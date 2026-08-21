// Electron 主进程
const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 960,
    height: 600,            // 540 画布 + 标题栏约 60
    minWidth: 960,
    minHeight: 600,
    resizable: true,
    title: '恒温牢饭',
    backgroundColor: '#0a0c12',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: process.env.NODE_ENV === 'dev'
    }
  });

  Menu.setApplicationMenu(null);  // 彻底移除菜单栏
  win.loadFile('index.html');

  win.once('ready-to-show', () => win.show());

  win.on('closed', () => { win = null; });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
