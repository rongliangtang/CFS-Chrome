/**
 * 与编码相关的密码学操作公共方法
 */

/**
 * 将十六进制字符串转换为 Uint8Array。
 * @param {string} hexString - 要转换的十六进制字符串。
 * @returns {Uint8Array} 转换后的 Uint8Array。
 * @throws {Error} 如果输入字符串的长度不是偶数。
 */
function hexStringToArrayBuffer(hexString) {
    if (hexString.length % 2 !== 0) {
      throw new Error("Invalid hexString: Length must be even.");
    }
    const arrayBuffer = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
      const byteValue = parseInt(hexString.substring(i, i + 2), 16);
      arrayBuffer[i / 2] = byteValue;
    }
    return arrayBuffer;
  }
  
  /**
   * 将字符串转换为 Uint8Array。
   * @param {string} str - 要转换的字符串。
   * @returns {Uint8Array} 转换后的 Uint8Array。
   */
  function stringToArrayBuffer(str) {
    const encoder = new TextEncoder();
    return encoder.encode(str);
  }
  
  /**
   * 将 Base32 字符串转换为十六进制字符串。
   * 使用自定义的 Base32 字符集（不包含 'L'、'O' 和 '0'）。
   * @param {string} base32Str - Base32 编码的字符串。
   * @returns {string} 转换后的十六进制字符串（大写）。
   * @throws {Error} 如果输入包含无效的 Base32 字符。
   */
  function base32ToHex(base32Str) {
    const base32Chars = "ABCDEFGHIJKMNPQRSTUVWXYZ23456789";
    let bits = "";
  
    // 将 Base32 字符串转换为二进制字符串
    for (const char of base32Str) {
      const index = base32Chars.indexOf(char);
      if (index === -1) {
        throw new Error("Invalid Base32 character: " + char);
      }
      bits += index.toString(2).padStart(5, "0");
    }
  
    // 计算字节数组的大小
    const bytesSize = Math.floor(bits.length / 8);
    const bytes = new Uint8Array(bytesSize);
  
    // 将二进制字符串转换为字节数组
    for (let i = 0; i < bytesSize; i++) {
      const byteStr = bits.slice(i * 8, i * 8 + 8);
      bytes[i] = parseInt(byteStr, 2);
    }
  
    // 将字节数组转换为十六进制字符串
    let hexStr = "";
    for (const byte of bytes) {
      hexStr += byte.toString(16).padStart(2, "0");
    }
  
    return hexStr.toUpperCase();
  }
  
  /**
   * 清理十六进制字符串，移除 '0x' 前缀和空格，并转换为小写。
   * @param {string} s - 要清理的十六进制字符串。
   * @returns {string} 清理后的十六进制字符串。
   */
  function hexCleanup(s) {
    return s.replace(/0x/g, "").replace(/\s+/g, "").toLowerCase();
  }
  
  /**
   * 将十六进制字符串转换为 UTF-8 字符串。
   * @param {string} hexStr - 要转换的十六进制字符串。
   * @returns {string} 转换后的 UTF-8 字符串。
   */
  function hexToUtf8(hexStr) {
    const uint8Array = hexStringToArrayBuffer(hexStr);
    const decoder = new TextDecoder("utf-8");
    return decoder.decode(uint8Array);
  }
  
  /**
   * 将 Uint8Array 转换为 CryptoJS 的 WordArray。
   * @param {Uint8Array} u8Array - 要转换的 Uint8Array。
   * @returns {CryptoJS.lib.WordArray} 转换后的 WordArray。
   */
  function uint8ArrayToWordArray(u8Array) {
    const words = [];
    let i = 0;
    const len = u8Array.length;
  
    while (i < len) {
      let word = u8Array[i++] << 24;
      if (i < len) word |= u8Array[i++] << 16;
      if (i < len) word |= u8Array[i++] << 8;
      if (i < len) word |= u8Array[i++];
      words.push(word);
    }
  
    return CryptoJS.lib.WordArray.create(words, len);
  }
  
  /**
   * 将 CryptoJS 的 WordArray 转换为 Uint8Array。
   * @param {CryptoJS.lib.WordArray} wordArray - 要转换的 WordArray。
   * @returns {Uint8Array} 转换后的 Uint8Array。
   */
  function wordArrayToUint8Array(wordArray) {
    const { words, sigBytes } = wordArray;
    const bytes = new Uint8Array(sigBytes);
  
    for (let i = 0; i < sigBytes; i++) {
      const word = words[Math.floor(i / 4)];
      bytes[i] = (word >>> (24 - (i % 4) * 8)) & 0xff;
    }
  
    return bytes;
  }
  
  /**
   * 将 Uint8Array 转换为十六进制字符串。
   * @param {Uint8Array} uint8Array - 要转换的 Uint8Array。
   * @returns {string} 转换后的十六进制字符串。
   */
  function uint8ArrayToHex(uint8Array) {
    return Array.from(uint8Array)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }
  
  /**
   * 将数字转换为小端序的 4 字节 Uint8Array。
   * @param {number} number - 要转换的数字。
   * @returns {Uint8Array} 转换后的 Uint8Array（长度为 4）。
   */
  function toLittleEndian32(number) {
    const bytes = new Uint8Array(4);
    for (let i = 0; i < 4; ++i) {
      bytes[i] = (number >> (i * 8)) & 0xff;
    }
    return bytes;
  }

/**
 * 将十六进制字符串转换为 Uint8Array
 * @param {string} hexString - 要转换的十六进制字符串
 * @returns {Uint8Array} - 转换后的 Uint8Array
 */
function hexStringToArray(hexString) {
  // 去掉可能的空格，并确保长度为偶数
  if (hexString.length % 2 !== 0) {
      throw new Error("Invalid hex string");
  }

  // 创建 Uint8Array，长度为 hex 字符串的 1/2
  const byteArray = new Uint8Array(hexString.length / 2);

  // 每两个字符转换为一个字节
  for (let i = 0; i < hexString.length; i += 2) {
      byteArray[i / 2] = parseInt(hexString.substr(i, 2), 16);
  }

  // 使用 Array.from 将 Uint8Array 转换为普通数组
  return Array.from(byteArray);
}
  