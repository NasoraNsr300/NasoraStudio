# Component ownership

Nasora uses Atomic Design as a composition vocabulary, not as a permanent folder taxonomy. Code is placed according to the team or product area that owns its contract, maintenance, tests, and operational impact.

## Ownership tiers

| Tier                       | Paths                      | Owner                      | Contract                                                                                                                                        |
| -------------------------- | -------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Core                       | `src/shared/**`            | Nasora core                | Stable authentication, localization, theme, Supabase infrastructure, upload controls, and low-level UI. Core must not import a product feature. |
| Domain                     | `src/features/<domain>/**` | Named domain               | Business rules, data access, composite UI, migrations, and focused tests for that domain.                                                       |
| Composition                | `src/app/**`, `workers/**` | Application runtime        | Routes and workers may compose multiple domains but must not become the source of domain rules.                                                 |
| Fixtures and compatibility | `src/data/**`              | Test/content compatibility | Legacy fixture contracts only. New production data access belongs to its owning feature.                                                        |

The current domain owners are `about`, `admin`, `catalog`, `collaboration`, `commission`, `documents`, `home`, `media`, `member`, `notifications`, `payments`, `portfolio`, `queue`, and `site-settings`. `test-support` owns deterministic non-production helpers only.

## Dependency rules

1. `shared` never imports from `features`.
2. A feature owns its validation, business rules, repository, composite components, and tests.
3. Cross-feature imports must point at a deliberate public contract. If several domains need generic infrastructure, move that infrastructure to `shared`; do not borrow it from an unrelated feature.
4. `app` may compose features, but route handlers keep validation and decisions in the owning domain.
5. Home, Portfolio, and Commission keep independent layout graphs. The approved Home read of Portfolio presentation data remains the only current exception.
6. A component stays local until at least three independent consumers need the same stable contract. Promotion to Core requires focused tests and removal of domain terminology.

## Review checklist

- Who owns API changes and regressions?
- Is the import direction Core → Domain-free and Domain → Core?
- Does a cross-domain dependency represent a real product relationship or misplaced generic infrastructure?
- Are accessibility, performance, tests, and operational behavior covered by the owner?
- Would a future maintainer find the component by purpose rather than by an `atom`, `molecule`, or `organism` label?
