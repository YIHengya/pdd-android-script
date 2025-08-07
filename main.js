// 拼多多自动购买脚本 - 主入口文件
// 功能：协调各个模块，提供统一的入口点

"ui";

// 导入模块
const permissions = require('./utils/permissions.js');
const { COMMON_CONFIG } = require('./config/app-config.js');
const FloatingWindow = require('./ui/floating-window.js');
const ProductPurchase = require('./modules/product-purchase.js');
const ProductFavorite = require('./modules/product-favorite.js');
const FavoriteSettlement = require('./modules/favorite-settlement.js');
const AutoPayment = require('./modules/auto-payment.js');
const UserInfo = require('./modules/user-info.js');
const UserInfoManager = require('./utils/user-info-manager.js');
const { GlobalStopManager } = require('./utils/common.js');

/**
 * 主程序构造函数
 */
function MainApp() {
    this.floatingWindow = null;
    this.productPurchase = null;
    this.productFavorite = null;
    this.autoPayment = null;
    this.userInfo = null;
    this.userInfoManager = null; // 用户信息管理器
    this.scriptThread = null;
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
    this.productFavorite = new ProductFavorite();
    this.favoriteSettlement = new FavoriteSettlement();
    this.autoPayment = new AutoPayment();
    this.userInfo = new UserInfo();
    this.userInfoManager = new UserInfoManager();

    // 设置用户信息管理器的UserInfo实例
    this.userInfoManager.setUserInfoInstance(this.userInfo);

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
    this.floatingWindow.setOnStartCallback(function(window, priceRange, mode, purchaseQuantity) {
        // 在新线程中执行脚本，避免阻塞UI线程
        self.scriptThread = threads.start(function() {
            // 注册线程到全局停止管理器
            GlobalStopManager.registerThread(self.scriptThread);

            try {
                // 首先获取用户信息
                var logger = require('./utils/logger.js');
                logger.addLog(window, "=== 开始获取用户信息 ===");

                var userInfo = self.userInfoManager.getCompleteUserInfo(window);
                if (!userInfo) {
                    logger.addLog(window, "⚠️ 用户信息获取失败，继续执行功能");
                }

                logger.addLog(window, "=== 开始执行主要功能 ===");

                // 获取用户名用于API调用
                var userName = self.userInfoManager.getUserName();
                logger.addLog(window, "使用用户名: " + userName);

                // 根据模式执行不同功能
                logger.addLog(window, "接收到的模式参数: '" + mode + "'");
                logger.addLog(window, "模式类型: " + typeof mode);

                if (mode === 'payment') {
                    // 执行自动支付功能
                    logger.addLog(window, "执行模式: 自动支付");
                    self.autoPayment.execute(window, userName);
                } else if (mode === 'favorite') {
                    // 执行收藏功能，传入用户名和收藏数量
                    logger.addLog(window, "执行模式: 批量收藏");
                    logger.addLog(window, "收藏数量: " + purchaseQuantity + "件");
                    self.productFavorite.execute(window, priceRange, userName, purchaseQuantity);
                } else if (mode === 'favoriteSettlement') {
                    // 执行收藏结算功能
                    logger.addLog(window, "执行模式: 收藏结算");
                    self.favoriteSettlement.execute(window, userName);
                } else {
                    // 执行购买功能，传入用户名和购买数量
                    logger.addLog(window, "执行模式: 自动购买 (默认或其他模式)");
                    logger.addLog(window, "实际模式值: '" + mode + "'");
                    self.productPurchase.execute(window, priceRange, userName, purchaseQuantity);
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
                // 结束脚本计数
                GlobalStopManager.endScript();

                // 从全局停止管理器注销线程
                GlobalStopManager.unregisterThread(self.scriptThread);

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
        // 使用全局停止管理器停止所有线程
        GlobalStopManager.shutdownAll();

        // 清理本地线程引用
        if (self.scriptThread) {
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

                var userInfo = self.userInfoManager.getCompleteUserInfo(window, true); // 强制刷新
                if (userInfo) {
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
    var intervalId = setInterval(function() {
        // 检查是否需要停止
        if (GlobalStopManager.isStopRequested()) {
            clearInterval(intervalId);
            return;
        }
        // 空函数，保持脚本运行
    }, COMMON_CONFIG.keepAliveInterval);

    // 注册定时器到全局停止管理器
    GlobalStopManager.registerInterval(intervalId);
};

/**
 * 获取当前用户信息
 * @returns {Object|null} 当前用户信息
 */
MainApp.prototype.getCurrentUserData = function() {
    return this.userInfoManager.getCachedUserData();
};

/**
 * 获取当前用户ID
 * @returns {string|null} 当前用户ID
 */
MainApp.prototype.getCurrentUserId = function() {
    return this.userInfoManager.getUserId();
};

/**
 * 获取当前收件人信息
 * @returns {Object|null} 当前收件人信息
 */
MainApp.prototype.getCurrentRecipientInfo = function() {
    return this.userInfoManager.getRecipientInfo();
};

/**
 * 手动刷新用户信息
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否刷新成功
 */
MainApp.prototype.refreshUserInfo = function(window) {
    return this.userInfoManager.refreshUserInfo(window);
};

/**
 * 获取完整的手机号（不带星号，用于实际业务逻辑）
 * @returns {string|null} 完整的手机号
 */
MainApp.prototype.getFullPhoneNumber = function() {
    return this.userInfoManager.getFullPhoneNumber();
};

/**
 * 获取完整的地址信息（用于实际业务逻辑）
 * @returns {string|null} 完整的地址
 */
MainApp.prototype.getFullAddress = function() {
    return this.userInfoManager.getFullAddress();
};

/**
 * 获取收件人姓名
 * @returns {string|null} 收件人姓名
 */
MainApp.prototype.getRecipientName = function() {
    return this.userInfoManager.getRecipientName();
};

// 启动主程序
function main() {
    // 检查是否通过参数启动悬浮窗模式
    if (engines.myEngine().getTag("mode") === "floating") {
        // 直接启动悬浮窗模式
        const app = new MainApp();
        app.start();
    } else {
        // 启动主界面
        const MainUI = require('./ui/main-ui.js');
        const mainUI = new MainUI();
        mainUI.show();
    }
}

// 程序入口
main();


