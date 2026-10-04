# Matching garden engine

This new mode is isolated from `src/collection` and the classic game. It replaces neither implementation and never reads, migrates, or writes their saves. Starting checkout: `work/matching-progression-20261004`, `03342a2498c4e0a62a4401fca8180b696a820571`. This file documents only the matching engine; the UI, artwork inspection, browser verification, and publication have separate gates.

## The two authored journeys

| Family | Tier 1 | Tier 2 | Tier 3 | Tier 4 | Tier 5 |
| --- | --- | --- | --- | --- | --- |
| Bird | Coral Bird (`b1`) | Riverwing (`b2`) | Wayfinder (`b3`) | Aviary Gate (`b4`) | Wandering Aviary (`b5`) |
| Fern | Teal Fern (`f1`) | Fern Cup (`f2`) | Nightgarden (`f3`) | Moonlit Arbor (`f4`) | Lunar Conservatory (`f5`) |

Two identical piece IDs make one next-tier piece in that same family. The catalog is the only authority: two different pictures cannot merge, including equally ranked pictures from different families. Tier-five pieces cannot merge. There are no cross-object recipes, automatic spawns, random drops, timers, currency, or game-over states.

Each family has exactly sixteen starter-equivalent units. The tiers weigh 1, 2, 4, 8, and 16 units. Four tier-one pieces per family start on the 5×5 board; twelve more units per family are visibly available in its finite supply. A deliberate supply action adds **two identical tier-one pieces** and deducts two units. The action requires two empty cells and refuses atomically otherwise. It never consumes supply on a refused action. Thus the uncomplicated route to both finales requires thirty successful merges and twelve supply-pair taps, or forty-two board actions. Moving and experimenting can take additional actions without a penalty.

Board movement targets empty cells only. Cutting any selected tier greater than one, including a finale, creates two identical previous-tier pieces and requires an empty destination. Undo restores board, supply, counters, and instance IDs for the previous board action; its capacity is one hundred snapshots. Discoveries survive consumption, cutting, Undo, and a board reset. Reset clears the current arrangement, supply use, counters, and Undo history, while retaining discoveries and the sound choice. Its confirmation belongs to the UI. The UI can offer the tier-three artwork as an early postcard reward and upgrade it as higher art is discovered; `FINALS` identifies tier five for round completion only.

## API

`src/matching/catalog.js` exports `CATALOG`, `PIECES`, `FAMILIES`, `STARTERS`, `FINALS`, `BOARD_SIZE`, `FAMILY_MATERIAL`, `PACK_ID`, `PACK_VERSION`, `pieceOf`, `idOf`, `nextPiece`, and `nameOf`.

- `PIECES` is an immutable array; `CATALOG` is an immutable ID-keyed lookup.
- Each piece has `id`, `familyId`, `tier` (1–5), `rank` (0–4), `name`, `shortName`, `description`, `mass`, `packId`, and `art`.
- `FAMILIES` is an immutable array of records with `id`, `name`, `shortName`, `color`, `pieceIds`, `starterId`, `finalId`, and `material`.
- `nextPiece(id)` returns the next catalog object, or `null` for unknown IDs and finales. `nameOf(tile)` returns its title, or an empty string for unknown or malformed input.

`src/matching/game.js` exports `STORAGE_KEY`, `HISTORY_LIMIT`, `MAX_SAVE_BYTES`, `MAX_MOVES`, `INITIAL_POSITIONS`, `createRound`, `newSave`, `validRound`, `validSave`, `readSave`, `serializeSave`, `act`, `compatible`, `mergePairs`, and `completedFinals`. It also re-exports `BOARD_SIZE` and `nextPiece`.

Save schema:

```js
{
  version: 1,
  round: {
    board: [null /* or { pieceId: 'b1', instanceId: 1 }, exactly 25 cells */],
    supply: { bird: 12, fern: 12 }, // remaining starter units; always even
    moves: 0,
    merges: 0,
    nextInstanceId: 9
  },
  history: [], // up to 100 complete prior round snapshots
  discoveries: ['b1', 'f1'],
  sound: true
}
```

`act(save, action)` is a pure reducer: it returns a new save on success, or `null` without changing anything on an invalid/no-op action. Supported actions:

