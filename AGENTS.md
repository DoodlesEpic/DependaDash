# Agent instructions

Keep DependaDash small, dependency-free, and easy to understand.

## Commits

Always use Conventional Commits. Do not use scopes in parentheses.

Good examples:

- `feat: add repository filter`
- `fix: handle empty alert files`
- `docs: clarify GitHub CLI permissions`

Do not use forms such as `feat(ui): ...`.

Create commits on a separate branch and merge them into `main` through a pull request.
Use merge commits for pull requests. Do not squash commits.

## Issues and pull requests

Apply relevant GitHub labels to every issue and pull request you create or work on. Assign them to the person operating the AI agent, using their authenticated GitHub account unless they specify another account.

## Releases

Every release must have its own annotated SemVer tag in `vMAJOR.MINOR.PATCH` format, starting with `v0.1.0`. Use a patch version for fixes, a minor version for new features, and a major version for breaking changes. While the major version is zero, use minor versions for breaking changes. Do not reuse or move published tags.

Keep work on separate branches until a release is ready. Every pull request merged into `main` must prepare a new release version. After merging, create its annotated tag and verify its deployment. Review both the changes since the previous commit and all changes since the last release tag. Choose the version from the most significant change in that full release range. The number of commits or changed lines does not determine the SemVer bump.

Update the version shown in `index.html` to match the new tag before committing. Keep it in the static HTML so local files, release downloads, and the website show the same version without network requests. The release workflow checks that the tag is annotated, belongs to `main`, and matches the interface version.

Netlify deploys the production website from `main`. Keep its production branch set to `main`, automatic publishing enabled, and its publish directory at the repository root with no build command. Deployment starts when a release pull request is merged. The tag creates the GitHub release after that merge. Do not merge unfinished work or changes without a version bump into `main`. Wait for Netlify to publish and verify that https://dependadash.doodlesdev.com/ shows the released version.

Before releasing, review the changes, run the relevant checks, and commit all release files on a separate branch. Merge the pull request, update local `main`, and tag the merged commit. Push `main` to all configured remotes before pushing the tag to any remote.

For example, create the first release with `git tag -a v0.1.0 -m "Release v0.1.0"`. For each remote listed by `git remote`, run `git push <remote> main` followed by `git push <remote> v0.1.0`. Replace the version for later releases.

The GitHub workflow in `.github/workflows/release.yml` creates a release when a version tag is pushed. Wait for the workflow to succeed, then suggest notes describing the changes and ask the user for the final release notes. Replace the generated notes with the user's text using `gh release edit <tag> --repo DoodlesEpic/DependaDash --notes-file <file>`. Preserve their wording and keep release notes out of README.md.

## Language

Write all source code, comments, interface copy, documentation, commit messages, and new file content in English.

## Code

- Prefer the smallest and simplest implementation that solves the problem. 
- Avoid dependencies unless they provide clear value that cannot be achieved cleanly with the existing static HTML, CSS, and JavaScript.
  - If you decide to add a dependency, you should inform me before doing so. Stop your work and wait for human confirmation before download dependencies.
- Keep functions focused and naming obvious. Do not add abstractions for hypothetical future needs.

Official GitHub-maintained actions are allowed and encouraged in GitHub Actions workflows when they simplify code or improve resilience. They do not count as application dependencies and do not require dependency approval.

## Writing

- Keep documentation simple and readable for humans. Prefer short paragraphs over dense lists when practical.
- You should never modify the README.md file: it's supposed to be entirely human-written. You may suggest me to add something there, but allow me to write it myself if I consider that it's actually worth adding.
- Do not use em dashes. Avoid semicolons when they are not required. Do not write verbose or promotional documentation.
