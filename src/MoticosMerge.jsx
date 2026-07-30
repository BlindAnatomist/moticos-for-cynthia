import { useCallback, useEffect, useRef, useState } from "react";
import {
  Download,
  RotateCcw,
  Shuffle as ShuffleIcon,
  Undo2,
  Volume2,
  VolumeX,
} from "lucide-react";
import MoticosBoard from "./MoticosBoard.jsx";
import exportPostcardImage from "./exportPostcard.js";
import { initialBoard, resolveMerge } from "./gameLogic.js";
import {
  FIBER,
  FLIGHT_MS,
  POSTCARD_MIN_TIER,
  SHAPES,
  TIERS,
  btnBase,
  clipPathOf,
  tileBackground,
} from "./moticosConstants.js";
import useMoticosAudio from "./useMoticosAudio.js";
import "./moticos.css";

export default function MoticosMerge() {
  const [board, setBoard] = useState(() => initialBoard());
  const [score, setScore] = useState(0);
  const [merges, setMerges] = useState(0);
  const [highest, setHighest] = useState(0);
  const [pasteIdx, setPasteIdx] = useState(null);
  const [spawnIdx, setSpawnIdx] = useState(null);
  const [bursts, setBursts] = useState([]);
  const [recordFlash, setRecordFlash] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [shufflesLeft, setShufflesLeft] = useState(3);
  const [prevState, setPrevState] = useState(null);
  const [drag, setDrag] = useState(null);
  const [flying, setFlying] = useState(null);
  const [exporting, setExporting] = useState(false);

  const gridRef = useRef(null);
  const cellRefs = useRef([]);
  const burstCounter = useRef(0);
  const timersRef = useRef(new Set());

  const {
    playPickup,
    playPaste,
    playTear,
    playBonus,
    playDenied,
    playEnabledCue,
  } = useMoticosAudio(soundOn);

  const schedule = useCallback((callback, delay) => {
    const timer = window.setTimeout(() => {
      timersRef.current.delete(timer);
      callback();
    }, delay);
    timersRef.current.add(timer);
    return timer;
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current.clear();
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  function addBurst(index, color, big) {
    burstCounter.current += 1;
    const key = burstCounter.current;
    setBursts((current) => [...current, { key, index, color, big }]);
    schedule(() => {
      setBursts((current) => current.filter((burst) => burst.key !== key));
    }, 620);
  }

  function findCellAtPoint(x, y) {
    const target = document.elementFromPoint(x, y);
    const cell = target?.closest?.("[data-cell-index]");
    if (!cell || !gridRef.current?.contains(cell)) return -1;
    const index = Number(cell.dataset.cellIndex);
    return Number.isInteger(index) ? index : -1;
  }

  function cellCenter(index) {
    const cell = cellRefs.current[index];
    if (!cell) return null;
    const rect = cell.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      size: Math.min(rect.width, rect.height),
    };
  }

  const reset = useCallback(() => {
    clearTimers();
    setBoard(initialBoard());
    setScore(0);
    setMerges(0);
    setHighest(0);
    setPasteIdx(null);
    setSpawnIdx(null);
    setBursts([]);
    setRecordFlash(false);
    setShufflesLeft(3);
    setPrevState(null);
    setDrag(null);
    setFlying(null);
  }, [clearTimers]);

  function finishMerge(nextBoard, mergedIndex, spawnedIndex) {
    setBoard(nextBoard);
    setPasteIdx(mergedIndex);
    schedule(() => setPasteIdx(null), 300);
    if (spawnedIndex !== -1) {
      setSpawnIdx(spawnedIndex);
      schedule(() => setSpawnIdx(null), 360);
    }
  }

  function commitMerge(
    fromIndex,
    toIndex,
    boardSnapshot,
    scoreSnapshot,
    mergesSnapshot,
    highestSnapshot
  ) {
    const result = resolveMerge(boardSnapshot, fromIndex, toIndex);
    if (!result) return;

    setPrevState({
      board: boardSnapshot.slice(),
      score: scoreSnapshot,
      merges: mergesSnapshot,
      highest: highestSnapshot,
    });

    if (result.bonus) {
      addBurst(toIndex, "#D9A441", true);
      addBurst(fromIndex, "#D9A441", true);
      playBonus();
    } else {
      if (result.newTier > highestSnapshot) {
        setRecordFlash(true);
        schedule(() => setRecordFlash(false), 700);
      }
      addBurst(
        toIndex,
        TIERS[result.newTier].special ? "#D9A441" : TIERS[result.newTier].bg,
        false
      );
      playPaste();
    }

    setScore(scoreSnapshot + result.scoreDelta);
    setMerges(mergesSnapshot + 1);
    setHighest(
      result.newTier === null
        ? highestSnapshot
        : Math.max(highestSnapshot, result.newTier)
    );
    finishMerge(result.board, result.mergedIndex, result.spawnedIndex);
  }

  function handlePointerDown(event, index) {
    if (flying || board[index] === null) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      return;
    }
    const center = cellCenter(index);
    if (!center) return;
    setDrag({
      index,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      dragging: false,
      snapBack: false,
      size: center.size,
    });
    playPickup();
  }

  function handlePointerMove(event) {
    setDrag((current) => {
      if (!current || current.pointerId !== event.pointerId || current.snapBack) {
        return current;
      }
      const dx = event.clientX - current.startX;
      const dy = event.clientY - current.startY;
      return {
        ...current,
        x: event.clientX,
        y: event.clientY,
        dragging: current.dragging || Math.hypot(dx, dy) > 6,
      };
    });
  }

  function handlePointerUp(event) {
    if (!drag || drag.pointerId !== event.pointerId) {
      setDrag(null);
      return;
    }
    if (!drag.dragging) {
      setDrag(null);
      return;
    }

    const targetIndex = findCellAtPoint(event.clientX, event.clientY);
    const fromTier = board[drag.index];
    const valid =
      targetIndex !== -1 &&
      targetIndex !== drag.index &&
      board[targetIndex] === fromTier;

    if (!valid) {
      const origin = cellCenter(drag.index);
      if (!origin) {
        setDrag(null);
        return;
      }
      if (
        targetIndex !== -1 &&
        board[targetIndex] !== null &&
        board[targetIndex] !== fromTier
      ) {
        playDenied();
      }
      setDrag({ ...drag, snapBack: true, x: origin.x, y: origin.y });
      schedule(() => setDrag(null), 170);
      return;
    }

    const target = cellCenter(targetIndex);
    if (!target) {
      setDrag(null);
      return;
    }

    const fromIndex = drag.index;
    const boardSnapshot = board.slice();
    const scoreSnapshot = score;
    const mergesSnapshot = merges;
    const highestSnapshot = highest;

    setFlying({
      from: fromIndex,
      to: targetIndex,
      tier: fromTier,
      x: drag.x,
      y: drag.y,
      size: drag.size,
    });
    setDrag(null);

    requestAnimationFrame(() => {
      setFlying((current) =>
        current ? { ...current, x: target.x, y: target.y } : current
      );
    });

    schedule(() => {
      commitMerge(
        fromIndex,
        targetIndex,
        boardSnapshot,
        scoreSnapshot,
        mergesSnapshot,
        highestSnapshot
      );
      setFlying(null);
    }, FLIGHT_MS);
  }

  function handleUndo() {
    if (!prevState || flying) return;
    setBoard(prevState.board);
    setScore(prevState.score);
    setMerges(prevState.merges);
    setHighest(prevState.highest);
    setPasteIdx(null);
    setSpawnIdx(null);
    setBursts([]);
    setPrevState(null);
  }

  function handleShuffle() {
    if (shufflesLeft <= 0 || flying) return;
    const occupiedIndices = [];
    const values = [];
    board.forEach((value, index) => {
      if (value !== null) {
        occupiedIndices.push(index);
        values.push(value);
      }
    });
    if (values.length < 2) return;
    for (let index = values.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
    }
    const next = board.slice();
    occupiedIndices.forEach((boardIndex, valueIndex) => {
      next[boardIndex] = values[valueIndex];
    });
    setBoard(next);
    setShufflesLeft((current) => current - 1);
    setPrevState(null);
    playTear();
  }

  async function handlePostcard() {
    if (highest < POSTCARD_MIN_TIER || exporting || flying) return;
    setExporting(true);
    try {
      await exportPostcardImage({ board, highest, score, merges, schedule });
    } finally {
      setExporting(false);
    }
  }

  let hoverIndex = -1;
  if (drag?.dragging && !drag.snapBack) {
    hoverIndex = findCellAtPoint(drag.x, drag.y);
  }

  const interactionLocked = Boolean(flying);
  const undoDisabled = !prevState || interactionLocked;
  const shuffleDisabled = shufflesLeft <= 0 || interactionLocked;
  const postcardDisabled =
    highest < POSTCARD_MIN_TIER || exporting || interactionLocked;

  return (
    <main
      className="mm-page"
      style={{
        background: `url("${FIBER}") repeat, radial-gradient(ellipse at 50% -10%, #F1E9D4, #E4DAC0 55%, #DCD0B2 100%)`,
      }}
    >
      <div className="mm-shell">
        <header className="mm-header">
          <button
            type="button"
            onClick={() => {
              setSoundOn((current) => {
                const next = !current;
                if (next) playEnabledCue();
                return next;
              });
            }}
            className="mm-mute"
            aria-label={soundOn ? "Mute sound effects" : "Unmute sound effects"}
          >
            {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <h1 className="mm-title">MOTICOS</h1>
          <p className="mm-subtitle">Drag a clipping onto its match to merge them.</p>
        </header>

        <section aria-label="Game score" className="mm-scoreboard">
          <div>
            HIGHEST
            <br />
            <strong
              data-testid="highest"
              className={`mm-stat-highest${recordFlash ? " flash" : ""}`}
            >
              {TIERS[highest].name}
            </strong>
          </div>
          <div>
            MERGES
            <br />
            <strong data-testid="merges">{merges}</strong>
          </div>
          <div>
            SCORE
            <br />
            <strong data-testid="score">{score}</strong>
          </div>
        </section>

        <MoticosBoard
          board={board}
          gridRef={gridRef}
          cellRefs={cellRefs}
          drag={drag}
          flying={flying}
          pasteIdx={pasteIdx}
          spawnIdx={spawnIdx}
          bursts={bursts}
          hoverIndex={hoverIndex}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => setDrag(null)}
        />

        <div className="mm-controls">
          <button
            type="button"
            onClick={reset}
            className="mm-btn"
            style={btnBase(interactionLocked)}
            disabled={interactionLocked}
          >
            <RotateCcw size={14} /> New board
          </button>
          <button
            type="button"
            onClick={handleUndo}
            className="mm-btn"
            style={btnBase(undoDisabled)}
            disabled={undoDisabled}
          >
            <Undo2 size={14} /> Undo
          </button>
          <button
            type="button"
            onClick={handleShuffle}
            className="mm-btn"
            style={btnBase(shuffleDisabled)}
            disabled={shuffleDisabled}
          >
            <ShuffleIcon size={14} /> Shuffle ({shufflesLeft})
          </button>
          <button
            type="button"
            onClick={handlePostcard}
            className="mm-btn"
            style={btnBase(postcardDisabled)}
            disabled={postcardDisabled}
            title={
              highest < POSTCARD_MIN_TIER
                ? `Reach ${TIERS[POSTCARD_MIN_TIER].name} tier to unlock`
                : "Save a postcard of this board"
            }
          >
            <Download size={14} /> {exporting ? "Saving…" : "Save postcard"}
          </button>
        </div>

        <section className="mm-progression" aria-label="Tier progression">
          <div className="mm-progression-title">THE PROGRESSION</div>
          <div className="mm-progression-row">
            {TIERS.map((tier, index) => {
              const unlocked = index <= highest;
              const shape = clipPathOf(SHAPES[tier.shape]);
              return (
                <div
                  key={tier.name}
                  title={tier.name}
                  aria-label={tier.name}
                  className="mm-progression-swatch"
                  style={{
                    clipPath: shape,
                    opacity: unlocked ? 1 : 0.35,
                    background: unlocked ? "#221F1D" : "transparent",
                  }}
                >
                  <span
                    className="mm-progression-swatch-fill"
                    style={{
                      inset: unlocked ? 2 : 0,
                      background: tileBackground(tier),
                      clipPath: shape,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
