import { TIERS } from "./moticosConstants.js";

function transformFor(motif) {
  const centerX = motif.x + motif.width / 2;
  const centerY = motif.y + motif.height / 2;
  return `rotate(${motif.rotation} ${centerX} ${centerY})`;
}

function Silhouette({ motif }) {
  const { x, y, width, height, color, background, variant } = motif;
  const centerX = x + width / 2;
  const centerY = y + height / 2;

  if (variant === "eye") {
    return (
      <g>
        <ellipse cx={centerX} cy={centerY} rx={width / 2} ry={height / 3} fill={background} />
        <circle cx={centerX} cy={centerY} r={Math.min(width, height) / 5} fill={color} />
        <circle cx={centerX} cy={centerY} r={Math.min(width, height) / 11} fill="#F0E7D2" />
      </g>
    );
  }

  if (variant === "bird") {
    return (
      <path
        d={`M ${x} ${centerY} Q ${x + width * 0.35} ${y} ${x + width * 0.58} ${centerY}
          Q ${x + width * 0.8} ${y + height * 0.15} ${x + width} ${y + height * 0.35}
          Q ${x + width * 0.73} ${y + height * 0.48} ${x + width * 0.58} ${y + height}
          Q ${x + width * 0.35} ${y + height * 0.58} ${x} ${centerY} Z`}
        fill={color}
      />
    );
  }

  if (variant === "shoe") {
    return (
      <path
        d={`M ${x} ${y + height * 0.2} L ${x + width * 0.4} ${y + height * 0.55}
          Q ${x + width * 0.72} ${y + height * 0.65} ${x + width} ${y + height * 0.72}
          L ${x + width * 0.92} ${y + height} L ${x + width * 0.1} ${y + height * 0.92} Z`}
        fill={color}
      />
    );
  }

  if (variant === "profile") {
    return (
      <path
        d={`M ${x + width * 0.22} ${y + height}
          Q ${x + width * 0.04} ${y + height * 0.58} ${x + width * 0.28} ${y + height * 0.13}
          Q ${x + width * 0.55} ${y - height * 0.02} ${x + width * 0.68} ${y + height * 0.25}
          L ${x + width} ${y + height * 0.4} L ${x + width * 0.68} ${y + height * 0.53}
          Q ${x + width * 0.61} ${y + height * 0.9} ${x + width * 0.22} ${y + height} Z`}
        fill={color}
      />
    );
  }

  if (variant === "flower") {
    return (
      <g fill={color}>
        {[0, 72, 144, 216, 288].map((angle) => {
          const radians = (angle * Math.PI) / 180;
          return (
            <circle
              key={angle}
              cx={centerX + Math.cos(radians) * width * 0.24}
              cy={centerY + Math.sin(radians) * height * 0.24}
              r={Math.min(width, height) * 0.18}
            />
          );
        })}
        <circle cx={centerX} cy={centerY} r={Math.min(width, height) * 0.15} fill={background} />
      </g>
    );
  }

  if (variant === "machine") {
    return (
      <g>
        <rect x={x} y={y + height * 0.18} width={width} height={height * 0.64} rx="2" fill={background} />
        <circle cx={x + width * 0.28} cy={centerY} r={height * 0.18} fill={color} />
        <circle cx={x + width * 0.72} cy={centerY} r={height * 0.18} fill={color} />
        <path d={`M ${x + width * 0.38} ${centerY} L ${x + width * 0.62} ${centerY}`} stroke={color} strokeWidth="3" />
      </g>
    );
  }

  return (
    <path
      d={`M ${x} ${y + height * 0.82} C ${x + width * 0.2} ${y + height * 0.2},
        ${x + width * 0.4} ${y + height * 1.05}, ${x + width * 0.6} ${y + height * 0.25}
        S ${x + width * 0.9} ${y + height * 0.7}, ${x + width} ${y}`}
      fill="none"
      stroke={color}
      strokeWidth="4"
      strokeLinecap="round"
    />
  );
}

