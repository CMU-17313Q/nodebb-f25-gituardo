'use strict';

const posts = require('../../posts');
// const privileges = require('../../privileges');
const websockets = require('../index');

module.exports = function (SocketPosts) {
	SocketPosts.endorse = async function (socket, data) {
		if (!socket.uid) {
			throw new Error('[[error:not-logged-in]]');
		}
		if (!data || !data.pid) {
			throw new Error('[[error:invalid-data]]');
		}

		// const canEndorse = await privileges.posts.can('posts:endorse', data.pid, socket.uid);
		// if (!canEndorse) {
		//      throw new Error('[[error:no-privileges]]');
		// }

		await posts.setPostField(data.pid, 'endorsed', 1);
		websockets.in(`post_${data.pid}`).emit('event:post_endorsed', { pid: data.pid, endorsed: true });
		return { endorsed: true };
	};

	SocketPosts.unendorse = async function (socket, data) {
		if (!socket.uid) {
			throw new Error('[[error:not-logged-in]]');
		}
		if (!data || !data.pid) {
			throw new Error('[[error:invalid-data]]');
		}

		await posts.setPostField(data.pid, 'endorsed', 0);
		websockets.in(`post_${data.pid}`).emit('event:post_endorsed', { pid: data.pid, endorsed: false });
		return { endorsed: false };
	};
};
