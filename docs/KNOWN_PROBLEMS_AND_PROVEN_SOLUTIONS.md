# Known Problems and Proven Solutions

This is the consolidated operational memory for Moticos.

Record a problem only after it has occurred and its cause or solution has evidence. Do not import unrelated incidents from other repositories.

## Repository-wide proven standards

### Change method after two confirmed failures

When the same connector, transfer path, command, workflow, or deployment mechanism fails twice for the same established reason, stop repeating it and choose a materially different route.

### Visual interaction failures are geometry and state failures

For drag-and-drop defects, inspect the actual target geometry, pointer capture, animation state, responsive dimensions, and delayed state transitions. Do not patch only the visible symptom.

The blind owner must not be asked to validate visual alignment or appearance that can be inspected through screenshots and browser tooling.

## Current incidents under first-playable verification

The supplied source exposed two concrete mechanisms before browser execution:

1. Drop targeting and flight centers were calculated by dividing the outer board rectangle into six equal bands, ignoring grid padding and gaps. This could select or animate toward the wrong cell near boundaries.
2. A board containing one tile from each of the eight tiers had no possible merge. Because matching tiles may merge from anywhere, shuffling positions could not restore a move.

These will be promoted to proven incident entries after the repaired implementation passes automated and browser verification.

## Incident entry template

### MOT-000 — Concise problem name

Status: `investigating`, `proven`, `failed-do-not-repeat`, or `superseded`

First observed: YYYY-MM-DD

Affected area:

#### Symptoms

Describe what the player, test, workflow, or hosted environment actually did.

#### Cause

State the established mechanism and distinguish evidence from inference.

#### Failed approaches

Record attempted approaches that failed or should not be repeated.

#### Proven solution

Describe the exact solution that worked, including files, commits, tests, screenshots, or acceptance evidence.

#### Prevention rule

State the reusable rule.

#### Scope

State whether the rule is component-specific, repository-wide, or a candidate for use elsewhere.
