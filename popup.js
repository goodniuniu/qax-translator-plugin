/**
 * Popup Script
 * 设置页面逻辑 - 增强错误处理和诊断功能
 */

document.addEventListener('DOMContentLoaded', async () => {
  // DOM 元素
  const apiUrlInput = document.getElementById('apiUrl');
  const modelNameInput = document.getElementById('modelName');
  const apiKeyInput = document.getElementById('apiKey');
  const scenarioInput = document.getElementById('scenario');
  const testBtn = document.getElementById('testBtn');
  const saveBtn = document.getElementById('saveBtn');
  const statusContainer = document.getElementById('statusContainer');
  const statusContent = document.getElementById('statusContent');

  // 默认配置
  const DEFAULT_CONFIG = {
    apiUrl: 'http://10.3.4.1:1025/v1',
    modelName: 'deepseekr1',
    scenario: 'general'
  };

  // 诊断日志
  const logs = [];
  function addLog(level, message) {
    const timestamp = new Date().toLocaleTimeString();
    logs.push(`[${timestamp}] [${level}] ${message}`);
    console.log(`[QAX Translator Popup] ${level}: ${message}`);
  }

  /**
   * 加载保存的配置
   */
  function loadConfig() {
    addLog('INFO', '正在加载配置...');
    chrome.storage.sync.get(['apiUrl', 'modelName', 'apiKey', 'scenario'], (data) => {
      if (chrome.runtime.lastError) {
        addLog('ERROR', `加载配置失败: ${chrome.runtime.lastError.message}`);
        showStatus('error', `加载配置失败: ${chrome.runtime.lastError.message}`);
        // 使用默认值
        apiUrlInput.value = DEFAULT_CONFIG.apiUrl;
        modelNameInput.value = DEFAULT_CONFIG.modelName;
        apiKeyInput.value = '';
        scenarioInput.value = DEFAULT_CONFIG.scenario;
        return;
      }
      
      // 确保有默认值
      apiUrlInput.value = (data && data.apiUrl) || DEFAULT_CONFIG.apiUrl;
      modelNameInput.value = (data && data.modelName) || DEFAULT_CONFIG.modelName;
      apiKeyInput.value = (data && data.apiKey) || '';
      scenarioInput.value = (data && data.scenario) || DEFAULT_CONFIG.scenario;
      addLog('INFO', '配置加载成功');
    });
  }

  /**
   * 保存配置
   */
  function saveConfig() {
    const apiUrl = apiUrlInput.value.trim();
    const modelName = modelNameInput.value.trim();
    const apiKey = apiKeyInput.value.trim();
    const scenario = scenarioInput.value;

    addLog('INFO', `正在保存配置: apiUrl=${apiUrl}, modelName=${modelName}, apiKey=${apiKey ? '***' : '(空)'}, scenario=${scenario}`);

    // 验证 API URL
    if (!apiUrl) {
      showStatus('error', '请输入 API 接口地址');
      return;
    }

    // 规范化 URL（移除末尾的斜杠）
    let normalizedUrl = apiUrl.replace(/\/$/, '');
    
    // 验证 URL 格式
    try {
      new URL(normalizedUrl);
    } catch (e) {
      showStatus('error', '请输入有效的 URL 地址');
      return;
    }

    chrome.storage.sync.set({
      apiUrl: normalizedUrl,
      modelName: modelName,
      apiKey: apiKey,
      scenario: scenario
    }, () => {
      if (chrome.runtime.lastError) {
        addLog('ERROR', `保存配置失败: ${chrome.runtime.lastError.message}`);
        showStatus('error', `保存失败: ${chrome.runtime.lastError.message}`);
      } else {
        addLog('INFO', '配置保存成功');
        showStatus('success', '设置已保存');
      }
    });
  }

  /**
   * 测试 API 连接 - 增强版，带详细诊断（纯回调方式）
   */
  function testConnection() {
    showStatus('loading', '正在测试连接...');
    testBtn.disabled = true;
    logs.length = 0;
    addLog('INFO', '开始测试连接...');

    // 先检查 background 是否响应
    addLog('INFO', '检查后台服务状态...');
    
    // 设置超时
    const testTimeout = setTimeout(() => {
      addLog('ERROR', '测试连接超时（10秒），后台服务可能未响应');
      showStatus('error', '❌ 测试失败: 请求超时（10秒），后台服务可能未响应\n\n🔧 可能原因：\n1. 插件刚刚加载，请等待几秒后重试\n2. 插件需要刷新，请访问 chrome://extensions/ 并点击刷新按钮\n3. 浏览器控制台可能有更多错误信息');
      testBtn.disabled = false;
    }, 10000);

    chrome.runtime.sendMessage({ action: 'testConnection' }, (result) => {
      clearTimeout(testTimeout);
      
      if (chrome.runtime.lastError) {
        addLog('ERROR', `后台通信错误: ${chrome.runtime.lastError.message}`);
        showStatus('error', `❌ 测试失败: 后台通信错误\n\n错误信息: ${chrome.runtime.lastError.message}\n\n🔧 可能原因：\n1. 插件刚刚加载，请等待几秒后重试\n2. 插件需要刷新，请访问 chrome://extensions/ 并点击刷新按钮\n3. 浏览器控制台可能有更多错误信息`);
        testBtn.disabled = false;
        return;
      }
      
      addLog('INFO', `收到响应: ${JSON.stringify(result).substring(0, 200)}...`);

      // 检查响应是否有效
      if (!result) {
        addLog('ERROR', '后台返回空响应');
        showStatus('error', '❌ 测试失败: 后台返回空响应，请检查插件是否已重新加载\n\n🔧 可能原因：\n1. 插件刚刚加载，请等待几秒后重试\n2. 插件需要刷新，请访问 chrome://extensions/ 并点击刷新按钮');
        testBtn.disabled = false;
        return;
      }

      if (typeof result !== 'object') {
        addLog('ERROR', `响应格式错误: ${typeof result}`);
        showStatus('error', `❌ 测试失败: 响应格式错误\n\n错误信息: 响应格式错误: ${typeof result}`);
        testBtn.disabled = false;
        return;
      }

      if (result.success === undefined) {
        addLog('ERROR', '响应缺少 success 字段');
        showStatus('error', '❌ 测试失败: 响应缺少 success 字段，可能是 API 返回格式错误');
        testBtn.disabled = false;
        return;
      }

      if (result.success) {
        addLog('SUCCESS', '测试连接成功');
        showStatus('success',
          `✅ 连接成功！\n` +
          `检测语言: ${result.detectedLanguage}\n` +
          `译文: ${result.translation.substring(0, 50)}${result.translation.length > 50 ? '...' : ''}`
        );
      } else {
        // 构建详细错误信息
        let errorDetail = result.error || '未知错误';
        
        // 添加诊断建议
        if (errorDetail.includes('fetch') || errorDetail.includes('连接')) {
          errorDetail += '\n\n💡 建议检查：';
          errorDetail += '\n1. API 地址是否正确（应为 http://IP:PORT/v1）';
          errorDetail += '\n2. 网络是否可以访问该地址';
          errorDetail += '\n3. 服务是否已启动';
        } else if (errorDetail.includes('HTTP')) {
          errorDetail += '\n\n💡 建议检查：';
          errorDetail += '\n1. API 路径是否正确（应为 /v1/chat/completions）';
          errorDetail += '\n2. 服务是否支持 OpenAI 兼容格式';
        } else if (errorDetail.includes('JSON') || errorDetail.includes('格式')) {
          errorDetail += '\n\n💡 建议检查：';
          errorDetail += '\n1. 模型是否正确配置了提示词';
          errorDetail += '\n2. 后端返回的格式是否为标准 JSON';
        }
        
        addLog('ERROR', '测试连接失败');
        showStatus('error', errorDetail);
      }
      
      testBtn.disabled = false;
    });
  }

  /**
   * 显示状态信息
   */
  function showStatus(type, message) {
    statusContainer.classList.remove('hidden');
    statusContent.className = 'status';
    
    let icon = '';
    
    switch (type) {
      case 'success':
        statusContent.classList.add('status-success');
        icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>`;
        break;
      case 'error':
        statusContent.classList.add('status-error');
        icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>`;
        break;
      case 'loading':
        statusContent.classList.add('status-loading');
        icon = `<div class="spinner"></div>`;
        break;
    }
    
    // 将换行符转换为 <br>
    const formattedMessage = escapeHtml(message).replace(/\n/g, '<br>');
    statusContent.innerHTML = `${icon}<span style="white-space: pre-wrap;">${formattedMessage}</span>`;
  }

  /**
   * HTML 转义
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 事件监听
  saveBtn.addEventListener('click', saveConfig);
  testBtn.addEventListener('click', testConnection);

  // 诊断按钮
  const diagnoseBtn = document.getElementById('diagnoseBtn');
  if (diagnoseBtn) {
    diagnoseBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('diagnose.html') });
    });
  }

  // 输入框回车保存
  apiUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveConfig();
  });
  modelNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveConfig();
  });
  apiKeyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveConfig();
  });

  // 加载配置
  loadConfig();
});
