// 动态添加监听器
let activeListener = null;

function setupListener(callback) {
    if (activeListener) {
        chrome.declarativeNetRequest.onRuleMatchedDebug.removeListener(activeListener);
    }
    activeListener = callback;
    chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(activeListener);
}

// 处理来自内容脚本的消息，根据消息类型添加或移除规则
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'try_download' || message.type === 'try_preview') {
        console.log("receive " + message.type);    
        setupListener(info => {
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                if (tabs.length > 0) {
                    chrome.declarativeNetRequest.updateDynamicRules({
                        removeRuleIds: [1]
                    }).then(() => {
                        chrome.tabs.sendMessage(tabs[0].id, {
                            type: message.type === 'try_download' ? "decrypt_download" : "decrypt_preview",
                            url: info.request.url
                        });

                        console.log("send " + (message.type === 'try_download' ? "decrypt_download" : "decrypt_preview"));

                        // 在发送消息后立即移除监听器
                        chrome.declarativeNetRequest.onRuleMatchedDebug.removeListener(activeListener);
                        activeListener = null;
                    });
                }
            });
        });
    }
    // 如果接受到block_download消息，设置屏蔽规则
    else if (message.type === 'block_download') {
        console.log('receive block_download');

        // 首先尝试移除可能存在的规则
        chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: [1]  // 尝试移除ID为1的规则
        }).then(() => {
            // 在成功移除旧规则后，添加新规则
            chrome.declarativeNetRequest.updateDynamicRules({
                addRules: [
                    {
                        id: 1,
                        priority: 1,
                        action: {
                            type: 'block',
                            requestHeaders: [
                                { header: "Referer", operation: "set", value: "http://invalid-referer.com/" }
                            ]
                        },
                        condition: {
                            urlFilter: "https://*.dm.files.1drv.com/*",
                            resourceTypes: ["main_frame", "sub_frame", "xmlhttprequest", "other"]
                        }
                    }
                ]
            }).then(() => {
                console.log('Install Rules have been updated successfully.');
            }).catch((error) => {
                console.error('Failed to add rules:', error);
            });
        }).catch((error) => {
            console.error('Failed to remove old rules:', error);
        });

        // 发送屏蔽成功消息,content收到后开始点击下载
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs.length > 0) {
                chrome.declarativeNetRequest.updateDynamicRules({
                    removeRuleIds: [1]
                }).then(() => {
                    chrome.tabs.sendMessage(tabs[0].id, {type: 'block_download_success'});

                    console.log("send block_download_success");
                });
            }
        });

    }
    // 如果接受到block_preview消息，设置屏蔽规则
    else if (message.type === 'block_preview') {
        console.log('receive block_preview');

        // 首先尝试移除可能存在的规则
        chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: [1]  // 尝试移除ID为1的规则
        }).then(() => {
            // 在成功移除旧规则后，添加新规则
            chrome.declarativeNetRequest.updateDynamicRules({
                addRules: [
                    {
                        id: 1,
                        priority: 1,
                        action: {
                            type: 'block',
                            requestHeaders: [
                                { header: "Referer", operation: "set", value: "http://invalid-referer.com/" }
                            ]
                        },
                        condition: {
                            urlFilter: "https://*.dm.files.1drv.com/*",
                            resourceTypes: ["main_frame", "sub_frame", "xmlhttprequest", "other"]
                        }
                    }
                ]
            }).then(() => {
                console.log('Install Rules have been updated successfully.');
            }).catch((error) => {
                console.error('Failed to add rules:', error);
            });
        }).catch((error) => {
            console.error('Failed to remove old rules:', error);
        });

        // 发送屏蔽成功消息,content收到后开始点击下载
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs.length > 0) {
                chrome.declarativeNetRequest.updateDynamicRules({
                    removeRuleIds: [1]
                }).then(() => {
                    chrome.tabs.sendMessage(tabs[0].id, {type: 'block_preview_success'});

                    console.log("send block_preview_success");
                });
            }
        });

    }

});



// 监听页面URL变化
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete') {
        chrome.tabs.sendMessage(tabId, { type: 'routeUpdate', content: tab });
    }
});
