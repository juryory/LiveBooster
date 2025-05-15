const { app, BrowserWindow, Menu } = require('electron');
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

  // 创建中文菜单
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '退出',
          accelerator: process.platform === 'darwin' ? 'Command+Q' : 'Alt+F4',
          click: () => app.quit()
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', role: 'undo' },
        { label: '重做', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', role: 'cut' },
        { label: '复制', role: 'copy' },
        { label: '粘贴', role: 'paste' },
        { label: '删除', role: 'delete' },
        { type: 'separator' },
        { label: '全选', role: 'selectAll' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { label: '重新加载', role: 'reload' },
        { label: '强制重新加载', role: 'forceReload' },
        { type: 'separator' },
        { label: '实际大小', role: 'resetZoom' },
        { label: '放大', role: 'zoomIn' },
        { label: '缩小', role: 'zoomOut' },
        { type: 'separator' },
        { label: '全屏', role: 'togglefullscreen' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于 LiveBooster',
          click: async () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(win, {
              title: '关于 LiveBooster',
              message: 'LiveBooster v1.0.0\n一个直播数据助推工具\n\n© 2025 LiveBooster',
              buttons: ['确定']
            });
          }
        },
        {
          label: '访问 GitHub',
          click: async () => {
            const { shell } = require('electron');
            await shell.openExternal('https://github.com/juryory/LiveBooster');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
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
