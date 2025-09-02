// 主页导航模块
// 专门处理拼多多主页相关的导航功能

const { PDD_CONFIG } = require('../../config/app-config.js');
const { safeClick, findAnyElement, isInApp } = require('../common.js');
const logger = require('../logger.js');
const { waitTimeManager } = require('../wait-time-manager.js');

/**
 * 主页导航构造函数
 */
function HomeNavigation() {
    this.config = PDD_CONFIG;
    this.maxRetries = 10;
    this.waitTime = 2000;
}

/**
 * 回到主页的通用方法
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否成功回到主页
 */
HomeNavigation.prototype.goToHomePage = function(window) {
    logger.addLog(window, "开始尝试回到主页...");
    
    // 方法1: 直接点击首页按钮
    if (this.clickHomeButton(window)) {
        return true;
    }
    
    // 方法2: 多次返回到主页
    if (this.backToHomePage(window)) {
        return true;
    }
    
    // 方法3: 重启应用
    if (this.restartApp(window)) {
        return true;
    }
    
    logger.addLog(window, "❌ 无法回到主页");
    return false;
};

/**
 * 点击首页按钮
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否成功
 */
HomeNavigation.prototype.clickHomeButton = function(window) {
    logger.addLog(window, "尝试点击首页按钮...");
    
    var homeSelectors = [
        text("首页"),
        textContains("首页"),
        desc("首页"),
        descContains("首页"),
        id("home"),
        id("homepage"),
        className("android.widget.TextView").text("首页"),
        className("android.widget.Button").text("首页")
    ];
    
    var homeButton = findAnyElement(homeSelectors);
    if (homeButton) {
        logger.addLog(window, "找到首页按钮: " + homeButton.text());
        if (safeClick(homeButton)) {
            waitTimeManager.wait('back');
            if (this.isAtHomePage(window)) {
                logger.addLog(window, "✅ 成功回到主页");
                return true;
            }
        }
    }
    
    logger.addLog(window, "未找到首页按钮或点击失败");
    return false;
};

/**
 * 通过多次返回操作回到主页
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否成功
 */
HomeNavigation.prototype.backToHomePage = function(window) {
    logger.addLog(window, "尝试通过返回操作回到主页...");
    
    var retryCount = 0;
    
    while (retryCount < this.maxRetries) {
        retryCount++;
        logger.addLog(window, "第 " + retryCount + " 次尝试返回...");
        
        // 检查是否已经在主页
        if (this.isAtHomePage(window)) {
            logger.addLog(window, "✅ 已经在主页");
            return true;
        }
        
        // 执行返回操作
        back();
        waitTimeManager.wait('back');
        
        // 检查是否回到主页
        if (this.isAtHomePage(window)) {
            logger.addLog(window, "✅ 成功返回到主页");
            return true;
        }
        
        // 如果不在拼多多应用中，尝试重新打开
        if (!isInApp(this.config.packageNames)) {
            logger.addLog(window, "不在拼多多应用中，尝试重新打开...");
            if (this.launchApp(window)) {
                if (this.isAtHomePage(window)) {
                    return true;
                }
            }
        }
    }
    
    logger.addLog(window, "返回操作失败");
    return false;
};

/**
 * 重启应用
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否成功
 */
HomeNavigation.prototype.restartApp = function(window) {
    logger.addLog(window, "尝试重启拼多多应用...");
    
    try {
        // 关闭当前应用
        this.closeApp(window);
        
        // 等待一段时间
        waitTimeManager.wait('long');
        
        // 重新启动应用
        if (this.launchApp(window)) {
            waitTimeManager.wait('back');
            if (this.isAtHomePage(window)) {
                logger.addLog(window, "✅ 重启应用成功，已回到主页");
                return true;
            }
        }
    } catch (e) {
        logger.addLog(window, "重启应用失败: " + e.message);
    }
    
    return false;
};

/**
 * 关闭应用
 * @param {Object} window 悬浮窗对象
 */
HomeNavigation.prototype.closeApp = function(window) {
    logger.addLog(window, "正在关闭拼多多应用...");
    
    try {
        // 方法1: 使用包名关闭
        for (var i = 0; i < this.config.packageNames.length; i++) {
            try {
                app.openAppSetting(this.config.packageNames[i]);
                waitTimeManager.wait('short');
                
                var forceStopBtn = text("强行停止").findOne(2000);
                if (!forceStopBtn) {
                    forceStopBtn = textContains("强行停止").findOne(2000);
                }
                if (!forceStopBtn) {
                    forceStopBtn = text("Force stop").findOne(2000);
                }
                
                if (forceStopBtn && forceStopBtn.enabled()) {
                    safeClick(forceStopBtn);
                    waitTimeManager.wait('short');
                    
                    var confirmBtn = text("确定").findOne(1000);
                    if (!confirmBtn) {
                        confirmBtn = text("OK").findOne(1000);
                    }
                    if (confirmBtn) {
                        safeClick(confirmBtn);
                    }
                    
                    logger.addLog(window, "已强制停止应用");
                    break;
                }
            } catch (e) {
                continue;
            }
        }
        
        // 方法2: 回到桌面
        home();
        waitTimeManager.wait('short');
        
    } catch (e) {
        logger.addLog(window, "关闭应用时出错: " + e.message);
    }
};

