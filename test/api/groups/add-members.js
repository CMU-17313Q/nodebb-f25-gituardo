'use strict';

const assert = require('assert');
const helpers = require('./helpers');
const request = require('../src/request');

describe('Groups API - Add Members', () => {
	let adminJar;
	let user;
  
	before(async () => {
		({ jar: adminJar } = await helpers.loginUser('admin', '123456'));
    
		// create a new test user
		const res = await request.post('/api/v3/users', {
			jar: adminJar,
			body: {
				username: 'testmember',
				email: 'testmember@example.com',
				password: 'password123',
			},
			json: true,
		});
		user = res.body.user;
	});
  
	it('should add a user to a group', async () => {
		const groupSlug = 'test-group';
    
		// make sure group exists
		await request.post(`/api/v3/groups`, {
			jar: adminJar,
			body: { name: groupSlug },
			json: true,
		});
    
		// add user to group
		const res = await request.put(`/api/v3/groups/${groupSlug}/membership/${user.uid}`, {
			jar: adminJar,
			json: true,
		});
    
		assert.strictEqual(res.response.statusCode, 200);
    
		// check user is now in group
		const members = await request.get(`/api/v3/groups/${groupSlug}/members`, {
			jar: adminJar,
			json: true,
		});
		const found = members.body.users.find(u => u.uid === user.uid);
		assert(found, 'Expected user to be in group');
	});
});
