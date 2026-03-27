/**
 * Background Service Worker
 * 处理大模型 API 调用，避免 CORS 问题
 * 增强错误处理和诊断功能
 */

// 默认配置
const DEFAULT_CONFIG = {
  apiUrl: 'http://10.3.4.1:1025/v1',
  modelName: 'deepseekr1',
  apiKey: '',  // API Key（可选，用于互联网大模型服务）
  timeout: 60000,  // 增加到60秒，以适应更长的提示词
  scenario: 'general'  // 翻译场景：general（一般翻译）或 customs（邮局海关审单）
};

// 系统提示词 - 针对 vLLM + MiniMax 模型优化
const GENERAL_SYSTEM_PROMPT = `你是一个语言检测和翻译专家。请严格按以下步骤处理用户输入：

【第一步：语言研判】
分析用户输入文本的语言类型，使用中文表述语言名称（如：英语、日语、韩语、法语、德语、西班牙语、俄语、阿拉伯语、中文等）。

【第二步：翻译处理】
- 如果是中文：直接返回原文，不做修改
- 如果是其他语言：翻译为流畅、自然的中文

【输出要求 - 严格遵守】
1. 只返回纯JSON对象，不要有<think>标签
2. 不要有思考过程、解释说明或markdown
3. JSON格式：{"detectedLanguage": "语言名称", "translation": "中文译文"}

【示例】
输入：Hello, world!
研判：英语
输出：{"detectedLanguage": "英语", "translation": "你好，世界！"}

输入：こんにちは
研判：日语
输出：{"detectedLanguage": "日语", "translation": "你好"}

输入：你好世界
研判：中文
输出：{"detectedLanguage": "中文", "translation": "你好世界"}`;

// 邮局海关审单场景提示词
const CUSTOMS_SYSTEM_PROMPT = `你是海关邮政审单系统的语言识别与翻译引擎。处理审单场景中的碎片化、多语言混合文本。

【核心任务】
1. 识别文本中的主要语言（混合文本标注所有语言，按占比排序）
2. 根据文本类型智能翻译：
   - 地址类：保留原格式，仅翻译通用方位词（区/市/省），专有地名音译或保留原文
   - 人名/机构名：音译为主，知名实体保留通行译名（如"IBM"不译）
   - 商品描述：准确翻译，保留专业术语原文并括号备注
   - 乱码/无法识别：标记为"未知/乱码"

【混合语言处理规则】
- 主语言占比<60%时，detectedLanguage格式："主要语言+辅助语言"（如"日语+英语"）
- 翻译时保持原文结构，混合部分分段处理

【输出格式 - 严格JSON】
{
  "detectedLanguage": "语言名称或混合标注",
  "confidence": "高/中/低",
  "translation": "中文译文",
  "notes": "特殊处理说明（如专有名词保留、疑似乱码等，无则留空）"
}

【审单场景示例】
输入：Shibuya-ku, Tokyo 150-0002 渋谷区
输出：{"detectedLanguage":"日语+英语","confidence":"高","translation":"涩谷区，东京都 150-0002","notes":"地址保留邮编格式，日语地名音译"}

输入：Nike Air Max 90 sneakers
输出：{"detectedLanguage":"英语","confidence":"高","translation":"Nike Air Max 90 运动鞋","notes":"品牌名保留原文"}

输入：
输出：{"detectedLanguage":"未知/乱码","confidence":"低","translation":"","notes":"输入包含不可识别字符，建议核对原始单据"}

输入：Hola señor, こんにちは
输出：{"detectedLanguage":"西班牙语+日语","confidence":"高","translation":"你好先生，你好","notes":"混合问候语分段翻译"}`;

/**
 * 获取存储的配置 - 确保始终返回有效对象
 */
