// diagnose.js - 诊断工具脚本
const logContainer = document.getElementById('logContainer');
const apiUrlInput = document.getElementById('apiUrl');
const modelNameInput = document.getElementById('modelName');
const apiKeyInput = document.getElementById('apiKey');

// 默认配置
const DEFAULT_CONFIG = {
  apiUrl: 'http://10.3.4.1:1025/v1',
  modelName: 'deepseekr1',
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

function loadConfig() {
  addLog('INFO', '正在加载配置...');
  chrome.runtime.sendMessage({ action: 'getConfig' }, (result) => {
    if (chrome.runtime.lastError) {
      addLog('ERROR', `加载配置失败: ${chrome.runtime.lastError.message}`);
      // 使用默认值
      apiUrlInput.value = DEFAULT_CONFIG.apiUrl;
      modelNameInput.value = DEFAULT_CONFIG.modelName;
      apiKeyInput.value = DEFAULT_CONFIG.apiKey;
      return;
    }
    
    // 确保返回有效对象
    const config = result || {};
    
    // 使用默认值确保不会 undefined
    apiUrlInput.value = config.apiUrl || DEFAULT_CONFIG.apiUrl;
    modelNameInput.value = config.modelName || DEFAULT_CONFIG.modelName;
    apiKeyInput.value = config.apiKey || DEFAULT_CONFIG.apiKey;
    
    const apiKeyStatus = config.apiKey ? '已设置' : '未设置';
    addLog('SUCCESS', `配置加载成功: ${apiUrlInput.value}, API Key: ${apiKeyStatus}`);
  });
}

  function testBasicConnection() {
    addLog('INFO', '开始基础连接测试...');
    document.getElementById('basicResult').innerHTML = '';

    const config = {
      apiUrl: apiUrlInput.value,
      apiKey: apiKeyInput.value.trim()
    };

    // 使用 XMLHttpRequest 替代 fetch
    addLog('INFO', `尝试连接: ${config.apiUrl}/models`);
    
    const xhr = new XMLHttpRequest();
    const startTime = Date.now();
    
    // 设置超时
    const timeoutId = setTimeout(() => {
      xhr.abort();
      addLog('ERROR', '连接超时（5秒）');
      document.getElementById('basicResult').innerHTML = `
        <div class="result-box error">
          <div class="result-title">❌ 连接失败</div>
          <p>错误信息: 连接超时（5秒）</p>
          <div class="tip" style="margin-top: 8px;">
            <div class="tip-title">排查建议</div>
            <p>1. 检查 API 地址是否正确</p>
            <p>2. 检查网络是否可访问 ${config.apiUrl}</p>
            <p>3. 检查后端服务是否已启动</p>
          </div>
        </div>
      `;
    }, 5000);
    
    xhr.open('GET', `${config.apiUrl}/models`, true);
    
    // 构建请求头
    if (config.apiKey) {
      xhr.setRequestHeader('Authorization', `Bearer ${config.apiKey}`);
      addLog('INFO', '使用 API Key 进行认证');
    }
    xhr.setRequestHeader('Accept', 'application/json');
    
    xhr.onload = function() {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      
      addLog('INFO', `收到响应: ${xhr.status} ${xhr.statusText} (${duration}ms)`);
      
      let resultHtml = '';
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          const modelCount = data.data ? data.data.length : 0;
          addLog('SUCCESS', `API 服务正常，发现 ${modelCount} 个模型`);
          resultHtml = `
            <div class="result-box success">
              <div class="result-title">✅ 连接成功</div>
              <p>响应状态: ${xhr.status}</p>
              <p>响应时间: ${duration}ms</p>
              <p>可用模型: ${modelCount} 个</p>
            </div>
          `;
        } catch (e) {
          addLog('WARN', '响应解析失败');
          resultHtml = `
            <div class="result-box error">
              <div class="result-title">⚠️ 响应解析失败</div>
              <p>响应状态: ${xhr.status}</p>
              <p>响应时间: ${duration}ms</p>
            </div>
          `;
        }
      } else {
        addLog('WARN', `API 返回非 200 状态: ${xhr.status}`);
        resultHtml = `
          <div class="result-box error">
            <div class="result-title">⚠️ 服务返回异常</div>
            <p>状态码: ${xhr.status} ${xhr.statusText}</p>
            <p>响应时间: ${duration}ms</p>
            ${xhr.responseText ? `<p>响应内容: ${xhr.responseText.substring(0, 200)}</p>` : ''}
            <div class="tip" style="margin-top: 8px;">
              <div class="tip-title">提示</div>
              <p>HTTP ${xhr.status} 不代表服务不可用，继续尝试完整功能测试。</p>
            </div>
          </div>
        `;
      }
      
      document.getElementById('basicResult').innerHTML = resultHtml;
    };
    
    xhr.onerror = function() {
      clearTimeout(timeoutId);
      addLog('ERROR', '连接失败');
      document.getElementById('basicResult').innerHTML = `
        <div class="result-box error">
          <div class="result-title">❌ 连接失败</div>
          <p>错误信息: 网络错误</p>
          <div class="tip" style="margin-top: 8px;">
            <div class="tip-title">排查建议</div>
            <p>1. 检查 API 地址是否正确</p>
            <p>2. 检查网络是否可访问 ${config.apiUrl}</p>
            <p>3. 检查后端服务是否已启动</p>
          </div>
        </div>
      `;
    };
    
    xhr.send();
  }

  function testFullConnection() {
    const testText = document.getElementById('testText').value || 'Hello, world!';
    addLog('INFO', `开始完整功能测试，测试文本: "${testText}"`);
    document.getElementById('fullResult').innerHTML = '';

    addLog('INFO', '通过 background 发送翻译请求...');
    
    // 设置超时
    const timeoutId = setTimeout(() => {
      addLog('ERROR', '请求超时（35秒）');
      document.getElementById('fullResult').innerHTML = `
        <div class="result-box error">
          <div class="result-title">❌ 测试失败</div>
          <p>请求超时（35秒）</p>
          <div class="tip" style="margin-top: 8px;">
            <div class="tip-title">排查建议</div>
            <p>1. 检查插件是否已重新加载</p>
            <p>2. 查看浏览器控制台（F12）是否有错误</p>
            <p>3. 尝试刷新页面后重试</p>
          </div>
        </div>
      `;
    }, 35000);

    chrome.runtime.sendMessage({ action: 'translate', text: testText }, (response) => {
      clearTimeout(timeoutId);
      
      if (chrome.runtime.lastError) {
        addLog('ERROR', `翻译请求失败: ${chrome.runtime.lastError.message}`);
        document.getElementById('fullResult').innerHTML = `
          <div class="result-box error">
            <div class="result-title">❌ 测试失败</div>
            <p>${chrome.runtime.lastError.message}</p>
            <div class="tip" style="margin-top: 8px;">
              <div class="tip-title">排查建议</div>
              <p>1. 检查插件是否已重新加载</p>
              <p>2. 查看浏览器控制台（F12）是否有错误</p>
              <p>3. 尝试刷新页面后重试</p>
            </div>
          </div>
        `;
        return;
      }

      addLog('INFO', `收到响应: ${JSON.stringify(response).substring(0, 200)}...`);

      if (!response) {
        addLog('ERROR', '返回结果为空');
        document.getElementById('fullResult').innerHTML = `
          <div class="result-box error">
            <div class="result-title">❌ 测试失败</div>
            <p>返回结果为空</p>
            <div class="tip" style="margin-top: 8px;">
              <div class="tip-title">排查建议</div>
              <p>1. 检查插件是否已重新加载</p>
              <p>2. 查看浏览器控制台（F12）是否有错误</p>
              <p>3. 尝试刷新页面后重试</p>
            </div>
          </div>
        `;
        return;
      }

      if (response.success) {
        addLog('SUCCESS', `翻译成功: ${response.detectedLanguage} -> ${response.translation}`);
        document.getElementById('fullResult').innerHTML = `
          <div class="result-box success">
            <div class="result-title">✅ 翻译成功</div>
            <p><strong>原文:</strong> ${response.originalText}</p>
            <p><strong>检测语言:</strong> ${response.detectedLanguage}</p>
            <p><strong>译文:</strong> ${response.translation}</p>
          </div>
        `;
      } else {
        addLog('ERROR', `翻译失败: ${response.error}`);
        document.getElementById('fullResult').innerHTML = `
          <div class="result-box error">
            <div class="result-title">❌ 翻译失败</div>
            <p>${response.error.replace(/\n/g, '<br>')}</p>
            ${response.debugInfo ? `
              <details style="margin-top: 8px;">
                <summary>调试信息</summary>
                <pre style="margin-top: 8px; font-size: 11px; background: #f0f0f0; padding: 8px; border-radius: 4px;">${JSON.stringify(response.debugInfo, null, 2)}</pre>
              </details>
            ` : ''}
          </div>
        `;
      }
    });
  }

  // 事件监听
  document.getElementById('refreshConfig').addEventListener('click', loadConfig);
  document.getElementById('openSettings').addEventListener('click', () => {
    chrome.runtime.openOptionsPage?.() || window.open('popup.html');
  });
  
  // 获取模型列表
  document.getElementById('fetchModels').addEventListener('click', function() {
    addLog('INFO', '正在获取可用模型列表...');
    const modelsListDiv = document.getElementById('modelsList');
    modelsListDiv.innerHTML = '<span style="color: #666;">查询中...</span>';
    
    const apiUrl = apiUrlInput.value;
    const apiKey = apiKeyInput.value.trim();
    
    // 使用 XMLHttpRequest 替代 fetch
    const xhr = new XMLHttpRequest();
    
    // 设置超时
    const timeoutId = setTimeout(() => {
      xhr.abort();
      addLog('ERROR', '连接超时（5秒）');
      modelsListDiv.innerHTML = `<span style="color: #c62828;">获取失败: 连接超时（5秒）</span>`;
    }, 5000);
    
    xhr.open('GET', `${apiUrl}/models`, true);
    
    // 构建请求头
    if (apiKey) {
      xhr.setRequestHeader('Authorization', `Bearer ${apiKey}`);
      addLog('INFO', '使用 API Key 进行认证');
    }
    xhr.setRequestHeader('Accept', 'application/json');
    
    xhr.onload = function() {
      clearTimeout(timeoutId);
      
      if (xhr.status === 401) {
        addLog('ERROR', 'HTTP 401: 未授权');
        modelsListDiv.innerHTML = `<span style="color: #c62828;">获取失败: HTTP 401: 未授权<br><br>💡 解决方案：<br>1. 如果使用内部部署服务（如 10.3.4.21），通常不需要 API Key<br>2. 如果使用互联网服务，请在设置中配置正确的 API Key<br>3. 检查 API Key 是否正确填写</span>`;
        return;
      }
      
      if (xhr.status < 200 || xhr.status >= 300) {
        addLog('ERROR', `HTTP ${xhr.status}: ${xhr.statusText}`);
        modelsListDiv.innerHTML = `<span style="color: #c62828;">获取失败: HTTP ${xhr.status}: ${xhr.statusText}</span>`;
        return;
      }
      
      try {
        const data = JSON.parse(xhr.responseText);
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
      } catch (e) {
        addLog('ERROR', '响应解析失败');
        modelsListDiv.innerHTML = `<span style="color: #c62828;">获取失败: 响应解析失败</span>`;
      }
    };
    
    xhr.onerror = function() {
      clearTimeout(timeoutId);
      addLog('ERROR', '连接失败');
      modelsListDiv.innerHTML = `<span style="color: #c62828;">获取失败: 网络错误</span>`;
    };
    
    xhr.send();
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
  document.getElementById('copyLog').addEventListener('click', function() {
    const text = logContainer.innerText;
    
    // 使用传统方法复制到剪贴板
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      
      if (successful) {
        addLog('SUCCESS', '日志已复制到剪贴板');
      } else {
        addLog('ERROR', '复制失败');
      }
    } catch (err) {
      document.body.removeChild(textarea);
      addLog('ERROR', '复制失败: ' + err.message);
    }
  });

  // 初始化
  loadConfig();
// 脚本结束
