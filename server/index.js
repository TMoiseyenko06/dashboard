const express = require('express');
const path = require('path');
const cors = require('cors');
const { reconcileState } = require('./docker');
const { stopContainer } = require('./docker');
const state = require('./state');
const apiRouter = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === 'production';

if (!IS_PROD) {
  app.use(cors());
}

app.use(express.json());
app.use('/api', apiRouter);

if (IS_PROD) {
  const staticPath = path.join(__dirname, 'public');
  app.use(express.static(staticPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

async function shutdown(signal) {
  console.log(`\nReceived ${signal}`);
  if (process.env.STOP_ON_EXIT === 'true' && state.running?.containerId) {
    console.log('Stopping running container before exit...');
    try {
      await stopContainer(state.running.containerId);
    } catch (err) {
      console.error('Error stopping container:', err.message);
    }
  }
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

async function main() {
  await reconcileState();
  app.listen(PORT, () => {
    console.log(`Dashboard server running on http://localhost:${PORT}`);
    if (!IS_PROD) console.log('Dev mode: expecting Vite on http://localhost:5173');
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
