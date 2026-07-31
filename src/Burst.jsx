import { useMemo } from "react";

export default function Burst({ color, big, burstKey }) {
  const scraps = useMemo(() => {
    const count = big ? 10 : 6;
    return Array.from({ length: count }, (_, index) => ({
      angle: (360 / count) * index + (Math.random() * 26 - 13),
      dist: big ? 26 + Math.random() * 14 : 18 + Math.random() * 10,
      rotation: Math.random() * 240 - 120,
      width: 3 + Math.random() * 4,
      height: 5 + Math.random() * 5,
      delay: index * 9,
      key: index,
    }));
  }, [big, burstKey]);

  return (
    <span className="mm-burst">
      {scraps.map((scrap) => (
        <span
          key={scrap.key}
          className="mm-scrap-orbit"
          style={{ transform: `rotate(${scrap.angle}deg)` }}
        >
          <span
            className="mm-scrap"
            style={{
              background: color,
              width: scrap.width,
              height: scrap.height,
              animationDelay: `${scrap.delay}ms`,
              "--dist": `${scrap.dist}px`,
              "--rot": `${scrap.rotation}deg`,
            }}
          />
        </span>
      ))}
    </span>
  );
}