/**
 * 获取当前包名（带重试机制）
 * @param {number} maxRetries 最大重试次数
 * @param {number} retryDelay 重试间隔（毫秒）
 * @returns {string|null} 当前包名
 */
HomeNavigation.prototype.getCurrentPackageWithRetry = function(maxRetries, retryDelay) {
    maxRetries = maxRetries || 3;
    retryDelay = retryDelay || 1000;

    for (var i = 0; i < maxRetries; i++) {
        try {
            var currentPkg = currentPackage();
            if (currentPkg && currentPkg !== null && currentPkg !== "") {
                return currentPkg;
            }

            if (i < maxRetries - 1) {
                waitTimeManager.wait(retryDelay);
            }
        } catch (e) {
            if (i < maxRetries - 1) {
                waitTimeManager.wait(retryDelay);
            }
        }
    }

    return null;
};

/**
 * 检查是否在拼多多应用中
 * @param {string} currentPkg 当前包名
 * @returns {boolean} 是否在拼多多应用中
 */
HomeNavigation.prototype.isPDDApp = function(currentPkg) {
    if (!currentPkg) return false;

    // 检查精确匹配
    for (var i = 0; i < this.config.packageNames.length; i++) {
        if (currentPkg === this.config.packageNames[i]) {
            return true;
        }
    }

    // 检查模糊匹配
    if (currentPkg.indexOf("pinduoduo") !== -1 ||
        currentPkg.indexOf("pdd") !== -1 ||
        currentPkg.indexOf("xunmeng") !== -1) {
        return true;
    }

    return false;
};

/**
 * 检查拼多多应用是否已安装
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否已安装
 */
HomeNavigation.prototype.isPDDInstalled = function(window) {
    try {
        var packageManager = context.getPackageManager();
        var appInfo = packageManager.getApplicationInfo("com.xunmeng.pinduoduo", 0);
        return appInfo !== null;
    } catch (e) {
        logger.addLog(window, "检查应用安装状态失败: " + e.message);
        return false;
    }
};

/**
 * 使用UI元素检测是否在拼多多应用中
 * @returns {boolean} 是否在拼多多应用中
 */
HomeNavigation.prototype.detectPDDByUI = function() {
    try {
        // 检查拼多多特有的UI元素
        var pddIndicators = [
            text("首页"),
            text("搜索"),
            textContains("拼多多"),
            text("个人中心"),
            text("购物车")
        ];

        for (var i = 0; i < pddIndicators.length; i++) {
            if (pddIndicators[i].exists()) {
                return true;
            }
        }

        return false;
    } catch (e) {
        return false;
    }
};

/**
 * 启动拼多多应用
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否启动成功
 */
HomeNavigation.prototype.launchApp = function(window) {
    try {
        logger.addLog(window, "正在启动拼多多应用...");

        // 首先检查应用是否已安装
        if (!this.isPDDInstalled(window)) {
            logger.addLog(window, "❌ 拼多多应用未安装");
            return false;
        }

        // 检查是否已经在拼多多应用中
        var currentPkg = this.getCurrentPackageWithRetry(3, 500);
        logger.addLog(window, "当前应用包名: " + (currentPkg || "null"));

        // 如果包名检测成功且是拼多多
        if (this.isPDDApp(currentPkg)) {
            logger.addLog(window, "✅ 已在拼多多应用中");
            return true;
        }

        // 如果包名检测失败，尝试通过UI检测
        if (!currentPkg && this.detectPDDByUI()) {
            logger.addLog(window, "✅ 通过UI检测确认已在拼多多应用中");
            return true;
        }

        home();
        waitTimeManager.wait('pageLoad');

        // 直接启动拼多多（只尝试已知存在的包名）
        logger.addLog(window, "尝试启动包名: com.xunmeng.pinduoduo");
        app.launchPackage("com.xunmeng.pinduoduo");
        waitTimeManager.wait('appLaunch');

        // 使用多种方式验证启动成功
        currentPkg = this.getCurrentPackageWithRetry(5, 800);
        logger.addLog(window, "启动后当前应用: " + (currentPkg || "null"));

        // 方式1：包名检测
        if (currentPkg === "com.xunmeng.pinduoduo") {
            logger.addLog(window, "✅ 成功通过包名启动拼多多");
            return true;
        }

        // 方式2：UI检测（当包名检测失败时的备用方案）
        if (this.detectPDDByUI()) {
            logger.addLog(window, "✅ 通过UI检测确认拼多多启动成功");
            return true;
        }

        // 如果包名启动失败，尝试应用名启动
        logger.addLog(window, "包名启动失败，尝试应用名启动...");
        logger.addLog(window, "尝试应用名: 拼多多");
        app.launchApp("拼多多");
        waitTimeManager.wait('appLaunch');

        // 再次检测
        currentPkg = this.getCurrentPackageWithRetry(5, 800);
        logger.addLog(window, "应用名启动后当前应用: " + (currentPkg || "null"));

        if (this.isPDDApp(currentPkg) || this.detectPDDByUI()) {
            logger.addLog(window, "✅ 成功启动拼多多");
            return true;
        }

        // 最后尝试：通过Intent启动
        logger.addLog(window, "尝试通过Intent启动...");
        try {
            var intent = app.intent({
                action: "android.intent.action.MAIN",
                category: ["android.intent.category.LAUNCHER"],
                packageName: "com.xunmeng.pinduoduo"
            });
            context.startActivity(intent);

            waitTimeManager.wait('appLaunch');
            currentPkg = this.getCurrentPackageWithRetry(5, 800);
            logger.addLog(window, "Intent启动后当前应用: " + (currentPkg || "null"));

            if (this.isPDDApp(currentPkg) || this.detectPDDByUI()) {
                logger.addLog(window, "✅ Intent启动成功");
                return true;
            }
        } catch (e) {
            logger.addLog(window, "Intent启动失败: " + e.message);
        }

        logger.addLog(window, "❌ 启动拼多多失败");
        logger.addLog(window, "请手动打开拼多多应用后重试");
        return false;
    } catch (e) {
        logger.addLog(window, "启动应用失败: " + e.message);
        return false;
    }
};

