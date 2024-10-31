/**
 * 如果要支持其它的 CFS，那么需要实现 decryptConfig、decFilename、downloadDecryptedFile、openDecryptedFile
 */

/**
 * 使用 scrypt 解密配置文件，并将解密后的密钥保存到本地存储中
 * @param {string} configData - 配置文件的内容（JSON 字符串）
 * @param {string} password - 用户输入的密码
 */
async function decryptConfigByScrypt(configData, password) {
  // 解析配置文件的 JSON 数据
  const jsonObj = JSON.parse(configData);

  // 提取 scrypt 算法参数
  const salt = jsonObj.salt;
  const N = jsonObj.iterations;
  const r = jsonObj.scrypt_r;
  const p = jsonObj.scrypt_p;
  const dkLen = 32; // 期望派生密钥的长度（字节）

  // 将密码和盐转换为适当的格式
  const normalizedPassword = password.normalize("NFKC");
  const passwordBuffer = new buffer.SlowBuffer(normalizedPassword, "utf8");
  const saltBuffer = new buffer.SlowBuffer(salt, "hex");

  // 使用 scrypt 同步派生密钥
  const key = scrypt.syncScrypt(passwordBuffer, saltBuffer, N, r, p, dkLen);
  let passwordDerivedKey = new buffer.SlowBuffer(key);
  passwordDerivedKey = passwordDerivedKey.toString("hex");

  // 提取加密的密钥和参数
  const IV = jsonObj.encrypted_key.IV;
  const MAC = jsonObj.encrypted_key.MAC;
  const EK = jsonObj.encrypted_key.key;

  // 设置附加数据（可选）
  const additionalData = stringToArrayBuffer("version=4");

  try {
    // 导入密钥用于解密
    const cryptoKey = await window.crypto.subtle.importKey(
      "raw",
      hexStringToArrayBuffer(passwordDerivedKey), // 将密钥转换为 ArrayBuffer
      { name: "AES-GCM" },
      true, // 密钥是否可导出
      ["decrypt"] // 密钥用途
    );

    // 执行解密操作
    const decryptedData = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: hexStringToArrayBuffer(IV),
        additionalData: additionalData,
        tagLength: 128, // 验证标签的长度（位）
      },
      cryptoKey,
      hexStringToArrayBuffer(EK + MAC) // 将密文和 MAC 拼接后转换为 ArrayBuffer
    );

    // 将解密结果转换为十六进制字符串
    const result = new Uint8Array(decryptedData);
    const masterKey = uint8ArrayToHex(result);

    // 从主密钥中提取文件名密钥和内容密钥
    const filenameKey = masterKey.substring(0, 64);
    const contentKey = masterKey.substring(64, 128);

    // 将密钥存储到本地存储中
    chrome.storage.local.set({ filenameKey: filenameKey }, () => {
      console.log("filenameKey is set to " + filenameKey);
    });
    chrome.storage.local.set({ contentKey: contentKey }, () => {
      console.log("contentKey is set to " + contentKey);
    });
  } catch (error) {
    console.error("解密失败:", error);
  }
}

/**
 * 使用 argon2id 解密配置文件，并将解密后的密钥保存到本地存储中
 * @param {string} configData - 配置文件的内容（JSON 字符串）
 * @param {string} password - 用户输入的密码
 */
