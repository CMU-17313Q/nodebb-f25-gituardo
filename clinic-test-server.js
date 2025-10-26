'use strict';

const http = require('http');

const server = http.createServer((req, res) => {
	if (req.url === '/api/posts') {
		setTimeout(() => {
			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ posts: ['post1', 'post2', 'post3'] }));
		}, 50);
	} else if (req.url === '/api/users') {
		const users = [];
		for (let i = 0; i < 1000; i++) {
			users.push({ id: i, name: `user${i}` });
		}
		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ users: users.slice(0, 10) }));
	} else {
		res.writeHead(200, { 'Content-Type': 'text/plain' });
		res.end('Hello from NodeBB Clinic.js test server!');
	}
});

server.listen(0, () => {
	console.log('Clinic.js test server running on port', server.address().port);
});