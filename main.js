const { app, BrowserWindow, Menu, ipcMain, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

// Custom protocol name
const PROTOCOL_NAME = 'vsp-media';

let mainWindow;

// Register custom protocol to serve local files
protocol.registerSchemesAsPrivileged([
    { scheme: PROTOCOL_NAME, privileges: { bypassCSP: true, stream: true, secure: true, supportFetchAPI: true } }
]);

function handleFileOpen(argv) {
    if (!mainWindow) return;

    // On Windows, the file path is usually the last argument or after some electron flags
    // In a packaged app, argv[0] is the exe. In dev, argv[0] is electron, argv[1] is "."
    const offset = app.isPackaged ? 1 : 2;
    const args = argv.slice(offset);

    const filePath = args.find(arg => {
        let p = arg.replace(/^"|"$/g, ''); // Remove quotes if any
        try {
            // Skip flags
            if (p.startsWith('--')) return false;
            return fs.existsSync(p) && fs.lstatSync(p).isFile();
        } catch (e) {
            return false;
        }
    });

    if (filePath) {
        const cleanPath = filePath.replace(/^"|"$/g, '');
        // Send to renderer
        mainWindow.webContents.send('open-file', cleanPath);
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        backgroundColor: '#05060a',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        title: "VS Ultimate MultiPlayer"
    });

    mainWindow.loadFile('index.html');

    // Remove default menu for a cleaner look
    Menu.setApplicationMenu(null);

    mainWindow.webContents.on('did-finish-load', () => {
        handleFileOpen(process.argv);
    });

    // Optional: Open DevTools during development
    // mainWindow.webContents.openDevTools();
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Someone tried to run a second instance, we should focus our window.
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();

            // Handle the new command line arguments
            handleFileOpen(commandLine);
        }
    });

    app.whenReady().then(() => {
        // Register custom protocol using registerFileProtocol (often more stable for media)
        protocol.registerFileProtocol(PROTOCOL_NAME, (request, callback) => {
            const url = request.url.replace(`${PROTOCOL_NAME}://`, '');
            try {
                return callback(decodeURIComponent(url));
            } catch (error) {
                console.error('Protocol failure', error);
            }
        });

        createWindow();

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });
    });
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

