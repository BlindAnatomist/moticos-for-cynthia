// Keep the visible label separate from option text. This gives both assistive
// technology and exact-label browser locators one stable control name.
export default function AlbumPicker({ id, label, value, onChange, children }) {
  return <div className="mg-album-picker">
    <label htmlFor={id}>{label}</label>
    <select id={id} value={value} onChange={event => onChange(event.target.value)}>{children}</select>
  </div>;
}
