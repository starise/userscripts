# Code Style

## JavaScript/TypeScript Naming

- `camelCase`: variables, functions, params, local helpers.
- `PascalCase`: types, interfaces, React components, enum-like unions.
- `UPPER_SNAKE_CASE`: module constants with fixed values.
- Booleans: descriptive (`isBusy`, `canInstall`, `hasApiKey`).
- DOM IDs/attributes: prefix `<app_name>-` or `data-<app_name>-*`.

## JavaScript/TypeScript Comments

- **Exported functions/types with non-obvious behavior**: use TSDoc. Include a one-sentence summary;
  `@remarks` for contracts; `@param`, `@returns`, `@throws` only when semantics are non-obvious.
- **Internal helpers**: use compact comments only for non-obvious behavior, side effects, fallbacks,
  bridge assumptions, or fragile dependencies.
- No comments that restate names, obvious assignments, or straightforward control flow.
- Skip comments for tiny helpers whose name and type already explain their purpose.
- Update stale comments in the same commit.

## Useful vs. Noisy Comments

- **Useful**: Why a fallback exists; runtime contract owner; required external API/path shape;
  caller error shape; intentional conservative behavior; LLM/agent maintainability requirements.
- **Noise**: Restating `return`/assignment/flow; common syntax; narrating straightforward steps;
  temporary refactor plans in source.
