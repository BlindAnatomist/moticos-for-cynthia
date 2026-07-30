import Burst from "./Burst.jsx";
import { GRAIN, SHAPES, TIERS, clipPathOf, labelSize, tileBackground } from "./moticosConstants.js";

function FloatingTile({ x, y, size, tierIndex, snapBack = false, flying = false }) {
  const tier = TIERS[tierIndex];
  return (
    <div
      className={`mm-floating-tile${snapBack ? " snap-back" : ""}${flying ? " flying" : ""}`}
      style={{
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        background: tileBackground(tier),
        clipPath: clipPathOf(SHAPES[tier.shape]),
      }}
    >
      <span style={{ fontSize: labelSize(tier.name), color: tier.ink }}>
        {tier.name}
      </span>
    </div>
  );
}

export default function MoticosBoard({
  board,
  gridRef,
  cellRefs,
  drag,
  flying,
  pasteIdx,
  spawnIdx,
  bursts,
  hoverIndex,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}) {
  return (
    <section
      ref={gridRef}
      aria-label="Moticos board"
      className="mm-board"
      style={{ backgroundImage: `url("${GRAIN}")` }}
    >
      {board.map((value, index) => {
        const tier = value === null ? null : TIERS[value];
        const isDragSource = drag?.index === index && drag.dragging;
        const isFlightSource = flying?.from === index;
        const tileBursts = bursts.filter((burst) => burst.index === index);
        let dropClass = "";

        if (
          drag?.dragging &&
          !drag.snapBack &&
          hoverIndex === index &&
          index !== drag.index
        ) {
          dropClass = board[index] === board[drag.index]
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
            data-tier={value ?? "empty"}
            onPointerDown={(event) => onPointerDown(event, index)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            aria-label={tier ? `${tier.name}, tier ${value + 1}` : "empty space"}
            disabled={!tier}
            className={`mm-tile${pasteIdx === index ? " paste" : ""}${spawnIdx === index ? " spawn" : ""}${dropClass}`}
            style={{
              cursor: tier ? "grab" : "default",
              background: tier ? tileBackground(tier) : "transparent",
              boxShadow: tier
                ? "inset 0 1px 3px rgba(0,0,0,0.22), inset 0 -2px 3px rgba(255,255,255,0.15), 0 3px 4px rgba(0,0,0,0.3)"
                : "none",
              clipPath: tier ? clipPathOf(SHAPES[tier.shape]) : "none",
              opacity: isDragSource || isFlightSource ? 0.18 : 1,
            }}
          >
            {tier && (
              <span
                className="mm-tile-label"
                style={{
                  fontSize: `clamp(7px, 2.25vw, ${labelSize(tier.name)}px)`,
                  color: tier.ink,
                }}
              >
                {tier.name}
              </span>
            )}
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

      {drag && board[drag.index] !== null && (drag.dragging || drag.snapBack) && (
        <FloatingTile
          x={drag.x}
          y={drag.y}
          size={drag.size}
          tierIndex={board[drag.index]}
          snapBack={drag.snapBack}
        />
      )}

      {flying && (
        <FloatingTile
          x={flying.x}
          y={flying.y}
          size={flying.size}
          tierIndex={flying.tier}
          flying
        />
      )}
    </section>
  );
}
