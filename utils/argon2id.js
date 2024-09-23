/**
 * 通过消息，与 background.js 中的 argon2-browser 进行交互
 */

function argon2id(password, salt, iterations, mem, hashLen, parallelism) {
    return new Promise((resolve, reject) => {
        // 向 background.js 发送消息
        chrome.runtime.sendMessage({
            action: 'argon2id',
            password: password,
            salt: salt,
            iterations: iterations, 
            mem: mem, 
            hashLen: hashLen,
            parallelism: parallelism
        }, response => {
            if (response.success) {
                // console.log(response)
                resolve({
                    hashHex: response.hashHex,
                    encoded: response.encoded
                });
            } else {
                reject(new Error(response.error));
            }
        });
    });
}


