import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  Gift,
  RotateCcw,
  Scissors,
  Share2,
  Undo2,
  Volume2,
  VolumeX,
} from "lucide-react";
import CollageGallery from "./CollageGallery.jsx";
import MoticoArrival from "./MoticoArrival.jsx";
import MoticosBoard from "./MoticosBoard.jsx";
import TileArtwork from "./TileArtwork.jsx";
import {
  createFoundTile,
  createResidue,
  makeSeededRng,
  titleForTile,
} from "./collageArt.js";
import renderPostcardImage, {
  downloadPostcard,
  sharePostcard,
} from "./exportPostcard.js";
import {
  CELLS,
  MAX_TIER,
  MODE_FOUND,
  MODE_SCRAPS,
  addScheduledDiscovery,
  canCut,
  initialBoard,
  resolveCut,
  resolveMerge,
} from "./gameLogic.js";
import {
  FIBER,
  FLIGHT_MS,
  POSTCARD_MIN_TIER,
  SHAPES,
  TIERS,
  btnBase,
  clipPathOf,
} from "./moticosConstants.js";
import useMoticosAudio from "./useMoticosAudio.js";
import "./moticos.css";
import "./foundComposition.css";

const emptyResidue = () => Array(CELLS).fill(null);
const CORRESPONDENCE_INTERVAL = 6;

function routeDescription(mode) {
  return mode === MODE_SCRAPS
    ? "Begin with individual Clips. Earn seven found pieces while building the history yourself."
    : "Begin inside an inherited composition. Merge matching histories until one Moticos remains.";
}

