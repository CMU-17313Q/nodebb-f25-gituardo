/* eslint-disable max-len */
'use strict';

const nconf = require('nconf');

const db = require('../../database');
const posts = require('../../posts');
const flags = require('../../flags');
const events = require('../../events');
const privileges = require('../../privileges');
const plugins = require('../../plugins');
const social = require('../../social');
const topics = require('../../topics');
const user = require('../../user');
const utils = require('../../utils');
// const { post } = require('jquery');

module.exports = function (SocketPosts) {
	// Helper to normalize privilege returns that may be booleans or { flag: boolean }
	const asBool = (v) => (typeof v === 'object' && v !== null && 'flag' in v ? !!v.flag : !!v);

	// Server-side authorization for endorsing/unendorsing
	async function canEndorse(pid, uid) {
		const cid = await posts.getCidByPid(pid);
		const [isAdmin, isMod, owner] = await Promise.all([
			user.isAdministrator(uid),
			user.isModerator(uid, cid),
			posts.getPostField(pid, 'uid'),
		]);
		// Rule: admins/mods OR the post owner can endorse/unendorse
		return isAdmin || isMod || String(uid) === String(owner);
	}

	SocketPosts.loadPostTools = async function (socket, data) {
		if (!data || !data.pid) {
			throw new Error('[[error:invalid-data]]');
		}
		const cid = await posts.getCidByPid(data.pid);
		const results = await utils.promiseParallel({
			posts: posts.getPostFields(data.pid, ['deleted', 'bookmarks', 'uid', 'tid', 'ip', 'flagId', 'url', 'endorsed', 'endorserUsername']),
			isAdmin: user.isAdministrator(socket.uid),
			isGlobalMod: user.isGlobalModerator(socket.uid),
			isModerator: user.isModerator(socket.uid, cid),
			canEdit: privileges.posts.canEdit(data.pid, socket.uid),
			canDelete: privileges.posts.canDelete(data.pid, socket.uid),
			canPurge: privileges.posts.canPurge(data.pid, socket.uid),
			canFlag: privileges.posts.canFlag(data.pid, socket.uid),
			canViewHistory: privileges.posts.can('posts:history', data.pid, socket.uid),
			flagged: flags.exists('post', data.pid, socket.uid), // specifically, whether THIS calling user flagged
			bookmarked: posts.hasBookmarked(data.pid, socket.uid),
			postSharing: social.getActivePostSharing(),
			history: posts.diffs.exists(data.pid),
			canViewInfo: privileges.global.can('view:users:info', socket.uid),
		});
		
		const postData = results.posts;
		postData.pid = data.pid;
		postData.absolute_url = `${nconf.get('url')}/post/${encodeURIComponent(data.pid)}`;
		postData.bookmarked = results.bookmarked;
		postData.selfPost = socket.uid && socket.uid === postData.uid;
		
		postData.display_edit_tools = asBool(results.canEdit);
		postData.display_delete_tools = asBool(results.canDelete);
		postData.display_purge_tools = asBool(results.canPurge);
		postData.display_flag_tools = socket.uid && asBool(results.canFlag);
		postData.display_history = results.history && asBool(results.canViewHistory);
		
		postData.display_moderator_tools = postData.display_edit_tools || postData.display_delete_tools;
		postData.display_move_tools = results.isAdmin || results.isModerator;
		postData.display_change_owner_tools = results.isAdmin || results.isModerator;
		postData.display_manage_editors_tools = results.isAdmin || results.isModerator || postData.selfPost;
		
		const mainPid = await topics.getTopicField(postData.tid, 'mainPid');
		const mainUid = await posts.getPostField(mainPid, 'uid');
		const isMainOwner = mainUid == socket.uid;
		const isMainPost = mainPid == data.pid;

		postData.endorsed = parseInt(postData.endorsed, 10) === 1;
		postData.endorserUsername = postData.endorsed ? postData.endorserUsername : 'OP';
		postData.display_endorse_tools = (results.isAdmin || results.isModerator ||
			isMainOwner) && !postData.endorsed && !isMainPost && !postData.selfPost;
		postData.display_unendorse_tools = (results.isAdmin || results.isModerator ||
			isMainOwner) && postData.endorsed && !isMainPost && !postData.selfPost;

		postData.display_ip_ban = (results.isAdmin || results.isGlobalMod) && !postData.selfPost;
		postData.display_original_url = !utils.isNumber(data.pid);
		
		const parsedFlagId = Number.parseInt(results.posts.flagId, 10);
		const flagId = Number.isFinite(parsedFlagId) ? parsedFlagId : null;
		postData.flags = {
			flagId,
			can: asBool(results.canFlag),
			exists: !!results.posts.flagId,
			flagged: results.flagged,
			state: flagId !== null ? await db.getObjectField(`flag:${flagId}`, 'state') : null,
		};

		if (!results.isAdmin && !results.canViewInfo) {
			postData.ip = undefined;
		}
		const { tools } = await plugins.hooks.fire('filter:post.tools', {
			pid: data.pid,
			post: postData,
			uid: socket.uid,
			tools: [],
		});
		postData.tools = tools;

		return results;
	};


	SocketPosts.changeOwner = async function (socket, data) {
		if (!data || !Array.isArray(data.pids) || !data.toUid) {
			throw new Error('[[error:invalid-data]]');
		}
		const isAdminOrGlobalMod = await user.isAdminOrGlobalMod(socket.uid);
		if (!isAdminOrGlobalMod) {
			throw new Error('[[error:no-privileges]]');
		}

		const postData = await posts.changeOwner(data.pids, data.toUid);
		const logs = postData.map(({ pid, uid, cid }) => (events.log({
			type: 'post-change-owner',
			uid: socket.uid,
			ip: socket.ip,
			targetUid: data.toUid,
			pid: pid,
			originalUid: uid,
			cid: cid,
		})));

		await Promise.all(logs);
	};

	SocketPosts.getEditors = async function (socket, data) {
		if (!data || !data.pid) {
			throw new Error('[[error:invalid-data]]');
		}
		await checkEditorPrivilege(socket.uid, data.pid);
		const editorUids = await db.getSetMembers(`pid:${data.pid}:editors`);
		const userData = await user.getUsersFields(editorUids, ['username', 'userslug', 'picture']);
		return userData;
	};

	SocketPosts.saveEditors = async function (socket, data) {
		if (!data || !data.pid || !Array.isArray(data.uids)) {
			throw new Error('[[error:invalid-data]]');
		}
		await checkEditorPrivilege(socket.uid, data.pid);
		await db.delete(`pid:${data.pid}:editors`);
		await db.setAdd(`pid:${data.pid}:editors`, data.uids);
	};

	SocketPosts.endorse = async function (socket, data) {
		if (!data || !data.pid) {
			throw new Error('[[error:invalid-data]]');
		}
		if (!(await canEndorse(data.pid, socket.uid))) {
			throw new Error('[[error:no-privileges]]');
		}

		const endorser = await user.getUserFields(socket.uid, ['uid', 'username']);
		const current = await posts.getPostFields(data.pid, ['endorsed', 'endorserUsername']);
		const alreadyEndorsed = Number.parseInt(current.endorsed, 10) === 1;

		// Idempotency: if already endorsed by same endorser, return OK without writing
		if (alreadyEndorsed && current.endorserUsername === endorser.username) {
			return { success: true, endorserUsername: endorser.username };
		}

		await posts.setEndorsed(data.pid, true, endorser);

		// Audit/log
		await events.log({
			type: 'post-endorse',
			uid: socket.uid,
			ip: socket.ip,
			pid: data.pid,
			endorser: endorser.uid,
			endorsed: true,
		});

		return { success: true, endorserUsername: endorser.username };
	};


	SocketPosts.unendorse = async function (socket, data) {
		if (!data || !data.pid) {
			throw new Error('[[error:invalid-data]]');
		}
		if (!(await canEndorse(data.pid, socket.uid))) {
			throw new Error('[[error:no-privileges]]');
		}

		const endorser = await user.getUserFields(socket.uid, ['uid', 'username']);
		const current = await posts.getPostFields(data.pid, ['endorsed']);
		const alreadyEndorsed = Number.parseInt(current.endorsed, 10) === 1;

		// Idempotency: if already unendorsed, just return OK
		if (!alreadyEndorsed) {
			return { success: true, endorserUsername: endorser.username };
		}

		await posts.setEndorsed(data.pid, false, endorser);

		// Audit/log
		await events.log({
			type: 'post-endorse',
			uid: socket.uid,
			ip: socket.ip,
			pid: data.pid,
			endorser: endorser.uid,
			endorsed: false,
		});

		return { success: true, endorserUsername: endorser.username };
	};

	async function checkEditorPrivilege(uid, pid) {
		const cid = await posts.getCidByPid(pid);
		const [isAdminOrMod, owner] = await Promise.all([
			privileges.categories.isAdminOrMod(cid, uid),
			posts.getPostField(pid, 'uid'),
		]);
		const isSelfPost = String(uid) === String(owner);
		if (!isAdminOrMod && !isSelfPost) {
			throw new Error('[[error:no-privileges]]');
		}
	}
};
