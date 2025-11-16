'use strict';

const translatorApi = module.exports;

translatorApi.translate = async function (postData) {
	let fetch;
	try {
		fetch = (await import('node-fetch')).default;
	} catch (err) {
		console.error('Translation dynamic import error:', err);
		return [true, ''];
	}

	const FLASK_URL = process.env.TRANSLATE_URL || 'http://crs-17313-gituardo-gpu.qatar.cmu.edu/';

	try {
		let url;
		try {
			url = new URL(FLASK_URL);
		} catch (err) {
			url = FLASK_URL + (FLASK_URL.includes('?') ? '&' : '?');
		}

		const contentValue = String(postData.content || '');
		if (typeof url === 'object') {
			url.searchParams.set('content', contentValue);
		} else {
			url = `${url}content=${encodeURIComponent(contentValue)}`;
		}

		const response = await fetch(String(url), {
			method: 'GET',
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();
		const isEnglish = !!data.is_english;
		const translated = data.translated_content ?? data.translated ?? '';
		console.log('[translate] Flask API response:', { is_english: data.is_english, isEnglish, translated_length: translated.length });
		return [isEnglish, translated];
	} catch (error) {
		console.error('Translation API error:', error);
		// Return defaults on error - assume English, no translation
		return [true, ''];
	}
};