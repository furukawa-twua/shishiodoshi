const electron = require('electron');
const { app, BrowserWindow } = electron;
const path = require('path');

let win = null;

const gotTheLock = app.requestSingleInstanceLock();

function createWindow () {
  const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize;
  win = new BrowserWindow({
    x: width - 345,
    y: height - 189,
    width: 345,
    height: 189,
    transparent: true,
    frame: false,
    toolbar: false,
    resizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    useContentSize: true,
    skipTaskbar: true,
    webPreferences: {
      devTools: false,
      nodeIntegration : true
    }
  });
  win.loadFile(path.join(__dirname, '..', 'static', 'shishiodoshi.html'));

  win.removeMenu();

  win.on('closed', () => {
    win = null;
  });
}

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.on('ready', createWindow);

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  })
  
  app.on('activate', () => {
    if(win === null) {
      createWindow();
    }
  })
}