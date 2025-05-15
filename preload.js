const { contextBridge } = require('electron');
const puppeteer = require('puppeteer');
const path = require('path');

// 添加调试信息
console.log('Preload script is running');

let browser = null;

// 定义 API 对象
const api = {
  fetchData: async (url) => {
    console.log('fetchData called with url:', url);
    try {
      if (!browser) {
        browser = await puppeteer.launch({
          headless: 'new',
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
      }

      const page = await browser.newPage();
      
      // 设置视口大小
      await page.setViewport({ width: 1280, height: 800 });
      
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
        // 在页面上下文中执行的函数
        const findViewerCount = () => {
          // 尝试各种可能的选择器
          const selectors = [
            '#j-watches-num',
            '.watch-num',
            '.viewer-count',
            '[data-watch-num]',
            '[data-viewers]',
            '.live-player-viewer-count',
            // 添加更多可能的选择器
            '.watch_count',
            '.viewer_count',
            '.live-viewer-count',
            '.audience-count',
            '#watch-counter'
          ];
          
          // 记录所有找到的元素
          const foundElements = [];
          
          // 检查所有选择器
          for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
              foundElements.push({
                selector: selector,
                text: element.textContent.trim(),
                isVisible: element.offsetParent !== null
              });
            });
          }
          
          // 如果找到了元素，返回第一个可见元素的文本
          const visibleElement = foundElements.find(e => e.isVisible);
          if (visibleElement) {
            return visibleElement.text;
          }
          
          // 如果没有找到，尝试查找包含特定关键词的元素
          const keywords = ['观看', '人气', '观众', '在线', 'watching', 'viewers', '人数', '热度'];
          const elements = document.getElementsByTagName('*');
          const keywordElements = [];
          
          for (const element of elements) {
            const text = element.textContent.trim();
            if (keywords.some(keyword => text.includes(keyword))) {
              keywordElements.push({
                text: text,
                id: element.id,
                className: element.className,
                isVisible: element.offsetParent !== null
              });
            }
          }
          
          console.log('找到的关键词元素:', keywordElements);
          
          // 返回第一个可见的包含关键词的元素
          const visibleKeywordElement = keywordElements.find(e => e.isVisible);
          return visibleKeywordElement ? visibleKeywordElement.text : null;
        };
        
        const viewerCount = findViewerCount();
        console.log('找到的观看人数:', viewerCount);
        
        return {
          title: document.title,
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
