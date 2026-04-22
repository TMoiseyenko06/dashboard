export const fetchTools = () =>
  fetch('/api/tools').then((r) => r.json());

export const fetchStatus = () =>
  fetch('/api/status').then((r) => r.json());

export const launchTool = (id) =>
  fetch(`/api/launch/${id}`, { method: 'POST' }).then((r) => r.json());

export const stopTool = () =>
  fetch('/api/stop', { method: 'POST' }).then((r) => r.json());
