# Repository Preflight

Use this checklist before every substantial Moticos implementation, repair, review, workflow, publication, or deployment assignment.

## 1. Establish authority

- Confirm the repository is `BlindAnatomist/moticos-for-cynthia`.
- Record the active branch and exact starting commit.
- Identify any open pull request governing the work.
- Read `AGENTS.md`.
- Read `docs/implementation-status.md`.
- Read relevant entries in `docs/KNOWN_PROBLEMS_AND_PROVEN_SOLUTIONS.md`.

## 2. Bound the assignment

State:

- requested outcome;
- likely files or behavior to change;
- what is outside scope;
- accepted behavior to preserve;
- whether merge, publication, or deployment is authorized;
- exact stop condition.

## 3. Protect the public boundary

Before committing content, verify that it contains no secret, credential, private correspondence, private personal information, or unauthorized asset.

## 4. Inspect before changing

- Examine the current implementation.
- Reproduce or verify the reported defect when practical.
- Search the proven-solutions register for the same mechanism.
- Identify deterministic logic that can be extracted and tested independently.

## 5. Define verification

Use the minimum complete evidence appropriate to the change:

- deterministic game-logic tests;
- production build;
- desktop Chromium interaction tests;
- mobile-sized Chromium interaction tests;
- screenshot capture and direct visual inspection;
- touch, mouse, animation, sound, download, and responsive checks where relevant;
- Cynthia play testing only after agent-operated evidence is exhausted.

The owner must not be used as the visual tester.

## 6. Use automation deliberately

Because this is a public repository, standard GitHub-hosted runners may be used. Even so:

- avoid duplicate work and unnecessary reruns;
- inspect failed logs before rerunning;
- use realistic timeouts and concurrency cancellation;
- keep artifacts briefly;
- do not select paid runners or services;
- do not let workflows merge, publish, or deploy without separate authorization.

## 7. Change methods when the method is the failure

After two failures with the same mechanism for the same confirmed reason:

1. stop that mechanism;
2. preserve completed state;
3. identify the remaining gate;
4. explain why the method failed;
5. choose a materially different route;
6. define the new stop condition.

## 8. Maintain owner visibility

During multi-step work, report the completed state, active gate, blocker if any, and next consequential action.

## 9. Close with evidence

Before declaring completion:

- confirm final branch and commit;
- inspect all changed files;
- record tests, build, browser, and screenshot results;
- identify any Actions run or deployment;
- state what remains unverified;
- identify the next bounded step and whether Cynthia is needed.
