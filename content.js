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
  
    const filesToSkip = ['.DS_Store', '.securefs.json'];
  
    for (let i = 0; i < results.snapshotLength; i++) {
      const element = results.snapshotItem(i);
  
      if (element && element.innerText) {
        const originalText = element.innerText.trim();
  
        // 跳过配置文件和挂载点
        if (!filesToSkip.includes(originalText)) {
          let encryptedName = originalText;
          let isDirectory = false;
  
          // 检查是否为目录（以 '/' 结尾）
          if (encryptedName.endsWith('/')) {
            encryptedName = encryptedName.slice(0, -1); // 移除末尾的 '/'
            isDirectory = true;
          }
  
          // 解密文件名
          const decryptedName = decFilename(filenameKey, encryptedName);
  
          // 如果是目录，补回末尾的 '/'
          const finalName = isDirectory ? `${decryptedName}/` : decryptedName;
  
          // 更新元素的文本内容
          element.innerText = finalName;
        }
      }
    }
  }
  
  /**
   * 在特定页面添加下载和预览按钮
   */
  function addButton() {
    const isTargetPage = window.location.href.endsWith('=OneUp');
    const buttonContainerId = 'buttonContainer';
  
    if (isTargetPage) {
      let buttonContainer = document.getElementById(buttonContainerId);
  
      if (!buttonContainer) {
        // 创建按钮容器
        buttonContainer = document.createElement('div');
        buttonContainer.id = buttonContainerId;
        Object.assign(buttonContainer.style, {
          position: 'fixed',
          top: '55%',
          right: '50px',
          transform: 'translateY(-50%)',
          zIndex: '1000',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#f8f9fa',
          border: '1px solid #ccc',
          padding: '10px',
          borderRadius: '10px',
        });
  
        // 创建标签
        const label = document.createElement('div');
        label.textContent = 'SecureFS Decrypt Operation';
        Object.assign(label.style, {
          marginBottom: '10px',
          color: '#333',
          textAlign: 'center',
        });
        buttonContainer.appendChild(label);
  
        // 创建并添加下载和预览按钮
        buttonContainer.appendChild(createActionButton('Download File', 'block_download'));
        buttonContainer.appendChild(createActionButton('Preview File', 'block_preview'));
  
        // 将容器添加到页面
        document.body.appendChild(buttonContainer);
      }
    } else {
      // 不是目标页面或 URL 已变更，移除按钮容器
      const buttonContainer = document.getElementById(buttonContainerId);
      if (buttonContainer) {
        document.body.removeChild(buttonContainer);
      }
    }
  }
  
  /**
   * 创建操作按钮
   * @param {string} buttonText - 按钮显示的文本
   * @param {string} messageType - 点击按钮时发送的消息类型
   * @returns {HTMLButtonElement} 创建的按钮元素
   */
  function createActionButton(buttonText, messageType) {
    const button = document.createElement('button');
    button.textContent = buttonText;
    button.style.marginBottom = '10px';
  
    button.onclick = () => {
      console.log(`${buttonText} button clicked.`);
      chrome.runtime.sendMessage({ type: messageType });
    };
  
    return button;
  }
  
  /**
   * 处理 'block_download_success' 和 'block_preview_success' 消息
   * @param {string} messageType - 消息类型
   * @param {string} actionType - 后续发送的动作类型
   */
  function handleBlockSuccess(messageType, actionType) {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === messageType) {
        console.log(`Received ${messageType}`);
  
        const selectors = [
          '#appRoot > div > div:nth-child(2) > div > div > div > div.OneUp-content > div.OneUp-carousel > div > div > div > div > div > div > div.OneUp-other-actions > span > span.od-ButtonBar-main > button',
          '#appRoot > div > div:nth-child(3) > div.od-OverlayHost > div > div > div.od-OneUpOverlay > div > div > div.OneUp-content > div.OneUp-carousel > div > div > div.Carousel-slide.is-current.is-loaded > div > div > div > div.OneUp-other-actions > span > span.od-ButtonBar-main > button',
        ];
  
        const element = elementBySelectors(selectors);
  
        if (element) {
          element.click();
          console.log(`Sent ${actionType}`);
          chrome.runtime.sendMessage({ type: actionType });
        } else {
          console.error('Could not find the element to click.');
        }
      }
    });
  }
  
  // 处理下载和预览的 block success 消息
  handleBlockSuccess('block_download_success', 'try_download');
  handleBlockSuccess('block_preview_success', 'try_preview');
  
  /**
   * 处理解密下载和预览的消息
   * @param {string} messageType - 消息类型
   * @param {Function} decryptFunction - 解密函数
   */
  function handleDecryptMessage(messageType, decryptFunction) {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === messageType) {
        console.log(`Received ${messageType}`);
  
        chrome.storage.local.get(['filenameKey', 'contentKey'], (result) => {
          const { filenameKey, contentKey } = result;
  
          if (filenameKey && contentKey) {
            decryptFunction(filenameKey, contentKey, message.url);
          } else {
            console.error('Filename key or content key is missing.');
          }
        });
      }
    });
  }
  
  // 处理解密下载和预览的消息
  handleDecryptMessage('decrypt_download', downloadDecryptedFile);
  handleDecryptMessage('decrypt_preview', openDecryptedFile);
  
  /**
   * 监听来自后台或弹窗的路由更新消息
   */
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'routeUpdate') {
      // 获取存储的文件名密钥
      chrome.storage.local.get('filenameKey', (result) => {
        const filenameKey = result['filenameKey'];
  
        if (filenameKey) {
          // 延迟执行，确保页面元素已加载
          setTimeout(() => {
            const xpath = `
              /html/body/div[1]/div/div[2]/div/div/div[2]/div[2]/main/div/div/div[3]/div/div/div/div/div[2]/div/div/div/div[*]/div/div/div[3]/div/div[1]/span/span[*]/button
              | /html/body/div[1]/div/div[2]/div/div/div[2]/div[2]/main/div/div/div[2]/div/div/div/div/div/div/ol/li[3]/div/div/button/div
              | /html/body/div/div/div[2]/div/div/div[2]/div[2]/main/div/div/div[2]/div/div/div/div/div/div/ol/li[*]/span/div
              | /html/body/div[1]/div/div[3]/div[4]/div/div/div[3]/div/div/div[3]/div[1]/div/div/div[*]/div/div/div/div[2]
              | /html/body/div[1]/div/div[3]/div[4]/div/div/div[3]/div/div/div[2]/div/div/div/div/div/div/div/div/div[2]/div/button/span/span[2]/span
              | /html/body/div[1]/div/div[2]/div/div/div/div[3]/div[1]/div/div/div/div/div/div/div[2]
              | /html/body/div[1]/div/div[2]/div/div/div/div[2]/div/div/div/div/div/div/div/div/div[2]/div/button/span/span[2]/span
            `;
  
            decMatchingElements(filenameKey, xpath);
          }, 1500); // 延迟 1.5 秒执行
  
          // 添加下载和预览按钮
          addButton();
        }
      });
    }
  });
  