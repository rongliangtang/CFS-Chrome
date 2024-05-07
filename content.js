/*
TODO:
1. 优化代码逻辑（'/'的补回、挂载点和配置文件的不加密）
2. 元素匹配的优化（列表、下载界面）
3. UI优化
*/



// 遍历解密文件名函数
function decMatchingElements(filenameKey, xpath) {
    let results = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    // 这个标志用于添加回'/'
    var tag = 0;
    for (let i = 0; i < results.snapshotLength; i++) {
        let element = results.snapshotItem(i);
        // 跳过配置文件
        if (element && element.innerText !== ".DS_Store" && element.innerText !== ".securefs.json") {
            // ""使其变为字符串，解密密钥目前固定
            var text = element.innerText;
            var enc_name = "" + text;
            // 去掉字符串后的'/'
            if (enc_name.endsWith('/')) {
                enc_name = enc_name.slice(0, -1);
                tag = 1;
            }
            var dec_name = decFilename(filenameKey, enc_name);
            if (tag == 1) {
                dec_name = dec_name + '/';
                tag = 0;
            }
            element.innerText = dec_name;
        }
    }
}



// 添加按钮的函数
function addButton() {
    // 检查URL是否以“=OneUp”结尾
    if (window.location.href.endsWith('=OneUp')) {
        let buttonContainer = document.getElementById('buttonContainer');
        if (!buttonContainer) {
            // 创建按钮容器
            buttonContainer = document.createElement('div');
            buttonContainer.id = 'buttonContainer';
            buttonContainer.style.position = 'fixed';
            buttonContainer.style.top = '55%';
            buttonContainer.style.right = '50px';
            buttonContainer.style.transform = 'translateY(-50%)';
            buttonContainer.style.zIndex = '1000';
            buttonContainer.style.display = 'flex';
            buttonContainer.style.flexDirection = 'column';
            buttonContainer.style.backgroundColor = '#f8f9fa';
            buttonContainer.style.border = '1px solid #ccc';
            buttonContainer.style.padding = '10px';
            buttonContainer.style.borderRadius = '10px';

            // 创建标签
            const label = document.createElement('div');
            label.textContent = 'SecureFS Decrypt Operation';
            label.style.marginBottom = '10px'; // 为按钮添加一些空间
            label.style.color = '#333'; // 文字颜色
            label.style.textAlign = 'center'; // 居中显示

            // 创建下载按钮
            const downloadButton = document.createElement('button');
            downloadButton.textContent = 'Download File';
            downloadButton.style.marginBottom = '10px';
            downloadButton.onclick = function () {
                console.log('Downloading file...');
                // 实现下载预览逻辑
                // 使用 CSS 选择器点击下载按钮
                // 发送开始屏蔽，下载消息
                console.log('send block_download');
                chrome.runtime.sendMessage({ type: 'block_download' });
            };

            // 创建预览按钮
            const previewButton = document.createElement('button');
            previewButton.textContent = 'Preview File';
            previewButton.onclick = function () {
                console.log('Previewing file...');
                // 实现文件预览逻辑
                // 使用 CSS 选择器点击下载按钮
                // 发送开始屏蔽，下载消息
                console.log('send block_preview');
                chrome.runtime.sendMessage({ type: 'block_preview' });
            };

            // 添加按钮到容器
            buttonContainer.appendChild(label);
            buttonContainer.appendChild(downloadButton);
            buttonContainer.appendChild(previewButton);

            // 将容器添加到body元素
            document.body.appendChild(buttonContainer);
        }
    } else {
        // 不是目标页面或URL已变更，移除按钮容器
        const buttonContainer = document.getElementById('buttonContainer');
        if (buttonContainer) {
            document.body.removeChild(buttonContainer);
        }
    }
}

// 接收 block_download_success
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.type === "block_download_success") {
        console.log("receive block_download_success");

        const selectors = [
            "#appRoot > div > div:nth-child(2) > div > div > div > div.OneUp-content > div.OneUp-carousel > div > div > div > div > div > div > div.OneUp-other-actions > span > span.od-ButtonBar-main > button",
            "#appRoot > div > div:nth-child(3) > div.od-OverlayHost > div > div > div.od-OneUpOverlay > div > div > div.OneUp-content > div.OneUp-carousel > div > div > div.Carousel-slide.is-current.is-loaded > div > div > div > div.OneUp-other-actions > span > span.od-ButtonBar-main > button"
        ];

        const element = elementBySelectors(selectors);

        // 检查是否成功选择到了元素
        if (element) {
            // 调用元素的 click() 方法来模拟点击事件
            element.click();
            console.log("send try_download");
            chrome.runtime.sendMessage({ type: 'try_download' });
        } else {
            console.error('找不到要点击的元素');
        }
    }
});