export default function MoticosMerge() {
  const galleryMode = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("gallery");
  const progressionTiles = useMemo(
    () => TIERS.map((_, tier) => createFoundTile(tier, makeSeededRng(7200 + tier * 97))),
    []
  );

  const [mode, setMode] = useState(MODE_FOUND);
  const [board, setBoard] = useState(() => initialBoard(Math.random, MODE_FOUND));
  const [residue, setResidue] = useState(emptyResidue);
  const [score, setScore] = useState(0);
  const [merges, setMerges] = useState(0);
  const [highest, setHighest] = useState(-1);
  const [pasteIdx, setPasteIdx] = useState(null);
  const [spawnIdx, setSpawnIdx] = useState(null);
  const [bursts, setBursts] = useState([]);
  const [recordFlash, setRecordFlash] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [cutsLeft, setCutsLeft] = useState(3);
  const [keepsakes, setKeepsakes] = useState(0);
  const [keepsakeArmed, setKeepsakeArmed] = useState(false);
  const [reward, setReward] = useState(null);
  const [prevState, setPrevState] = useState(null);
  const [drag, setDrag] = useState(null);
  const [flying, setFlying] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [postcardStatus, setPostcardStatus] = useState("");
  const [arrival, setArrival] = useState(null);

  const gridRef = useRef(null);
  const cellRefs = useRef([]);
  const burstCounter = useRef(0);
  const timersRef = useRef(new Set());
  const dragRef = useRef(null);

  const {
    playPickup,
    playMerge,
    playCut,
    playReward,
    playArrival,
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

  if (galleryMode) return <CollageGallery />;

  function addBurst(index, color, big) {
    burstCounter.current += 1;
    const key = burstCounter.current;
    setBursts((current) => [...current, { key, index, color, big }]);
    schedule(() => {
      setBursts((current) => current.filter((burst) => burst.key !== key));
    }, 620);
  }

  function announceReward(message) {
    setReward(message);
    schedule(() => setReward(null), 2600);
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

  function findMagneticTarget(x, y, fromIndex) {
    const fromTier = board[fromIndex]?.tier;
    if (fromTier === undefined) return null;

    let best = null;
    board.forEach((tile, index) => {
      if (!tile || index === fromIndex || tile.tier !== fromTier) return;
      const center = cellCenter(index);
      if (!center) return;
      const distance = Math.hypot(x - center.x, y - center.y);
      const radius = Math.max(52, center.size * 0.95);
      if (distance <= radius && (!best || distance < best.distance)) {
        best = { index, center, distance, radius };
      }
    });
    return best;
  }

  const reset = useCallback((nextMode = mode) => {
    clearTimers();
    setMode(nextMode);
    setBoard(initialBoard(Math.random, nextMode));
    setResidue(emptyResidue());
    setScore(0);
    setMerges(0);
    setHighest(-1);
    setPasteIdx(null);
    setSpawnIdx(null);
    setBursts([]);
    setRecordFlash(false);
    setCutsLeft(3);
    setKeepsakes(0);
    setKeepsakeArmed(false);
    setReward(null);
    setPrevState(null);
    dragRef.current = null;
    setDrag(null);
    setFlying(null);
    setPostcardStatus("");
    setArrival(null);
  }, [clearTimers, mode]);

  function finishMerge(nextBoard, mergedIndex, discoveredIndex) {
    setBoard(nextBoard);
    setPasteIdx(mergedIndex);
    schedule(() => setPasteIdx(null), 300);
    if (discoveredIndex !== -1) {
      setSpawnIdx(discoveredIndex);
      schedule(() => setSpawnIdx(null), 520);
    }
  }

  function commitMerge(
    fromIndex,
    toIndex,
    boardSnapshot,
    residueSnapshot,
    scoreSnapshot,
    mergesSnapshot,
    highestSnapshot,
    cutsSnapshot,
    keepsakesSnapshot,
    keepsakeArmedSnapshot
  ) {
    const nextMergeCount = mergesSnapshot + 1;
    const correspondence = nextMergeCount % CORRESPONDENCE_INTERVAL === 0;
    const preserveMotifId = keepsakeArmedSnapshot
      ? boardSnapshot[fromIndex]?.focalMotifId ?? null
      : null;
    const result = resolveMerge(boardSnapshot, fromIndex, toIndex, Math.random, {
      preserveMotifId,
      correspondence,
    });
    if (!result) return;

    setPrevState({
      board: boardSnapshot.slice(),
      residue: residueSnapshot.slice(),
      score: scoreSnapshot,
      merges: mergesSnapshot,
      highest: highestSnapshot,
      cutsLeft: cutsSnapshot,
      keepsakes: keepsakesSnapshot,
      keepsakeArmed: keepsakeArmedSnapshot,
    });

    const nextResidue = residueSnapshot.slice();
    nextResidue[fromIndex] = createResidue(result.fromTile);
    setResidue(nextResidue);

    let nextBoard = result.board;
    let discoveredIndex = -1;
    let discoveredTier = null;
    const discovery = addScheduledDiscovery(nextBoard, mode, nextMergeCount);
    if (discovery) {
      nextBoard = discovery.board;
      discoveredIndex = discovery.index;
      discoveredTier = discovery.tier;
    }

    if (result.bonus) {
      addBurst(toIndex, "#D9A441", true);
      addBurst(fromIndex, "#D9A441", true);
      playReward();
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
      playMerge();
      if (result.newTier === MAX_TIER) {
        setArrival(result.mergedTile);
        playArrival();
      }
    }

    let nextKeepsakes = keepsakesSnapshot;
    const rewardMessages = [];
    if (keepsakeArmedSnapshot) {
      nextKeepsakes = Math.max(0, nextKeepsakes - 1);
      rewardMessages.push("Keepsake preserved");
    }
    if (correspondence) {
      nextKeepsakes += 1;
      rewardMessages.push("Correspondence found: Keepsake earned");
      playReward();
    }
    if (discoveredTier !== null) {
      rewardMessages.push(`Found piece discovered: ${TIERS[discoveredTier].name}`);
      playReward();
    }
    if (rewardMessages.length) announceReward(rewardMessages.join(". "));

    const bonusScore = correspondence ? 75 : 0;
    setScore(scoreSnapshot + result.scoreDelta + bonusScore);
    setMerges(nextMergeCount);
    setHighest(
      result.newTier === null
        ? highestSnapshot
        : Math.max(highestSnapshot, result.newTier)
    );
    setKeepsakes(nextKeepsakes);
    setKeepsakeArmed(false);
    finishMerge(nextBoard, result.mergedIndex, discoveredIndex);
  }

  function setActiveDrag(next) {
  dragRef.current = next;
  setDrag(next);
}

function cancelDrag() {
  setActiveDrag(null);
}

  function handlePointerDown(event, index) {
    if (flying || !board[index]) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      return;
    }
    const center = cellCenter(index);
    if (!center) return;
    setActiveDrag({
      index,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      rawX: event.clientX,
      rawY: event.clientY,
      dragging: false,
      snapBack: false,
      size: center.size,
    });
    playPickup();
  }

  function handlePointerMove(event) {
  const current = dragRef.current;
  if (!current || current.pointerId !== event.pointerId || current.snapBack) {
    return;
  }

  const rawX = event.clientX;
  const rawY = event.clientY;
  const dx = rawX - current.startX;
  const dy = rawY - current.startY;
  const dragging = current.dragging || Math.hypot(dx, dy) > 6;
  let next;

  if (!dragging) {
    next = { ...current, rawX, rawY, x: rawX, y: rawY, dragging };
  } else {
    const magnetic = findMagneticTarget(rawX, rawY, current.index);
    if (!magnetic) {
      next = {
        ...current,
        rawX,
        rawY,
        x: rawX,
        y: rawY,
        dragging,
        magneticIndex: null,
      };
    } else {
      const closeness = 1 - magnetic.distance / magnetic.radius;
      const pull = 0.28 + closeness * 0.34;
      next = {
        ...current,
        rawX,
        rawY,
        x: rawX + (magnetic.center.x - rawX) * pull,
        y: rawY + (magnetic.center.y - rawY) * pull,
        dragging,
        magneticIndex: magnetic.index,
      };
    }
  }

  setActiveDrag(next);
}

  function handlePointerUp(event) {
  const activeDrag = dragRef.current;
  if (!activeDrag || activeDrag.pointerId !== event.pointerId) {
    cancelDrag();
    return;
  }
  if (!activeDrag.dragging) {
    cancelDrag();
    return;
  }

  const directTargetIndex = findCellAtPoint(event.clientX, event.clientY);
  const magnetic = findMagneticTarget(event.clientX, event.clientY, activeDrag.index);
  const targetIndex = magnetic?.index ?? directTargetIndex;
  const fromTier = board[activeDrag.index]?.tier;
  const valid =
    targetIndex !== -1 &&
    targetIndex !== activeDrag.index &&
    board[targetIndex]?.tier === fromTier;

  if (!valid) {
    const origin = cellCenter(activeDrag.index);
    if (!origin) {
      cancelDrag();
      return;
    }
    if (
      targetIndex !== -1 &&
      board[targetIndex] &&
      board[targetIndex].tier !== fromTier
    ) {
      playDenied();
    }
    setActiveDrag({ ...activeDrag, snapBack: true, x: origin.x, y: origin.y });
    schedule(cancelDrag, 170);
    return;
  }

  const target = cellCenter(targetIndex);
  if (!target) {
    cancelDrag();
    return;
  }

  const fromIndex = activeDrag.index;
  const boardSnapshot = board.slice();
  const residueSnapshot = residue.slice();
  const scoreSnapshot = score;
  const mergesSnapshot = merges;
  const highestSnapshot = highest;
  const cutsSnapshot = cutsLeft;
  const keepsakesSnapshot = keepsakes;
  const keepsakeArmedSnapshot = keepsakeArmed;

  setFlying({
    from: fromIndex,
    to: targetIndex,
    tile: board[fromIndex],
    x: activeDrag.x,
    y: activeDrag.y,
    size: activeDrag.size,
  });
  cancelDrag();

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
        residueSnapshot,
        scoreSnapshot,
        mergesSnapshot,
        highestSnapshot,
        cutsSnapshot,
        keepsakesSnapshot,
        keepsakeArmedSnapshot
      );
      setFlying(null);
    }, FLIGHT_MS);
  }

  function handleUndo() {
    if (!prevState || flying) return;
    setBoard(prevState.board);
    setResidue(prevState.residue);
    setScore(prevState.score);
    setMerges(prevState.merges);
    setHighest(prevState.highest);
    setCutsLeft(prevState.cutsLeft);
    setKeepsakes(prevState.keepsakes);
    setKeepsakeArmed(prevState.keepsakeArmed);
    setPasteIdx(null);
    setSpawnIdx(null);
    setBursts([]);
    setReward(null);
    setPrevState(null);
    setArrival(null);
  }

  function handleCut() {
    if (cutsLeft <= 0 || flying) return;
    const result = resolveCut(board);
    if (!result) return;

    setPrevState({
      board: board.slice(),
      residue: residue.slice(),
      score,
      merges,
      highest,
      cutsLeft,
      keepsakes,
      keepsakeArmed,
    });
    const nextResidue = residue.slice();
    nextResidue[result.targetIndex] = createResidue(result.sourceTile);
    setResidue(nextResidue);
    setBoard(result.board);
    setCutsLeft((current) => current - 1);
    setKeepsakeArmed(false);
    setSpawnIdx(result.spawnedIndex);
    schedule(() => setSpawnIdx(null), 420);
    addBurst(result.targetIndex, "#365D54", false);
    playCut();
  }

  function toggleKeepsake() {
    if (keepsakes <= 0 || flying) return;
    setKeepsakeArmed((current) => !current);
    setPostcardStatus("");
  }

  async function preparePostcard() {
    if (highest < POSTCARD_MIN_TIER || exporting) return null;
    setExporting(true);
    setPostcardStatus("Preparing postcard…");
    try {
      return await renderPostcardImage({ board, highest, score, merges });
    } finally {
      setExporting(false);
    }
  }

  async function handleDownloadPostcard() {
    try {
      const postcard = await preparePostcard();
      if (!postcard) return;
      downloadPostcard({ ...postcard, schedule });
      setPostcardStatus("Postcard downloaded. On iPhone, find it in Safari Downloads in the Files app.");
    } catch {
      setPostcardStatus("The postcard could not be downloaded.");
    }
  }

  async function handleSharePostcard() {
    try {
      const postcard = await preparePostcard();
      if (!postcard) return;
      const result = await sharePostcard(postcard);
      setPostcardStatus(
        result.shared
          ? "The iPhone share sheet opened. Choose where to send or save the postcard."
          : "Sharing is not available in this browser. Use Download postcard instead."
      );
    } catch (error) {
      setPostcardStatus(
        error?.name === "AbortError"
          ? "Sharing was canceled."
          : "The postcard could not be shared. Use Download postcard instead."
      );
    }
  }

  const interactionLocked = Boolean(flying);
  const undoDisabled = !prevState || interactionLocked;
  const cutDisabled = cutsLeft <= 0 || interactionLocked || !canCut(board);
  const keepsakeDisabled = keepsakes <= 0 || interactionLocked;
  const postcardDisabled =
    highest < POSTCARD_MIN_TIER || exporting || interactionLocked;
  const hoverIndex = drag?.magneticIndex ?? (
    drag?.dragging ? findCellAtPoint(drag.rawX ?? drag.x, drag.rawY ?? drag.y) : -1
  );

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
          <p className="mm-subtitle">{routeDescription(mode)}</p>
        </header>

        <section className="mm-route-panel" aria-label="Choose a starting route">
          <div>
            <strong>STARTING ROUTE</strong>
            <span>{mode === MODE_FOUND ? "Found Pieces" : "From Scraps"}</span>
          </div>
          <div className="mm-route-buttons">
            <button
              type="button"
              className="mm-route-button"
              aria-pressed={mode === MODE_FOUND}
              onClick={() => reset(MODE_FOUND)}
            >
              <span>Found Pieces</span>
              <small>24 merges</small>
            </button>
            <button
              type="button"
              className="mm-route-button"
              aria-pressed={mode === MODE_SCRAPS}
              onClick={() => reset(MODE_SCRAPS)}
            >
              <span>From Scraps</span>
              <small>31 merges</small>
            </button>
          </div>
        </section>

        <section aria-label="Game score" className="mm-scoreboard">
          <div>
            HIGHEST MADE
            <br />
            <strong
              data-testid="highest"
              className={`mm-stat-highest${recordFlash ? " flash" : ""}`}
            >
              {highest < 0 ? "—" : TIERS[highest].name}
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

        {reward && <div className="mm-reward" role="status"><Gift size={16} /> {reward}</div>}
        {keepsakeArmed && (
          <div className="mm-keepsake-instruction" role="status">
            Keepsake armed: the focal fragment of the piece you drag will survive the next merge.
          </div>
        )}

        <MoticosBoard
          board={board}
          residue={residue}
          gridRef={gridRef}
          cellRefs={cellRefs}
          drag={drag}
          flying={flying}
          pasteIdx={pasteIdx}
          spawnIdx={spawnIdx}
          bursts={bursts}
          hoverIndex={hoverIndex}
          matchTier={drag?.dragging ? board[drag.index]?.tier ?? null : null}
          keepsakeArmed={keepsakeArmed}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={cancelDrag}
        />

        <div className="mm-controls">
          <button
            type="button"
            onClick={() => reset(mode)}
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
            onClick={handleCut}
            className="mm-btn"
            style={btnBase(cutDisabled)}
            disabled={cutDisabled}
            title="Cut the highest piece into two altered descendants"
          >
            <Scissors size={14} /> Cut ({cutsLeft})
          </button>
          <button
            type="button"
            onClick={toggleKeepsake}
            className="mm-btn"
            style={btnBase(keepsakeDisabled, keepsakeArmed)}
            disabled={keepsakeDisabled}
            aria-pressed={keepsakeArmed}
            title="Preserve the dragged piece's focal fragment in the next merge"
          >
            <Gift size={14} /> Keepsake ({keepsakes})
          </button>
          <button
            type="button"
            onClick={handleSharePostcard}
            className="mm-btn"
            style={btnBase(postcardDisabled)}
            disabled={postcardDisabled}
          >
            <Share2 size={14} /> {exporting ? "Preparing…" : "Share postcard"}
          </button>
          <button
            type="button"
            onClick={handleDownloadPostcard}
            className="mm-btn"
            style={btnBase(postcardDisabled)}
            disabled={postcardDisabled}
          >
            <Download size={14} /> {exporting ? "Preparing…" : "Download postcard"}
          </button>
        </div>
        {postcardStatus && <p className="mm-postcard-status" role="status">{postcardStatus}</p>}

        <section className="mm-progression" aria-label="Path to Moticos">
          <div className="mm-progression-title">PATH TO MOTICOS</div>
          <p className="mm-progression-copy">Each stage reorganizes what came before. Found pieces are inherited; made pieces are yours.</p>
          <div className="mm-progression-grid">
            {TIERS.map((tier, index) => {
              const made = index <= highest;
              const found = board.some((tile) => tile?.tier === index) && !made;
              const current = index === highest;
              const status = made ? "Made" : found ? "Found" : "Waiting";
              const shape = clipPathOf(SHAPES[tier.shape]);
              return (
                <article
                  key={tier.name}
                  data-progression-tier={index}
                  data-progression-status={status.toLowerCase()}
                  className={`mm-progression-card${current ? " current" : ""}${made ? " made" : found ? " found" : ""}`}
                >
                  <span className="mm-progression-number">{index + 1}</span>
                  <span className="mm-progression-art" style={{ clipPath: shape }}>
                    <TileArtwork tile={progressionTiles[index]} showLabel={false} showLineage={false} />
                  </span>
                  <strong>{tier.name}</strong>
                  <small>{status}</small>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      <MoticoArrival
        tile={arrival}
        title={arrival ? titleForTile(arrival) : ""}
        exporting={exporting}
        onClose={() => setArrival(null)}
        onDownload={handleDownloadPostcard}
        onShare={handleSharePostcard}
        postcardStatus={postcardStatus}
      />
    </main>
  );
}
