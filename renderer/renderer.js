let timer = null;
let startTime = null;
let refreshCount = 0;
let durationTimer = null;
let nextRefreshTimer = null;
let nextRefreshTime = null;
let refreshInterval = 10; // 默认刷新间隔（秒）

const startButton = document.getElementById('start');
const stopButton = document.getElementById('stop');
const urlInput = document.getElementById('url');
const refreshIntervalInput = document.getElementById('refresh-interval');
const titleElement = document.getElementById('title');
const viewsElement = document.getElementById('views');
const durationElement = document.getElementById('duration');
const refreshCountElement = document.getElementById('refresh-count');
const nextRefreshElement = document.getElementById('next-refresh');
const logContainer = document.getElementById('log-container');

// 验证输入
function validateInputs() {
  const url = urlInput.value.trim();
  const interval = parseInt(refreshIntervalInput.value);
  
  if (!url) {
    alert('请输入直播网址');
    return false;
  }
  
  if (isNaN(interval) || interval < 5) {
    alert('请输入有效的刷新间隔，最小为5秒');
    refreshIntervalInput.value = '5';
    return false;
  }
  
  return true;
}

// 格式化时间
function formatDate(date) {
  const pad = (n) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

// 添加日志
function addLog(views) {
  const now = new Date();
  const logEntry = document.createElement('p');
  logEntry.textContent = `${formatDate(now)}    场观：${views}`;
  logContainer.insertBefore(logEntry, logContainer.firstChild);
}

// 更新下次刷新倒计时
function updateNextRefresh() {
  if (!nextRefreshTime) return;
  
  const now = new Date();
  const diff = Math.max(0, Math.ceil((nextRefreshTime - now) / 1000));
  nextRefreshElement.innerText = `${diff}秒`;
}

// 更新监控时长
function updateDuration() {
  if (!startTime) return;
  
  const now = new Date();
  const diff = Math.floor((now - startTime) / 1000); // 转换为秒
  const minutes = Math.floor(diff / 60);
  const seconds = diff % 60;
  durationElement.innerText = `${minutes}分钟${seconds}秒`;
}

// 重置所有状态
function resetMonitoring() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (durationTimer) {
    clearInterval(durationTimer);
    durationTimer = null;
  }
  if (nextRefreshTimer) {
    clearInterval(nextRefreshTimer);
    nextRefreshTimer = null;
  }
  startTime = null;
  nextRefreshTime = null;
  refreshCount = 0;
  startButton.disabled = false;
  stopButton.disabled = true;
  refreshIntervalInput.disabled = false;
  titleElement.innerText = '-';
  viewsElement.innerText = '-';
  durationElement.innerText = '0分钟0秒';
  refreshCountElement.innerText = '0';
  nextRefreshElement.innerText = '-';
}

// 开始监控
startButton.addEventListener('click', async () => {
  if (!validateInputs()) return;
  
  const url = urlInput.value.trim();
  refreshInterval = parseInt(refreshIntervalInput.value);

  try {
    startButton.disabled = true;
    stopButton.disabled = false;
    refreshIntervalInput.disabled = true;
    
    // 重置计数器
    refreshCount = 0;
    startTime = new Date();
    refreshCountElement.innerText = '0';
    
    // 开始计时
    durationTimer = setInterval(updateDuration, 1000);
    
    // 开始倒计时更新
    nextRefreshTimer = setInterval(updateNextRefresh, 1000);
    
    // 先立即获取一次
    await fetchAndUpdate(url);
    
    // 清除之前的定时器
    if (timer) {
      clearInterval(timer);
    }
    
    // 设置新的定时器
    timer = setInterval(() => fetchAndUpdate(url), refreshInterval * 1000);
  } catch (error) {
    console.error('监控启动失败:', error);
    resetMonitoring();
  }
});

// 停止监控
stopButton.addEventListener('click', () => {
  resetMonitoring();
});

// 限制刷新间隔的输入范围
refreshIntervalInput.addEventListener('change', () => {
  const value = parseInt(refreshIntervalInput.value);
  if (isNaN(value) || value < 5) {
    refreshIntervalInput.value = '5';
  }
});

async function fetchAndUpdate(url) {
  try {
    // 更新下次刷新时间
    nextRefreshTime = new Date(Date.now() + refreshInterval * 1000);
    
    const res = await window.api.fetchData(url);
    if (res.error) {
      throw new Error(res.error);
    }
    
    titleElement.innerText = res.title;
    viewsElement.innerText = res.views;
    
    // 添加日志
    addLog(res.views);
    
    // 更新刷新次数
    refreshCount++;
    refreshCountElement.innerText = refreshCount.toString();
  } catch (error) {
    alert('抓取失败: ' + error.message);
    resetMonitoring();
  }
}
