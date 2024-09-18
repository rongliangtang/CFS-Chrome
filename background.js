/**
 * 动态添加监听器和处理消息的模块
 *
 * 描述：
 * 该模块用于处理来自内容脚本的消息，根据消息类型动态添加或移除规则，
 * 并通过监听网络请求来捕获下载或预览的请求 URL，然后发送给内容脚本进行后续处理。
 */

/** 当前活动的监听器 */
let activeListener = null;

/**
 * 设置网络请求匹配的监听器
 * @param {Function} callback - 当规则匹配时触发的回调函数
 */
function setupListener(callback) {
  // 如果已有活动的监听器，先移除
  if (activeListener) {
    chrome.declarativeNetRequest.onRuleMatchedDebug.removeListener(activeListener);
  }
  // 设置新的监听器
  activeListener = callback;
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(activeListener);
}

/**
 * 处理来自内容脚本的消息，根据消息类型添加或移除规则
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type } = message;

  if (type === 'try_download' || type === 'try_preview') {
    console.log(`Received message: ${type}`);

    // 设置监听器，捕获匹配的网络请求
    setupListener((info) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
          // 移除动态规则 ID 为 1 的规则
          chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [1] })
            .then(() => {
              // 发送解密下载或预览的消息到内容脚本
              chrome.tabs.sendMessage(tabs[0].id, {
                type: type === 'try_download' ? 'decrypt_download' : 'decrypt_preview',
                url: info.request.url,
              });

              console.log(`Sent message: ${type === 'try_download' ? 'decrypt_download' : 'decrypt_preview'}`);

              // 发送消息后立即移除监听器
              chrome.declarativeNetRequest.onRuleMatchedDebug.removeListener(activeListener);
              activeListener = null;
            })
            .catch((error) => {
              console.error('Failed to remove dynamic rules:', error);
            });
        }
      });
    });
  } else if (type === 'block_download' || type === 'block_preview') {
    console.log(`Received message: ${type}`);

    // 定义要添加的规则
    const rule = {
      id: 1,
      priority: 1,
      action: {
        type: 'block',
        requestHeaders: [
          { header: 'Referer', operation: 'set', value: 'http://invalid-referer.com/' },
        ],
      },
      condition: {
        urlFilter: 'https://*.dm.files.1drv.com/*',
        resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest', 'other'],
      },
    };

    // 移除可能存在的旧规则，然后添加新规则
    chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [1] })
      .then(() => {
        return chrome.declarativeNetRequest.updateDynamicRules({ addRules: [rule] });
      })
      .then(() => {
        console.log('Dynamic rules have been updated successfully.');
      })
      .catch((error) => {
        console.error('Failed to update dynamic rules:', error);
      });

    // 发送屏蔽成功的消息，内容脚本收到后开始点击下载或预览
    const successMessageType = type === 'block_download' ? 'block_download_success' : 'block_preview_success';

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, { type: successMessageType });
        console.log(`Sent message: ${successMessageType}`);
      }
    });
  }
});

/**
 * 监听页面的 URL 变化，通知内容脚本进行相应的处理
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    chrome.tabs.sendMessage(tabId, { type: 'routeUpdate', content: tab });
  }
});
