// $(document).ready(function () {

//   function updateReactionCount($reaction, count) {
//     $reaction.find('.count').text(count);
//   }

//   function handleReactionClick(e) {
//     e.preventDefault();
//     const $reaction = $(this);
//     const $bar = $reaction.closest('.reaction-bar');
//     const pid = $bar.data('pid');
//     const type = $reaction.data('type');

//     // Optimistic UI: increment/decrement count immediately
//     let currentCount = parseInt($reaction.find('.count').text(), 10) || 0;
//     if ($reaction.hasClass('reacted')) {
//       currentCount -= 1;
//     } else {
//       currentCount += 1;
//     }
//     $reaction.toggleClass('reacted');
//     updateReactionCount($reaction, currentCount);

//     // Call backend API
//     const action = $reaction.hasClass('reacted') ? 'add' : 'remove';
//     $.ajax({
//       method: 'POST',
//       url: `/api/posts/${pid}/reactions`,
//       data: { type, action },
//     }).fail(function () {
//       // Rollback on failure
//       $reaction.toggleClass('reacted');
//       updateReactionCount($reaction, currentCount + ($reaction.hasClass('reacted') ? 1 : -1));
//       alert('Failed to update reaction. Try again.');
//     });
//   }

//   // Attach click handler
//   $('.reaction-bar .reaction').off('click').on('click', handleReactionClick);

// });
'use strict';

define('forum/reactions', [
	'api', 'alerts',
], function (api, alerts) {
	const Reactions = {};

	Reactions.init = function () {
		// Attach click handler on page load
		$('.reaction-bar .reaction').off('click').on('click', handleReactionClick);
	};

	function updateReactionCount($reaction, count) {
		$reaction.find('.count').text(count);
	}
  
	function handleReactionClick(e) {
		e.preventDefault();
		const $reaction = $(this);
		const $bar = $reaction.closest('.reaction-bar');
		const pid = $bar.data('pid');
		const type = $reaction.data('type');

		api.post('/reactions/toggle', { pid, type })
			.then(result => {
				updateReactionCount($reaction, result.count);
				$reaction.toggleClass('reacted', result.reacted);
			})
			.catch(() => {
				alerts.error('[[reactions:update-failed]]');
			});
	}

	$(window).on('action:ajaxify.end', function (ev, data) {
		if (data.url && data.url.startsWith('topic/')) {
			Reactions.init();
		}
	});

	return Reactions;
});
