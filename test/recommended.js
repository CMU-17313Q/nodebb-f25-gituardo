'use strict';

const assert = require('assert');
const recommend = require('../src/topics/recommend');

describe('Topic Recommendations', () => {
	let currentTopic;
	let candidateTopics;

	before(() => {
		// Sample topics for testing
		currentTopic = {
			tid: 1,
			title: 'How to learn Python programming',
			tags: ['python', 'programming', 'tutorial'],
			cid: 1,
		};

		candidateTopics = [
			{
				tid: 2,
				title: 'JavaScript basics for beginners',
				tags: ['javascript', 'programming', 'tutorial'],
				cid: 1,
			},
			{
				tid: 3,
				title: 'Advanced Python tips and tricks',
				tags: ['python', 'advanced', 'tips'],
				cid: 1,
			},
			{
				tid: 4,
				title: 'Best pizza recipes',
				tags: ['cooking', 'food', 'pizza'],
				cid: 2,
			},
			{
				tid: 5,
				title: 'Python web development with Flask',
				tags: ['python', 'web', 'flask'],
				cid: 1,
			},
			{
				tid: 6,
				title: 'Machine learning with Python',
				tags: ['python', 'ml', 'ai'],
				cid: 1,
			},
		];
	});

	it('should return recommended topics based on semantic similarity', async () => {
		const recommendations = await recommend.getRecommendedTopics(
			currentTopic,
			candidateTopics,
			3,
		);

		assert(Array.isArray(recommendations), 'Should return an array');
		assert.strictEqual(
			recommendations.length,
			3,
			'Should return exactly 3 recommendations',
		);

		// Verify each recommendation has required fields
		recommendations.forEach(topic => {
			assert(topic.tid, 'Each recommendation should have a tid');
			assert(topic.title, 'Each recommendation should have a title');
			assert(
				topic.similarityScore !== undefined,
				'Each recommendation should have a similarity score',
			);
			assert(
				topic.similarityScore >= 0 && topic.similarityScore <= 1,
				'Similarity score should be between 0 and 1',
			);
		});
	});

	it('should rank Python-related topics higher than unrelated topics', async () => {
		const recommendations = await recommend.getRecommendedTopics(
			currentTopic,
			candidateTopics,
			3,
		);

		// The top recommendations should be Python-related topics (tid 3, 5, or 6)
		const topRecommendation = recommendations[0];
		const pythonRelatedTids = [3, 5, 6];

		assert(
			pythonRelatedTids.includes(topRecommendation.tid),
			`Top recommendation should be Python-related (got tid ${topRecommendation.tid})`,
		);
	});

	it('should exclude the current topic from recommendations', async () => {
		const recommendations = await recommend.getRecommendedTopics(
			currentTopic,
			candidateTopics,
			3,
		);

		const currentTopicInResults = recommendations.some(
			topic => topic.tid === currentTopic.tid,
		);
		assert(
			!currentTopicInResults,
			'Current topic should not appear in recommendations',
		);
	});

	it('should handle empty candidate list gracefully', async () => {
		const recommendations = await recommend.getRecommendedTopics(
			currentTopic,
			[],
			3,
		);

		assert(Array.isArray(recommendations), 'Should return an array');
		assert.strictEqual(
			recommendations.length,
			0,
			'Should return empty array for no candidates',
		);
	});

	it('should return all topics when candidates are fewer than limit', async () => {
		const fewCandidates = candidateTopics.slice(0, 2);
		const recommendations = await recommend.getRecommendedTopics(
			currentTopic,
			fewCandidates,
			3,
		);

		assert(Array.isArray(recommendations), 'Should return an array');
		assert.strictEqual(
			recommendations.length,
			2,
			'Should return all available candidates',
		);
	});

	it('should have decreasing similarity scores', async () => {
		const recommendations = await recommend.getRecommendedTopics(
			currentTopic,
			candidateTopics,
			3,
		);

		for (let i = 1; i < recommendations.length; i++) {
			assert(
				recommendations[i - 1].similarityScore >=
					recommendations[i].similarityScore,
				`Recommendations should be sorted by similarity score (${recommendations[i - 1].similarityScore} >= ${recommendations[i].similarityScore})`,
			);
		}
	});
});
