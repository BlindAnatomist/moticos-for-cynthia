import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import AlbumPicker from '../src/matching/AlbumPicker.jsx';
import { ENVELOPES } from '../src/matching/registry.js';

const choices = ENVELOPES.map(envelope => <option key={envelope.id} value={envelope.id}>{envelope.title}</option>);
describe('album picker label contract', () => {
  it.each([
    ['mg-album-envelope', 'Browse envelope'], ['mg-album-filter', 'Show envelopes'],
  ])('%s binds an exact standalone visible label rather than including option text', (id, label) => {
    const markup = renderToStaticMarkup(<AlbumPicker id={id} label={label} value="lantern-studio" onChange={() => {}}>{choices}</AlbumPicker>);
    expect(markup).toContain(`<label for="${id}">${label}</label><select id="${id}">`);
    expect(markup).not.toMatch(/<label[^>]*>[^<]*<select/);
    expect(markup.match(/<label\b/g)).toHaveLength(1);
    expect(markup).toContain('<option value="lantern-studio" selected="">Lantern Studio</option>');
  });
  it('keeps label text fixed when a much larger collection adds more options', () => {
    const many = Array.from({ length: 30 }, (_, index) => <option key={index} value={`envelope-${index}`}>Collection envelope {index + 1}</option>);
    const markup = renderToStaticMarkup(<AlbumPicker id="album-many" label="Browse envelope" value="envelope-29" onChange={() => {}}>{many}</AlbumPicker>);
    expect(markup.match(/<label[^>]*>(.*?)<\/label>/)?.[1]).toBe('Browse envelope');
    expect(markup.match(/<option\b/g)).toHaveLength(30);
  });
  it('forwards only the chosen envelope value and retains the styling wrapper', () => {
    const choose = vi.fn(), element = AlbumPicker({ id: 'album-choice', label: 'Browse envelope', value: 'matching-garden', onChange: choose, children: choices });
    expect(element.type).toBe('div'); expect(element.props.className).toBe('mg-album-picker');
    const [label, select] = element.props.children;
    expect(label.props.htmlFor).toBe(select.props.id);
    select.props.onChange({ target: { value: 'lantern-studio' } });
    expect(choose).toHaveBeenCalledExactlyOnceWith('lantern-studio');
  });
});