async function getConfig() {
  try {
    // 使用 Promise 包装以确保正确处理
    const result = await new Promise((resolve) => {
      chrome.storage.sync.get(['apiUrl', 'modelName', 'apiKey', 'timeout', 'scenario'], (data) => {
        // 确保返回对象，即使 storage 返回 undefined
        resolve(data || {});
      });
    });
    
    // 构建配置对象，确保所有字段都有值
    const config = {
      apiUrl: result.apiUrl || DEFAULT_CONFIG.apiUrl,
      modelName: result.modelName || DEFAULT_CONFIG.modelName,
      apiKey: result.apiKey || DEFAULT_CONFIG.apiKey,
      timeout: result.timeout || DEFAULT_CONFIG.timeout,
      scenario: result.scenario || DEFAULT_CONFIG.scenario
    };
    
    console.log('[QAX Translator] 获取配置:', {
      ...config,
      apiKey: config.apiKey ? '***' : '(空)',
      scenario: config.scenario
    });
    return config;
  } catch (error) {
    console.error('[QAX Translator] 获取配置失败:', error);
    // 出错时返回默认配置
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * 诊断 API 连接问题
 */
async function diagnoseApiConnection(config) {
  const diagnoses = [];
  
  // 检查 URL 格式
  try {
    const url = new URL(config.apiUrl);
    diagnoses.push(`✓ API URL 格式正确: ${url.protocol}//${url.host}`);
  } catch (e) {
    diagnoses.push(`✗ API URL 格式错误: ${config.apiUrl}`);
    return diagnoses;
  }
  
  // 尝试获取模型列表（大多数 OpenAI 兼容服务支持）
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${config.apiUrl}/models`, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      diagnoses.push(`✓ API 服务可访问 (/models 返回 ${response.status})`);
    } else {
      diagnoses.push(`⚠ API 服务返回 ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      diagnoses.push(`✗ 无法连接到 API 服务: ${error.message}`);
      diagnoses.push(`  建议: 检查网络连接和防火墙设置`);
    } else {
      diagnoses.push(`✗ 连接测试失败: ${error.message}`);
    }
  }
  
  return diagnoses;
}

/**
 * 获取可用的模型列表
 * @param {Object} config - 配置对象
 * @returns {Promise<string>} - 第一个可用的模型名称
 */
