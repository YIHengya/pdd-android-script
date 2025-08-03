// 用户信息管理器
// 统一管理用户信息的获取、存储、格式化和显示

const logger = require('./logger.js');
const LocalStorage = require('./local-storage.js');

/**
 * 用户信息管理器构造函数
 */
function UserInfoManager() {
    this.userInfo = null; // UserInfo模块实例
    this.currentUserData = null; // 缓存的用户信息
    this.lastUpdateTime = null; // 最后更新时间
    this.cacheTimeout = 5 * 60 * 1000; // 缓存超时时间：5分钟
    this.localStorage = new LocalStorage(); // 本地存储管理器
    this.autoSave = true; // 是否自动保存到本地
}

/**
 * 设置UserInfo模块实例
 * @param {Object} userInfoInstance UserInfo模块实例
 */
UserInfoManager.prototype.setUserInfoInstance = function(userInfoInstance) {
    this.userInfo = userInfoInstance;
};

/**
 * 获取完整用户信息（带缓存和本地存储）
 * @param {Object} window 悬浮窗对象
 * @param {boolean} forceRefresh 是否强制刷新
 * @returns {Object|null} 用户信息对象
 */
UserInfoManager.prototype.getCompleteUserInfo = function(window, forceRefresh) {
    try {
        // 检查内存缓存是否有效
        if (!forceRefresh && this.isCacheValid()) {
            logger.addLog(window, "使用内存缓存的用户信息");
            return this.currentUserData;
        }

        // 如果没有强制刷新，先尝试从本地存储加载
        if (!forceRefresh && !this.currentUserData) {
            var localUserInfo = this.loadFromLocal(window);
            if (localUserInfo) {
                return localUserInfo;
            }
        }

        // 获取新的用户信息
        logger.addLog(window, "开始从应用获取用户信息...");

        if (!this.userInfo) {
            logger.addLog(window, "UserInfo模块未初始化");
            return null;
        }

        var userInfo = this.userInfo.getCompleteUserInfo(window);
        if (userInfo) {
            this.currentUserData = userInfo;
            this.lastUpdateTime = Date.now();

            // 自动保存到本地
            if (this.autoSave) {
                this.saveToLocal(window, userInfo);
            }

            this.logUserInfoSuccess(window, userInfo);
            return userInfo;
        } else {
            logger.addLog(window, "⚠️ 用户信息获取失败");
            return null;
        }

    } catch (e) {
        logger.addLog(window, "获取用户信息出错: " + e.message);
        return null;
    }
};

/**
 * 检查缓存是否有效
 * @returns {boolean} 缓存是否有效
 */
UserInfoManager.prototype.isCacheValid = function() {
    if (!this.currentUserData || !this.lastUpdateTime) {
        return false;
    }
    
    var now = Date.now();
    return (now - this.lastUpdateTime) < this.cacheTimeout;
};

/**
 * 记录用户信息获取成功的日志
 * @param {Object} window 悬浮窗对象
 * @param {Object} userInfo 用户信息对象
 */
UserInfoManager.prototype.logUserInfoSuccess = function(window, userInfo) {
    logger.addLog(window, "✅ 用户信息获取成功");
    
    if (userInfo.user) {
        logger.addLog(window, "用户ID: " + userInfo.user.userId);
        if (userInfo.user.displayName) {
            logger.addLog(window, "用户名: " + userInfo.user.displayName);
        }
    }
    
    if (userInfo.recipient) {
        logger.addLog(window, "收件人: " + (userInfo.recipient.name || "未获取"));
        if (userInfo.recipient.phone) {
            logger.addLog(window, "手机号: " + this.formatPhoneForDisplay(userInfo.recipient.phone));
        }
        if (userInfo.recipient.address) {
            logger.addLog(window, "地址: " + userInfo.recipient.address);
        }
        if (userInfo.recipient.isDefault !== undefined) {
            logger.addLog(window, "默认地址: " + (userInfo.recipient.isDefault ? "是" : "否"));
        }
    }
};

/**
 * 格式化手机号用于显示（隐藏中间4位）
 * @param {string} phone 完整手机号
 * @returns {string} 格式化后的手机号
 */