/**
 * 检查是否在主页
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否在主页
 */
HomeNavigation.prototype.isAtHomePage = function(window) {
    logger.addLog(window, "检查是否在主页...");

    // 检查主页特征的函数
    var checkHomeIndicators = function() {
        var foundIndicators = 0;
        var totalChecks = 0;

        // 1. 检查底部导航栏的"首页"按钮（最重要的标识）
        totalChecks++;
        var homeNavButtons = [
            text("首页"),
            textContains("首页")
        ];

        for (var i = 0; i < homeNavButtons.length; i++) {
            var homeNavs = homeNavButtons[i].find();
            for (var j = 0; j < homeNavs.length; j++) {
                var bounds = homeNavs[j].bounds();
                // 检查是否在屏幕底部（底部导航栏区域）
                if (bounds.bottom > device.height * 0.8) {
                    logger.addLog(window, "✅ 找到底部导航栏的首页按钮");
                    foundIndicators++;
                    break;
                }
            }
            if (foundIndicators > 0) break;
        }

        // 2. 检查"推荐"标识（但需要在页面上方区域）
        totalChecks++;
        var recommendElements = text("推荐").find();
        for (var i = 0; i < recommendElements.length; i++) {
            var bounds = recommendElements[i].bounds();
            // 推荐标识应该在页面上半部分，不在底部导航区域
            if (bounds.top < device.height * 0.7 && bounds.bottom < device.height * 0.8) {
                logger.addLog(window, "✅ 找到推荐标识（在合适位置）");
                foundIndicators++;
                break;
            }
        }

        // 3. 检查搜索框（主页特有）
        totalChecks++;
        var searchIndicators = [
            textContains("搜索"),
            desc("搜索"),
            descContains("搜索")
        ];

        for (var i = 0; i < searchIndicators.length; i++) {
            var searchElements = searchIndicators[i].find();
            for (var j = 0; j < searchElements.length; j++) {
                var bounds = searchElements[j].bounds();
                // 搜索框通常在页面顶部区域
                if (bounds.top < device.height * 0.3) {
                    logger.addLog(window, "✅ 找到搜索框");
                    foundIndicators++;
                    break;
                }
            }
            if (foundIndicators >= 2) break;
        }

        logger.addLog(window, "主页特征检查结果: " + foundIndicators + "/" + totalChecks);

        // 至少需要找到2个特征才认为是主页（底部首页按钮 + 其他特征）
        return foundIndicators >= 2;
    };

    // 先检查当前页面是否已经在主页
    if (checkHomeIndicators()) {
        logger.addLog(window, "✅ 确认在主页 - 找到足够的主页特征");
        return true;
    }

    // 如果不在主页，适度向上滚动并检测（减少滚动次数避免被识别为机器人）
    var maxScrolls = 1;
    for (var i = 0; i < maxScrolls; i++) {
        try {
            logger.addLog(window, "向上滚动第 " + (i + 1) + " 次...");
            // 向上滑动
            swipe(device.width / 2, device.height / 3, device.width / 2, device.height * 2 / 3, 300);
            waitTimeManager.wait('pageStable'); // 增加等待时间，更像真实用户

            // 每次滚动后立即检测主页标识
            if (checkHomeIndicators()) {
                logger.addLog(window, "✅ 确认在主页 - 找到足够的主页特征（滚动第 " + (i + 1) + " 次后）");
                return true;
            }
        } catch (e) {
            logger.addLog(window, "滚动操作失败: " + e.message);
            break;
        }
    }

    logger.addLog(window, "❌ 不在主页 - 滚动完成后仍未找到足够的主页特征");
    return false;
};

module.exports = HomeNavigation;
