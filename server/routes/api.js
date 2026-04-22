const express = require('express');
const fs = require('fs');
const path = require('path');
const state = require('../state');
const { launchContainer, stopContainer, HOST_PORT } = require('../docker');

const router = express.Router();
const TOOLS_PATH = path.join(__dirname, '..', '..', 'tools.json');

function readTools() {
  const raw = fs.readFileSync(TOOLS_PATH, 'utf8');
  const tools = JSON.parse(raw);
  return tools.filter((t) => t.id && t.image && t.containerPort);
}

router.get('/tools', (req, res) => {
  try {
    res.json(readTools());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/status', (req, res) => {
  res.json({ running: state.running, error: state.error });
});

router.post('/launch/:id', async (req, res) => {
  if (state.launching) {
    return res.status(409).json({ error: 'A launch is already in progress' });
  }

  let tools;
  try {
    tools = readTools();
  } catch (err) {
    return res.status(500).json({ error: 'Failed to read tools.json' });
  }

  const tool = tools.find((t) => t.id === req.params.id);
  if (!tool) {
    return res.status(404).json({ error: `Tool "${req.params.id}" not found` });
  }

  state.launching = true;
  state.error = null;

  // Respond immediately so the UI can start polling
  state.running = {
    toolId: tool.id,
    containerId: null,
    hostPort: HOST_PORT,
    status: 'starting',
    startedAt: new Date(),
    url: `http://localhost:${HOST_PORT}`,
  };
  res.status(202).json({ status: 'starting', toolId: tool.id });

  // Background work
  (async () => {
    try {
      // Stop previous container if any
      if (state.running && state.running.containerId) {
        const prevId = state.running.containerId;
        await stopContainer(prevId);
      }

      const { containerId } = await launchContainer(tool, HOST_PORT);
      state.running = {
        toolId: tool.id,
        containerId,
        hostPort: HOST_PORT,
        status: 'running',
        startedAt: state.running?.startedAt || new Date(),
        url: `http://localhost:${HOST_PORT}`,
      };
      console.log(`Tool "${tool.id}" is running (container ${containerId.slice(0, 12)})`);
    } catch (err) {
      console.error(`Failed to launch "${tool.id}":`, err.message);
      state.error = err.message;
      state.running = null;
    } finally {
      state.launching = false;
    }
  })();
});

router.post('/stop', (req, res) => {
  if (!state.running) {
    return res.status(200).json({ running: null });
  }

  const { containerId, toolId } = state.running;
  state.running.status = 'stopping';
  res.status(202).json({ status: 'stopping', toolId });

  (async () => {
    try {
      if (containerId) await stopContainer(containerId);
      console.log(`Tool "${toolId}" stopped`);
    } catch (err) {
      console.error(`Failed to stop "${toolId}":`, err.message);
      state.error = err.message;
    } finally {
      state.running = null;
    }
  })();
});

module.exports = router;
