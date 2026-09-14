# AGENTS.md

- Check `CODE_STYLE.md` for coding style, comments, refactor safety.
- Check `README.md` when changes affect public-facing behavior or documented usage.
- Do not document implementation details that are directly readable from the code. Do not update
  documentation with temporary state, derived values, file lists, test results.

## Commit policy

All commits MUST use Conventional Commits following these rules:

- The suggested commit message MUST follow the 50/72 rule:
  - Subject: maximum 50 characters.
  - Body: maximum 72 characters per line.
- Commit messages must describe one logical change.
- Do not mix unrelated changes in the same commit.

Always suggest a Conventional Commit message when a self-contained change is commit-ready, never for
intermediate, exploratory, or unfinished work.
