'use strict';

/**
 * BM25 strategy using elasticlunr.
 * Indexes: title + body (first post). Returns top-N similar topics.
 */
const { loadTopicDocsVisibleTo } = require('../topicStore');
const elasticlunr = require('elasticlunr');

// module-scoped index (rebuilt on startup for now)
let idx = null;

/**
 * TODO later: replacing this with a real loader that pulls
 * { tid, title, body, url, cid } for topics the current user can see.
 * For now it returns an empty array.
 */
async function loadTopicDocs() {
	// later we’ll pass `user` here for permissions
	return await loadTopicDocsVisibleTo(null);
}

async function buildIndex() {
	const docs = await loadTopicDocs();

	idx = elasticlunr(function () {
		this.addField('title');
		this.addField('body');
		this.setRef('tid');
	});

	docs.forEach(d => idx.addDoc(d));
}

async function query({ q, limit = 5 /*, user*/ }) {
	if (!idx) await buildIndex();
	if (!q || !q.trim()) return [];

	// elasticlunr returns array like [{ref:'123', score: 0.42, matchData: {...}}, ...]
	const results = idx.search(q, { expand: true }).slice(0, limit);

	return results.map(r => ({
		tid: r.ref,
		title: '(title pending)',
		url: '#',
		snippet: '',
		score: r.score,
	}));
}

module.exports = { buildIndex, query };
