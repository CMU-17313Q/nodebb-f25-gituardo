'use strict';

const db = require('../database');
const privileges = require('../privileges');
const plugins = require('../plugins');


module.exports = function (Posts) {
	/**
	 * Add a reaction (👍 ❤️ 😂 etc.)
	 */
	Posts.addReaction = async function (pid, uid, type) {
		// Check privilege: user must be allowed to react
		const canReact = await privileges.posts.can('posts:react', pid, uid);
		if (!canReact) {
			throw new Error('[[error:no-privileges]]');
		}

		// Remove any old reaction by this user (only one per post)
		const key = `pid:${pid}:reactions`;
		const existing = await db.getObjectField(key, uid);
		if (existing && existing !== type) {
			// decrement old reaction
			await db.incrObjectFieldBy(`${key}:count`, existing, -1);
		}

		// save new reaction
		await db.setObjectField(key, uid, type);
		await db.incrObjectFieldBy(`${key}:count`, type, 1);

		// Fire hook for plugins
		plugins.hooks.fire('action:post.addReaction', { pid, uid, type });

		return await Posts.getReactions(pid);
	};

	/**
	 * Remove a reaction
	 */
	Posts.removeReaction = async function (pid, uid) {
		const key = `pid:${pid}:reactions`;
		const existing = await db.getObjectField(key, uid);
		if (!existing) {
			return await Posts.getReactions(pid); // nothing to remove
		}

		// remove user’s reaction
		await db.deleteObjectField(key, uid);
		await db.incrObjectFieldBy(`${key}:count`, existing, -1);

		plugins.hooks.fire('action:post.removeReaction', { pid, uid, type: existing });

		return await Posts.getReactions(pid);
	};

	/**
	 * Get all reactions + counts for a post
	 */
	Posts.getReactions = async function (pid) {
		const counts = await db.getObject(`${`pid:${pid}:reactions:count`}`) || {};
		// Ensure defaults (so template has 0 if none)
		return {
			like: parseInt(counts.like, 10) || 0,
			love: parseInt(counts.love, 10) || 0,
			laugh: parseInt(counts.laugh, 10) || 0,
		};
	};
};