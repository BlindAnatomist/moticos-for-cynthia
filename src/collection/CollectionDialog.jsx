import { useEffect, useRef } from 'react';
export default function CollectionDialog({ title, onClose, children, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    dialog.showModal();
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = priorOverflow; if (dialog.open) dialog.close(); previous?.focus?.(); };
  }, []);
  return <dialog ref={ref} className={`cg-dialog ${className}`} aria-labelledby="cg-dialog-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="cg-dialog-header"><h2 id="cg-dialog-title">{title}</h2><button autoFocus onClick={onClose} className="cg-button">Back to board</button></div>
    {children}
  </dialog>;
}