function Glyph({ motif }) {
  const { x, y, width, height, color, variant } = motif;
  const paths = [
    `M ${x} ${y + height} L ${x + width * 0.34} ${y} L ${x + width * 0.58} ${y + height} L ${x + width} ${y + height * 0.18}`,
    `M ${x} ${y + height * 0.45} C ${x + width * 0.18} ${y}, ${x + width * 0.52} ${y + height}, ${x + width} ${y + height * 0.2}`,
    `M ${x} ${y} L ${x + width} ${y + height} M ${x + width} ${y} L ${x} ${y + height}`,
    `M ${x} ${y + height * 0.8} Q ${x + width * 0.5} ${y - height * 0.1} ${x + width} ${y + height * 0.8} Q ${x + width * 0.5} ${y + height * 1.1} ${x} ${y + height * 0.8}`,
  ];
  return (
    <path
      d={paths[variant % paths.length]}
      fill="none"
      stroke={color}
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

function Motif({ motif }) {
  const transform = transformFor(motif);
  const common = { opacity: motif.opacity, transform };

  if (motif.kind === "word") {
    return (
      <g {...common}>
        <rect x={motif.x - 2} y={motif.y - 2} width={motif.width + 4} height={motif.height + 4} fill={motif.background} />
        <text
          x={motif.x + motif.width / 2}
          y={motif.y + motif.height * 0.72}
          textAnchor="middle"
          fill={motif.color}
          fontFamily="Georgia, serif"
          fontSize={Math.max(8, motif.height * 0.62)}
          fontWeight={motif.weight}
          letterSpacing="0.4"
        >
          {motif.text}
        </text>
      </g>
    );
  }

  if (motif.kind === "number") {
    return (
      <text
        {...common}
        x={motif.x + motif.width / 2}
        y={motif.y + motif.height * 0.8}
        textAnchor="middle"
        fill={motif.color}
        fontFamily="'Special Elite', monospace"
        fontSize={Math.max(13, motif.height)}
        fontWeight="700"
      >
        {motif.text}
      </text>
    );
  }

  if (motif.kind === "stripe") {
    return (
      <g {...common}>
        <rect x={motif.x} y={motif.y} width={motif.width} height={motif.height} fill={motif.background} />
        <path
          d={`M ${motif.x - 4} ${motif.y + motif.height} L ${motif.x + motif.width * 0.35} ${motif.y}
            M ${motif.x + motif.width * 0.2} ${motif.y + motif.height} L ${motif.x + motif.width * 0.62} ${motif.y}
            M ${motif.x + motif.width * 0.52} ${motif.y + motif.height} L ${motif.x + motif.width} ${motif.y}`}
          stroke={motif.color}
          strokeWidth="5"
        />
      </g>
    );
  }

  if (motif.kind === "tape") {
    return (
      <rect
        {...common}
        x={motif.x}
        y={motif.y}
        width={motif.width}
        height={Math.max(8, motif.height * 0.42)}
        fill="#F2D98D"
        stroke="#8F7A43"
        strokeWidth="0.8"
        opacity={0.52}
      />
    );
  }

  if (motif.kind === "stamp") {
    const cx = motif.x + motif.width / 2;
    const cy = motif.y + motif.height / 2;
    const radius = Math.min(motif.width, motif.height) / 2;
    return (
      <g {...common} fill="none" stroke={motif.color} strokeWidth="2.2">
        <circle cx={cx} cy={cy} r={radius} />
        <circle cx={cx} cy={cy} r={radius * 0.73} />
        <path d={`M ${cx - radius * 0.7} ${cy} L ${cx + radius * 0.7} ${cy}`} />
      </g>
    );
  }

  if (motif.kind === "glyph") {
    return <g {...common}><Glyph motif={motif} /></g>;
  }

  return <g {...common}><Silhouette motif={motif} /></g>;
}

export default function TileArtwork({ tile, showLabel = true, showLineage = true, className = "" }) {
  const tier = TIERS[tile.tier];
  return (
    <span className={`mm-artwork ${className}`.trim()} aria-hidden="true">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="mm-artwork-svg">
        <rect width="100" height="100" fill={tier.canvasBg ?? tier.bg} />
        {tile.motifs.map((motif) => <Motif key={motif.id} motif={motif} />)}
        <path d="M 5 91 C 25 86, 58 96, 95 88" fill="none" stroke="rgba(34,31,29,.18)" strokeWidth="1.4" />
      </svg>
      {showLabel && (
        <span className="mm-artwork-label" style={{ color: "#221F1D" }}>
          {tier.name}
        </span>
      )}
      {showLineage && (
        <span className="mm-lineage-mark" title={`${tile.lineage} source scraps`}>
          {tile.lineage}
        </span>
      )}
    </span>
  );
}
