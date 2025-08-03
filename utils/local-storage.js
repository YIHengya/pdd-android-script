// 本地存储管理器
// 负责用户信息的本地保存和读取

/**
 * 本地存储管理器构造函数
 */
function LocalStorage() {
    this.storageDir = "/sdcard/PDD_AutoScript/"; // 存储目录
    this.userInfoFile = "user_info.json"; // 用户信息文件
    this.settingsFile = "settings.json"; // 设置文件
    
    // 确保存储目录存在
    this.ensureStorageDir();
}

/**
 * 确保存储目录存在
 */
LocalStorage.prototype.ensureStorageDir = function() {
    try {
        if (!files.exists(this.storageDir)) {
            files.createWithDirs(this.storageDir);
            console.log("创建存储目录: " + this.storageDir);
        }
    } catch (e) {
        console.log("创建存储目录失败: " + e.message);
    }
};

/**
 * 保存用户信息到本地
 * @param {Object} userInfo 用户信息对象
 * @returns {boolean} 是否保存成功
 */
LocalStorage.prototype.saveUserInfo = function(userInfo) {
    try {
        if (!userInfo) {
            console.log("用户信息为空，无法保存");
            return false;
        }

        var filePath = this.storageDir + this.userInfoFile;
        
        // 添加保存时间戳
        var dataToSave = {
            userInfo: userInfo,
            savedAt: new Date().toISOString(),
            version: "1.0"
        };

        var jsonString = JSON.stringify(dataToSave, null, 2);
        files.write(filePath, jsonString);
        
        console.log("用户信息已保存到: " + filePath);
        return true;
        
    } catch (e) {
        console.log("保存用户信息失败: " + e.message);
        return false;
    }
};

/**
 * 从本地读取用户信息
 * @returns {Object|null} 用户信息对象
 */
LocalStorage.prototype.loadUserInfo = function() {
    try {
        var filePath = this.storageDir + this.userInfoFile;
        
        if (!files.exists(filePath)) {
            console.log("用户信息文件不存在: " + filePath);
            return null;
        }

        var jsonString = files.read(filePath);
        if (!jsonString) {
            console.log("用户信息文件为空");
            return null;
        }

        var data = JSON.parse(jsonString);
        
        // 检查数据格式
        if (!data.userInfo) {
            console.log("用户信息文件格式错误");
            return null;
        }

        console.log("用户信息已从本地加载，保存时间: " + (data.savedAt || "未知"));
        return data.userInfo;
        
    } catch (e) {
        console.log("读取用户信息失败: " + e.message);
        return null;
    }
};

/**
 * 检查本地是否有用户信息
 * @returns {boolean} 是否存在用户信息
 */
LocalStorage.prototype.hasUserInfo = function() {
    var filePath = this.storageDir + this.userInfoFile;
    return files.exists(filePath);
};

/**
 * 删除本地用户信息
 * @returns {boolean} 是否删除成功
 */
LocalStorage.prototype.clearUserInfo = function() {
    try {
        var filePath = this.storageDir + this.userInfoFile;
        
        if (files.exists(filePath)) {
            files.remove(filePath);
            console.log("用户信息已清除");
            return true;
        } else {
            console.log("用户信息文件不存在，无需清除");
            return true;
        }
        
    } catch (e) {
        console.log("清除用户信息失败: " + e.message);
        return false;
    }
};

/**
 * 保存应用设置
 * @param {Object} settings 设置对象
 * @returns {boolean} 是否保存成功
 */
LocalStorage.prototype.saveSettings = function(settings) {
    try {
        if (!settings) {
            console.log("设置为空，无法保存");
            return false;
        }

        var filePath = this.storageDir + this.settingsFile;
        
        var dataToSave = {
            settings: settings,
            savedAt: new Date().toISOString(),
            version: "1.0"
        };

        var jsonString = JSON.stringify(dataToSave, null, 2);
        files.write(filePath, jsonString);
        
        console.log("应用设置已保存到: " + filePath);
        return true;
        
    } catch (e) {
        console.log("保存应用设置失败: " + e.message);
        return false;
    }
};

/**
 * 从本地读取应用设置
 * @returns {Object|null} 设置对象
 */
LocalStorage.prototype.loadSettings = function() {
    try {
        var filePath = this.storageDir + this.settingsFile;
        
        if (!files.exists(filePath)) {
            console.log("设置文件不存在: " + filePath);
            return null;
        }

        var jsonString = files.read(filePath);
        if (!jsonString) {
            console.log("设置文件为空");
            return null;
        }

        var data = JSON.parse(jsonString);
        
        if (!data.settings) {
            console.log("设置文件格式错误");
            return null;
        }

        console.log("应用设置已从本地加载，保存时间: " + (data.savedAt || "未知"));
        return data.settings;
        
    } catch (e) {
        console.log("读取应用设置失败: " + e.message);
        return null;
    }
};

/**
 * 获取用户信息文件的完整路径
 * @returns {string} 文件路径
 */
LocalStorage.prototype.getUserInfoFilePath = function() {
    return this.storageDir + this.userInfoFile;
};

/**
 * 获取设置文件的完整路径
 * @returns {string} 文件路径
 */
LocalStorage.prototype.getSettingsFilePath = function() {
    return this.storageDir + this.settingsFile;
};

/**
 * 获取存储目录路径
 * @returns {string} 目录路径
 */
LocalStorage.prototype.getStorageDir = function() {
    return this.storageDir;
};

/**
 * 备份用户信息
 * @returns {boolean} 是否备份成功
 */
LocalStorage.prototype.backupUserInfo = function() {
    try {
        var sourcePath = this.storageDir + this.userInfoFile;
        var backupPath = this.storageDir + "user_info_backup_" + new Date().getTime() + ".json";
        
        if (!files.exists(sourcePath)) {
            console.log("源文件不存在，无法备份");
            return false;
        }

        files.copy(sourcePath, backupPath);
        console.log("用户信息已备份到: " + backupPath);
        return true;
        
    } catch (e) {
        console.log("备份用户信息失败: " + e.message);
        return false;
    }
};

module.exports = LocalStorage;
