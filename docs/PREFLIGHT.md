# Repository Preflight

Use this checklist before every substantial implementation, repair, review, workflow, publication, or deployment assignment.

## 1. Establish authority

- Confirm the repository is `BlindAnatomist/monicos-for-cynthia`.
- Record the active branch and exact starting commit.
- Identify any open pull request governing the work.
- Read `AGENTS.md`.
- Read `docs/implementation-status.md`.
- Read relevant entries in `docs/KNOWN_PROBLEMS_AND_PROVEN_SOLUTIONS.md`.
- Read any phase, acceptance, or repair record named by the assignment.

## 2. Bound the assignment

State before editing:

- the requested outcome;
- the files or behavior likely to change;
- what is explicitly outside scope;
- which accepted behavior must remain unchanged;
- whether merge, publication, deployment, or external-state changes are authorized;
- the exact stop condition.

Do not infer permission for a consequential action from permission to implement or test.

## 3. Inspect before changing

- Examine the current implementation rather than assuming its structure.
- Check recent commits and pull-request changes relevant to the assignment.
- Reproduce or verify the reported problem when practical.
- Search the proven-solutions register for the same mechanism, not merely the same visible symptom.
- Identify tests that already protect the behavior.

## 4. Protect the public boundary

Before adding any content, verify that it contains no:

- secret, password, token, private key, or credential;
- private email, address, telephone number, account information, or personal record;
- copyrighted or private asset lacking authorization for public release;
- development fixture derived from private source material;
- configuration that exposes a protected service.

When uncertain, do not commit the material.

## 5. Choose the verification plan

Record the minimum evidence required for completion, as applicable:

- type checking;
- linting;
- unit or integration tests;
- production build;
- automated accessibility checks;
- GitHub Actions;
- hosted preview verification;
- real-device iPhone VoiceOver testing.

Automated checks do not substitute for VoiceOver acceptance when the behavior depends on spoken output, swipe order, focus placement, timing, or touch interaction.

## 6. Use automation deliberately

Because this repository is public, standard GitHub-hosted runners may be used when useful. Even so:

- inspect and verify locally or in the active environment first when practical;
- avoid duplicate workflows and unnecessary reruns;
- inspect failed logs before rerunning;
- use realistic timeouts and concurrency cancellation;
- do not select paid runners or paid services without explicit authorization;
- do not let a workflow merge, publish, or deploy unless that behavior is separately authorized and documented.

## 7. Change methods when the method is the failure

After two failures with the same mechanism for the same confirmed reason:

1. stop that mechanism;
2. state what is already complete;
3. identify the remaining gate;
4. explain why the method failed;
5. choose a materially different route;
6. define the new stop condition.

Do not reconstruct large files manually from overlapping fragments when a safer exact route exists.

## 8. Maintain owner visibility

During multi-step work, report:

- the current completed state;
- the active gate;
- any blocker;
- whether the present method remains viable;
- the next consequential action before taking it.

Silence must not conceal repetition, uncertainty, or a stalled method.

## 9. Close with evidence

Before declaring completion:

- confirm the final branch and commit;
- inspect the final changed files;
- record every verification result;
- identify any Actions run or deployment performed;
- state what remains unverified;
- identify the next bounded step;
- state whether the owner or Cynthia is needed for testing.
