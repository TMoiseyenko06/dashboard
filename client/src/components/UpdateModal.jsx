import { useEffect, useRef } from 'react';
import './UpdateModal.css';

export default function UpdateModal({ updating, log, onClose }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">
            {updating ? (
              <><span className="spinner modal__spinner" /> Updating all tools…</>
            ) : (
              '✓ Update complete'
            )}
          </h2>
          {!updating && (
            <button className="modal__close" onClick={onClose}>✕</button>
          )}
        </div>
        <div className="modal__log">
          {log.map((line, i) => (
            <div key={i} className="modal__line">{line}</div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