async function decryptConfigByArgon2id(configData, password) {
  // 解析配置文件的 JSON 数据
  const jsonObj = JSON.parse(configData);

  // 提取 argon2id 算法参数
  const argon2_m_cost = jsonObj.argon2_m_cost;
  const argon2_p = jsonObj.argon2_p;
  const iterations = jsonObj.iterations;
  const salt = jsonObj.salt;
  const dkLen = 32; // 期望派生密钥的长度（字节）

  // 将 salt hex 字符串转换为 unicode 字符串（argon2id 输入要求格式）
  const saltArray = hexStringToArray(salt);

  // 使用 argon2id 派生密钥
  let passwordDerivedKey = null;
  await argon2id(
    password,
    saltArray,
    iterations,
    argon2_m_cost,
    dkLen,
    argon2_p
  )
    .then((result) => {
      passwordDerivedKey = result.hashHex;
      // console.log("Hash (Hex):", result.hashHex);
      // console.log("Encoded Hash:", result.encoded);
    })
    .catch((error) => {
      console.error("Error:", error.message);
    });

  // 提取加密的密钥和参数
  const IV = jsonObj.encrypted_key.IV;
  const MAC = jsonObj.encrypted_key.MAC;
  const EK = jsonObj.encrypted_key.key;

  // 设置附加数据（可选）
  const additionalData = stringToArrayBuffer("version=4");

  // 导入密钥用于解密
  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    hexStringToArrayBuffer(passwordDerivedKey), // 将密钥转换为 ArrayBuffer
    { name: "AES-GCM" },
    true, // 密钥是否可导出
    ["decrypt"] // 密钥用途
  );

  // 执行解密操作
  const decryptedData = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: hexStringToArrayBuffer(IV),
      additionalData: additionalData,
      tagLength: 128, // 验证标签的长度（位）
    },
    cryptoKey,
    hexStringToArrayBuffer(EK + MAC) // 将密文和 MAC 拼接后转换为 ArrayBuffer
  );

  // 将解密结果转换为十六进制字符串
  const result = new Uint8Array(decryptedData);
  const masterKey = uint8ArrayToHex(result);

  // 从主密钥中提取文件名密钥和内容密钥
  const filenameKey = masterKey.substring(0, 64);
  const contentKey = masterKey.substring(64, 128);

  // 将密钥存储到本地存储中
  chrome.storage.local.set({ filenameKey: filenameKey }, () => {
    // console.log("filenameKey is set to " + filenameKey);
  });
  chrome.storage.local.set({ contentKey: contentKey }, () => {
    // console.log("contentKey is set to " + contentKey);
  });
}

/**
 * 解密文件名，返回解密结果
 * 如果发生异常，则返回原始的加密文件名
 * @param {string} enc_key - 加密的密钥（十六进制字符串）
 * @param {string} enc_name - 加密的文件名
 * @returns {string} 解密后的文件名
 */
function decFilename(enc_key, enc_name) {
  try {
    // 将加密的文件名从 Base32 解码为十六进制
    let name = base32ToHex(enc_name);
    name = hexCleanup(name);
    name = CryptoJS.enc.Hex.parse(name);

    // 处理密钥
    let key = hexCleanup(enc_key);
    key = CryptoJS.enc.Hex.parse(key);

    // 使用 SIV 模式解密文件名
    const siv = CryptoJS.SIV.create(key);
    const result = siv.decrypt(name);

    if (result) {
      return hexToUtf8(result.toString());
    } else {
      return enc_name;
    }
  } catch (error) {
    // 解密失败，返回原始的加密文件名
    return enc_name;
  }
}

/**
 * 根据 URL 下载文件内容
 * @param {string} url - 文件的下载链接
 * @returns {Promise<Uint8Array>} 文件的内容（Uint8Array）
 */
async function fetchEntireFile(url) {
  const response = await fetch(url);
  const data = await response.arrayBuffer();
  return new Uint8Array(data);
}

/**
 * 下载并解密文件内容，返回明文文件名和明文文件内容
 * @param {string} filename_key - 文件名解密密钥
 * @param {string} content_key - 内容解密密钥
 * @param {string} url - 文件的下载链接
 * @returns {Promise<{content: Uint8Array, filename: string}>} 解密后的文件内容和文件名
 */