UserInfoManager.prototype.formatPhoneForDisplay = function(phone) {
    if (!phone || phone.length !== 11) {
        return phone;
    }
    return phone.substring(0, 3) + "****" + phone.substring(7);
};

/**
 * 获取用户名（优先使用收件人姓名，其次用户显示名）
 * @returns {string} 用户名
 */
UserInfoManager.prototype.getUserName = function() {
    if (this.currentUserData && this.currentUserData.recipient && this.currentUserData.recipient.name) {
        return this.currentUserData.recipient.name;
    } else if (this.currentUserData && this.currentUserData.user && this.currentUserData.user.displayName) {
        return this.currentUserData.user.displayName;
    }
    return "未知用户";
};

/**
 * 获取用户ID
 * @returns {string|null} 用户ID
 */
UserInfoManager.prototype.getUserId = function() {
    if (this.currentUserData && this.currentUserData.user) {
        return this.currentUserData.user.userId;
    }
    return null;
};

/**
 * 获取收件人信息
 * @returns {Object|null} 收件人信息
 */
UserInfoManager.prototype.getRecipientInfo = function() {
    if (this.currentUserData && this.currentUserData.recipient) {
        return this.currentUserData.recipient;
    }
    return null;
};

/**
 * 获取收件人姓名
 * @returns {string|null} 收件人姓名
 */
UserInfoManager.prototype.getRecipientName = function() {
    var recipient = this.getRecipientInfo();
    return recipient ? recipient.name : null;
};

/**
 * 获取完整手机号（用于业务逻辑）
 * @returns {string|null} 完整手机号
 */
UserInfoManager.prototype.getFullPhoneNumber = function() {
    var recipient = this.getRecipientInfo();
    return recipient ? recipient.phone : null;
};

/**
 * 获取完整地址
 * @returns {string|null} 完整地址
 */
UserInfoManager.prototype.getFullAddress = function() {
    var recipient = this.getRecipientInfo();
    return recipient ? recipient.address : null;
};

/**
 * 获取缓存的用户信息
 * @returns {Object|null} 缓存的用户信息
 */
UserInfoManager.prototype.getCachedUserData = function() {
    return this.currentUserData;
};

/**
 * 清除缓存
 */
UserInfoManager.prototype.clearCache = function() {
    this.currentUserData = null;
    this.lastUpdateTime = null;
};

/**
 * 刷新用户信息
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否刷新成功
 */
UserInfoManager.prototype.refreshUserInfo = function(window) {
    try {
        logger.addLog(window, "正在刷新用户信息...");
        
        var userInfo = this.getCompleteUserInfo(window, true); // 强制刷新
        if (userInfo) {
            logger.addLog(window, "用户信息刷新成功");
            return true;
        } else {
            logger.addLog(window, "用户信息刷新失败");
            return false;
        }
    } catch (e) {
        logger.addLog(window, "刷新用户信息出错: " + e.message);
        return false;
    }
};

/**
 * 更新UI显示的用户信息（通用方法）
 * @param {Object} uiElements UI元素对象，包含userName, userPhone, userAddress等
 * @param {Object} userInfo 用户信息对象（可选，不传则使用缓存）
 */
UserInfoManager.prototype.updateUIDisplay = function(uiElements, userInfo) {
    var info = userInfo || this.currentUserData;
    
    if (!info || !uiElements) return;
    
    try {
        if (info.recipient) {
            var recipient = info.recipient;
            if (uiElements.userName) {
                uiElements.userName.setText(recipient.name || "未获取");
            }
            if (uiElements.userPhone) {
                uiElements.userPhone.setText(recipient.phone || "未获取");
            }
            if (uiElements.userAddress) {
                uiElements.userAddress.setText(recipient.address || "未获取");
            }
        } else {
            // 如果没有收件人信息，显示默认文本
            if (uiElements.userName) uiElements.userName.setText("未获取");
            if (uiElements.userPhone) uiElements.userPhone.setText("未获取");
            if (uiElements.userAddress) uiElements.userAddress.setText("未获取");
        }
    } catch (e) {
        console.log("更新UI显示失败: " + e.message);
    }
};

