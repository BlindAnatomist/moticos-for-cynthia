# Repository Instructions

This file governs all agent work in `BlindAnatomist/monicos-for-cynthia`.

## Authoritative reconstruction

Before changing the repository:

1. Confirm the exact repository, branch, starting commit, and any open pull request in scope.
2. Read `docs/PREFLIGHT.md`.
3. Read `docs/implementation-status.md`.
4. Read the relevant entries in `docs/KNOWN_PROBLEMS_AND_PROVEN_SOLUTIONS.md`.
5. Inspect the current implementation and preserve behavior already recorded as accepted unless the assignment explicitly changes it.

Do not rely on conversation history alone when the repository can establish the current state.

## Repository character

This is a public repository. Never commit secrets, credentials, access tokens, private correspondence, personal identifying information, or assets that Cynthia or the owner has not authorized for public release.

Standard GitHub-hosted Actions runners may be used when they materially support implementation, verification, or publication. This authorization does not extend to paid larger runners, paid infrastructure, paid external services, or spending of any kind without the owner's explicit approval.

## Scope and authorization

Treat each assignment as bounded.

- Do not broaden a repair into redesign, cleanup, or a new feature phase.
- Do not merge, publish, deploy, release, or alter external production state without explicit authorization for that action.
- Do not delete accepted work merely because another implementation appears cleaner.
- When instructions conflict, stop before an irreversible action and identify the conflict.

## Accessibility authority

Accessibility is part of functional correctness, not a later enhancement.

- Preserve semantic HTML and native controls whenever possible.
- Give every interactive control an accurate accessible name, role, state, and usable focus order.
- Do not duplicate long instructions inside control names when adjacent text already provides them.
- Automated accessibility checks supplement rather than replace real-device VoiceOver testing.
- Record the exact point at which owner-operated iPhone testing becomes necessary.

## Working method

- Inspect before editing.
- Use the smallest coherent change that satisfies the assignment.
- Run available relevant checks before pushing.
- Batch coherent verified changes rather than using CI as an exploratory guessing loop.
- Give the owner concise progress reports during multi-step work, including the current gate, any blocker, and the replacement method when a method fails.
- Never claim completion without repository evidence and verification results.

## Failure and transport rule

When a connector, transfer path, command, or deployment mechanism fails twice for the same confirmed reason, stop repeating that mechanism and change methods. Preserve exact source fidelity, but do not confuse fidelity with loyalty to a failed transport route.

Manual reconstruction of large files from overlapping fragments is prohibited when a safer source-preserving route exists.

## Completion record

At the end of a repository assignment, report:

- the exact branch and final commit;
- files changed;
- checks run and their results;
- Actions or deployments triggered, if any;
- anything intentionally left unchanged;
- the next bounded step and whether it requires owner testing or authorization.
