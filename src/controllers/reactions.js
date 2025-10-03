'use strict';

const db = require('../database');
const posts = require('../posts');

const Reactions = {};

Reactions.toggle = async function (req, res, next) {
	try {
		const { uid } = req;
		const { pid, type } = req.body;
		
		if (!uid || !pid || !type) {
			return res.status(400).json({ error: 'missing-data' });
		}
		
		const post = await posts.getPostData(parseInt(pid, 10));
		if (!post) {
			return res.status(404).json({ error: 'no-post' });
		}
		
		const reactedKey = `post:${pid}:reactions:${type}`;
		const userKey = `uid:${uid}:reactions`;
		
		const already = await db.isSetMember(reactedKey, uid);
		
		if (already) {
			await Promise.all([
				db.setRemove(reactedKey, uid),
				db.sortedSetRemove(userKey, `${pid}:${type}`),
			]);
		} else {
			await Promise.all([
				db.setAdd(reactedKey, uid),
				db.sortedSetAdd(userKey, Date.now(), `${pid}:${type}`),
			]);
		}
		
		const count = await db.setCount(reactedKey);
		
		res.json({
			pid: parseInt(pid, 10),
			type,
			reacted: !already,
			count,
		});
	} catch (err) {
		next(err);
	}
};

module.exports = Reactions;

