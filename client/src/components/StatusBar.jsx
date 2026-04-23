import { useState, useEffect } from 'react';
import './StatusBar.css';

export default function StatusBar({ status, tools, onStop }) {
  const [elapsed, setElapsed] = useState(0);
  const r = status?.running;

  useEffect(() => {
    if (!r || r.status === 'running') {
      setElapsed(0);
      return;
    }
    const start = new Date(r.startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [r?.toolId, r?.status]);

  const tool = r && tools.find((t) => t.id === r.toolId);
  const icon = tool?.icon || '🔧';
  const name = tool?.name || r?.toolId;

  return (
    <div className={`status-bar ${r ? 'status-bar--active' : ''}`}>
      {!r ? (
        <span className="status-bar__idle">No tool running</span>
      ) : r.status === 'starting' ? (
        <>
          <span className="spinner status-bar__spinner" />
          <span>{icon} <strong>{name}</strong> is starting… ({elapsed}s)</span>
        </>
      ) : r.status === 'running' ? (
        <>
          <span className="status-bar__dot" />
          <span>{icon} <strong>{name}</strong> is running</span>
          <div className="status-bar__actions">
            <a className="btn btn--sm btn--primary" href={`http://${window.location.hostname}:${r.hostPort}`} target="_blank" rel="noreferrer">Open</a>
            <button className="btn btn--sm btn--danger" onClick={onStop}>Stop</button>
          </div>
        </>
      ) : r.status === 'stopping' ? (
        <>
          <span className="spinner status-bar__spinner" />
          <span>{icon} <strong>{name}</strong> is stopping…</span>
        </>
      ) : null}

      {status?.error && (
        <span className="status-bar__error" title={status.error}>⚠ Error — check console</span>
      )}
    </div>
  );
}