```js
{ type: 'merge', from, to }
{ type: 'move', from, to }
{ type: 'cut', index }                  // first empty destination
{ type: 'cut', index, to }              // explicitly chosen empty destination
{ type: 'supply', familyId }            // first two empty cells
{ type: 'supply', familyId, index }     // chosen first cell, then first other empty
{ type: 'supply', familyId, to }        // alias for index; do not pass both
{ type: 'undo' }
{ type: 'reset' }
{ type: 'sound', enabled: false }
```

Sound changes do not create Undo history. Merges, moves, cuts, and supply actions do. `compatible(a,b)` accepts piece-ID strings or tile records and recognizes only equal non-final IDs. `mergePairs(board)` returns unique `[from,to]` index pairs. `completedFinals(board)` returns the finale IDs currently on the board.

## Persistence and hostile/corrupt input

The sole matching storage key is `moticos.matching.garden.v1`. The engine has no browser storage side effects. `readSave(raw)` returns `{status, save, sourceRaw}`:

- `empty`: only absent input (`null` or `undefined`); no existing bytes are present.
- `loaded`: a fully valid version-one save, preserved without normalization.
- `invalid`: damaged, malformed, oversized, older, or structurally unsupported data. `save` is `null`; `sourceRaw` retains the exact supplied input.
- `unsupported`: a bounded parseable object with an own integer version newer than one. `save` is `null`; `sourceRaw` retains the original input.

**The UI must not overwrite `invalid` or `unsupported` source bytes.** Continuing in memory is possible, but writing/replacing that storage requires the UI's explicit user-directed recovery flow. An empty string is damaged data, not an absent save. `serializeSave(save)` throws rather than serializing invalid state.

Validation is intentionally strict: exact data-only object shapes and dense arrays; no inherited records, prototype-shaped IDs, extra properties, accessors, sparse arrays, unknown IDs, duplicate live instance IDs, invalid counters, odd/negative/excess supply, missing discoveries, duplicate discoveries, or discarded malformed history. Each family independently conserves sixteen units in the active round and every snapshot. Instance allocation, supply use, successful merges, and implied cuts must agree with the action counters. Consecutive history snapshots must describe an actual legal one-action transition. Higher discoveries require the lower tiers of the same family, and all pieces in active/history boards must be discovered. No corrupt fields are filtered or silently repaired.

Raw input and serialization are capped at 512 KiB (UTF-8), history at 100 rounds, moves at 1,000,000, and numeric fields at defined safe-integer bounds. These guardrails prevent unbounded parsed structures and ID/counter exhaustion. An exhausted move bound refuses additional board actions; Undo and reset remain available.

## Continuity proof

For either family, if no finale is present and no equal non-final pair exists, at most one piece of each of tiers one through four exists. Their total mass is at most 1 + 2 + 4 + 8 = 15. Since total material is sixteen, unfinished no-pair play must still have supply. With no pair across both families, there are at most eight non-final pieces, or fewer if a whole family is already represented by its finale. There is therefore room for a supplied pair. Conversely, a board with twenty-four or twenty-five occupied cells necessarily contains a non-final matching pair; merging it creates room. Supply never becomes the only possible action on a board where its pair cannot fit.

Repeatedly merge any available pair, otherwise supply an unfinished family. Supply actions strictly consume the finite supply; merges reduce board piece count. This policy terminates at both finales. Moves and cuts may deliberately lengthen play, but they cannot alter the conserved materials or destroy the existence of that completion policy. A player can also Undo or reset.

## Deterministic verification

Run `node scripts/validateMatching.mjs` for a standalone JSON report, or `npx vitest run tests/matchingLogic.test.js` for all matching unit tests. The standalone script enumerates all 116 weighted, even-supply per-family inventories, combines all 13,341 pairs that fit the 25-cell board, and verifies finite completion for each (at most 42 operations). This is a proof over conservative inventories, a superset of any actual legal play history. The same script runs 10,000 deterministic operations with seed `0x4d4f5449`, including accepted and refused merges, moves, cuts, pair supplies, Undo, reset, and 271 save/reload checks.

The unit suite additionally checks all 100 catalog pairings; both finale orders in exactly thirty merges; independent material accounting; full/one-empty-board pair-supply refusal; all cut tiers; source immutability; retained discovery; bounded Undo; strict malformed/prototype input handling; history transitions; and preservation of invalid/future raw bytes. This is engine evidence, not a browser or visual-acceptance claim.
