'use strict';

const db = require('../database');
const posts = require('../posts');

//object to store all reaction related functions
const Reactions = {};

//function to add or remove a user's reaction on a post
Reactions.toggle = async function (req, res, next) {
	try {
		//get the user ID from the request and the post ID and reaction type from the body
		const { uid } = req;
		const { pid, type } = req.body;
		
		//any required data is missing, return a 400 error
		if (!uid || !pid || !type) {
			return res.status(400).json({ error: 'missing-data' });
		}
		
		//post doesn’t exist, return a 404 error
		const post = await posts.getPostData(parseInt(pid, 10));
		if (!post) {
			return res.status(404).json({ error: 'no-post' });
		}
		
		const reactedKey = `post:${pid}:reactions:${type}`;
		const userKey = `uid:${uid}:reactions`;
		
		const already = await db.isSetMember(reactedKey, uid);
		
		//if the user already reacted, remove their reaction
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
		
		//count how many users have reacted with this type after the update
		const count = await db.setCount(reactedKey);
		
		//the updated reaction info as a json response
		return res.json({
			pid: parseInt(pid, 10),
			type,
			reacted: !already,
			count,
		});
	} catch (err) {
		return next(err);
	}
};

module.exports = Reactions;