/**
 * 检查用户信息是否完整
 * @returns {boolean} 用户信息是否完整
 */
UserInfoManager.prototype.isUserInfoComplete = function() {
    if (!this.currentUserData) return false;

    var hasUser = this.currentUserData.user && this.currentUserData.user.userId;
    var hasRecipient = this.currentUserData.recipient &&
                      this.currentUserData.recipient.name &&
                      this.currentUserData.recipient.phone &&
                      this.currentUserData.recipient.address;

    return hasUser && hasRecipient;
};

/**
 * 从本地存储加载用户信息
 * @param {Object} window 悬浮窗对象
 * @returns {Object|null} 用户信息对象
 */
UserInfoManager.prototype.loadFromLocal = function(window) {
    try {
        logger.addLog(window, "正在从本地加载用户信息...");

        var userInfo = this.localStorage.loadUserInfo();
        if (userInfo) {
            this.currentUserData = userInfo;
            this.lastUpdateTime = Date.now(); // 设置为当前时间，避免立即过期

            logger.addLog(window, "✅ 从本地加载用户信息成功");
            this.logUserInfoSuccess(window, userInfo);
            return userInfo;
        } else {
            logger.addLog(window, "本地没有保存的用户信息");
            return null;
        }
    } catch (e) {
        logger.addLog(window, "从本地加载用户信息失败: " + e.message);
        return null;
    }
};

/**
 * 保存用户信息到本地存储
 * @param {Object} window 悬浮窗对象
 * @param {Object} userInfo 用户信息对象
 * @returns {boolean} 是否保存成功
 */
UserInfoManager.prototype.saveToLocal = function(window, userInfo) {
    try {
        if (!userInfo) {
            logger.addLog(window, "用户信息为空，无法保存到本地");
            return false;
        }

        var success = this.localStorage.saveUserInfo(userInfo);
        if (success) {
            logger.addLog(window, "✅ 用户信息已保存到本地");
        } else {
            logger.addLog(window, "❌ 用户信息保存到本地失败");
        }
        return success;
    } catch (e) {
        logger.addLog(window, "保存用户信息到本地出错: " + e.message);
        return false;
    }
};

/**
 * 清除本地保存的用户信息
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否清除成功
 */
UserInfoManager.prototype.clearLocalUserInfo = function(window) {
    try {
        var success = this.localStorage.clearUserInfo();
        if (success) {
            logger.addLog(window, "✅ 本地用户信息已清除");
        } else {
            logger.addLog(window, "❌ 清除本地用户信息失败");
        }
        return success;
    } catch (e) {
        logger.addLog(window, "清除本地用户信息出错: " + e.message);
        return false;
    }
};

/**
 * 检查本地是否有保存的用户信息
 * @returns {boolean} 是否有本地用户信息
 */
UserInfoManager.prototype.hasLocalUserInfo = function() {
    return this.localStorage.hasUserInfo();
};

/**
 * 设置是否自动保存到本地
 * @param {boolean} autoSave 是否自动保存
 */
UserInfoManager.prototype.setAutoSave = function(autoSave) {
    this.autoSave = autoSave;
};

/**
 * 手动保存当前用户信息到本地
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否保存成功
 */
UserInfoManager.prototype.manualSaveToLocal = function(window) {
    if (!this.currentUserData) {
        logger.addLog(window, "当前没有用户信息，无法保存");
        return false;
    }

    return this.saveToLocal(window, this.currentUserData);
};

/**
 * 初始化时自动加载本地用户信息
 * @param {Object} window 悬浮窗对象
 * @returns {Object|null} 用户信息对象
 */
UserInfoManager.prototype.initializeFromLocal = function(window) {
    try {
        if (this.hasLocalUserInfo()) {
            logger.addLog(window, "发现本地保存的用户信息，正在加载...");
            return this.loadFromLocal(window);
        } else {
            logger.addLog(window, "本地没有保存的用户信息");
            return null;
        }
    } catch (e) {
        logger.addLog(window, "初始化本地用户信息失败: " + e.message);
        return null;
    }
};

module.exports = UserInfoManager;
