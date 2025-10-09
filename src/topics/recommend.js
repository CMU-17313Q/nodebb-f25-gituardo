'use strict';

const winston = require('winston');

let tf;
let use;
let model;
let modelLoading = false;
let modelLoadError = null;

async function loadModel() {
	if (model) {
		return model;
	}

	if (modelLoading) {
		// Wait for the model to finish loading
		await new Promise((resolve) => {
			const checkInterval = setInterval(() => {
				if (!modelLoading) {
					clearInterval(checkInterval);
					resolve();
				}
			}, 100);
		});
		return model;
	}

	try {
		modelLoading = true;
		winston.info('Loading Universal Sentence Encoder model...');

		// Lazy load TensorFlow.js modules
		tf = require('@tensorflow/tfjs-node');
		use = require('@tensorflow-models/universal-sentence-encoder');

		model = await use.load();
		modelLoading = false;

		winston.info('Model loaded successfully!');
		return model;
	} catch (err) {
		modelLoading = false;
		modelLoadError = err;
		winston.error(`Failed to load model: ${err.message}`);
		throw err;
	}
}

/**
 * Find similar topics based on content similarity using sentence embeddings
 * @param {Object} currentTopic - The current topic being viewed
 * @param {Array} candidateTopics - Array of candidate topics to compare against
 * @param {number} limit - Number of recommendations to return (default: 3)
 * @returns {Array} Array of recommended topic objects
 */
async function getRecommendedTopics(currentTopic, candidateTopics, limit = 3) {
	try {
		// Check if model is available
		if (modelLoadError) {
			winston.warn('Model failed to load, returning random topics');
			return getRandomTopics(candidateTopics, limit);
		}

		// Load model if not already loaded
		const encoder = await loadModel();

		// Filter out the current topic from candidates
		const candidates = candidateTopics.filter(t => t.tid !== currentTopic.tid);

		if (candidates.length === 0) {
			return [];
		}

		if (candidates.length <= limit) {
			return candidates;
		}

		// Build text representations
		const currentText = buildTopicText(currentTopic);
		const candidateTexts = candidates.map(t => buildTopicText(t));

		// Prepare all texts for encoding
		const allTexts = [currentText, ...candidateTexts];

		// Generate embeddings for all texts at once (more efficient)
		const embeddings = await encoder.embed(allTexts);

		// Split embeddings
		const currentEmbedding = tf.slice(embeddings, [0, 0], [1, -1]);
		const candidateEmbeddings = tf.slice(embeddings, [1, 0], [-1, -1]);

		// Compute cosine similarity
		// Formula: cosine_sim = dot(a, b) / (norm(a) * norm(b))
		const currentNorm = tf.norm(currentEmbedding, 2, 1, true);
		const candidateNorms = tf.norm(candidateEmbeddings, 2, 1, true);

		const normalizedCurrent = tf.div(currentEmbedding, currentNorm);
		const normalizedCandidates = tf.div(candidateEmbeddings, candidateNorms);

		// Compute dot product
		const similarities = tf.matMul(normalizedCurrent, normalizedCandidates, false, true);
		const scoresArray = await similarities.array();
		const scores = scoresArray[0];

		// Clean up tensors
		currentEmbedding.dispose();
		candidateEmbeddings.dispose();
		currentNorm.dispose();
		candidateNorms.dispose();
		normalizedCurrent.dispose();
		normalizedCandidates.dispose();
		similarities.dispose();
		embeddings.dispose();

		// Get top N most similar
		const topIndices = getTopKIndices(scores, limit);

		const recommendations = topIndices.map(i => ({
			...candidates[i],
			similarityScore: scores[i],
		}));

		return recommendations;
	} catch (err) {
		winston.error(`Error computing recommendations: ${err.message}`);
		// Fallback to random selection
		return getRandomTopics(candidateTopics.filter(t => t.tid !== currentTopic.tid), limit);
	}
}

/**
 * Build a text representation of a topic from its title and tags
 * @param {Object} topic - Topic object with title, tags, etc.
 * @returns {string} Text representation
 */
function buildTopicText(topic) {
	const parts = [];

	if (topic.title) {
		parts.push(topic.title);
	}

	if (topic.tags && Array.isArray(topic.tags) && topic.tags.length > 0) {
		// Tags are important for topic similarity
		parts.push(topic.tags.join(' '));
		// Add tags again for emphasis
		parts.push(topic.tags.join(' '));
	}

	// You can add more fields if available (description, category name, etc.)
	if (topic.category && topic.category.name) {
		parts.push(topic.category.name);
	}

	return parts.join(' ');
}

/**
 * Get top K indices from an array of scores
 * @param {Array} scores - Array of similarity scores
 * @param {number} k - Number of top items to return
 * @returns {Array} Indices of top K items
 */
function getTopKIndices(scores, k) {
	const indexed = scores.map((score, idx) => ({ score, idx }));
	indexed.sort((a, b) => b.score - a.score);
	return indexed.slice(0, k).map(item => item.idx);
}

/**
 * Fallback: Get random topics
 * @param {Array} topics - Array of topics
 * @param {number} limit - Number of topics to return
 * @returns {Array} Random selection of topics
 */
function getRandomTopics(topics, limit) {
	const shuffled = [...topics].sort(() => Math.random() - 0.5);
	return shuffled.slice(0, limit);
}

/**
 * Preload the model during startup (optional)
 */
async function init() {
	try {
		await loadModel();
	} catch (err) {
		winston.warn('Model preloading failed');
	}
}

module.exports = {
	getRecommendedTopics,
	init,
};

