/**
 * TODO:
 * 1. 优化代码逻辑（补回 '/'、跳过挂载点和配置文件的解密）
 * 2. 优化元素匹配（列表、下载界面）
 * 3. 优化 UI
 */

/**
 * 解密匹配的元素的文件名
 * @param {string} filenameKey - 用于解密文件名的密钥
 * @param {string} xpath - 用于选择元素的 XPath 表达式
 */
function decMatchingElements(filenameKey, xpath) {
  const results = document.evaluate(
    xpath,
    document,
    null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
    null
  );

  const filesToSkip = [".DS_Store", ".securefs.json"];

  for (let i = 0; i < results.snapshotLength; i++) {
    const element = results.snapshotItem(i);

    if (element && element.innerText) {
      const originalText = element.innerText.trim();

      // 跳过配置文件和挂载点
      if (!filesToSkip.includes(originalText)) {
        let encryptedName = originalText;
        let isDirectory = false;

        // 检查是否为目录（以 '/' 结尾）
        if (encryptedName.endsWith("/")) {
          encryptedName = encryptedName.slice(0, -1); // 移除末尾的 '/'
          isDirectory = true;
        }

        // 发送消息到 background.js 进行解密
        chrome.runtime.sendMessage(
          {
            message: "decryptFilename",
            enc_key: filenameKey,
            enc_name: encryptedName,
          },
          (response) => {
            if (response && response.decryptedFilename) {
              const decryptedName = response.decryptedFilename;

              // 如果是目录，补回末尾的 '/'
              const finalName = isDirectory
                ? `${decryptedName}/`
                : decryptedName;

              // 更新元素的文本内容
              element.innerText = finalName;
            }
          }
        );
      }
    }
  }
}

/**
 * 监听来自后台或弹窗的路由更新消息
 * 每次路由更新就对页面进行解密
 */
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "routeUpdate") {
    // 获取存储的文件名密钥
    chrome.storage.local.get("filenameKey", (result) => {
      const filenameKey = result["filenameKey"];

      if (filenameKey) {
        // 延迟执行，确保页面元素已加载
        setTimeout(() => {
          let xpath;
          const hostname = window.location.hostname;
          if (hostname.includes("onedrive")) {
            // OneDrive XPath
            xpath = `
                /html/body/div[1]/div/div[2]/div/div/div[2]/div[2]/main/div/div/div[3]/div/div/div/div/div[2]/div/div/div/div[*]/div/div/div[3]/div/div[1]/span/span[*]/button
              | /html/body/div[1]/div/div[2]/div/div/div[2]/div[2]/main/div/div/div[2]/div/div/div/div/div/div/ol/li[3]/div/div/button/div
              | /html/body/div/div/div[2]/div/div/div[2]/div[2]/main/div/div/div[2]/div/div/div/div/div/div/ol/li[*]/span/div
              | /html/body/div[1]/div/div[3]/div[4]/div/div/div[3]/div/div/div[3]/div[1]/div/div/div[*]/div/div/div/div[2]
              | /html/body/div[1]/div/div[3]/div[4]/div/div/div[3]/div/div/div[2]/div/div/div/div/div/div/div/div/div[2]/div/button/span/span[2]/span
              | /html/body/div[*]/div/div[2]/div/div/div/div[3]/div[1]/div/div/div/div/div/div/div[2]
              | /html/body/div[*]/div/div[2]/div/div/div/div[2]/div/div/div/div/div/div/div/div/div[2]/div/button/span/span[2]/span
              | /html/body/div[2]/div/div[2]/div/div/div[2]/div[2]/main/div/div/div[3]/div/div/div/div/div[2]/div/div/div/div[*]/div/div/div[3]/div/div[1]/span/span/button
            `;
          } else if (hostname.includes("dropbox")) {
            // Dropbox XPath 示例（根据需要替换为正确的 XPath）
            xpath = `
                /html/body/div[2]/div[6]/div/div/div/div/div[2]/section/div/div[5]/span/div/span/div/div/div/table/tbody/div[1]/tr/td[2]/div[2]/div/div[1]/div/div/span[1]/a/div/span
              | /html/body/div[*]/div[6]/div/div/div/div/div[2]/section/div/div[5]/span/div/span/div/div/div/table/tbody/div[*]/tr/td[2]/div[2]/div/div[1]/div/div/a/div/span
              | /html/body/div[*]/div[6]/div/div/div/div/div[2]/section/header/span/div[1]/div/div[1]/span/div/h2
              | /html/body/div[3]/div[6]/div/div/div/div/div[2]/section/div/div[5]/span/div/span/div/div/div/table/tbody/div[1]/tr/td[2]/div[2]/div/div[1]/div/div/span/a/div/span
            `;
          }

          decMatchingElements(filenameKey, xpath);
        }, 1500); // 延迟 1.5 秒执行

        // 添加下载和预览按钮
        addButton();
      }
    });
  }
});
