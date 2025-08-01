// 拼多多自动购买脚本 - 主入口文件
// 功能：协调各个模块，提供统一的入口点

// 导入模块
const permissions = require('./utils/permissions.js');
const { COMMON_CONFIG } = require('./config/app-config.js');
const FloatingWindow = require('./ui/floating-window.js');
const ProductPurchase = require('./modules/product-purchase.js');
const ProductCollect = require('./modules/product-collect.js');
const UserInfo = require('./modules/user-info.js');

/**
 * 主程序构造函数
 */
function MainApp() {
    this.floatingWindow = null;
    this.productPurchase = null;
    this.productCollect = null;
    this.userInfo = null;
    this.scriptThread = null;
    this.currentUserData = null; // 存储当前用户信息
}

/**
 * 初始化应用
 */
MainApp.prototype.init = function() {
    // 检查权限
    permissions.checkPermissions();

    // 创建模块实例
    this.floatingWindow = new FloatingWindow();
    this.productPurchase = new ProductPurchase();
    this.productCollect = new ProductCollect();
    this.userInfo = new UserInfo();

    // 创建悬浮窗
    this.floatingWindow.create();

    // 设置回调函数
    this.setupCallbacks();

    // 设置用户信息回调
    this.setupUserInfoCallback();
};

/**
 * 设置回调函数
 */
MainApp.prototype.setupCallbacks = function() {
    var self = this;

    // 设置脚本启动回调
    this.floatingWindow.setOnStartCallback(function(window, targetPrice, mode) {
        // 在新线程中执行脚本，避免阻塞UI线程
        self.scriptThread = threads.start(function() {
            try {
                // 首先获取用户信息
                var logger = require('./utils/logger.js');
                logger.addLog(window, "=== 开始获取用户信息 ===");

                var userInfo = self.userInfo.getCompleteUserInfo(window);
                if (userInfo) {
                    self.currentUserData = userInfo;
                    logger.addLog(window, "✅ 用户信息获取成功");
                    logger.addLog(window, "用户ID: " + userInfo.user.userId);
                    if (userInfo.recipient) {
                        logger.addLog(window, "收件人: " + (userInfo.recipient.name || "未获取"));
                        if (userInfo.recipient.phone) {
                            logger.addLog(window, "手机号: " + userInfo.recipient.phone.substring(0, 3) + "****" + userInfo.recipient.phone.substring(7));
                        }
                        if (userInfo.recipient.address) {
                            logger.addLog(window, "地址: " + userInfo.recipient.address);
                        }
                    }
                } else {
                    logger.addLog(window, "⚠️ 用户信息获取失败，继续执行功能");
                }

                logger.addLog(window, "=== 开始执行主要功能 ===");

                // 根据模式选择执行功能
                if (mode === 'collect') {
                    self.productCollect.execute(window, targetPrice);
                } else {
                    // 默认执行购买功能
                    self.productPurchase.execute(window, targetPrice);
                }
            } catch (e) {
                // 在UI线程中更新日志
                ui.run(function() {
                    if (window && window.logText) {
                        var logger = require('./utils/logger.js');
                        logger.addLog(window, "脚本执行出错: " + e.message);
                    }
                });
            } finally {
                // 脚本结束时自动关闭开关
                ui.run(function() {
                    if (window && window.scriptSwitch) {
                        window.scriptSwitch.setChecked(false);
                    }
                });
                self.scriptThread = null;
            }
        });
    });

    // 设置脚本停止回调
    this.floatingWindow.setOnStopCallback(function() {
        // 停止脚本线程
        if (self.scriptThread) {
            self.scriptThread.interrupt();
            self.scriptThread = null;
        }
    });
};

/**
 * 设置用户信息回调
 */
