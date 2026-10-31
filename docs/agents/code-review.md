# Code review

Signal over volume: each finding names a concrete defect and its fix.

## Standards

Apply every standard to every changed line:

- **Correctness**: logic errors, unhandled `await`, races, unvalidated input at a boundary.
- **Conventions**: every rule under "Conventions" and "Design: deep modules" in `AGENTS.md`.
- **ADRs**: a change that contradicts an ADR in `docs/adr/` (cite its number and the contradicted sentence), or makes a new architectural decision with no ADR.

## Scope

- Changed lines only. At most 5 findings, highest severity first.
- Leave formatting and lint to Prettier and ESLint.
- Zero findings is a valid result.
