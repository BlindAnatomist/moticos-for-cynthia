import TileArtwork from "./TileArtwork.jsx";
import { createFoundTile, makeSeededRng, titleForTile } from "./collageArt.js";
import { SHAPES, TIERS, clipPathOf } from "./moticosConstants.js";

const galleryTiles = TIERS.map((_, tier) => createFoundTile(tier, makeSeededRng(1000 + tier * 91)));

export default function CollageGallery() {
  return (
    <main className="mm-gallery-page">
      <header>
        <p>MOTICOS DEVELOPMENT PLATE</p>
        <h1>Every tier, inspected at full scale</h1>
      </header>
      <div className="mm-gallery-grid">
        {galleryTiles.map((tile) => {
          const tier = TIERS[tile.tier];
          return (
            <article key={tier.name} className="mm-gallery-card">
              <div
                className="mm-gallery-tile"
                data-gallery-tier={tile.tier}
                style={{ clipPath: clipPathOf(SHAPES[tier.shape]) }}
              >
                <TileArtwork tile={tile} />
              </div>
              <h2>{tier.name}</h2>
              <p>{titleForTile(tile)}</p>
            </article>
          );
        })}
      </div>
    </main>
  );
}