async function fetchAndProcessFile(filename_key, content_key, url) {
  try {
    // 下载整个文件
    const entireFile = await fetchEntireFile(url);
    const fileSize = entireFile.length;
    console.log(`Total file size: ${fileSize} bytes`);

    // 初始化用于累积解密内容的 Uint8Array
    let content = new Uint8Array(0);

    // 获取初始的 CPU 和内存使用情况，并开始统计解密时间
    chrome.system.cpu.getInfo(function (cpuInfoStart) {
      chrome.system.memory.getInfo(function (memoryInfoStart) {
        // 记录总的解密开始时间
        const totalStartTime = performance.now();

        // 提取文件头部（前 16 字节）
        const header = entireFile.slice(0, 16);

        // 获取文件密钥，通过文件系统密钥加密 ID（使用 AES-ECB 模式）
        const cleanContentKey = hexCleanup(content_key);
        const contentKeyWordArray = CryptoJS.enc.Hex.parse(cleanContentKey);
        const idWordArray = uint8ArrayToWordArray(header);
        const encrypted = CryptoJS.AES.encrypt(
          idWordArray,
          contentKeyWordArray,
          {
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.Pkcs7,
          }
        );

        // 提取文件密钥的前 16 字节
        let fileKeyBytes = wordArrayToUint8Array(encrypted.ciphertext);
        fileKeyBytes = fileKeyBytes.slice(0, 16);

        // 导入文件密钥用于解密
        self.crypto.subtle
          .importKey("raw", fileKeyBytes, "AES-GCM", true, ["decrypt"])
          .then((cryptoKey) => {
            // 初始化位置和块编号
            let position = 16; // 从头部之后开始
            let blockNumber = 0;

            // 分块处理文件内容
            const decryptBlock = async () => {
              while (position < fileSize) {
                const nextRangeEnd = Math.min(
                  position + 4124 - 1,
                  fileSize - 1
                );
                const block = entireFile.slice(position, nextRangeEnd + 1);

                // 分割块为 IV 和密文（内容 + MAC）
                const iv = block.slice(0, 12); // 前 12 字节为 IV
                const cipherData = block.slice(12); // 剩余部分为密文和 MAC

                // 解密块
                const decryptedData = await self.crypto.subtle.decrypt(
                  {
                    name: "AES-GCM",
                    iv: iv,
                    additionalData: toLittleEndian32(blockNumber), // 小端序存储的块编号
                    tagLength: 128, // 验证标签的长度（位）
                  },
                  cryptoKey,
                  cipherData
                );

                // 将解密结果累积到内容中
                const decryptedArray = new Uint8Array(decryptedData);
                const combined = new Uint8Array(
                  content.length + decryptedArray.length
                );
                combined.set(content);
                combined.set(decryptedArray, content.length);
                content = combined;

                // 更新位置和块编号
                position = nextRangeEnd + 1;
                blockNumber += 1;
              }

              // 获取解密结束时的 CPU 和内存使用情况
              chrome.system.cpu.getInfo(function (cpuInfoEnd) {
                chrome.system.memory.getInfo(function (memoryInfoEnd) {
                  // 记录总的解密结束时间
                  const totalEndTime = performance.now();
                  const totalDecryptionTime = totalEndTime - totalStartTime;

                  // 计算每个核心的 CPU 使用时间差
                  const cpuUsageDiffs = cpuInfoStart.processors.map(
                    (procStart, index) => {
                      const procEnd = cpuInfoEnd.processors[index];
                      const userDiff =
                        procEnd.usage.user - procStart.usage.user;
                      const kernelDiff =
                        procEnd.usage.kernel - procStart.usage.kernel;
                      return userDiff + kernelDiff;
                    }
                  );

                  // 计算每个核心的平均 CPU 使用时间
                  const totalCpuUsageDiff = cpuUsageDiffs.reduce(
                    (acc, diff) => acc + diff,
                    0
                  );
                  const averageCpuUsageDiff =
                    totalCpuUsageDiff / cpuUsageDiffs.length;

                  // 计算 CPU 平均利用率
                  const cpuUtilization =
                    (averageCpuUsageDiff / totalDecryptionTime) * 100;

                  // 计算内存使用的变化
                  const memoryUsedStart =
                    memoryInfoStart.capacity -
                    memoryInfoStart.availableCapacity;
                  const memoryUsedEnd =
                    memoryInfoEnd.capacity - memoryInfoEnd.availableCapacity;
                  const memoryDiff = memoryUsedEnd - memoryUsedStart;

                  // 输出统计结果
                  console.log(
                    `Total Decryption Time: ${totalDecryptionTime} ms`
                  );
                  console.log(
                    `Average CPU Utilization: ${cpuUtilization.toFixed(2)}%`
                  );
                  console.log(
                    `Total Memory Usage Difference: ${(
                      memoryDiff /
                      (1024 * 1024)
                    ).toFixed(2)} MB`
                  );
                });
              });
            };

            decryptBlock();
          });
      });
    });

    // 从 url 中提取加密的文件名并解密
    let filename = await getFileNameFromUrl(url);
    filename = decFilename(filename_key, filename);

    return { content, filename };
  } catch (error) {
    console.error("Error:", error);
    throw error; // 将错误抛出以便上层捕获
  }
}

/**
 * 根据下载 url 获取文件名
 * @returns {string} 文件名
 */
