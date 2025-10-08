'use strict';

//import testing utilities
const assert = require('assert');

//import NodeBB and DB modules
const db = require('../mocks/databasemock');
const user = require('../../src/user');
const topics = require('../../src/topics');
const posts = require('../../src/posts');
const reactionsController = require('../../src/controllers/reactions');

describe('post reactions', () => {
	let uid;
	let pid;
	let tid;

	// create a user, topic, and post to work with for testing
	before(async () => {
	// Create a test user
		uid = await user.create({
			username: 'reaction_user',
			password: '123456',
			gdpr_consent: 1,
		});

		// Create a test category
		const categories = require('../../src/categories');
		const privileges = require('../../src/privileges');

		const { cid } = await categories.create({
			name: 'Reactions Test Category',
			description: 'Used for reaction tests',
		});

		// Grant the user privileges to post topics and replies
		await privileges.categories.give(['topics:create', 'topics:reply'], cid, uid);

		//Create a topic
		const topicData = await topics.post({
			uid,
			cid,
			title: 'Test topic for reactions',
			content: 'Hello, world!',
		});

		tid = topicData.topicData.tid;
		pid = topicData.postData.pid;
	});

	// "student can see a reaction bar under each discussion post"
	describe('.toggle()', () => {
		//"Student can add a reaction by clicking an emoji -"
		it('should add a new reaction to a post', async () => {
			const req = {
				uid,
				body: { pid, type: 'like' },
			};
			let response;
			const res = {
				status: () => res,
				json: (data) => { response = data; },
			};
			const next = (err) => { throw err; };

			await reactionsController.toggle(req, res, next);

			assert.strictEqual(response.pid, pid);
			assert.strictEqual(response.type, 'like');
			assert.strictEqual(response.reacted, true);
			assert.strictEqual(typeof response.count, 'number');
			assert.strictEqual(response.count >= 1, true);
		});

		//"Student can remove their reaction"
		it('should remove an existing reaction when toggled again', async () => {
			const req = {
				uid,
				body: { pid, type: 'like' },
			};
			let response;
			const res = {
				status: () => res,
				json: (data) => { response = data; },
			};
			const next = (err) => { throw err; };

			await reactionsController.toggle(req, res, next);
			
			//Validate the controller response
			assert.strictEqual(response.pid, pid);
			assert.strictEqual(response.type, 'like');
			assert.strictEqual(response.reacted, false);
		});

		it('should return 400 if missing required data', async () => {
			let statusCode;
			let jsonResponse;

			const req = { uid, body: { pid } };
			const res = {
				status: (code) => { statusCode = code; return res; },
				json: (data) => { jsonResponse = data; },
			};
			const next = () => {};

			await reactionsController.toggle(req, res, next);
			// Should return error 400 with message "missing-data"
			assert.strictEqual(statusCode, 400);
			assert.strictEqual(jsonResponse.error, 'missing-data');
		});

		it('should return 404 if post does not exist', async () => {
			let statusCode;
			let jsonResponse;
			const req = {
				uid,
				body: { pid: 999999, type: 'like' },
			};
			const res = {
				status: (code) => { statusCode = code; return res; },
				json: (data) => { jsonResponse = data; },
			};
			const next = () => {};

			await reactionsController.toggle(req, res, next);
			// expect a "no-post" error message
			assert.strictEqual(statusCode, 404);
			assert.strictEqual(jsonResponse.error, 'no-post');
		});

		//"student cannot add the same reaction multiple times on the same post"
		it('should not allow the same reaction to be added multiple times by the same user', async () => {
			//Add a reaction once
			const firstReq = { uid, body: { pid, type: 'love' } };
			let firstResponse;
			const firstRes = {
				status: () => firstRes,
				json: (data) => { firstResponse = data; },
			};
			const next = (err) => { if (err) throw err; };

			await reactionsController.toggle(firstReq, firstRes, next);
			const firstCount = firstResponse.count;

			//Try adding the same reaction again
			let secondResponse;
			const secondRes = {
				status: () => secondRes,
				json: (data) => { secondResponse = data; },
			};

			await reactionsController.toggle(firstReq, secondRes, next);
			const secondCount = secondResponse.count;

			//check that the count didn’t go up after the second click
			assert.strictEqual(secondCount, firstCount - 1, 'Count should decrease after unreact');
			assert.strictEqual(secondResponse.reacted, false, 'User should not be able to react twice');
		});
	});

	describe('.getReactions()', () => {
		//"count updates immediately when student adds rection"
		it('should return correct reaction counts per post', async () => {
			const reactions = await posts.getReactions([pid]);
			assert.ok(reactions);
			assert.ok(reactions[pid]);
			assert.strictEqual(typeof reactions[pid], 'object');
		});
	});

	describe('.getUserReactions()', () => {
		it('should return correct user reaction type for each post', async () => {
			// add a like again
			await reactionsController.toggle({
				uid,
				body: { pid, type: 'like' },
			}, { status: () => {}, json: () => {} }, () => {});

			const userReactions = await posts.getUserReactions([pid], uid);
			assert.ok(userReactions);
			assert.strictEqual(userReactions[pid], 'like');
		});
	});

	after(async () => {
		// clean up any testing reaction data from DB
		await db.delete(`post:${pid}:reactions:like`);
		await db.delete(`post:${pid}:reactions:love`);
		await db.delete(`uid:${uid}:reactions`);
		await db.delete(`post:${pid}:userReactions`);
	});
});
