import { useState, useEffect, useCallback } from 'react';
import { fetchTools, fetchStatus, launchTool, stopTool } from './api';
import ToolCard from './components/ToolCard';
import StatusBar from './components/StatusBar';
import './App.css';

const POLL_INTERVAL = 1500;

export default function App() {
  const [tools, setTools] = useState([]);
  const [status, setStatus] = useState({ running: null, error: null });

  const refreshStatus = useCallback(async () => {
    try {
      const s = await fetchStatus();
      setStatus(s);
    } catch {
      // ignore network errors during poll
    }
  }, []);

  useEffect(() => {
    fetchTools().then(setTools).catch(console.error);
    refreshStatus();
    const id = setInterval(refreshStatus, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [refreshStatus]);

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

  return (
    <>
      <StatusBar status={status} tools={tools} onStop={handleStop} />
      <main className="main">
        <header className="header">
          <h1 className="header__title">Tools Dashboard</h1>
          <p className="header__sub">Launch a tool to get started — only one runs at a time</p>
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
    </>
  );
}
