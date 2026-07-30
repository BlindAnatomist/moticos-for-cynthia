import { Download, X } from "lucide-react";
import TileArtwork from "./TileArtwork.jsx";
import { btnBase } from "./moticosConstants.js";

export default function MoticoArrival({ tile, title, exporting, onClose, onSave }) {
  if (!tile) return null;
  return (
    <div className="mm-arrival-backdrop" role="presentation">
      <section className="mm-arrival" role="dialog" aria-modal="true" aria-labelledby="motico-arrival-title">
        <button type="button" className="mm-arrival-close" onClick={onClose} aria-label="Return to the board">
          <X size={18} />
        </button>
        <p className="mm-arrival-kicker">A MOTICO HAS ARRIVED</p>
        <div className="mm-arrival-art">
          <TileArtwork tile={tile} showLabel={false} />
        </div>
        <h2 id="motico-arrival-title">{title}</h2>
        <p>{tile.lineage} scraps have become one correspondence.</p>
        <div className="mm-arrival-actions">
          <button type="button" className="mm-btn" style={btnBase(false)} onClick={onClose}>
            Keep composing
          </button>
          <button type="button" className="mm-btn" style={btnBase(exporting)} disabled={exporting} onClick={onSave}>
            <Download size={14} /> {exporting ? "Saving…" : "Save postcard"}
          </button>
        </div>
      </section>
    </div>
  );
}
