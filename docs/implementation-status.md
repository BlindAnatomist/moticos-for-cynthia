# Implementation Status

Repository: `BlindAnatomist/monicos-for-cynthia`

Visibility: public

Default branch: `main`

Status date: 2026-07-29

## Project identity

Monicos for Cynthia is an independent game project. It must remain separate from Val Music Vault, Guitar Eyes, and the earlier experimental placement of the game inside another repository.

The game concept, technical stack, rules, interface, hosting path, and acceptance criteria have not yet been formally established in this repository.

## Current accepted state

The repository has been created publicly under the accepted name:

`monicos-for-cynthia`

The initial governance foundation consists of:

- `AGENTS.md`
- `docs/PREFLIGHT.md`
- `docs/KNOWN_PROBLEMS_AND_PROVEN_SOLUTIONS.md`
- `docs/implementation-status.md`

These files establish repository-specific operating discipline without importing the Music Vault's private-data, backend-production, or private-repository Actions constraints.

## Automation position

Standard GitHub-hosted Actions runners may be used for this public repository when they materially support development, verification, preview publication, or release preparation.

No workflow has yet been created because the application stack and required checks have not yet been selected. Before adding a workflow, define:

- the application stack and package manager;
- installation command;
- type-checking command, if applicable;
- lint command;
- test command;
- production-build command;
- automated accessibility checks;
- preview or publication mechanism;
- permissions, concurrency, timeout, and artifact-retention requirements.

Paid runners, paid infrastructure, and paid external services remain unauthorized unless the owner explicitly approves them.

## Accessibility position

Accessibility is a core design requirement from the first implementation.

The eventual game must be designed for reliable VoiceOver operation on the owner's iPhone, including:

- concise and accurate control names;
- logical swipe and focus order;
- state changes announced without excessive repetition;
- instructions separated from control identity;
- recoverable validation and error handling;
- game information available without visual inference;
- no dependence on color, animation, spatial position, or timed visual recognition alone.

Automated checks will not replace real-device VoiceOver acceptance.

## Recorded incidents

No Monicos-specific implementation incident has yet occurred.

General proven standards are recorded in `docs/KNOWN_PROBLEMS_AND_PROVEN_SOLUTIONS.md` without pretending they originated in this repository.

## Unresolved foundation decisions

Before application code is added, establish:

1. The authoritative spelling and meaning of “Monicos” within the game.
2. The game rules and win or loss conditions.
3. The intended player experience for Cynthia and any broader audience.
4. Whether the game is single-player, local shared play, or something else.
5. The initial content set and whether any content is private or copyrighted.
6. The technical stack.
7. The hosting and preview path.
8. The minimum first playable checkpoint.
9. The VoiceOver acceptance criteria for that checkpoint.

## Next bounded task

Create the project-definition brief before writing application code. That brief should establish the game concept, vocabulary, rules, accessibility model, first playable scope, technical constraints, and acceptance tests.

After the brief is accepted:

1. choose the smallest suitable technical stack;
2. add `.github/AUTOMATION_POLICY.md` tailored to that stack;
3. scaffold the application;
4. add the first quality workflow;
5. build a hosted first playable candidate;
6. stop for real-device VoiceOver testing at the defined acceptance point.

## Prohibited assumptions

Until explicitly decided, do not assume:

- that code from the earlier game experiment should be copied;
- that the earlier implementation was technically or conceptually authoritative;
- that publication or deployment is authorized;
- that Cynthia's name in the repository title authorizes publication of personal information or private assets;
- that a framework used in another repository is automatically appropriate here.