MainApp.prototype.setupUserInfoCallback = function() {
    var self = this;

    // 设置用户信息获取回调
    this.floatingWindow.setOnUserInfoCallback(function(window, callback) {
        // 在新线程中执行，避免阻塞UI线程
        threads.start(function() {
            try {
                var logger = require('./utils/logger.js');
                logger.addLog(window, "=== 手动获取用户信息 ===");

                var userInfo = self.userInfo.getCompleteUserInfo(window);
                if (userInfo) {
                    self.currentUserData = userInfo;
                    logger.addLog(window, "✅ 用户信息获取成功");
                    logger.addLog(window, "用户ID: " + userInfo.user.userId);
                    logger.addLog(window, "用户名: " + (userInfo.user.displayName || "未获取"));

                    if (userInfo.recipient) {
                        logger.addLog(window, "收件人: " + (userInfo.recipient.name || "未获取"));
                        if (userInfo.recipient.phone) {
                            logger.addLog(window, "手机号: " + userInfo.recipient.phone);
                        }
                        if (userInfo.recipient.address) {
                            logger.addLog(window, "地址: " + userInfo.recipient.address);
                        }
                        logger.addLog(window, "默认地址: " + (userInfo.recipient.isDefault ? "是" : "否"));
                    }

                    logger.addLog(window, "=== 用户信息获取完成 ===");

                    // 如果提供了回调函数，调用它来更新UI显示
                    if (callback && typeof callback === 'function') {
                        callback(userInfo);
                    }
                } else {
                    logger.addLog(window, "❌ 用户信息获取失败");
                    logger.addLog(window, "请确保已登录拼多多并设置了收货地址");
                }
            } catch (e) {
                ui.run(function() {
                    if (window && window.logText) {
                        var logger = require('./utils/logger.js');
                        logger.addLog(window, "获取用户信息出错: " + e.message);
                    }
                });
            }
        });
    });
};

/**
 * 启动应用
 */
MainApp.prototype.start = function() {
    this.init();
    this.keepAlive();
};

/**
 * 保持应用运行
 */
MainApp.prototype.keepAlive = function() {
    // 保持悬浮窗运行
    setInterval(function() {
        // 空函数，保持脚本运行
    }, COMMON_CONFIG.keepAliveInterval);
};

/**
 * 获取当前用户信息
 * @returns {Object|null} 当前用户信息
 */
MainApp.prototype.getCurrentUserData = function() {
    return this.currentUserData;
};

/**
 * 获取当前用户ID
 * @returns {string|null} 当前用户ID
 */
MainApp.prototype.getCurrentUserId = function() {
    if (this.currentUserData && this.currentUserData.user) {
        return this.currentUserData.user.userId;
    }
    return null;
};

/**
 * 获取当前收件人信息
 * @returns {Object|null} 当前收件人信息
 */
MainApp.prototype.getCurrentRecipientInfo = function() {
    if (this.currentUserData && this.currentUserData.recipient) {
        return this.currentUserData.recipient;
    }
    return null;
};

/**
 * 手动刷新用户信息
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否刷新成功
 */
MainApp.prototype.refreshUserInfo = function(window) {
    try {
        var logger = require('./utils/logger.js');
        logger.addLog(window, "正在刷新用户信息...");

        var userInfo = this.userInfo.getCompleteUserInfo(window);
        if (userInfo) {
            this.currentUserData = userInfo;
            logger.addLog(window, "用户信息刷新成功");
            return true;
        } else {
            logger.addLog(window, "用户信息刷新失败");
            return false;
        }
    } catch (e) {
        var logger = require('./utils/logger.js');
        logger.addLog(window, "刷新用户信息出错: " + e.message);
        return false;
    }
};

/**
 * 获取完整的手机号（不带星号，用于实际业务逻辑）
 * @returns {string|null} 完整的手机号
 */
MainApp.prototype.getFullPhoneNumber = function() {
    if (this.currentUserData && this.currentUserData.recipient && this.currentUserData.recipient.phone) {
        return this.currentUserData.recipient.phone;
    }
    return null;
};

/**
 * 获取完整的地址信息（用于实际业务逻辑）
 * @returns {string|null} 完整的地址
 */
MainApp.prototype.getFullAddress = function() {
    if (this.currentUserData && this.currentUserData.recipient && this.currentUserData.recipient.address) {
        return this.currentUserData.recipient.address;
    }
    return null;
};

/**
 * 获取收件人姓名
 * @returns {string|null} 收件人姓名
 */
MainApp.prototype.getRecipientName = function() {
    if (this.currentUserData && this.currentUserData.recipient && this.currentUserData.recipient.name) {
        return this.currentUserData.recipient.name;
    }
    return null;
};

// 启动主程序
function main() {
    const app = new MainApp();
    app.start();
}

// 程序入口
main();


