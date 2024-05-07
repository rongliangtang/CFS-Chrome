/*
* 密码学操作公共方法
*/
function hexStringToArrayBuffer(hexString) {
    if (hexString.length % 2 !== 0) {
        throw "Invalid hexString";
    }
    var arrayBuffer = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
        const byteValue = parseInt(hexString.substring(i, i + 2), 16);
        arrayBuffer[i / 2] = byteValue;
    }
    return arrayBuffer;
}

function stringToArrayBuffer(str) {
    const encoder = new TextEncoder();
    return encoder.encode(str);
}

function base32ToHex(base32Str) {
    const base32Chars = "ABCDEFGHIJKMNPQRSTUVWXYZ23456789";
    let bits = '';

    // 转换 Base32 字符串为二进制字符串
    for (let char of base32Str) {
        const index = base32Chars.indexOf(char);
        if (index === -1) {
            throw new Error('Invalid Base32 character: ' + char);
        }
        bits += index.toString(2).padStart(5, '0');
    }

    // 确定字节数组的大小
    const bytesSize = Math.floor((base32Str.length * 5) / 8);
    let bytes = new Array(bytesSize).fill(0);

    // 填充字节数组
    for (let i = 0, bitIndex = 0; i < bytesSize; i++) {
        const byteStr = bits.substr(bitIndex, 8);
        bytes[i] = parseInt(byteStr, 2);
        bitIndex += 8;
    }

    // 转换字节数组为十六进制字符串
    let hexStr = '';
    for (let byte of bytes) {
        hexStr += byte.toString(16).padStart(2, '0');
    }

    return hexStr.toUpperCase();
}

function hexCleanup(s) {
    return s.replace(/0x/g, "")
        .replace(/ /g, "")
        .toLowerCase();
}

// 将十六进制字符串转换为unicode编码的字节序列
function hexToUtf8(hexStr) {
    // 将十六进制字符串转换为字节序列
    const bytes = [];
    for (let i = 0; i < hexStr.length; i += 2) {
        bytes.push(parseInt(hexStr.substring(i, i + 2), 16));
    }

    // 将字节序列解码为 UTF-8 字符串
    let str = '';
    for (let i = 0; i < bytes.length; i++) {
        const byte1 = bytes[i];
        if (byte1 <= 0x7F) {
            str += String.fromCharCode(byte1);
        } else if (byte1 <= 0xDF) {
            const byte2 = bytes[++i];
            str += String.fromCharCode(((byte1 & 0x1F) << 6) | (byte2 & 0x3F));
        } else if (byte1 <= 0xEF) {
            const byte2 = bytes[++i];
            const byte3 = bytes[++i];
            str += String.fromCharCode(((byte1 & 0x0F) << 12) | ((byte2 & 0x3F) << 6) | (byte3 & 0x3F));
        } else {
            const byte2 = bytes[++i];
            const byte3 = bytes[++i];
            const byte4 = bytes[++i];
            let codepoint = ((byte1 & 0x07) << 18) | ((byte2 & 0x3F) << 12) | ((byte3 & 0x3F) << 6) | (byte4 & 0x3F);
            codepoint -= 0x10000;
            str += String.fromCharCode(0xD800 + (codepoint >> 10), 0xDC00 + (codepoint & 0x3FF));
        }
    }

    return str;
}

function uint8ArrayToWordArray(u8Array) {
    var words = [], i = 0, len = u8Array.length;

    while (i < len) {
        words.push(
            (u8Array[i++] << 24) |
            (u8Array[i++] << 16) |
            (u8Array[i++] << 8) |
            (u8Array[i++])
        );
    }

    return CryptoJS.lib.WordArray.create(words, len);
}

function wordArrayToUint8Array(wordArray) {
    const { words, sigBytes } = wordArray;
    const bytes = [];

    for (let i = 0; i < sigBytes; i++) {
        // 将当前字节位移到正确的位置并通过AND操作提取出来
        const byte = (words[Math.floor(i / 4)] >>> (8 * (3 - i % 4))) & 0xFF;
        bytes.push(byte);
    }

    return new Uint8Array(bytes);
}

