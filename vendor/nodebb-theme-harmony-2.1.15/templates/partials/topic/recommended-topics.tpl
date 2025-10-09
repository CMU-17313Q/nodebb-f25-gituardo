{{{ if recommendedTopics.length }}}
<div class="recommended-topics-section mt-5 mb-4">
	<div class="container-fluid px-0">
		<h3 class="fw-semibold fs-5 mb-3">Recommended Topics</h3>
		<div class="row g-3">
			{{{ each recommendedTopics }}}
			<div class="col-12 col-md-4">
				<div class="card h-100 border hover-shadow transition-all">
					<div class="card-body d-flex flex-column">
						<div class="d-flex align-items-center mb-3">
							<a class="d-inline-block text-decoration-none" href="{{{ if ./user.userslug }}}{config.relative_path}/user/{./user.userslug}{{{ else }}}#{{{ end }}}">
								{buildAvatar(./user, "32px", true)}
							</a>
							<div class="ms-2 flex-grow-1 text-truncate">
								<span class="text-muted small">{./user.displayname}</span>
							</div>
						</div>
						<h5 class="card-title fw-semibold mb-2">
							<a href="{config.relative_path}/topic/{./slug}" class="text-reset text-decoration-none stretched-link">
								{./title}
							</a>
						</h5>
						<div class="d-flex gap-2 mt-auto pt-2">
							{{{ if ./category }}}
							{buildCategoryLabel(./category, "span", "border")}
							{{{ end }}}
							<span class="badge bg-transparent border border-gray-300 text-muted small">
								<i class="fa fa-message"></i> {humanReadableNumber(./postcount, 0)}
							</span>
							<span class="badge bg-transparent border border-gray-300 text-muted small">
								<i class="fa fa-eye"></i> {humanReadableNumber(./viewcount, 0)}
							</span>
						</div>
						{{{ if ./tags.length }}}
						<div class="mt-2 d-flex flex-wrap gap-1">
							{{{ each ./tags }}}
							<a href="{config.relative_path}/tags/{./valueEncoded}" class="text-decoration-none">
								<span class="badge border border-gray-300 fw-normal small">{./valueEscaped}</span>
							</a>
							{{{ end }}}
						</div>
						{{{ end }}}
					</div>
				</div>
			</div>
			{{{ end }}}
		</div>
	</div>
</div>
{{{ end }}}