async function getFirstAvailableModel(config) {
  // 常见的默认模型名称（按优先级排序）
  const fallbackModels = [
    'MiniMax/MiniMax-M2.5',
    'qwen',
    'gpt-3.5-turbo',
    'gpt-4',
    'default',
    'model'
  ];
  
  try {
    console.log('[QAX Translator] 正在获取可用模型列表...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    if (config.apiKey && config.apiKey.trim() !== '') {
      headers['Authorization'] = `Bearer ${config.apiKey.trim()}`;
    }
    
    const response = await fetch(`${config.apiUrl}/models`, {
      method: 'GET',
      headers: headers,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.warn(`[QAX Translator] 获取模型列表失败: HTTP ${response.status}，尝试使用备用模型`);
      // 不抛出错误，继续尝试备用模型
      return fallbackModels[0];
    }
    
    const data = await response.json();
    
    if (data.data && Array.isArray(data.data) && data.data.length > 0) {
      const firstModel = data.data[0].id;
      console.log('[QAX Translator] 找到可用模型:', firstModel);
      return firstModel;
    } else {
      console.warn('[QAX Translator] 未找到可用模型，使用备用模型');
      return fallbackModels[0];
    }
  } catch (error) {
    console.error('[QAX Translator] 获取模型列表失败:', error);
    console.log('[QAX Translator] 使用备用模型:', fallbackModels[0]);
    return fallbackModels[0];
  }
}

/**
 * 调用大模型 API
 * @param {string} text - 需要翻译的文本
 * @returns {Promise<Object>} - 翻译结果
 */
async function translateText(text) {
  const config = await getConfig();
  
  // 根据场景选择提示词
  const systemPrompt = config.scenario === 'customs' ? CUSTOMS_SYSTEM_PROMPT : GENERAL_SYSTEM_PROMPT;
  
  console.log('[QAX Translator] 当前配置:', {
    apiUrl: config.apiUrl,
    modelName: config.modelName || '(自动获取)',
    timeout: config.timeout,
    scenario: config.scenario
  });
  console.log('[QAX Translator] 使用提示词:', config.scenario === 'customs' ? '邮局海关审单' : '一般翻译');
  
  // 如果模型名称为空，自动获取第一个可用模型
  let modelName = config.modelName;
  if (!modelName || modelName.trim() === '') {
    try {
      modelName = await getFirstAvailableModel(config);
      console.log('[QAX Translator] 自动选择模型:', modelName);
    } catch (error) {
      console.error('[QAX Translator] 自动获取模型失败，使用默认值');
      // 使用一个通用的默认模型名称
      modelName = 'default';
    }
  }
  
  const requestBody = {
    model: modelName,
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: text
      }
    ],
    temperature: 0.3,
    max_tokens: 2048
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeout);

  try {
    const fullUrl = `${config.apiUrl}/chat/completions`;
    console.log('[QAX Translator] 发送请求到:', fullUrl);
    console.log('[QAX Translator] 请求体:', JSON.stringify(requestBody, null, 2));
    
    // 构建请求头
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    // 如果有 API Key，添加到请求头
    if (config.apiKey && config.apiKey.trim() !== '') {
      headers['Authorization'] = `Bearer ${config.apiKey.trim()}`;
      console.log('[QAX Translator] 使用 API Key 进行认证');
    }
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    console.log('[QAX Translator] 收到响应:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      let errorDetail = '';
      try {
        const errorData = await response.json();
        errorDetail = JSON.stringify(errorData);
        
        // 特殊处理 "Model Not Exist" 错误
        if (errorData.error && errorData.error.message && errorData.error.message.includes('Model Not Exist')) {
          throw new Error(`模型不存在错误\n\n当前使用的模型名称: ${modelName}\n\n💡 解决方案：\n1. 使用诊断工具的"获取模型列表"功能查看可用模型\n2. 将模型名称留空，让插件自动选择第一个可用模型\n3. 或者在设置中输入正确的模型名称`);
        }
        
        // 特殊处理 "missing field `model`" 错误
        if (errorData.error && errorData.error.message && errorData.error.message.includes('missing field `model`')) {
          throw new Error(`请求缺少模型字段\n\n后端要求必须提供 model 参数\n\n💡 解决方案：\n1. 插件会自动获取第一个可用模型\n2. 如果自动获取失败，请使用诊断工具查看可用模型\n3. 在设置中手动输入正确的模型名称`);
        }
      } catch (e) {
        if (e.message.includes('模型不存在') || e.message.includes('请求缺少模型字段')) {
          throw e; // 重新抛出模型相关错误
        }
        errorDetail = await response.text();
      }
      
      console.error('[QAX Translator] HTTP 错误响应:', errorDetail);
      
      if (response.status === 404) {
        throw new Error(`HTTP 404: 接口路径不存在。请确认 API 地址是否正确（应为 ${config.apiUrl}/chat/completions）`);
      } else if (response.status === 401) {
        throw new Error(`HTTP 401: 未授权，请检查 API Key`);
      } else if (response.status === 500) {
        throw new Error(`HTTP 500: 服务器内部错误，请检查后端服务状态`);
      } else if (response.status === 400) {
        throw new Error(`HTTP 400: 请求参数错误\n\n响应内容: ${errorDetail.substring(0, 300)}\n\n💡 常见原因：\n1. 模型名称不正确或不存在\n2. 请求格式不符合后端要求\n3. 插件会自动尝试获取可用模型`);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}\n响应内容: ${errorDetail.substring(0, 200)}`);
      }
    }

    const data = await response.json();
    console.log('[QAX Translator] 响应数据:', JSON.stringify(data, null, 2));
    
    if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      throw new Error('API 返回格式异常: 缺少 choices 字段');
    }
    
    if (!data.choices[0].message) {
      throw new Error('API 返回格式异常: 缺少 message 字段');
    }

    const content = data.choices[0].message.content;
    console.log('[QAX Translator] 模型返回内容:', content);

    // 解析 JSON 响应 - 处理 <think> 标签和 JSON 提取
    let result;
    try {
      // 步骤1: 移除 <think>...</think> 思考过程
      let cleanedContent = content.replace(/<think>[\s\S]*?<\/think>/gi, '');
      
      // 步骤2: 尝试提取 JSON 部分
      const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          result = JSON.parse(jsonMatch[0]);
        } catch (e2) {
          console.warn('[QAX Translator] JSON 提取失败，尝试清理后解析:', e2.message);
          // 尝试清理常见的格式问题
          const cleaned = jsonMatch[0]
            .replace(/^[^{]*/, '')  // 移除开头的非JSON字符
            .replace(/[^}]*$/, '');  // 移除结尾的非JSON字符
          result = JSON.parse(cleaned);
        }
      } else {
        throw new Error('响应中未找到 JSON 对象');
      }
    } catch (error) {
      console.error('[QAX Translator] 解析失败:', error);
      console.error('[QAX Translator] 原始内容:', content);
      throw new Error(`无法解析响应格式: ${error.message}\n\n模型返回内容预览:\n${content.substring(0, 300)}...`);
    }

    // 验证必要字段
    if (!result.detectedLanguage || !result.translation) {
      throw new Error(`响应缺少必要字段。返回内容: ${JSON.stringify(result).substring(0, 200)}...`);
    }

    return {
      success: true,
      detectedLanguage: result.detectedLanguage,
      translation: result.translation,
      originalText: text
    };

  } catch (error) {
    clearTimeout(timeoutId);
    console.error('[QAX Translator] 翻译失败:', error);
    
    let errorMessage = '翻译失败';
    
    if (error.name === 'AbortError') {
      errorMessage = '请求超时（30秒），请检查：\n1. 后端服务是否响应缓慢\n2. 网络连接是否稳定';
    } else if (error.message.includes('Failed to fetch') || error.message.includes('fetch')) {
      errorMessage = `无法连接到翻译服务。\n\n可能原因：\n1. API 地址错误（当前: ${config.apiUrl}）\n2. 网络不通\n3. 服务未启动\n\n详细错误: ${error.message}`;
    } else {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage,
      originalText: text,
      debugInfo: {
        apiUrl: config.apiUrl,
        errorType: error.name,
        errorMessage: error.message
      }
    };
  }
}

/**
 * 测试 API 连接 - 带详细诊断
 */
async function testApiConnection() {
  const config = await getConfig();
  
  console.log('[QAX Translator] 开始测试连接...');
  console.log('[QAX Translator] 当前配置:', config);
  
  // 先进行基础诊断
  const diagnoses = await diagnoseApiConnection(config);
  console.log('[QAX Translator] 诊断结果:', diagnoses);
  
  const testText = 'Hello, world!';
  const result = await translateText(testText);
  
  // 添加诊断信息到结果
  if (!result.success) {
    result.diagnoses = diagnoses;
  }
  
  return result;
}

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[QAX Translator] 收到消息:', request.action, request);

  if (request.action === 'ping') {
    // 响应 ping 消息，用于唤醒 Service Worker
    console.log('[QAX Translator] 收到 ping 消息');
    sendResponse({ status: 'pong' });
    return false;
  }

  if (request.action === 'translate') {
    translateText(request.text)
      .then(result => {
        console.log('[QAX Translator] 发送响应:', result);
        sendResponse(result);
      })
      .catch(error => {
        console.error('[QAX Translator] 处理请求时出错:', error);
        sendResponse({
          success: false,
          error: `内部错误: ${error.message}`,
          originalText: request.text
        });
      });
    return true; // 保持通道开启，等待异步响应
  }

  if (request.action === 'testConnection') {
    testApiConnection()
      .then(result => {
        console.log('[QAX Translator] 发送测试响应:', result);
        sendResponse(result);
      })
      .catch(error => {
        console.error('[QAX Translator] 测试连接时出错:', error);
        sendResponse({
          success: false,
          error: `测试失败: ${error.message}`
        });
      });
    return true;
  }

  if (request.action === 'getConfig') {
    getConfig()
      .then(config => sendResponse(config))
      .catch(error => {
        console.error('[QAX Translator] 获取配置时出错:', error);
        sendResponse(DEFAULT_CONFIG);
      });
    return true;
  }

  return false;
});

// ============================================================
// 右键菜单功能
// ============================================================

/**
 * 创建右键菜单
 */
chrome.runtime.onInstalled.addListener(() => {
  console.log('[QAX Translator] 创建右键菜单...');
  
  // 移除已存在的菜单（避免重复）
  chrome.contextMenus.removeAll(() => {
    // 创建主菜单项
    chrome.contextMenus.create({
      id: 'qax-translate',
      title: '翻译选中文本',
      contexts: ['selection']
    });
    
    console.log('[QAX Translator] 右键菜单创建完成');
  });
});

/**
 * 监听右键菜单点击事件
 */
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log('[QAX Translator] 右键菜单被点击:', info);
  console.log('[QAX Translator] 选中文本:', info.selectionText);
  console.log('[QAX Translator] 页面URL:', tab.url);
  
  if (info.menuItemId === 'qax-translate') {
    let selectedText = '';
    
    // 尝试从多个来源获取选中文本
    if (info.selectionText && info.selectionText.trim()) {
      selectedText = info.selectionText.trim();
    } else {
      // 如果 info.selectionText 为空，尝试从页面获取
      console.log('[QAX Translator] info.selectionText 为空，尝试从页面获取');
      // 发送消息到页面获取选中文本
      chrome.tabs.sendMessage(tab.id, {
        action: 'getSelectedText'
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[QAX Translator] 获取页面选中文本失败:', chrome.runtime.lastError);
        } else if (response && response.text) {
          selectedText = response.text;
          console.log('[QAX Translator] 从页面获取到选中文本:', selectedText.substring(0, 50) + '...');
        } else {
          console.log('[QAX Translator] 无法从页面获取选中文本');
        }
      });
    }
    
    if (!selectedText) {
      console.log('[QAX Translator] 没有获取到选中文本，取消翻译');
      return;
    }
    
    // 限制文本长度
    const MAX_TEXT_LENGTH = 5000;
    const textToTranslate = selectedText.length > MAX_TEXT_LENGTH
      ? selectedText.substring(0, MAX_TEXT_LENGTH) + '...'
      : selectedText;
    
    console.log('[QAX Translator] 准备翻译文本:', textToTranslate.substring(0, 50) + '...');
    
    // 发送消息到 content script 执行翻译
    chrome.tabs.sendMessage(tab.id, {
      action: 'translateFromContextMenu',
      text: textToTranslate
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[QAX Translator] 发送翻译消息失败:', chrome.runtime.lastError);
      } else {
        console.log('[QAX Translator] 翻译消息发送成功');
      }
    });
  }
});

console.log('[QAX Translator] Background Service Worker 已启动');