function uint8ArrayToHex(uint8Array) {
    let hexStr = '';
    for (let i = 0; i < uint8Array.length; i++) {
        // 将每个字节转换为十六进制，结果为字符串
        const hex = uint8Array[i].toString(16);
        // 添加前导零以确保每个结果都是两个字符
        const paddedHex = hex.padStart(2, '0');
        hexStr += paddedHex;
    }
    return hexStr;
}

function toLittleEndian32(number) {
    const bytes = new Uint8Array(4); // 创建一个4字节的Uint8Array
    for (let i = 0; i < 4; ++i) {
        bytes[i] = (number >> (i * 8)) & 0xFF; // 通过位运算提取每个字节
    }
    return bytes;
}






/*
* 界面操作方法
*/
// 根据选择器获取元素
// onedrive中点击进入和刷新的选择器可能会不一样
function elementBySelectors(selectors) {
    for (let selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
            // console.log('Button clicked using selector:', selector);
            return element; // 成功找到并点击按钮
        }
    }

    return null; // 未找到有效元素
}






/*
* 解密文件名方法
*/
// 解密文件名（解密成功才返回解密）
// base32ToHex可能会抛出异常，抛出异常则返回不加密的结果
function decFilename(enc_key, enc_name) {
    // Base32解码密文和密钥为hex
    try {
        var name = base32ToHex(enc_name);
        name = hexCleanup(name);
        name = CryptoJS.enc.Hex.parse(name);
        var key = hexCleanup(enc_key);
        key = CryptoJS.enc.Hex.parse(key);

        var siv = CryptoJS.SIV.create(key);
        var result = siv.decrypt(name);
        if (result) {
            return hexToUtf8(result.toString());
        } else {
            return enc_name;
        }
    } catch (error) {
        return enc_name;
    }

}






// /*
// * 解密文件内容方法 分块下载
// */
// async function fetchWithRange(url, start, end) {
//     const response = await fetch(url, {
//         headers: {
//             'Range': `bytes=${start}-${end}`
//         }
//     });
//     const data = await response.arrayBuffer();
//     return new Uint8Array(data);
// }

// async function getFileSize(url) {
//     const response = await fetch(url, { method: 'HEAD' });
//     return parseInt(response.headers.get('Content-Length'), 10);
// }


// async function fetchAndProcessFile(filename_key, content_key, url) {
//     try {
//         // 获取文件大小
//         var fileSize = await getFileSize(url);
//         console.log(`Total file size: ${fileSize} bytes`);

//         let position = 0;
//         let number = 0;
//         const headerSize = 16; // 头部大小
//         const blockSize = 4124; // 后续块的大小

//         let content = ""; // 用于累积解密的内容

//         // 读取文件的前16字节
//         var header = await fetchWithRange(url, position, position + headerSize - 1);
//         position += headerSize;

//         // 获取文件密钥，用文件系统密钥加密ID得到（AES-ECB）
//         var clean_content_key = hexCleanup(content_key);
//         clean_content_key = CryptoJS.enc.Hex.parse(clean_content_key);
//         const id = uint8ArrayToWordArray(header);
//         const encrypted = CryptoJS.AES.encrypt(id, clean_content_key, {
//             mode: CryptoJS.mode.ECB,
//             padding: CryptoJS.pad.Pkcs7
//         });

//         // 加密结果是一个对象，对象中的ciphertext才是密文
//         // 是wordarray类型，tostring输出base64
//         // wordarray转unit8array
//         var file_key_bytes = wordArrayToUint8Array(encrypted.ciphertext);
//         // ecb库的问题，输出的是256位但是前128位是正确的加密结果
//         file_key_bytes = file_key_bytes.slice(0, 16);

//         // debug
//         // console.log(base32ToHex(orgin_content_key));
//         // console.log(uint8ArrayToHex(file_key_bytes))

//         // 将密钥数据转换为CryptoKey对象
//         const cryptoKey = await window.crypto.subtle.importKey(
//             "raw",
//             file_key_bytes,
//             "AES-GCM",
//             true, // 是否可导出
//             ["decrypt"] // 使用密钥的操作
//         );

