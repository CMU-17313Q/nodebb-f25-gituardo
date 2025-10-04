'use strict';

//frontend for handling post reactions.
//Depends on 'api' (for making backend calls) and 'alerts' (for showing user messages).
define('forum/reactions', [
	'api', 'alerts',
], function (api, alerts) {
	const Reactions = {};

	Reactions.init = function () {
		//Remove any previous click handlers and attach a new one to each reaction button
		$('.reaction-bar .reaction').off('click').on('click', handleReactionClick);
	};

	//Update the visible reaction count on a button
	function updateReactionCount($reaction, count) {
		$reaction.find('.count').text(count);
	}
  
	function handleReactionClick(e) {
		e.preventDefault();
		const $reaction = $(this);
		const $bar = $reaction.closest('.reaction-bar');
		const pid = $bar.data('pid');
		const type = $reaction.data('type');

		//Send POST request to backend to toggle the user's reaction
		api.post('/api/reactions/toggle', { pid, type })
			.then(result => {
				//Call the helper function to update the reaction count and button state
				updateReactionCount($reaction, result.count);
				$reaction.toggleClass('reacted', result.reacted);
			})
			.catch(() => {
				//Error message if the reaction failed to update
				alerts.error('[[reactions:update-failed]]');
			});
	}

	//Automatically run Reactions.init() when a topic page is loaded
	$(window).on('action:ajaxify.end', function (ev, data) {
		if (data.url && data.url.startsWith('topic/')) {
			Reactions.init();
		}
	});

	return Reactions;
});
