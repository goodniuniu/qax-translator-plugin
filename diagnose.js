// diagnose.js - 诊断工具脚本
const logContainer = document.getElementById('logContainer');
const apiUrlInput = document.getElementById('apiUrl');
const modelNameInput = document.getElementById('modelName');
const apiKeyInput = document.getElementById('apiKey');

// 默认配置
const DEFAULT_CONFIG = {
  apiUrl: 'http://10.3.4.21:8000/v1',
  modelName: '',  // 留空让后端自动选择默认模型
  apiKey: ''
};

function addLog(level, message) {
  const time = new Date().toLocaleTimeString();
  const levelClass = {
    'INFO': 'log-info',
    'SUCCESS': 'log-success',
    'ERROR': 'log-error',
    'WARN': 'log-warn'
  }[level] || 'log-info';

  const line = document.createElement('div');
  line.innerHTML = `<span class="log-time">[${time}]</span> <span class="${levelClass}">[${level}]</span> ${message}`;
  
  if (logContainer.innerHTML.includes('等待开始')) {
    logContainer.innerHTML = '';
  }
  
  logContainer.appendChild(line);
  logContainer.scrollTop = logContainer.scrollHeight;
}

async function loadConfig() {
  addLog('INFO', '正在加载配置...');
  try {
    const config = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'getConfig' }, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          // 确保返回有效对象
          resolve(result || {});
        }
      });
    });
    
    // 使用默认值确保不会 undefined
    apiUrlInput.value = config.apiUrl || DEFAULT_CONFIG.apiUrl;
    modelNameInput.value = config.modelName || DEFAULT_CONFIG.modelName;
    apiKeyInput.value = config.apiKey || DEFAULT_CONFIG.apiKey;
    
    const apiKeyStatus = config.apiKey ? '已设置' : '未设置';
    addLog('SUCCESS', `配置加载成功: ${apiUrlInput.value}, API Key: ${apiKeyStatus}`);
  } catch (error) {
    addLog('ERROR', `加载配置失败: ${error.message}`);
    // 使用默认值
    apiUrlInput.value = DEFAULT_CONFIG.apiUrl;
    modelNameInput.value = DEFAULT_CONFIG.modelName;
    apiKeyInput.value = DEFAULT_CONFIG.apiKey;
  }
}

  async function testBasicConnection() {
    addLog('INFO', '开始基础连接测试...');
    document.getElementById('basicResult').innerHTML = '';

    const config = {
      apiUrl: apiUrlInput.value,
      apiKey: apiKeyInput.value.trim()
    };

    try {
      // 测试直接 fetch
      addLog('INFO', `尝试连接: ${config.apiUrl}/models`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      // 构建请求头
      const headers = {};
      if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
        addLog('INFO', '使用 API Key 进行认证');
      }
      
      const startTime = Date.now();
      const response = await fetch(`${config.apiUrl}/models`, {
        method: 'GET',
        headers: headers,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      const duration = Date.now() - startTime;
      
      addLog('INFO', `收到响应: ${response.status} ${response.statusText} (${duration}ms)`);
      
      let resultHtml = '';
      if (response.ok) {
        const data = await response.json();
        const modelCount = data.data ? data.data.length : 0;
        addLog('SUCCESS', `API 服务正常，发现 ${modelCount} 个模型`);
        resultHtml = `
          <div class="result-box success">
            <div class="result-title">✅ 连接成功</div>
            <p>响应状态: ${response.status}</p>
            <p>响应时间: ${duration}ms</p>
            <p>可用模型: ${modelCount} 个</p>
          </div>
        `;
      } else {
        let responseText = '';
        try {
          responseText = await response.text();
        } catch {}
        
        addLog('WARN', `API 返回非 200 状态: ${response.status}`);
        resultHtml = `
          <div class="result-box error">
            <div class="result-title">⚠️ 服务返回异常</div>
            <p>状态码: ${response.status} ${response.statusText}</p>
            <p>响应时间: ${duration}ms</p>
            ${responseText ? `<p>响应内容: ${responseText.substring(0, 200)}</p>` : ''}
            <div class="tip" style="margin-top: 8px;">
              <div class="tip-title">提示</div>
              <p>HTTP ${response.status} 不代表服务不可用，继续尝试完整功能测试。</p>
            </div>
          </div>
        `;
      }
      
      document.getElementById('basicResult').innerHTML = resultHtml;
      
    } catch (error) {
      addLog('ERROR', `连接失败: ${error.message}`);
      document.getElementById('basicResult').innerHTML = `
        <div class="result-box error">
          <div class="result-title">❌ 连接失败</div>
          <p>错误信息: ${error.message}</p>
          <div class="tip" style="margin-top: 8px;">
            <div class="tip-title">排查建议</div>
            <p>1. 检查 API 地址是否正确</p>
            <p>2. 检查网络是否可访问 ${config.apiUrl}</p>
            <p>3. 检查后端服务是否已启动</p>
          </div>
        </div>
      `;
    }
  }

  async function testFullConnection() {
    const testText = document.getElementById('testText').value || 'Hello, world!';
    addLog('INFO', `开始完整功能测试，测试文本: "${testText}"`);
    document.getElementById('fullResult').innerHTML = '';

    try {
      addLog('INFO', '通过 background 发送翻译请求...');
      
      const result = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('请求超时（35秒）'));
        }, 35000);

        chrome.runtime.sendMessage({ action: 'translate', text: testText }, (response) => {
          clearTimeout(timeout);
          
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });

      addLog('INFO', `收到响应: ${JSON.stringify(result).substring(0, 200)}...`);

      if (!result) {
        throw new Error('返回结果为空');
      }

      if (result.success) {
        addLog('SUCCESS', `翻译成功: ${result.detectedLanguage} -> ${result.translation}`);
        document.getElementById('fullResult').innerHTML = `
          <div class="result-box success">
            <div class="result-title">✅ 翻译成功</div>
            <p><strong>原文:</strong> ${result.originalText}</p>
            <p><strong>检测语言:</strong> ${result.detectedLanguage}</p>
            <p><strong>译文:</strong> ${result.translation}</p>
          </div>
        `;
      } else {
        addLog('ERROR', `翻译失败: ${result.error}`);
        document.getElementById('fullResult').innerHTML = `
          <div class="result-box error">
            <div class="result-title">❌ 翻译失败</div>
            <p>${result.error.replace(/\n/g, '<br>')}</p>
            ${result.debugInfo ? `
              <details style="margin-top: 8px;">
                <summary>调试信息</summary>
                <pre style="margin-top: 8px; font-size: 11px; background: #f0f0f0; padding: 8px; border-radius: 4px;">${JSON.stringify(result.debugInfo, null, 2)}</pre>
              </details>
            ` : ''}
          </div>
        `;
      }
    } catch (error) {
      addLog('ERROR', `测试失败: ${error.message}`);
      document.getElementById('fullResult').innerHTML = `
        <div class="result-box error">
          <div class="result-title">❌ 测试失败</div>
          <p>${error.message}</p>
          <div class="tip" style="margin-top: 8px;">
            <div class="tip-title">排查建议</div>
            <p>1. 检查插件是否已重新加载</p>
            <p>2. 查看浏览器控制台（F12）是否有错误</p>
            <p>3. 尝试刷新页面后重试</p>
          </div>
        </div>
      `;
    }
  }

  // 事件监听
  document.getElementById('refreshConfig').addEventListener('click', loadConfig);
  document.getElementById('openSettings').addEventListener('click', () => {
    chrome.runtime.openOptionsPage?.() || window.open('popup.html');
  });
  
  // 获取模型列表
  document.getElementById('fetchModels').addEventListener('click', async () => {
    addLog('INFO', '正在获取可用模型列表...');
    const modelsListDiv = document.getElementById('modelsList');
    modelsListDiv.innerHTML = '<span style="color: #666;">查询中...</span>';
    
    try {
      const apiUrl = apiUrlInput.value;
      const apiKey = apiKeyInput.value.trim();
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      // 构建请求头
      const headers = {};
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
        addLog('INFO', '使用 API Key 进行认证');
      }
      
      const response = await fetch(`${apiUrl}/models`, {
        method: 'GET',
        headers: headers,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        // 特殊处理 401 错误
        if (response.status === 401) {
          throw new Error(`HTTP 401: 未授权\n\n💡 解决方案：\n1. 如果使用内部部署服务（如 10.3.4.21），通常不需要 API Key\n2. 如果使用互联网服务，请在设置中配置正确的 API Key\n3. 检查 API Key 是否正确填写`);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      addLog('SUCCESS', `获取到 ${data.data?.length || 0} 个模型`);
      
      if (data.data && data.data.length > 0) {
        const modelsHtml = data.data.map(m => {
          const isSelected = m.id === modelNameInput.value ? '✓ ' : '';
          return `<div style="padding: 4px 0; border-bottom: 1px solid #eee; ${isSelected ? 'font-weight: bold; color: #2b579a;' : ''}">
            ${isSelected}${m.id}
          </div>`;
        }).join('');
        modelsListDiv.innerHTML = modelsHtml;
      } else {
        modelsListDiv.innerHTML = '<span style="color: #999;">未找到可用模型</span>';
      }
    } catch (error) {
      addLog('ERROR', `获取模型列表失败: ${error.message}`);
      modelsListDiv.innerHTML = `<span style="color: #c62828;">获取失败: ${error.message.replace(/\n/g, '<br>')}</span>`;
    }
  });
  document.getElementById('testBasic').addEventListener('click', testBasicConnection);
  document.getElementById('testFull').addEventListener('click', testFullConnection);
  document.getElementById('testChinese').addEventListener('click', () => {
    document.getElementById('testText').value = '这是一段中文测试';
    testFullConnection();
  });
  document.getElementById('clearLog').addEventListener('click', () => {
    logContainer.innerHTML = '<span class="log-time">[等待开始]</span> 日志已清空，点击上方按钮开始诊断...';
  });
  document.getElementById('copyLog').addEventListener('click', () => {
    const text = logContainer.innerText;
    navigator.clipboard.writeText(text).then(() => {
      addLog('SUCCESS', '日志已复制到剪贴板');
    }).catch(err => {
      addLog('ERROR', '复制失败: ' + err.message);
    });
  });

  // 初始化
  loadConfig();
// 脚本结束
