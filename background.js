/**
 * 拦截下载 url 模块
 *
 * 描述：
 * 拦截下载 url，在 background 中进行下载解密
 */

/**
 * TODO
 * 实现根据 url，加载移除拦截策略
 */

importScripts(
  "lib/cryptojs/cryptojs-aes_0.2.0.min.js",
  "lib/cryptojs/cryptojs-mode-ctr_0.2.0.min.js",
  "lib/cryptojs/all_0.2.0.min.js",
  "lib/cryptojs/cryptojs-mode-ecb_0.2.0.min.js",
  "utils/code.js",
  "utils/other.js",
  "cfs/securefs.js"
);

// 动态移除拦截规则
function removeBlockRule(callback) {
  chrome.declarativeNetRequest.updateDynamicRules(
    {
      removeRuleIds: [1, 2], // 移除 ID 为 1 和 2 的规则
    },
    () => {
      if (chrome.runtime.lastError) {
        console.error("Failed to remove block rule:", chrome.runtime.lastError);
      } else {
        console.log("Block rule removed successfully.");
        if (callback) callback();
      }
    }
  );
}

// 动态添加拦截规则
function addBlockRule(callback) {
  chrome.declarativeNetRequest.updateDynamicRules(
    {
      addRules: [
        {
          id: 1,  // OneDrive 拦截规则
          priority: 1,
          action: { type: "block" },
          condition: {
            urlFilter: "https://*.dm.files.1drv.com/*",
            resourceTypes: [
              "main_frame",
              "sub_frame",
              "xmlhttprequest",
              "other",
            ],
          },
        },
        {
          id: 2, // Dropbox 拦截规则
          priority: 1,
          action: { type: "block" },
          condition: {
            urlFilter: "https://*.dl.dropboxusercontent.com/cd/0/get/*", // 替换为适用于 Dropbox 的 URL 模式
            resourceTypes: ["main_frame", "sub_frame", "xmlhttprequest", "other"],
          },
        },
      ],
    },
    () => {
      if (chrome.runtime.lastError) {
        console.error("Failed to add block rule:", chrome.runtime.lastError);
      } else {
        console.log("Block rule added successfully.");
        if (callback) callback();
      }
    }
  );
}

// 模拟操作函数，执行操作
function performOperation(callback) {
  console.log("Performing operation...");
  // 模拟异步操作，例如处理文件、请求等
  setTimeout(() => {
    console.log("Operation completed.");
    if (callback) callback();
  }, 2000); // 假设操作耗时 2 秒
}

// 每次运行 background 的时候会检查是否要添加拦截规则
chrome.declarativeNetRequest.getDynamicRules((rules) => {
  console.log(rules);
  // 检查规则 ID 是否存在
  if (!rules.some((rule) => (rule.id === 1 || rule.id === 2))) {
    addBlockRule();
  }
});

// 监听是否有拦截到，拦截后移除规则，进行操作，然后添加规则
chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
  const interceptedUrl = info.request.url;
  console.log(interceptedUrl);
  removeBlockRule(() => {
    chrome.storage.local.get(["filenameKey", "contentKey"], (result) => {
      const { filenameKey, contentKey } = result;

      if (filenameKey && contentKey) {
        downloadDecryptedFile(filenameKey, contentKey, interceptedUrl, () => {
          addBlockRule();
        });
      } else {
        console.error("Filename key or content key is missing.");
      }
    });
  });
});

/**
 * 监听页面的 URL 变化，通知内容脚本进行相应的处理（进行文件名解密）
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    chrome.tabs.sendMessage(tabId, { type: "routeUpdate", content: tab });
  }
});

/**
 * 监听来自 content script 的解密文件名消息
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === "decryptFilename") {
    const { enc_key, enc_name } = request;

    // 调用解密函数
    const decryptedFilename = decFilename(enc_key, enc_name);

    // 返回解密后的文件名给 content script
    sendResponse({ decryptedFilename: decryptedFilename });
  }

  // 必须返回 true 以便在异步操作时保持连接（可选）
  return true;
});

/**
 * argon2id 算法模块
 *
 * 描述：
 * 基于 wasm 进行 argon2id 算法的操作
 */
// 引入 JavaScript 文件（argon2-bundled.min.js）
importScripts("node_modules/argon2-browser/dist/argon2-bundled.min.js");

// 监听消息，执行哈希计算
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "argon2id") {
    const { password, salt, iterations, mem, hashLen, parallelism } = message;

    // 调用 argon2.hash 进行哈希计算
    argon2
      .hash({
        pass: password,
        salt: salt,
        time: 9, // 迭代次数
        mem: 262144, // 使用的内存 (KiB)
        hashLen: 32, // 哈希长度
        parallelism: 4, // 并行度
        type: argon2.ArgonType.Argon2id, // 哈希类型
      })
      .then((res) => {
        // 返回结果给发送消息的页面
        sendResponse({
          success: true,
          hashHex: res.hashHex,
          encoded: res.encoded,
        });
      })
      .catch((err) => {
        sendResponse({
          success: false,
          error: err.message,
        });
      });

    // 表示 sendResponse 会异步调用
    return true;
  }
});
