const {
    contextBridge,
    remote,
} = require("electron");

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electron", remote.require("electron"));
contextBridge.exposeInMainWorld("fs", remote.require("fs"));
contextBridge.exposeInMainWorld("homeDir", remote.require('os').homedir());
contextBridge.exposeInMainWorld("plistParser", remote.require('bplist-parser'));
contextBridge.exposeInMainWorld("exec", remote.require('child_process').exec);