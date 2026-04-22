module.exports = {
  running: null,
  launching: false,
  error: null,
  // running shape when populated:
  // {
  //   toolId: string,
  //   containerId: string,
  //   hostPort: number,
  //   status: "starting" | "running" | "stopping",
  //   startedAt: Date,
  //   url: string
  // }
};
