'use strict';

const translatorApi = module.exports;

translatorApi.translate = async function (postData) {
	// Dynamically import node-fetch (ES module)
	const fetch = (await import('node-fetch')).default;
	
	const FLASK_URL = 'http://localhost:8080/translate';
	
	try {
		const response = await fetch(FLASK_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				text: postData.content || '',
			}),
		});
		
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		
		const data = await response.json();
		
		// Return [isEnglish, translatedContent]
		return [data.is_english, data.translated || data.translated_content || ''];
	} catch (error) {
		console.error('Translation API error:', error);
		// Return defaults on error - assume English, no translation
		return [true, ''];
	}
};