'use strict';

module.exports = function registerSimilarRoute({ router, middleware }) {
	const expose = middleware && middleware.exposeUid ? middleware.exposeUid : (req, res, next) => next();

	// no /api prefix here because api.js mounts the router at /api already
	router.get('/similar', expose, async (req, res) => {
		const q = String(req.query.q || '').trim();
		const limit = Math.min(parseInt(req.query.limit || '5', 10), 10);

		try {
			const results = await bm25.query({ q, limit, user: req.user });
			res.json({ ok: true, q, limit, results });
		} catch (e) {
			// keeping responses predictable for now
			res.json({ ok: false, q, limit, results: [], error: e.message });
		}
	});
};