//         // 创建一个TextDecoder实例，默认使用UTF-8编码
//         const decoder = new TextDecoder('utf-8');

//         // 分块读取剩余的文件内容
//         while (position < fileSize) {
//             // 再次获取文件大小以确保准确性，解决阿里云第二次才返回真实大小问题
//             fileSize = await getFileSize(url);

//             let nextRangeEnd = Math.min(position + blockSize - 1, fileSize - 1);
//             const block = await fetchWithRange(url, position, nextRangeEnd);

//             // 分块处理
//             let part1, part2;
//             part1 = block.slice(0, 12); //iv
//             part2 = block.slice(12, block.length); //content + 16 mac

//             //解密处理，用文件密钥解密文件内容（AES-GCM）
//             const decryptedData = await window.crypto.subtle.decrypt(
//                 {
//                     name: "AES-GCM",
//                     iv: part1,
//                     additionalData: toLittleEndian32(number), //小端存储的uint32
//                     tagLength: 128, // 标签的长度（以位为单位），通常是128位
//                 },
//                 cryptoKey,
//                 part2
//             );

//             // 将解密结果转换为Uint8Array
//             var result = new Uint8Array(decryptedData);

//             // 使用TextDecoder将Uint8Array解码为字符串
//             const decodedString = decoder.decode(result);

//             content += decodedString;

//             position += blockSize; // 更新位置指针
//             number += 1;
//         }

//         // 从url中解密文件名字
//         filename = extractCipherFilename(url);
//         filename = decFilename(filename_key, filename);

//         return { content, filename };

//     } catch (error) {
//         console.error("Error:", error);
//     }
// }



/*
* 解密文件内容方法 一次性下载
*/
async function fetchEntireFile(url) {
    const response = await fetch(url);
    const data = await response.arrayBuffer();
    return new Uint8Array(data);
}

// 文件名返回字符串
// 文件内容返回unit8array类型的解密结果
async function fetchAndProcessFile(filename_key, content_key, url) {
    try {
        // 下载整个文件
        var entireFile = await fetchEntireFile(url);
        var fileSize = entireFile.length;
        console.log(`Total file size: ${fileSize} bytes`);

        // 用于累积解密的Uint8Array
        let content = new Uint8Array(0); // 初始化为空的Uint8Array

        // 读取文件的前16字节作为头部
        var header = entireFile.slice(0, 16);

        // 获取文件密钥，用文件系统密钥加密ID得到（AES-ECB）
        var clean_content_key = hexCleanup(content_key);
        clean_content_key = CryptoJS.enc.Hex.parse(clean_content_key);
        const id = uint8ArrayToWordArray(header);
        const encrypted = CryptoJS.AES.encrypt(id, clean_content_key, {
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.Pkcs7
        });

        // 将密钥数据转换为CryptoKey对象
        var file_key_bytes = wordArrayToUint8Array(encrypted.ciphertext);
        file_key_bytes = file_key_bytes.slice(0, 16);
        const cryptoKey = await window.crypto.subtle.importKey(
            "raw",
            file_key_bytes,
            "AES-GCM",
            true, // 是否可导出
            ["decrypt"] // 使用密钥的操作
        );

        // 设置初始位置为头部之后
        let position = 16;
        let number = 0;

        // 分块处理文件内容
        while (position < fileSize) {
            let nextRangeEnd = Math.min(position + 4124 - 1, fileSize - 1);
            let block = entireFile.slice(position, nextRangeEnd + 1);

            // 分块处理
            let part1 = block.slice(0, 12); // iv
            let part2 = block.slice(12); // content + 16 mac

            // 解密处理，用文件密钥解密文件内容（AES-GCM）
            const decryptedData = await window.crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: part1,
                    additionalData: toLittleEndian32(number), //小端存储的uint32
                    tagLength: 128, // 标签的长度（以位为单位），通常是128位
                },
                cryptoKey,
                part2
            );

            // 将解密结果转换为Uint8Array并累积
            var result = new Uint8Array(decryptedData);
            let combined = new Uint8Array(content.length + result.length);
            combined.set(content);
            combined.set(result, content.length);
            content = combined;

            position = nextRangeEnd + 1; // 更新位置指针
            number += 1;
        }

        // 从url中解密文件名字
        filename = extractCipherFilename();
        filename = decFilename(filename_key, filename);

        return { content, filename };

    } catch (error) {
        console.error("Error:", error);
    }
}




