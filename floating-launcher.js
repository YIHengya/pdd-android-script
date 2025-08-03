// 悬浮窗启动器
// 专门用于从主界面启动悬浮窗功能

"ui";

// 导入模块
const permissions = require('./utils/permissions.js');
const { COMMON_CONFIG } = require('./config/app-config.js');
const FloatingWindow = require('./ui/floating-window.js');
const ProductPurchase = require('./modules/product-purchase.js');
const ProductCollect = require('./modules/product-collect.js');
const UserInfo = require('./modules/user-info.js');

/**
 * 悬浮窗应用构造函数
 */
function FloatingApp() {
    this.floatingWindow = null;
    this.productPurchase = null;
    this.productCollect = null;
    this.userInfo = null;
    this.scriptThread = null;
    this.currentUserData = null;
}

/**
 * 初始化应用
 */
FloatingApp.prototype.init = function() {
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
FloatingApp.prototype.setupCallbacks = function() {
    var self = this;

    // 设置脚本启动回调
    this.floatingWindow.setOnStartCallback(function(window, priceRange, mode) {
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

                // 获取用户名用于API调用
                var userName = "未知用户";
                if (self.currentUserData && self.currentUserData.recipient && self.currentUserData.recipient.name) {
                    userName = self.currentUserData.recipient.name;
                } else if (self.currentUserData && self.currentUserData.user && self.currentUserData.user.displayName) {
                    userName = self.currentUserData.user.displayName;
                }

                logger.addLog(window, "使用用户名: " + userName);

                // 根据模式选择执行功能
                if (mode === 'collect') {
                    self.productCollect.execute(window, priceRange);
                } else {
                    // 默认执行购买功能，传入用户名
                    self.productPurchase.execute(window, priceRange, userName);
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
FloatingApp.prototype.setupUserInfoCallback = function() {
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
FloatingApp.prototype.start = function() {
    this.init();
    this.keepAlive();
};

/**
 * 保持应用运行
 */
FloatingApp.prototype.keepAlive = function() {
    // 保持悬浮窗运行
    setInterval(function() {
        // 空函数，保持脚本运行
    }, COMMON_CONFIG.keepAliveInterval);
};

/**
 * 关闭悬浮窗
 */
FloatingApp.prototype.close = function() {
    if (this.floatingWindow) {
        this.floatingWindow.close();
    }
    if (this.scriptThread) {
        this.scriptThread.interrupt();
    }
};

// 启动悬浮窗应用
function main() {
    const app = new FloatingApp();
    app.start();
}

// 程序入口
main();
