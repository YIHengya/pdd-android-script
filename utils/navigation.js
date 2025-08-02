// 导航工具模块
// 提供通用的导航功能，包括回到主页和个人中心

const { PDD_CONFIG } = require('../config/app-config.js');
const { safeClick, findAnyElement, isInApp } = require('./common.js');
const logger = require('./logger.js');

/**
 * 导航工具构造函数
 */
function NavigationHelper() {
    this.config = PDD_CONFIG;
    this.maxRetries = 10;
    this.waitTime = 2000;
}

/**
 * 回到主页的通用方法
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否成功回到主页
 */
NavigationHelper.prototype.goToHomePage = function(window) {
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
 * 回到个人中心的通用方法
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否成功回到个人中心
 */
NavigationHelper.prototype.goToPersonalCenter = function(window) {
    logger.addLog(window, "开始尝试回到个人中心...");
    
    // 方法1: 直接点击个人中心按钮
    if (this.clickPersonalCenterButton(window)) {
        return true;
    }
    
    // 方法2: 先回到主页，再点击个人中心
    if (this.goToHomePage(window)) {
        sleep(this.waitTime);
        if (this.clickPersonalCenterButton(window)) {
            return true;
        }
    }
    
    // 方法3: 重启应用后进入个人中心
    if (this.restartApp(window)) {
        sleep(this.waitTime);
        if (this.clickPersonalCenterButton(window)) {
            return true;
        }
    }
    
    logger.addLog(window, "❌ 无法回到个人中心");
    return false;
};

/**
 * 点击首页按钮
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否成功
 */
NavigationHelper.prototype.clickHomeButton = function(window) {
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
            sleep(this.waitTime);
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
 * 点击个人中心按钮
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否成功
 */
NavigationHelper.prototype.clickPersonalCenterButton = function(window) {
    logger.addLog(window, "尝试点击个人中心按钮...");
    
    var personalSelectors = [
        text("个人中心"),
        textContains("个人中心"),
        text("我的"),
        textContains("我的"),
        desc("个人中心"),
        descContains("个人中心"),
        desc("我的"),
        descContains("我的"),
        id("personal"),
        id("profile"),
        id("mine"),
        className("android.widget.TextView").text("个人中心"),
        className("android.widget.TextView").text("我的"),
        className("android.widget.Button").text("个人中心"),
        className("android.widget.Button").text("我的")
    ];
    
    var personalButton = findAnyElement(personalSelectors);
    if (personalButton) {
        logger.addLog(window, "找到个人中心按钮: " + personalButton.text());
        if (safeClick(personalButton)) {
            sleep(this.waitTime);
            if (this.isAtPersonalCenter(window)) {
                logger.addLog(window, "✅ 成功进入个人中心");
                return true;
            }
        }
    }
    
    logger.addLog(window, "未找到个人中心按钮或点击失败");
    return false;
};

/**
 * 通过多次返回操作回到主页
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否成功
 */
NavigationHelper.prototype.backToHomePage = function(window) {
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
        sleep(this.waitTime);
        
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
NavigationHelper.prototype.restartApp = function(window) {
    logger.addLog(window, "尝试重启拼多多应用...");
    
    try {
        // 关闭当前应用
        this.closeApp(window);
        
        // 等待一段时间
        sleep(3000);
        
        // 重新启动应用
        if (this.launchApp(window)) {
            sleep(this.waitTime);
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
NavigationHelper.prototype.closeApp = function(window) {
    logger.addLog(window, "正在关闭拼多多应用...");
    
    try {
        // 方法1: 使用包名关闭
        for (var i = 0; i < this.config.packageNames.length; i++) {
            try {
                app.openAppSetting(this.config.packageNames[i]);
                sleep(1000);
                
                var forceStopBtn = text("强行停止").findOne(2000);
                if (!forceStopBtn) {
                    forceStopBtn = textContains("强行停止").findOne(2000);
                }
                if (!forceStopBtn) {
                    forceStopBtn = text("Force stop").findOne(2000);
                }
                
                if (forceStopBtn && forceStopBtn.enabled()) {
                    safeClick(forceStopBtn);
                    sleep(1000);
                    
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
        sleep(1000);
        
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
NavigationHelper.prototype.getCurrentPackageWithRetry = function(maxRetries, retryDelay) {
    maxRetries = maxRetries || 3;
    retryDelay = retryDelay || 1000;

    for (var i = 0; i < maxRetries; i++) {
        try {
            var currentPkg = currentPackage();
            if (currentPkg && currentPkg !== null && currentPkg !== "") {
                return currentPkg;
            }

            if (i < maxRetries - 1) {
                sleep(retryDelay);
            }
        } catch (e) {
            if (i < maxRetries - 1) {
                sleep(retryDelay);
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
NavigationHelper.prototype.isPDDApp = function(currentPkg) {
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
NavigationHelper.prototype.isPDDInstalled = function(window) {
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
NavigationHelper.prototype.detectPDDByUI = function() {
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
NavigationHelper.prototype.launchApp = function(window) {
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
        sleep(2000);

        // 直接启动拼多多（只尝试已知存在的包名）
        logger.addLog(window, "尝试启动包名: com.xunmeng.pinduoduo");
        app.launchPackage("com.xunmeng.pinduoduo");
        sleep(this.config.waitTimes.appLaunch);

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
        sleep(this.config.waitTimes.appLaunch);

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
            var intent = new Intent();
            intent.setAction("android.intent.action.MAIN");
            intent.addCategory("android.intent.category.LAUNCHER");
            intent.setPackage("com.xunmeng.pinduoduo");
            context.startActivity(intent);

            sleep(this.config.waitTimes.appLaunch);
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
 * 滚动到页面顶部（连续滚动，不检测内容）
 * 注意：对于主页和个人中心检测，建议使用 isAtHomePage 和 isAtPersonalCenter 方法，
 * 它们会在滚动过程中逐步检测，避免过度滚动被识别为机器人行为
 * @param {Object} window 悬浮窗对象
 * @param {number} maxScrolls 最大滚动次数
 */
NavigationHelper.prototype.scrollToTop = function(window, maxScrolls) {
    maxScrolls = maxScrolls || 10;
    logger.addLog(window, "开始滚动到页面顶部...");

    for (var i = 0; i < maxScrolls; i++) {
        try {
            // 向上滑动到顶部
            swipe(device.width / 2, device.height / 3, device.width / 2, device.height * 2 / 3, 300);
            sleep(500);
        } catch (e) {
            logger.addLog(window, "滚动操作失败: " + e.message);
            break;
        }
    }

    logger.addLog(window, "滚动到顶部完成");
};

/**
 * 检查是否在主页
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否在主页
 */
NavigationHelper.prototype.isAtHomePage = function(window) {
    logger.addLog(window, "检查是否在主页...");

    // 查找"推荐"标识的函数
    var checkHomeIndicators = function() {
        var homeIndicators = [
            text("推荐"),
            textContains("推荐")
        ];

        for (var i = 0; i < homeIndicators.length; i++) {
            if (homeIndicators[i].exists()) {
                return true;
            }
        }
        return false;
    };

    // 先检查当前页面是否已经在主页
    if (checkHomeIndicators()) {
        logger.addLog(window, "✅ 确认在主页 - 找到推荐标识");
        return true;
    }

    // 如果不在主页，适度向上滚动并检测（减少滚动次数避免被识别为机器人）
    var maxScrolls = 2; // 减少到3次，更自然
    for (var i = 0; i < maxScrolls; i++) {
        try {
            logger.addLog(window, "向上滚动第 " + (i + 1) + " 次...");
            // 向上滑动
            swipe(device.width / 2, device.height / 3, device.width / 2, device.height * 2 / 3, 300);
            sleep(1000); // 增加等待时间，更像真实用户

            // 每次滚动后立即检测主页标识
            if (checkHomeIndicators()) {
                logger.addLog(window, "✅ 确认在主页 - 找到推荐标识（滚动第 " + (i + 1) + " 次后）");
                return true;
            }
        } catch (e) {
            logger.addLog(window, "滚动操作失败: " + e.message);
            break;
        }
    }

    logger.addLog(window, "❌ 不在主页 - 滚动完成后仍未找到推荐标识");
    return false;
};

/**
 * 检查是否在个人中心
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否在个人中心
 */
NavigationHelper.prototype.isAtPersonalCenter = function(window) {
    logger.addLog(window, "检查是否在个人中心...");

    // 查找"设置"标识的函数
    var checkPersonalIndicators = function() {
        var personalIndicators = [
            text("设置"),
            textContains("设置")
        ];

        for (var i = 0; i < personalIndicators.length; i++) {
            if (personalIndicators[i].exists()) {
                return true;
            }
        }
        return false;
    };

    // 先检查当前页面是否已经在个人中心
    if (checkPersonalIndicators()) {
        logger.addLog(window, "✅ 确认在个人中心 - 找到设置标识");
        return true;
    }

    // 如果不在个人中心，适度向上滚动并检测（减少滚动次数避免被识别为机器人）
    var maxScrolls = 2; // 减少到3次，更自然
    for (var i = 0; i < maxScrolls; i++) {
        try {
            logger.addLog(window, "向上滚动第 " + (i + 1) + " 次...");
            // 向上滑动
            swipe(device.width / 2, device.height / 3, device.width / 2, device.height * 2 / 3, 300);
            sleep(1000); // 增加等待时间，更像真实用户

            // 每次滚动后立即检测个人中心标识
            if (checkPersonalIndicators()) {
                logger.addLog(window, "✅ 确认在个人中心 - 找到设置标识（滚动第 " + (i + 1) + " 次后）");
                return true;
            }
        } catch (e) {
            logger.addLog(window, "滚动操作失败: " + e.message);
            break;
        }
    }

    logger.addLog(window, "❌ 不在个人中心 - 滚动完成后仍未找到设置标识");
    return false;
};

/**
 * 智能导航 - 根据当前状态选择最佳导航方式
 * @param {Object} window 悬浮窗对象
 * @param {string} target 目标页面 ("home" 或 "personal")
 * @returns {boolean} 是否成功
 */
NavigationHelper.prototype.smartNavigate = function(window, target) {
    logger.addLog(window, "开始智能导航到: " + target);

    // 检查是否在拼多多应用中
    if (!isInApp(this.config.packageNames)) {
        logger.addLog(window, "不在拼多多应用中，先启动应用...");
        if (!this.launchApp(window)) {
            return false;
        }
    }

    // 根据目标选择导航方法
    if (target === "home") {
        return this.goToHomePage(window);
    } else if (target === "personal") {
        return this.goToPersonalCenter(window);
    } else {
        logger.addLog(window, "❌ 未知的导航目标: " + target);
        return false;
    }
};

/**
 * 紧急重置 - 当所有方法都失败时的最后手段
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否成功
 */
NavigationHelper.prototype.emergencyReset = function(window) {
    logger.addLog(window, "执行紧急重置...");

    try {
        // 1. 强制回到桌面
        home();
        sleep(2000);

        // 2. 清理最近任务
        recents();
        sleep(1000);

        // 3. 尝试清除拼多多任务
        var clearAllBtn = text("清除全部").findOne(2000);
        if (!clearAllBtn) {
            clearAllBtn = textContains("清除").findOne(2000);
        }
        if (clearAllBtn) {
            safeClick(clearAllBtn);
            sleep(1000);
        }

        // 4. 回到桌面
        home();
        sleep(2000);

        // 5. 重新启动应用
        if (this.launchApp(window)) {
            logger.addLog(window, "✅ 紧急重置成功");
            return true;
        }

        logger.addLog(window, "❌ 紧急重置失败");
        return false;

    } catch (e) {
        logger.addLog(window, "紧急重置出错: " + e.message);
        return false;
    }
};

module.exports = NavigationHelper;
