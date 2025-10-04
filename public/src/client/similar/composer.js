'use strict';
define('forum/similar/composer', ['composer', 'api'], function (composer, api) {
  const DEBOUNCE_MS = 500;
  let timer = null;

  composer.on('action:composer.loaded', function (data) {
    const $title = data && data.postContainer && data.postContainer.find('.composer .title input');
    if (!$title || !$title.length) return;

    $title.on('input', function () {
      clearTimeout(timer);
      const q = $title.val().trim();
      if (q.length < 6) return;

      timer = setTimeout(async () => {
        try {
          const resp = await api.get('/api/similar', { q, limit: 5 });
          console.debug('[similar/stub]', q, resp);
        } catch (e) { console.error('[similar/stub] error', e); }
      }, DEBOUNCE_MS);
    });
  });
});

