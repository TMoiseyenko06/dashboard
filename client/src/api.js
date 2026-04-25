export const fetchTools = () =>
  fetch('/api/tools').then((r) => r.json());

export const fetchStatus = () =>
  fetch('/api/status').then((r) => r.json());

export const launchTool = (id) =>
  fetch(`/api/launch/${id}`, { method: 'POST' }).then((r) => r.json());

export const stopTool = () =>
  fetch('/api/stop', { method: 'POST' }).then((r) => r.json());

export const startUpdateAll = () =>
  fetch('/api/update-all', { method: 'POST' }).then((r) => r.json());

export const fetchUpdateStatus = () =>
  fetch('/api/update-status').then((r) => r.json());
