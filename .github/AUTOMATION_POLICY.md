# Moticos Automation Policy

Status: governing repository policy

This is a public, zero-spend repository. Standard GitHub-hosted runners may be used for implementation and verification because public-repository usage does not consume the owner's private-repository Actions allowance. This does not authorize paid larger runners, paid external services, or any spending.

## Workflow requirements

1. Use the smallest standard Linux runner that can perform the job.
2. Set realistic timeouts and concurrency cancellation.
3. Avoid duplicate installation, build, browser, or screenshot work.
4. Inspect failed logs before rerunning.
5. Keep artifacts only as long as needed for inspection.
6. Workflows must not merge, publish, deploy, or alter external state unless that action has separate explicit authorization.
7. Grant the minimum GitHub token permissions required.

## Visual testing authority

Moticos is a visual game for Cynthia, not a VoiceOver product for the owner. Automated browser interaction and screenshots at desktop and mobile sizes are required before the owner is asked to involve Cynthia. The agent must inspect the screenshots and report visual defects rather than asking the blind owner to perform visual quality assurance.

## Current workflow purpose

The quality workflow may install dependencies, run deterministic game-logic tests, build the production bundle, exercise drag-and-drop behavior in Chromium, and retain short-lived screenshots and failure traces for review.
