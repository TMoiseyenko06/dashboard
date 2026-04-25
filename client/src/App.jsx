import { useState, useEffect, useCallback } from 'react';
import { fetchTools, fetchStatus, launchTool, stopTool, startUpdateAll, fetchUpdateStatus } from './api';
import ToolCard from './components/ToolCard';
import StatusBar from './components/StatusBar';
import UpdateModal from './components/UpdateModal';
import './App.css';

const POLL_INTERVAL = 1500;

export default function App() {
  const [tools, setTools] = useState([]);
  const [status, setStatus] = useState({ running: null, error: null });
  const [showUpdate, setShowUpdate] = useState(false);
  const [updateState, setUpdateState] = useState({ updating: false, log: [] });

  const refreshStatus = useCallback(async () => {
    try {
      const s = await fetchStatus();
      setStatus(s);
    } catch {
      // ignore network errors during poll
    }
  }, []);

  const refreshUpdate = useCallback(async () => {
    try {
      const u = await fetchUpdateStatus();
      setUpdateState(u);
    } catch {}
  }, []);

  useEffect(() => {
    fetchTools().then(setTools).catch(console.error);
    refreshStatus();
    const id = setInterval(refreshStatus, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [refreshStatus]);

  // Poll update status while modal is open
  useEffect(() => {
    if (!showUpdate) return;
    const id = setInterval(refreshUpdate, 1000);
    return () => clearInterval(id);
  }, [showUpdate, refreshUpdate]);

  const handleLaunch = async (id) => {
    try {
      await launchTool(id);
      await refreshStatus();
    } catch (err) {
      console.error('Launch failed:', err);
    }
  };

  const handleStop = async () => {
    try {
      await stopTool();
      await refreshStatus();
    } catch (err) {
      console.error('Stop failed:', err);
    }
  };

  const handleUpdateAll = async () => {
    setUpdateState({ updating: true, log: [] });
    setShowUpdate(true);
    try {
      await startUpdateAll();
    } catch (err) {
      console.error('Update failed:', err);
    }
  };

  return (
    <>
      <StatusBar status={status} tools={tools} onStop={handleStop} />
      <main className="main">
        <header className="header">
          <div>
            <h1 className="header__title">Tools Dashboard</h1>
            <p className="header__sub">Launch a tool to get started — only one runs at a time</p>
          </div>
          <button className="btn btn--update" onClick={handleUpdateAll}>
            ↻ Update All
          </button>
        </header>
        {tools.length === 0 ? (
          <p className="empty">No tools configured. Add entries to <code>tools.json</code>.</p>
        ) : (
          <div className="grid">
            {tools.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                runningStatus={status.running}
                onLaunch={handleLaunch}
                onStop={handleStop}
              />
            ))}
          </div>
        )}
      </main>
      {showUpdate && (
        <UpdateModal
          updating={updateState.updating}
          log={updateState.log}
          onClose={() => !updateState.updating && setShowUpdate(false)}
        />
      )}
    </>
  );
}
