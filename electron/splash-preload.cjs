const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("splashApi", {
  onFinish(callback) {
    ipcRenderer.on("splash:finish", () => callback());
  },
});
