import './ToolCard.css';

export default function ToolCard({ tool, runningStatus, onLaunch, onStop }) {
  const isThisTool = runningStatus?.toolId === tool.id;
  const isRunning = isThisTool && runningStatus?.status === 'running';
  const isLoading = isThisTool && (runningStatus?.status === 'starting' || runningStatus?.status === 'stopping');
  const otherTool = runningStatus && !isThisTool;
  const actionLabel = runningStatus?.status === 'stopping' ? 'Stopping...' : 'Starting...';

  let elapsedSecs = null;
  if (isLoading && runningStatus?.startedAt) {
    elapsedSecs = Math.floor((Date.now() - new Date(runningStatus.startedAt).getTime()) / 1000);
  }

  return (
    <div className={`tool-card ${isRunning ? 'tool-card--running' : ''} ${isLoading ? 'tool-card--loading' : ''}`}>
      <div className="tool-card__icon">{tool.icon || '🔧'}</div>
      <div className="tool-card__body">
        <h3 className="tool-card__name">{tool.name}</h3>
        <p className="tool-card__desc">{tool.description}</p>
        {otherTool && !isLoading && (
          <p className="tool-card__warn">Will stop current tool</p>
        )}
      </div>
      <div className="tool-card__actions">
        {isLoading ? (
          <div className="tool-card__loading-state">
            <span className="spinner" />
            <span>{actionLabel}{elapsedSecs !== null ? ` (${elapsedSecs}s)` : ''}</span>
          </div>
        ) : isRunning ? (
          <>
            <a
              className="btn btn--primary"
              href="/tool/"
              target="_blank"
              rel="noreferrer"
            >
              Open
            </a>
            <button className="btn btn--danger" onClick={onStop}>
              Stop
            </button>
          </>
        ) : (
          <button className="btn btn--launch" onClick={() => onLaunch(tool.id)}>
            Launch
          </button>
        )}
      </div>
    </div>
  );
}
