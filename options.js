/**
 * 为解密配置文件按钮添加点击事件监听器
 * 当用户点击按钮时，读取配置文件和密码，并调用解密函数
 */
document.getElementById("decrypt-config").addEventListener("click", async () => {
    const configFileInput = document.getElementById("config-file");
    const passwordInput = document.getElementById("password");
  
    // 检查是否选择了配置文件
    if (configFileInput.files.length > 0) {
      const configFile = configFileInput.files[0];
      const reader = new FileReader();
  
      // 当文件读取完成时执行
      reader.onload = async (e) => {
        const configData = e.target.result;
        const password = passwordInput.value;
  
        // 检查密码是否为空
        if (password) {
          try {
            // 调用解密配置文件的函数
            await decryptConfig(configData, password);
  
            // 清空输入框
            configFileInput.value = "";
            passwordInput.value = "";
  
            // 显示成功消息（可选）
            alert("Configuration file decrypted successfully!");
          } catch (error) {
            // 处理解密过程中可能出现的错误
            console.error("Decryption failed:", error);
            alert("Failed to decrypt the configuration file. Please check your password and try again.");
          }
        } else {
          alert("Please enter a password.");
        }
      };
  
      // 读取配置文件为文本
      reader.readAsText(configFile);
    } else {
      alert("Please upload a configuration file.");
    }
  });
  