// 创建下载链接，content为unit8array
function downloadFile(content, filename) {
    // 基于文件名扩展名推断MIME类型
    const fileType = filename.endsWith('.pdf') ? 'application/pdf' :
        filename.endsWith('.png') ? 'image/png' :
            filename.endsWith('.jpg') || filename.endsWith('.jpeg') ? 'image/jpeg' :
                filename.endsWith('.txt') ? 'text/plain' :
                    'application/octet-stream'; // 默认为通用的二进制数据类型

    const blob = new Blob([content], { type: fileType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';  // 隐藏链接元素，用户不需要看到它
    a.href = url;
    a.download = filename;  // 设置下载文件名
    document.body.appendChild(a);
    a.click();  // 模拟点击以开始下载
    document.body.removeChild(a);  // 下载后移除元素
    URL.revokeObjectURL(url);  // 清理创建的URL，释放内存
}


// 打开文件
// 当为不能预览的类型时，下载文件
// 打开文件或下载文件
function openFile(content, filename) {
    try {
        // 基于文件名扩展名推断MIME类型
        const fileType = filename.endsWith('.pdf') ? 'application/pdf' :
                         filename.endsWith('.png') ? 'image/png' :
                         filename.endsWith('.jpg') || filename.endsWith('.jpeg') ? 'image/jpeg' :
                         filename.endsWith('.txt') ? 'text/plain' :
                         'application/octet-stream'; // 默认为通用的二进制数据类型

        const contentBlob = new Blob([content], { type: fileType });
        const contentUrl = URL.createObjectURL(contentBlob);

        if (fileType === 'application/octet-stream') {
            // 处理默认的二进制类型为下载
            const a = document.createElement('a');
            a.style.display = 'none';  // 隐藏链接元素
            a.href = contentUrl;
            a.download = filename;  // 指定下载文件名
            document.body.appendChild(a);
            a.click();  // 模拟点击以开始下载
            document.body.removeChild(a);  // 下载后移除元素
            URL.revokeObjectURL(contentUrl);  // 清理创建的URL，释放内存
        } else {
            // 在新标签页中打开解密的内容
            window.open(contentUrl, '_blank');
            // 清理创建的URL，释放内存
            setTimeout(() => {
                URL.revokeObjectURL(contentUrl);
            }, 100); // 延迟撤销URL确保页面已经开始加载
        }
    } catch (error) {
        console.error("Error creating Blob or handling data:", error);
    }
}



// 获取下载页中的加密文件名or解密文件名
function extractCipherFilename() {
    const selectors = [
        "#appRoot > div > div:nth-child(3) > div.od-OverlayHost > div > div > div.od-OneUpOverlay > div > div > div.OneUp-content > div.OneUp-carousel > div > div > div.Carousel-slide.is-current.is-loaded > div > div > div > div.OneUp-other-fileName",
        "#appRoot > div > div:nth-child(2) > div > div > div > div.OneUp-content > div.OneUp-carousel > div > div > div > div > div > div > div.OneUp-other-fileName"
    ];

    const element = elementBySelectors(selectors);

    var fileContent = "解密文件";

    if (element) {
        // 获取元素内的文本内容
        fileContent = element.innerText;
    } else {
        console.error('extractCipherFilename() 未找到匹配的元素');
    }
    return fileContent;
}

// 下载解密文件
async function downloadDecryptedFile(filename_key, content_key, url) {
    const result = await fetchAndProcessFile(filename_key, content_key, url)
    downloadFile(result.content, result.filename);
}

// 预览解密文件
async function openDecryptedFile(filename_key, content_key, url) {
    const result = await fetchAndProcessFile(filename_key, content_key, url)
    openFile(result.content, result.filename);
}