// 接收 block_preview_success
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.type === "block_preview_success") {
        console.log("receive block_preview_success");

        const selectors = [
            "#appRoot > div > div:nth-child(2) > div > div > div > div.OneUp-content > div.OneUp-carousel > div > div > div > div > div > div > div.OneUp-other-actions > span > span.od-ButtonBar-main > button",
            "#appRoot > div > div:nth-child(3) > div.od-OverlayHost > div > div > div.od-OneUpOverlay > div > div > div.OneUp-content > div.OneUp-carousel > div > div > div.Carousel-slide.is-current.is-loaded > div > div > div > div.OneUp-other-actions > span > span.od-ButtonBar-main > button"
        ];

        const element = elementBySelectors(selectors);

        // 检查是否成功选择到了元素
        if (element) {
            // 调用元素的 click() 方法来模拟点击事件
            element.click();
            chrome.runtime.sendMessage({ type: 'try_preview' });
        } else {
            console.error('找不到要点击的元素');
        }
    }
});




// 接收 decrypt_download
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.type === "decrypt_download") {
        console.log("receive decrypt_download");
        // console.log("Download request blocked:", message.url);
        chrome.storage.local.get(["filenameKey", "contentKey"], function (result) {
            if (result['filenameKey'] != "" && result['contentKey'] != "") {
                downloadDecryptedFile(result['filenameKey'], result['contentKey'], message.url);
            }
        });
    }
});



// 接收 decrypt_preview
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.type === "decrypt_preview") {
        console.log("receive decrypt_preview");
        chrome.storage.local.get(["filenameKey", "contentKey"], function (result) { // 标记此函数为异步
            if (result['filenameKey'] != "" && result['contentKey'] != "") {
                openDecryptedFile(result['filenameKey'], result['contentKey'], message.url);
            }
        });
    }
});



// 接受bg发出的url更新（包括打开tab）消息
/**
 * 接收bg|popup发给content-script的消息
 * message          object          消息对象
 * sender           object          发送者，含{id: "插件的ID字符串", origin: "null"}
 * sendResponse     function        消息响应，可回复发送者
.*/
chrome.runtime.onMessage.addListener(function (message) {
    let { type, content } = message;

    // console.log('crx: 收到来自bg|popup的消息：');
    // console.log({message, sender});
    if (type === 'routeUpdate') {
        // 页面路由变化会有两次通知，一次加载时，一次完成时,
        // 判断是更新还是新加载，一律放在complete,
        // 因为重定向会出现多次loading,而complete仅页面加载完成才会触发
        chrome.storage.local.get("filenameKey", function (result) {
            // console.log(result);
            if (result['filenameKey'] != "") {
                setTimeout(function () {
                    // TODO：
                    // 1.优化xpath，考虑能不能结合选择器
                    // 2.下载页刷新不解密文件名，xptah原因
                    var xpath = `
                            /html/body/div[1]/div/div[2]/div/div/div[2]/div[2]/main/div/div/div[3]/div/div/div/div/div[2]/div/div/div/div[*]/div/div/div[3]/div/div[1]/span/span[*]/button
                            | /html/body/div[1]/div/div[2]/div/div/div[2]/div[2]/main/div/div/div[2]/div/div/div/div/div/div/ol/li[3]/div/div/button/div
                            | /html/body/div/div/div[2]/div/div/div[2]/div[2]/main/div/div/div[2]/div/div/div/div/div/div/ol/li[*]/span/div
                            | /html/body/div[1]/div/div[3]/div[4]/div/div/div[3]/div/div/div[3]/div[1]/div/div/div[*]/div/div/div/div[2]
                            | /html/body/div[1]/div/div[3]/div[4]/div/div/div[3]/div/div/div[2]/div/div/div/div/div/div/div/div/div[2]/div/button/span/span[2]/span
                            | /html/body/div[1]/div/div[2]/div/div/div/div[3]/div[1]/div/div/div/div/div/div/div[2]
                            | /html/body/div[1]/div/div[2]/div/div/div/div[2]/div/div/div/div/div/div/div/div/div[2]/div/button/span/span[2]/span
                        `;
                    decMatchingElements(result['filenameKey'], xpath);
                }, 1500); // 延迟1.5秒执行

                addButton();
            }
        });
    }
})
