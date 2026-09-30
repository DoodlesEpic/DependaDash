# Agent instructions

Keep DependaDash small, dependency-free, and easy to understand.

## Commits

Always use Conventional Commits. Do not use scopes in parentheses.

Good examples:

- `feat: add repository filter`
- `fix: handle empty alert files`
- `docs: clarify GitHub CLI permissions`

Do not use forms such as `feat(ui): ...`.

## Releases

Every release must have its own annotated SemVer tag in `vMAJOR.MINOR.PATCH` format, starting with `v0.1.0`. Use a patch version for fixes, a minor version for new features, and a major version for breaking changes. While the major version is zero, use minor versions for breaking changes. Do not reuse or move published tags.

Before releasing, review the changes, run the relevant checks, and commit all release files. Push `main` to all configured remotes before pushing the tag.

For example, create the first release with `git tag -a v0.1.0 -m "Release v0.1.0"`. For each remote listed by `git remote`, run `git push <remote> main` followed by `git push <remote> v0.1.0`. Replace the version for later releases.

The GitHub workflow in `.github/workflows/release.yml` creates a release when a version tag is pushed. Wait for the workflow to succeed, then suggest notes describing the changes and ask the user for the final release notes. Replace the generated notes with the user's text using `gh release edit <tag> --repo DoodlesEpic/DependaDash --notes-file <file>`. Preserve their wording and keep release notes out of README.md.

## Language

Write all source code, comments, interface copy, documentation, commit messages, and new file content in English.

## Code

- Prefer the smallest and simplest implementation that solves the problem. 
- Avoid dependencies unless they provide clear value that cannot be achieved cleanly with the existing static HTML, CSS, and JavaScript.
  - If you decide to add a dependency, you should inform me before doing so. Stop your work and wait for human confirmation before download dependencies.
- Keep functions focused and naming obvious. Do not add abstractions for hypothetical future needs.

## Writing

- Keep documentation simple and readable for humans. Prefer short paragraphs over dense lists when practical.
- You should never modify the README.md file: it's supposed to be entirely human-written. You may suggest me to add something there, but allow me to write it myself if I consider that it's actually worth adding.
- Do not use em dashes. Avoid semicolons when they are not required. Do not write verbose or promotional documentation.
