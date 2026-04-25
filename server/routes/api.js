const express = require('express');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
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

  // Capture previous container ID before overwriting state
  const prevContainerId = state.running?.containerId ?? null;

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
      // Stop previous container and wait for port to be released
      if (prevContainerId) {
        await stopContainer(prevContainerId);
        await new Promise((r) => setTimeout(r, 1000));
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

// --- Update All ---

const TOOLS_DIR = path.join(__dirname, '..', '..', 'tools');

function log(msg) {
  const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
  state.updateLog.push(line);
  console.log(line);
}

function runCommand(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd, shell: false });
    proc.stdout.on('data', (d) => d.toString().split('\n').filter(Boolean).forEach(log));
    proc.stderr.on('data', (d) => d.toString().split('\n').filter(Boolean).forEach(log));
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
  });
}

router.get('/update-status', (req, res) => {
  res.json({ updating: state.updating, log: state.updateLog });
});

router.post('/update-all', (req, res) => {
  if (state.updating) {
    return res.status(409).json({ error: 'Update already in progress' });
  }

  state.updating = true;
  state.updateLog = [];
  res.status(202).json({ status: 'started' });

  (async () => {
    try {
      // Stop running container
      if (state.running?.containerId) {
        log('Stopping running container...');
        await stopContainer(state.running.containerId);
        state.running = null;
        log('Container stopped.');
      }

      // Find tool folders that have a .git repo and/or a Dockerfile
      let toolFolders = [];
      try {
        toolFolders = fs.readdirSync(TOOLS_DIR, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => d.name);
      } catch {
        log('No tools/ directory found, skipping git pull and build steps.');
      }

      // Git pull each tool that has a .git folder
      for (const folder of toolFolders) {
        const toolPath = path.join(TOOLS_DIR, folder);
        const hasGit = fs.existsSync(path.join(toolPath, '.git'));
        if (hasGit) {
          log(`git pull → tools/${folder}`);
          try {
            await runCommand('git', ['pull'], toolPath);
          } catch (err) {
            log(`  ⚠ git pull failed: ${err.message}`);
          }
        }
      }

      // Rebuild Docker images for tools that have a local Dockerfile
      let tools = [];
      try { tools = readTools(); } catch { }

      for (const tool of tools) {
        const toolPath = path.join(TOOLS_DIR, tool.id);
        const hasDockerfile = fs.existsSync(path.join(toolPath, 'Dockerfile'));
        if (hasDockerfile) {
          log(`docker build → ${tool.image} (tools/${tool.id})`);
          try {
            await runCommand('docker', ['build', '-t', tool.image, '.'], toolPath);
            log(`  ✓ ${tool.image} built successfully`);
          } catch (err) {
            log(`  ⚠ build failed: ${err.message}`);
          }
        }
      }

      log('All done.');
    } catch (err) {
      log(`Error: ${err.message}`);
    } finally {
      state.updating = false;
    }
  })();
});

module.exports = router;
