# Repository Instructions

This file governs all agent work in `BlindAnatomist/moticos-for-cynthia`.

The authoritative product name is `Moticos`. Repository, branch, documentation, code, and future references must preserve that spelling.

## Authoritative reconstruction

Before changing the repository:

1. Confirm the exact repository, branch, starting commit, and any open pull request in scope.
2. Read `docs/PREFLIGHT.md`.
3. Read `docs/implementation-status.md`.
4. Read relevant entries in `docs/KNOWN_PROBLEMS_AND_PROVEN_SOLUTIONS.md`.
5. Inspect the current implementation and preserve accepted behavior unless the assignment explicitly changes it.

Do not rely on conversation history alone when repository evidence is available.

## Product authority

Moticos is a visual, collage-inspired game for Cynthia. It is not being designed as a VoiceOver game for the owner.

The owner is blind. Therefore:

- Perform as much functional, browser, responsive, visual, and screenshot testing as the available tools permit before asking the owner or Cynthia to test.
- Inspect screenshots directly and describe material visual findings in words.
- Do not transfer visual quality assurance to the owner.
- Ask Cynthia to test only when automated and agent-operated testing can no longer answer a genuinely human play-experience question.

General web quality still matters: use semantic controls, visible focus, readable contrast, reduced-motion support, and robust touch and mouse interaction. These are engineering standards, not a requirement to redesign Moticos around VoiceOver.

## Public repository boundary

This is a public repository. Never commit secrets, credentials, tokens, private correspondence, personal identifying information, or assets not authorized for public release.

Standard GitHub-hosted Actions runners may be used when they materially support implementation and verification. This does not authorize paid runners, paid services, or spending.

## Scope and authorization

Treat each assignment as bounded.

- Do not broaden a repair into an unrelated redesign or feature phase.
- Do not merge, publish, deploy, release, or alter external production state without explicit authorization.
- Do not copy code from the discarded earlier experiment unless the owner explicitly supplies and authorizes that exact code.
- The fresh React source supplied by the owner is the starting design authority for the first playable.

## Working method

- Inspect before editing.
- Separate confirmed defects from optional improvements.
- Use the smallest coherent repair that makes the game reliable.
- Run deterministic logic tests, production builds, browser interaction tests, and screenshot inspection when applicable.
- Give concise progress reports during multi-step work, including the current gate and any blocker.
- Never claim completion without repository evidence and verification results.

## Failure and transport rule

When a connector, transfer path, command, workflow, or deployment mechanism fails twice for the same confirmed reason, stop repeating it and change methods.

Do not manually reconstruct large files from overlapping fragments when a safer source-preserving route exists.

## Completion record

At the end of a repository assignment, report:

- exact branch and final commit;
- files changed;
- tests, builds, browser runs, and screenshot inspections performed;
- Actions or deployments triggered;
- confirmed defects repaired;
- optional improvements still under consideration;
- whether Cynthia is needed for the next step.
