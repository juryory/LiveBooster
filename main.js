const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  // 获取 preload.js 的绝对路径
  const preloadPath = path.join(__dirname, 'preload.js');
  console.log('Preload path:', preloadPath);

  const win = new BrowserWindow({
    width: 900,
    height: 1000,
    webPreferences: {
      sandbox: false,
      nodeIntegration: true,
      contextIsolation: true,
      preload: preloadPath,
      // 启用远程调试
      devTools: false
    }
  });

  // 设置 CSP
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src *"]
      }
    });
  });

  // 加载前先等待一下确保 preload 脚本加载完成
  setTimeout(() => {
    win.loadFile('renderer/index.html');
    // 打开开发者工具
    win.webContents.openDevTools();
  }, 100);

  // 监听页面加载完成事件
  win.webContents.on('did-finish-load', () => {
    console.log('Page loaded successfully');
  });

  // 监听 preload 脚本加载错误
  win.webContents.on('preload-error', (event, preloadPath, error) => {
    console.error('Preload script error:', error);
  });
}

// 确保应用程序完全准备好后再创建窗口
app.whenReady().then(() => {
  createWindow();
  
  // 如果是 macOS，点击 dock 图标时没有窗口则创建一个窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 当所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
