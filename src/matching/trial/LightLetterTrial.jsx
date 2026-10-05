import { useRef } from 'react';
import MatchingGarden from '../MatchingGarden.jsx';
import { LIGHT_LETTER_CATALOG, LIGHT_LETTER_ENGINE, LIGHT_LETTER_ENVELOPE } from './catalog.js';
import { LIGHT_LETTER_BOUNDS } from './boardArt.js';
import './trial.css';

export function TrialCollection({ save, onPostcard }) {
  const { PIECES, previousPiece } = LIGHT_LETTER_CATALOG;
  const postcards = PIECES.filter(piece => piece.tier >= 3 && save.discoveries.includes(piece.id));
  return <>
    <p className="cg-collection-intro">Private Light / Letter trial: {save.discoveries.length} of 5 artworks discovered · {postcards.length} of 3 postcards earned.</p>
    <p className="cg-collection-note">This trial has its own board and save. Its discoveries do not count toward the published collection.</p>
    <section className="mg-family-collection"><h3>Light / Letter{save.discoveries.includes('ll5') && <span className="mg-collected-label">World collected</span>}</h3>
      <div className="mg-chain">{PIECES.map(piece => {
        const known = save.discoveries.includes(piece.id);
        return <article className={`cg-collection-piece${known ? '' : ' is-undiscovered'}`} key={piece.id} data-trial-discovery={piece.id}>
          <span className="mg-chain-level">Level {piece.tier}</span>
          {known ? <img className="cg-art" src={piece.art} alt={piece.description} width="768" height="768" loading="lazy" draggable="false" /> : <div className="cg-mystery" aria-hidden="true">?</div>}
          <h4>{known ? piece.name : 'A new Light / Letter discovery'}</h4>
          <p>{piece.tier === 1 ? 'From your envelope' : `2 × ${previousPiece(piece.id).name}`}</p>
          {known && <p className="mg-trial-ancestry">{piece.description}</p>}
          {known && piece.tier >= 3 && <button className="cg-button" onClick={() => onPostcard(piece.id)}>Open postcard</button>}
        </article>;
      })}</div>
    </section>
    <p className="cg-collection-note">Discoveries stay here after Undo, Cut or a fresh trial envelope. Original AI-generated collage inspired by Ray Johnson; not his work or an endorsed reproduction.</p>
  </>;
}
export function TrialHelp() {
  return <div className="cg-help">
    <p>Two identical pictures make the next picture. Match Light with Light, then match two See Light pieces to discover Letter Window.</p>
    <ol>
      <li>Drag a piece onto its match, or tap both. Different levels never match.</li>
      <li>Add a Light / Letter pair when you need more pieces. Four starting clippings and six pair draws are enough to reach the fifth artwork. There is no waiting or payment.</li>
      <li>Level 3 earns the first postcard. Levels 4 and 5 earn two more. Open them when you like and return to the same board.</li>
      <li>Undo takes back a move. Cut splits a made piece into two copies of the previous level. Discovered art stays in this trial collection.</li>
    </ol>
    <p>This is a private five-artwork trial, separate from the published four-envelope collection. Your published progress is unchanged.</p>
    <h3>Keyboard</h3><p>Tab to the board, use arrow keys, and press Enter or Space to select and match. Escape clears the selection.</p>
  </div>;
}
export const LIGHT_LETTER_TRIAL = Object.freeze({
  envelope: LIGHT_LETTER_ENVELOPE, engine: LIGHT_LETTER_ENGINE, boardArtBounds: LIGHT_LETTER_BOUNDS,
  renderCollection: props => <TrialCollection {...props} />,
  renderHelp: () => <TrialHelp />,
});
export default function LightLetterTrial() {
  const sessions = useRef(new Map());
  return <MatchingGarden envelopeId={LIGHT_LETTER_ENVELOPE.id} sessionCache={sessions.current} trial={LIGHT_LETTER_TRIAL} />;
}
