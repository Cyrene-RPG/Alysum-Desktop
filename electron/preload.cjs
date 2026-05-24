const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("AlysumDesktop", {
  isDesktop: true,
  platform: process.platform,
});
