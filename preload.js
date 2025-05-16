const { contextBridge } = require('electron');
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

// 添加调试信息
console.log('Preload script is running');

let browser = null;

async function launchBrowser() {
    try {
        let chromePath;
        
        if (process.platform === 'darwin') {
            // macOS 上使用系统 Chrome
            const possiblePaths = [
                '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
                '/Applications/Chromium.app/Contents/MacOS/Chromium'
            ];
            
            for (const path of possiblePaths) {
                if (fs.existsSync(path)) {
                    chromePath = path;
                    break;
                }
            }
            
            if (!chromePath) {
                throw new Error('请先安装 Google Chrome、Chrome Canary 或 Chromium');
            }
        } else {
            // Windows 上使用打包的 Chrome
            const appPath = process.env.PORTABLE_EXECUTABLE_DIR || 
                          path.dirname(process.execPath);
            chromePath = path.join(appPath, 'resources', 'chrome-win', 'chrome.exe');
        }
        
        console.log('Chrome 路径:', chromePath);
        
        const browser = await puppeteer.launch({
            headless: 'new',
            executablePath: chromePath,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });
        return browser;
    } catch (error) {
        console.error('启动浏览器失败:', error);
        throw error;
    }
}

// 定义 API 对象
const api = {
  fetchData: async (url) => {
    console.log('fetchData called with url:', url);
    try {
      if (!browser) {
        browser = await launchBrowser();
      }

      const page = await browser.newPage();
      
      // 设置手机端 User-Agent
      await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1');
      
      // 设置视口大小为手机尺寸
      await page.setViewport({ 
        width: 375,
        height: 812,
        isMobile: true,
        hasTouch: true
      });
      
      // 启用请求拦截
      await page.setRequestInterception(true);
      
      // 监听请求，只允许文档和脚本通过
      page.on('request', request => {
        const resourceType = request.resourceType();
        if (resourceType === 'document' || resourceType === 'script') {
          request.continue();
        } else {
          request.abort();
        }
      });

      // 导航到页面并等待加载完成
      console.log('开始加载页面...');
      await page.goto(url, { 
        waitUntil: ['networkidle0', 'domcontentloaded'],
        timeout: 30000 
      });
      
      console.log('页面加载完成，开始查找元素');
      
      // 等待页面内容加载
      await page.waitForFunction(() => {
        return document.readyState === 'complete';
      });
      
      // 获取页面内容
      const pageData = await page.evaluate(() => {
        // 获取场观数据
        const viewerElement = document.querySelector('.live-watch.font6.color-9');
        const viewerCount = viewerElement ? viewerElement.textContent.trim() : null;
        
        // 获取标题
        const titleElement = document.querySelector('.article-title.font1_c.color-2');
        const title = titleElement ? titleElement.textContent.trim() : document.title;
        
        return {
          title: title,
          views: viewerCount,
          url: window.location.href,
          html: document.documentElement.outerHTML
        };
      });
      
      console.log('页面数据:', {
        title: pageData.title,
        views: pageData.views,
        url: pageData.url
      });
      
      // 如果找不到观看人数，保存 HTML 以供分析
      if (!pageData.views) {
        console.log('未找到观看人数，页面 URL:', pageData.url);
        console.log('未找到观看人数，完整 HTML:', pageData.html);
      }
      
      await page.close();
      
      return {
        title: pageData.title || '未找到标题',
        views: pageData.views || '未找到观看人数'
      };
      
    } catch (error) {
      console.error('抓取失败:', error);
      return {
        error: error.message || '网络请求失败，请检查网址是否正确'
      };
    }
  }
};

// 确保在应用退出时关闭浏览器
process.on('exit', async () => {
  if (browser) {
    await browser.close();
  }
});

// 确保 API 被正确暴露
try {
  contextBridge.exposeInMainWorld('api', api);
  console.log('API exposed successfully');
} catch (error) {
  console.error('Failed to expose API:', error);
  throw error;
}
