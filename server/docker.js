const Docker = require('dockerode');
const state = require('./state');

const docker = new Docker({ socketPath: '/var/run/docker.sock' });
const HOST_PORT = 49200;

async function pullImage(image) {
  return new Promise((resolve, reject) => {
    docker.pull(image, (err, stream) => {
      if (err) return reject(err);
      docker.modem.followProgress(stream, (err) => {
        if (err) return reject(err);
        resolve();
      }, (event) => {
        if (event.status) process.stdout.write('.');
      });
    });
  });
}

async function isImagePresent(image) {
  try {
    await docker.getImage(image).inspect();
    return true;
  } catch {
    return false;
  }
}

async function launchContainer(tool, hostPort = HOST_PORT) {
  const present = await isImagePresent(tool.image);
  if (!present) {
    console.log(`Pulling image ${tool.image}...`);
    await pullImage(tool.image);
    console.log(`\nImage pulled.`);
  }

  const envArray = Object.entries(tool.env || {}).map(([k, v]) => `${k}=${v}`);
  const binds = Array.isArray(tool.volumes) ? tool.volumes : [];

  const container = await docker.createContainer({
    Image: tool.image,
    Labels: {
      'tools-dashboard': 'true',
      'tools-dashboard-toolId': tool.id,
      'tools-dashboard-hostPort': String(hostPort),
    },
    ExposedPorts: { [`${tool.containerPort}/tcp`]: {} },
    Env: envArray,
    HostConfig: {
      PortBindings: {
        [`${tool.containerPort}/tcp`]: [{ HostPort: String(hostPort) }],
      },
      AutoRemove: true,
      Binds: binds,
    },
  });

  await container.start();

  // Verify the container is actually running after a short delay
  await new Promise((r) => setTimeout(r, 2000));
  const info = await container.inspect();
  if (!info.State.Running) {
    throw new Error(`Container exited immediately after start (exit code ${info.State.ExitCode})`);
  }

  return { containerId: container.id, hostPort };
}

async function stopContainer(containerId) {
  try {
    const container = docker.getContainer(containerId);
    await container.stop({ t: 10 });
  } catch (err) {
    // 304 = container already stopped, 404 = already removed; both are fine
    if (err.statusCode !== 304 && err.statusCode !== 404) throw err;
  }
}

async function reconcileState() {
  try {
    const containers = await docker.listContainers({ all: false });
    const managed = containers.find(
      (c) => c.Labels && c.Labels['tools-dashboard'] === 'true'
    );
    if (managed) {
      const toolId = managed.Labels['tools-dashboard-toolId'];
      const hostPort = parseInt(managed.Labels['tools-dashboard-hostPort'], 10) || HOST_PORT;
      state.running = {
        toolId,
        containerId: managed.Id,
        hostPort,
        status: 'running',
        startedAt: new Date(managed.Created * 1000),
        url: `http://localhost:${hostPort}`,
      };
      console.log(`Reconciled: found running container for tool "${toolId}"`);
    }
  } catch (err) {
    console.error('reconcileState error:', err.message);
  }
}

module.exports = { launchContainer, stopContainer, reconcileState, HOST_PORT };
