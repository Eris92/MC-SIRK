# Dev48 runner blocker

Temporary handoff for branch `fix/dev48-smoke-followup`.

GitHub-hosted Actions jobs for the temporary patch workflow remain queued without a runner. The branch already contains the intended patcher and admin integration changes. Do not merge until the patcher has executed, temporary workflow/patcher files are removed, targeted tests and `npm test` are green, and version `0.1.1-dev.48` is prepared.