function getFileNameFromUrl(url) {
  return new Promise((resolve, reject) => {
    let extractedFilename = null;

    // 启动下载，设置为不保存文件
    chrome.downloads.download({
      url: url,
      saveAs: false // 不弹出保存对话框
    }, function(downloadId) {
      if (chrome.runtime.lastError) {
        console.error('Failed to start download:', chrome.runtime.lastError.message);
        reject('Failed to start download');
      } else {
        console.log('Download started with ID:', downloadId);
      }
    });

    // 监听 onDeterminingFilename 事件获取文件名
    chrome.downloads.onDeterminingFilename.addListener(function(item, suggest) {
      extractedFilename = item.filename; // 获取文件名
      console.log('Captured file name:', extractedFilename);

      // 取消下载，防止文件实际下载
      chrome.downloads.cancel(item.id, function() {
        if (chrome.runtime.lastError) {
          console.warn('Ignoring cancel error:', chrome.runtime.lastError.message); // 忽略错误
        }
      });

      // 继续使用建议的文件名
      suggest();

      // 返回获取的文件名
      if (extractedFilename) {
        resolve(extractedFilename);
      } else {
        reject('Filename could not be determined');
      }
    });
  });
}

/**
 * 下载解密后的文件
 * @param {Uint8Array} content - 文件内容
 * @param {string} filename - 文件名
 */
function downloadFile(content, filename) {
  // 根据文件扩展名推断 MIME 类型
  const fileType = getFileMimeType(filename);

  // 创建 Blob 对象
  const blob = new Blob([content], { type: fileType });

  // 使用 FileReader 将 Blob 转换为 Data URL
  const reader = new FileReader();
  reader.onloadend = function() {
    const dataUrl = reader.result;

    // 使用 chrome.downloads API 触发下载
    chrome.downloads.download({
      url: dataUrl,         // 使用 Data URL 进行下载
      filename: filename,   // 下载文件的名称
      saveAs: true          // 是否弹出保存对话框
    }, function(downloadId) {
      if (chrome.runtime.lastError) {
        console.error('Download failed:', chrome.runtime.lastError.message);
      } else {
        console.log('Download started with ID:', downloadId);
      }
    });
  };

  // 将 Blob 转换为 Data URL
  reader.readAsDataURL(blob);
}

/**
 * 预览文件，如果无法预览则下载文件
 * @param {Uint8Array} content - 文件内容
 * @param {string} filename - 文件名
 */
function openFile(content, filename) {
  try {
    const fileType = getFileMimeType(filename);
    const blob = new Blob([content], { type: fileType });
    const url = URL.createObjectURL(blob);

    if (fileType === "application/octet-stream") {
      // 无法预览，触发下载
      downloadFile(content, filename);
    } else {
      // 在新标签页中打开文件
      window.open(url, "_blank");

      // 延迟释放内存，确保文件已加载
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    }
  } catch (error) {
    console.error("Error opening file:", error);
  }
}

/**
 * 下载解密文件
 * @param {string} filename_key - 文件名解密密钥
 * @param {string} content_key - 内容解密密钥
 * @param {string} url - 文件的下载链接
 */
async function downloadDecryptedFile(filename_key, content_key, url, callback) {
  try {
    const result = await fetchAndProcessFile(filename_key, content_key, url);
    downloadFile(result.content, result.filename);
    if (callback) callback();
  } catch (error) {
    console.error("下载解密文件失败：" + error.message);
  }
}

/**
 * 预览解密文件
 * @param {string} filename_key - 文件名解密密钥
 * @param {string} content_key - 内容解密密钥
 * @param {string} url - 文件的下载链接
 */
async function openDecryptedFile(filename_key, content_key, url) {
  try {
    const result = await fetchAndProcessFile(filename_key, content_key, url);
    openFile(result.content, result.filename);
  } catch (error) {
    console.error("预览解密文件失败：" + error.message);
  }
}

/**
 * 根据文件名推断 MIME 类型
 * @param {string} filename - 文件名
 * @returns {string} MIME 类型
 */
function getFileMimeType(filename) {
  const extension = filename.split(".").pop().toLowerCase();
  switch (extension) {
    case "pdf":
      return "application/pdf";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "txt":
      return "text/plain";
    default:
      return "application/octet-stream"; // 默认的二进制类型
  }
}
