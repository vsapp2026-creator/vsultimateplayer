const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    onOpenFile: (callback) => ipcRenderer.on('open-file', (_event, value) => callback(value)),
    // We might need to read the file content if we want to play it like the dropped files
    // But for local files in Electron, we can often just pass the path if we have permissions
    // or use a custom protocol.
    // However, the current player uses URL.createObjectURL(file).
    // In Electron, we can use webUtils.getPathForFile or just work with absolute paths if we enable some settings.
    // Actually, in Electron, we can just set the src of a video/audio tag to an absolute file path
    // if we disable webSecurity (not recommended) or register a custom protocol.
    // Better yet, we can use ipcRenderer to invoke a "get-file-data" if needed, 
    // but the simplest is to use the 'file://' protocol if allowed, or a custom one.
});
