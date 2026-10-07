#!/usr/bin/env bash
# Offline tests only. No dependency installation, server, browser or build.
set -euo pipefail
unset VITE_COLLAGE_BATCH VITE_COLLAGE_EXPANSION VITE_COLLAGE_EXPANSION_160 VITE_COLLAGE_EXPANSION_200
./node_modules/.bin/vitest run tests/gameLogic.test.js tests/collectionLogic.test.js tests/matchingLogic.test.js tests/matchingUi.test.jsx tests/matchingSession.test.js tests/expansionAudit.test.js tests/thirdEnvelopeAudit.test.js tests/boardArt.test.js tests/dialogFocus.test.js tests/albumProgress.test.js tests/fourthEnvelopeAudit.test.js tests/albumPicker.test.jsx tests/nextDiscovery.test.js tests/saveCapacity.test.js tests/cohesionOverlay.test.js
VITE_COLLAGE_EXPANSION_160=1 ./node_modules/.bin/vitest run tests/cohesion.test.js tests/expansion160.test.js tests/expansion160Storage.test.js tests/expansion160Progress.test.js
./node_modules/.bin/vitest run tests/expansion160Harness.test.js tests/expansion160Coverage.test.js tests/expansion160Png.test.js tests/expansion160Fixtures.test.js tests/expansion160VisualEvidence.test.js tests/expansion160JourneyEvidence.test.js tests/playwrightInvocation.test.js tests/currentCandidate.test.js
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -p 'test_*.py'
