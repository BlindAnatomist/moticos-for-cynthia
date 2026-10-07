export default function ResidueMark({ residue }) {
  if (!residue) return null;
  const paths = [
    "M 14 70 C 28 35, 55 88, 84 25",
    "M 18 18 L 80 78 M 28 82 L 74 12",
    "M 12 60 Q 50 8 88 60 Q 50 90 12 60",
    "M 16 30 C 38 5, 58 95, 86 50",
  ];
  return (
    <svg
      aria-hidden="true"
      className="mm-residue"
      viewBox="0 0 100 100"
      style={{ transform: `rotate(${residue.rotation}deg)`, opacity: residue.opacity }}
    >
      <path
        d={paths[residue.variant % paths.length]}
        fill="none"
        stroke={residue.color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={residue.variant % 2 ? "4 5" : "none"}
      />
    </svg>
  );
}
