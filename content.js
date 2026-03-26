/**
 * Content Script
 * 处理划词检测和 UI 渲染
 */

(function() {
  'use strict';

  // 避免重复注入
  if (window.qaxTranslatorInjected) {
    return;
  }
  window.qaxTranslatorInjected = true;

  // 状态管理
  let isTranslating = false;
  let currentPopup = null;
  let selectionTimeout = null;

  // 配置
  const CONFIG = {
    minTextLength: 1,        // 最小选中文本长度
    maxTextLength: 5000,     // 最大选中文本长度
    popupDelay: 300,         // 弹窗延迟（毫秒）
    popupOffset: 10          // 弹窗偏移量
  };

  /**
   * 检测选中的文本
   */
  function getSelectedText() {
    const selection = window.getSelection();
    console.log('[QAX Translator] getSelectedText - selection:', selection, 'rangeCount:', selection ? selection.rangeCount : 0);
    
    if (!selection || selection.rangeCount === 0) {
      console.log('[QAX Translator] 没有选中内容或 rangeCount 为 0');
      return null;
    }
    
    const text = selection.toString().trim();
    console.log('[QAX Translator] 原始选中文本:', `"${selection.toString()}"`, 'trim后:', `"${text}"`, '长度:', text.length);
    
    if (!text || text.length < CONFIG.minTextLength) {
      console.log('[QAX Translator] 文本为空或长度小于最小要求:', CONFIG.minTextLength);
      return null;
    }
    
    if (text.length > CONFIG.maxTextLength) {
      console.log('[QAX Translator] 文本超过最大长度，将截断:', CONFIG.maxTextLength);
      return text.substring(0, CONFIG.maxTextLength) + '...';
    }
    
    console.log('[QAX Translator] 返回有效文本:', `"${text}"`);
    return text;
  }

  /**
   * 获取选中文本的位置（返回视口坐标）
   */
  function getSelectionPosition() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return null;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // 返回视口坐标（getBoundingClientRect() 已经返回视口坐标）
    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height
    };
  }

  /**
   * 创建翻译弹窗
   */
  function createPopup() {
    const popup = document.createElement('div');
    popup.id = 'qax-translator-popup';
    popup.className = 'qax-translator-popup';
    
    popup.innerHTML = `
      <div class="qax-translator-header">
        <span class="qax-translator-title">
          <svg class="qax-translator-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
          </svg>
          智能翻译
        </span>
        <button class="qax-translator-close" title="关闭">×</button>
      </div>
      <div class="qax-translator-content">
        <div class="qax-translator-loading">
          <div class="qax-translator-spinner"></div>
          <span>正在翻译...</span>
        </div>
      </div>
    `;

    // 关闭按钮事件
    const closeBtn = popup.querySelector('.qax-translator-close');
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closePopup();
    });

    // 点击弹窗外部不关闭，方便用户选择文本
    popup.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    return popup;
  }

  /**
   * 显示翻译弹窗 - 改进定位和尺寸控制（使用 fixed 定位）
   */
  function showPopup(position) {
    // 关闭已存在的弹窗
    closePopup();

    currentPopup = createPopup();
    document.body.appendChild(currentPopup);

    // 强制设置初始宽度以获取正确尺寸
    currentPopup.style.width = '320px';
    currentPopup.style.maxWidth = '90vw';
    
    // 计算弹窗位置（智能避让）
    const popupRect = currentPopup.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // 默认位置：选中文本下方居中（使用视口坐标）
    let left = position.left + (position.width / 2) - (Math.min(popupRect.width, 320) / 2);
    let top = position.bottom + CONFIG.popupOffset;

    // 水平边界检测 - 确保不超出视口
    const margin = 10;
    const popupWidth = Math.min(popupRect.width, 320);
    if (left < margin) {
      left = margin;
    } else if (left + popupWidth > viewportWidth - margin) {
      left = viewportWidth - popupWidth - margin;
    }

    // 垂直边界检测 - 如果下方空间不足，显示在上方
    const popupHeight = Math.min(popupRect.height, 400);
    const spaceBelow = viewportHeight - position.bottom - CONFIG.popupOffset;
    const spaceAbove = position.top - CONFIG.popupOffset;
    
    if (spaceBelow < popupHeight && spaceAbove > popupHeight) {
      // 下方空间不足且上方空间充足，显示在上方
      top = position.top - popupHeight - CONFIG.popupOffset;
    } else if (spaceBelow < 200) {
      // 下方空间很小，强制显示在上方
      top = Math.max(margin, position.top - popupHeight - CONFIG.popupOffset);
    }
    
    // 确保不超出视口顶部
    if (top < margin) {
      top = margin;
    }

    currentPopup.style.left = `${left}px`;
    currentPopup.style.top = `${top}px`;
    currentPopup.style.opacity = '0';
    currentPopup.style.transform = 'translateY(-10px)';

    // 动画显示
    requestAnimationFrame(() => {
      currentPopup.style.opacity = '1';
      currentPopup.style.transform = 'translateY(0)';
    });
  }

  /**
   * 关闭翻译弹窗
   */
  function closePopup() {
    if (currentPopup) {
      currentPopup.style.opacity = '0';
      currentPopup.style.transform = 'translateY(-10px)';
      setTimeout(() => {
        if (currentPopup && currentPopup.parentNode) {
          currentPopup.parentNode.removeChild(currentPopup);
        }
        currentPopup = null;
      }, 200);
    }
    isTranslating = false;
  }

  /**
   * 更新弹窗内容 - 显示结果
   */
  function updatePopupWithResult(result) {
    if (!currentPopup) return;

    const contentDiv = currentPopup.querySelector('.qax-translator-content');
    
    if (!result.success) {
      const errorText = result.error || '未知错误';
      contentDiv.innerHTML = `
        <div class="qax-translator-error">
          <svg class="qax-translator-error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <div class="qax-translator-error-message">${escapeHtml(errorText)}</div>
        </div>
      `;
      return;
    }

    const originalText = escapeHtml(result.originalText);
    const detectedLanguage = escapeHtml(result.detectedLanguage || '未知');
    const translation = escapeHtml(result.translation);
    
    // 判断是否为中文内容（无需翻译）
    const isChinese = detectedLanguage === '中文' || /^[\u4e00-\u9fa5]+$/.test(originalText);

    contentDiv.innerHTML = `
      <div class="qax-translator-result">
        ${!isChinese ? `
        <!-- 研判结果 -->
        <div class="qax-translator-section qax-translator-analysis">
          <div class="qax-translator-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            智能研判
            <span class="qax-translator-analysis-badge">已识别</span>
          </div>
          <div class="qax-translator-analysis-content">
            <div class="qax-translator-analysis-item">
              <span class="qax-translator-analysis-label">检测语言：</span>
              <span class="qax-translator-analysis-value">${detectedLanguage}</span>
            </div>
            <div class="qax-translator-analysis-item">
              <span class="qax-translator-analysis-label">翻译方向：</span>
              <span class="qax-translator-analysis-value">${detectedLanguage} → 中文</span>
            </div>
          </div>
        </div>
        <div class="qax-translator-divider"></div>
        ` : `
        <!-- 中文内容提示 -->
        <div class="qax-translator-section qax-translator-analysis">
          <div class="qax-translator-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            智能研判
            <span class="qax-translator-analysis-badge" style="background: #27ae60;">中文</span>
          </div>
          <div class="qax-translator-analysis-content">
            <div class="qax-translator-analysis-item">
              <span class="qax-translator-analysis-value" style="color: #27ae60;">检测到中文内容，无需翻译</span>
            </div>
          </div>
        </div>
        <div class="qax-translator-divider"></div>
        `}
        
        <!-- 原文 -->
        <div class="qax-translator-section">
          <div class="qax-translator-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            原文
            <span class="qax-translator-lang-tag">${detectedLanguage}</span>
          </div>
          <div class="qax-translator-text qax-translator-original">${originalText}</div>
        </div>
        
        ${!isChinese ? `
        <div class="qax-translator-divider"></div>
        <!-- 译文 -->
        <div class="qax-translator-section">
          <div class="qax-translator-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
            译文
            <span class="qax-translator-lang-tag">中文</span>
          </div>
          <div class="qax-translator-text qax-translator-translation">${translation}</div>
        </div>
        ` : ''}
        
        <div class="qax-translator-actions">
          <button class="qax-translator-btn qax-translator-btn-copy" data-text="${isChinese ? originalText : translation}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            ${isChinese ? '复制原文' : '复制译文'}
          </button>
        </div>
      </div>
    `;

    // 复制按钮事件
    const copyBtn = contentDiv.querySelector('.qax-translator-btn-copy');
    copyBtn.addEventListener('click', async () => {
      const textToCopy = copyBtn.getAttribute('data-text');
      try {
        await navigator.clipboard.writeText(textToCopy);
        copyBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          已复制
        `;
        copyBtn.classList.add('qax-translator-btn-success');
        setTimeout(() => {
          copyBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            复制译文
          `;
          copyBtn.classList.remove('qax-translator-btn-success');
        }, 2000);
      } catch (err) {
        console.error('[QAX Translator] 复制失败:', err);
      }
    });
  }

  /**
   * HTML 转义，防止 XSS
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 执行翻译 - 增强错误处理和研判展示
   */
  /**
   * 检查扩展上下文是否有效
   */
  function isExtensionContextValid() {
    try {
      return typeof chrome !== 'undefined' &&
             chrome.runtime &&
             chrome.runtime.onMessage;
    } catch (e) {
      return false;
    }
  }

  function doTranslate(text) {
    if (isTranslating) return;
    isTranslating = true;

    // 检查扩展上下文有效性
    if (!isExtensionContextValid()) {
      updatePopupWithResult({
        success: false,
        error: '❌ 翻译失败\n\n错误类型: 上下文失效\n错误信息: 扩展上下文已失效，请刷新页面后重试\n\n💡 解决建议：\n• 扩展已被重新加载或禁用\n• 请刷新当前网页（F5）\n• 或者重新启动浏览器'
      });
      isTranslating = false;
      return;
    }

    const position = getSelectionPosition();
    if (!position) {
      isTranslating = false;
      return;
    }

    showPopup(position);

    // 先发送一个 ping 消息确保 Service Worker 已启动
    const pingTimeout = setTimeout(() => {
      console.warn('[QAX Translator] Service Worker ping 超时，尝试直接发送翻译请求');
      sendTranslateRequest(text);
    }, 2000);

    chrome.runtime.sendMessage({ action: 'ping' }, (pingResponse) => {
      clearTimeout(pingTimeout);
      if (chrome.runtime.lastError) {
        console.warn('[QAX Translator] Service Worker ping 失败，尝试直接发送翻译请求:', chrome.runtime.lastError.message);
        sendTranslateRequest(text);
      } else {
        console.log('[QAX Translator] Service Worker 已唤醒');
        sendTranslateRequest(text);
      }
    });
  }

  /**
   * 发送翻译请求（纯回调方式）
   */
  function sendTranslateRequest(text) {
    // 再次检查扩展上下文
    if (!isExtensionContextValid()) {
      updatePopupWithResult({
        success: false,
        error: '❌ 翻译失败\n\n错误类型: 上下文失效\n错误信息: 扩展上下文已失效，请刷新页面后重试\n\n💡 解决建议：\n• 扩展已被重新加载或禁用\n• 请刷新当前网页（F5）\n• 或者重新启动浏览器'
      });
      isTranslating = false;
      return;
    }

    // 设置超时
    const translateTimeout = setTimeout(() => {
      console.error('[QAX Translator] 翻译请求超时');
      updatePopupWithResult({
        success: false,
        error: '❌ 翻译失败\n\n错误类型: 超时\n错误信息: 请求超时（30秒）\n\n💡 可能原因：\n• 后端服务响应缓慢\n• 网络连接不稳定\n• 模型计算耗时较长'
      });
      isTranslating = false;
    }, 30000);

    // 发送翻译请求（确保 chrome.runtime 存在）
    try {
      chrome.runtime.sendMessage({
        action: 'translate',
        text: text
      }, (result) => {
        clearTimeout(translateTimeout);

        if (chrome.runtime.lastError) {
          console.error('[QAX Translator] 翻译请求失败:', chrome.runtime.lastError);
          updatePopupWithResult({
            success: false,
            error: '❌ 翻译失败\n\n错误类型: 通信错误\n错误信息: ' + chrome.runtime.lastError.message + '\n\n💡 解决建议：\n• 检查插件配置页面的测试是否通过\n• 尝试刷新页面后重新划词\n• 打开诊断工具查看详细日志'
          });
          isTranslating = false;
          return;
        }

        // 检查响应是否有效
        if (!result) {
          console.error('[QAX Translator] 后台返回空响应');
          updatePopupWithResult({
            success: false,
            error: '❌ 翻译失败\n\n错误类型: 空响应\n错误信息: 后台返回空响应，请刷新插件后重试\n\n💡 解决建议：\n• 请访问 chrome://extensions/\n• 找到本插件，点击刷新按钮\n• 刷新页面后重新尝试'
          });
          isTranslating = false;
          return;
        }

        if (typeof result !== 'object') {
          console.error('[QAX Translator] 响应格式错误:', typeof result);
          updatePopupWithResult({
            success: false,
            error: '❌ 翻译失败\n\n错误类型: 格式错误\n错误信息: 响应格式错误: ' + typeof result + '\n\n💡 解决建议：\n• 检查插件配置页面的测试是否通过\n• 尝试刷新页面后重新划词\n• 打开诊断工具查看详细日志'
          });
          isTranslating = false;
          return;
        }

        // 如果后台返回错误，显示详细错误信息
        if (!result.success && result.error) {
          console.error('[QAX Translator] 后台返回错误:', result.error);
        }

        updatePopupWithResult(result);
        isTranslating = false;
      });
    } catch (e) {
      console.error('[QAX Translator] 发送翻译请求时出错:', e);
      updatePopupWithResult({
        success: false,
        error: '❌ 翻译失败\n\n错误类型: 发送失败\n错误信息: ' + (e && e.message ? e.message : '未知错误') + '\n\n💡 解决建议：\n• 请刷新页面后重试\n• 或重新启动浏览器'
      });
      isTranslating = false;
    }
  }

  /**
   * 处理划词事件
   */
  function handleSelection(event) {
    console.log('[QAX Translator] handleSelection 被触发', event);
    
    // 清除之前的定时器
    if (selectionTimeout) {
      clearTimeout(selectionTimeout);
    }

    const text = getSelectedText();
    console.log('[QAX Translator] 选中的文本:', text);
    
    if (!text) {
      console.log('[QAX Translator] 没有选中文本，返回');
      // 如果点击在弹窗外部，关闭弹窗
      if (currentPopup && !currentPopup.contains(document.activeElement)) {
        closePopup();
      }
      return;
    }

    console.log('[QAX Translator] 准备延迟翻译，延迟时间:', CONFIG.popupDelay);
    // 延迟触发，避免选词过程中频繁触发
    selectionTimeout = setTimeout(() => {
      console.log('[QAX Translator] 延迟触发，重新获取选中文本');
      const currentText = getSelectedText();
      console.log('[QAX Translator] 当前选中的文本:', currentText, '原始文本:', text);
      if (currentText && currentText === text) {
        console.log('[QAX Translator] 文本匹配，开始翻译');
        doTranslate(currentText);
      } else {
        console.log('[QAX Translator] 文本不匹配或为空，取消翻译');
      }
    }, CONFIG.popupDelay);
  }

  /**
   * 初始化
   */
  function init() {
    console.log('[QAX Translator] 开始初始化 content script');
    
    // 监听来自 background 的消息（右键菜单翻译）
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('[QAX Translator] 收到消息:', request.action);
      
      if (request.action === 'translateFromContextMenu') {
        console.log('[QAX Translator] 收到右键菜单翻译请求');
        
        // 直接执行翻译，不依赖选区位置
        // 因为右键菜单点击时选区可能已消失
        doTranslate(request.text);
        
        sendResponse({ success: true });
      }
      
      return false; // 同步响应
    });
    
    // 监听划词事件
    console.log('[QAX Translator] 添加 mouseup 事件监听');
    document.addEventListener('mouseup', handleSelection);
    
    console.log('[QAX Translator] 添加 keyup 事件监听');
    document.addEventListener('keyup', (e) => {
      console.log('[QAX Translator] keyup 事件触发，按键:', e.key, 'Shift键:', e.shiftKey);
      // 支持键盘选词（Shift + 方向键）
      if (e.shiftKey && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
        console.log('[QAX Translator] 检测到键盘选词，触发 handleSelection');
        handleSelection(e);
      }
    });

    // 监听页面点击，关闭弹窗
    document.addEventListener('click', (e) => {
      if (currentPopup && !currentPopup.contains(e.target)) {
        // 检查是否点击在选中的文本上
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          if (!range.collapsed) {
            // 检查点击位置是否在选区范围内
            const rect = range.getBoundingClientRect();
            const clickX = e.clientX;
            const clickY = e.clientY;
            
            if (clickX >= rect.left && clickX <= rect.right && 
                clickY >= rect.top && clickY <= rect.bottom) {
              return; // 点击在选区内，不关闭弹窗
            }
          }
        }
        closePopup();
      }
    });

    // 监听滚动，关闭弹窗
    window.addEventListener('scroll', () => {
      closePopup();
    }, { passive: true });

    // 监听窗口大小变化
    window.addEventListener('resize', () => {
      closePopup();
    });

    console.log('[QAX Translator] Content Script 已初始化');
  }

  // 等待 DOM 就绪
  console.log('[QAX Translator] 检查 DOM 就绪状态:', document.readyState);
  if (document.readyState === 'loading') {
    console.log('[QAX Translator] DOM 未就绪，等待 DOMContentLoaded 事件');
    document.addEventListener('DOMContentLoaded', init);
  } else {
    console.log('[QAX Translator] DOM 已就绪，直接初始化');
    init();
  }
})();
