document.getElementById('decrypt-config').addEventListener('click', async function () {
    const configFileInput = document.getElementById('config-file');
    const passwordInput = document.getElementById('password');
    if (configFileInput.files.length > 0) {
        const configFile = configFileInput.files[0];
        const reader = new FileReader();
        reader.onload = async function (e) {
            const configData = e.target.result;
            try {
                const masterKey = await decryptConfig(configData, passwordInput.value);
                console.log(masterKey);
                const filenameKey = masterKey.substring(0, 64);
                const contentKey = masterKey.substring(64, 128);
                // Store the key in local storage
                chrome.storage.local.set({"filenameKey": filenameKey}, function() {
                    console.log('filenameKey is set to ' + filenameKey);
                });
                chrome.storage.local.set({"contentKey": contentKey}, function() {
                    console.log('contentKey is set to ' + contentKey);
                });
                
                
                // chrome.storage.local.get("contentKey", function(result) {
                //     console.log('Retrieved contentKey:', result);
                // });
                alert('Config decrypted successfully!');
            } catch (error) {
                alert('Failed to decrypt config: ' + error.message);
            }
        };
        reader.readAsText(configFile);
    } else {
        alert('Please upload a config file.');
    }
});

async function decryptConfig(configData, password) {
    // // 记录开始时间
    // let startTime = performance.now();

    const jsonObj = JSON.parse(configData);

    const salt = jsonObj.salt;
    const N = jsonObj.iterations;
    const r = jsonObj.scrypt_r;
    const p = jsonObj.scrypt_p;
    const dkLen = 32;

    // console.log(password, salt, N, r, p, dkLen);

    const op_password = new buffer.SlowBuffer(password.normalize('NFKC'), 'utf8');

    const op_salt = new buffer.SlowBuffer(salt, 'hex');

    // Sync执行scrypt算法
    const key = scrypt.syncScrypt(op_password, op_salt, N, r, p, dkLen);
    var password_derived_key = new buffer.SlowBuffer(key);
    password_derived_key = password_derived_key.toString('hex');
    // console.log("Derived Key (sync): ", password_derived_key.toString('hex'));

    // // 记录结束时间
    // let endTime = performance.now();
    // // 计算执行时间（单位：毫秒）
    // let executionTime = endTime - startTime;
    // console.log("Execution time:", executionTime, "milliseconds");

    const IV = jsonObj.encrypted_key.IV;
    const MAC = jsonObj.encrypted_key.MAC;
    const EK = jsonObj.encrypted_key.key;

    const additionalData = stringToArrayBuffer("version=4");

    try {
        const cryptoKey = await window.crypto.subtle.importKey(
            "raw",
            hexStringToArrayBuffer(password_derived_key), // 确保这里 password_derived_key 已经是 ArrayBuffer 类型
            { name: "AES-GCM" },
            true, // 是否可导出
            ["decrypt"] // 使用密钥的操作
        );

        const decryptedData = await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: hexStringToArrayBuffer(IV),
                additionalData: additionalData,
                tagLength: 128 // 标签的长度（以位为单位），通常是128位
            },
            cryptoKey,
            hexStringToArrayBuffer(EK+MAC) // 确保 EK 也是转换后的 ArrayBuffer
        );

        // 将解密结果转换为Uint8Array
        var result = new Uint8Array(decryptedData);
        var result_hexstr = uint8ArrayToHex(result); 

        return result_hexstr;
    } catch (error) {
        console.error("Decryption failed:", error);
    }
}
