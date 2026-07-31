import Burst from "./Burst.jsx";
import ResidueMark from "./ResidueMark.jsx";
import TileArtwork from "./TileArtwork.jsx";
import { GRAIN, SHAPES, TIERS, clipPathOf } from "./moticosConstants.js";

function FloatingTile({ x, y, size, tile, snapBack = false, flying = false, keepsake = false }) {
  const tier = TIERS[tile.tier];
  return (
    <div
      className={`mm-floating-tile${snapBack ? " snap-back" : ""}${flying ? " flying" : ""}${keepsake ? " keepsake" : ""}`}
      style={{
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        clipPath: clipPathOf(SHAPES[tier.shape]),
      }}
    >
      <TileArtwork tile={tile} />
    </div>
  );
}

export default function MoticosBoard({
  board,
  residue,
  gridRef,
  cellRefs,
  drag,
  flying,
  pasteIdx,
  spawnIdx,
  bursts,
  hoverIndex,
  matchTier,
  keepsakeArmed,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}) {
  return (
    <section
      ref={gridRef}
      aria-label="Moticos board"
      className={`mm-board${keepsakeArmed ? " keepsake-armed" : ""}`}
      style={{ backgroundImage: `url("${GRAIN}")` }}
    >
      {board.map((tile, index) => {
        const tier = tile ? TIERS[tile.tier] : null;
        const isDragSource = drag?.index === index && drag.dragging;
        const isFlightSource = flying?.from === index;
        const isPossibleMatch =
          drag?.dragging && !drag.snapBack && index !== drag.index && tile?.tier === matchTier;
        const tileBursts = bursts.filter((burst) => burst.index === index);
        let dropClass = "";

        if (
          drag?.dragging &&
          !drag.snapBack &&
          hoverIndex === index &&
          index !== drag.index
        ) {
          dropClass = board[index]?.tier === board[drag.index]?.tier
            ? " drop-valid"
            : " drop-invalid";
        }

        return (
          <button
            ref={(element) => {
              cellRefs.current[index] = element;
            }}
            type="button"
            key={index}
            data-cell-index={index}
            data-tier={tile?.tier ?? "empty"}
            data-lineage={tile?.lineage ?? 0}
            data-motif-count={tile?.motifs.length ?? 0}
            data-correspondences={tile?.correspondenceCount ?? 0}
            onPointerDown={(event) => onPointerDown(event, index)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            aria-label={tier ? `${tier.name}, tier ${tile.tier + 1}, ${tile.lineage} source scraps` : "empty space"}
            disabled={!tier}
            className={`mm-tile${pasteIdx === index ? " paste" : ""}${spawnIdx === index ? " spawn" : ""}${isPossibleMatch ? " match-possible" : ""}${dropClass}`}
            style={{
              cursor: tier ? "grab" : "default",
              background: tier ? tier.canvasBg ?? tier.bg : "transparent",
              boxShadow: tier
                ? "inset 0 1px 3px rgba(0,0,0,0.22), inset 0 -2px 3px rgba(255,255,255,0.15), 0 3px 4px rgba(0,0,0,0.3)"
                : "none",
              clipPath: tier ? clipPathOf(SHAPES[tier.shape]) : "none",
              opacity: isDragSource || isFlightSource ? 0.18 : 1,
            }}
          >
            <ResidueMark residue={residue[index]} />
            {tile && <TileArtwork tile={tile} />}
            {tier?.special && <span className="mm-special-ring" />}
            {tileBursts.map((burst) => (
              <Burst
                key={burst.key}
                burstKey={burst.key}
                color={burst.color}
                big={burst.big}
              />
            ))}
          </button>
        );
      })}

      {drag && board[drag.index] && (drag.dragging || drag.snapBack) && (
        <FloatingTile
          x={drag.x}
          y={drag.y}
          size={drag.size}
          tile={board[drag.index]}
          snapBack={drag.snapBack}
          keepsake={keepsakeArmed}
        />
      )}

      {flying && (
        <FloatingTile
          x={flying.x}
          y={flying.y}
          size={flying.size}
          tile={flying.tile}
          flying
          keepsake={keepsakeArmed}
        />
      )}
    </section>
  );
}
