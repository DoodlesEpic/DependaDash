# Agent instructions

Keep DependaDash small, dependency-free, and easy to understand.

## Commits

Always use Conventional Commits. Do not use scopes in parentheses.

Good examples:

- `feat: add repository filter`
- `fix: handle empty alert files`
- `docs: clarify GitHub CLI permissions`

Do not use forms such as `feat(ui): ...`.

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
