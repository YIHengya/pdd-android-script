// 拼多多自动购买脚本 - 主入口文件
// 功能：协调各个模块，提供统一的入口点

// 导入模块
const permissions = require('./utils/permissions.js');
const { COMMON_CONFIG } = require('./config/app-config.js');
const FloatingWindow = require('./ui/floating-window.js');
const ProductPurchase = require('./modules/product-purchase.js');
const ProductCollect = require('./modules/product-collect.js');

/**
 * 主程序构造函数
 */
function MainApp() {
    this.floatingWindow = null;
    this.productPurchase = null;
    this.productCollect = null;
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
    this.productCollect = new ProductCollect();

    // 创建悬浮窗
    this.floatingWindow.create();

    // 设置回调函数
    this.setupCallbacks();
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

// 启动主程序
function main() {
    const app = new MainApp();
    app.start();
}

// 程序入口
main();


