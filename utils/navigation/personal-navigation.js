// 个人中心导航模块
// 专门处理拼多多个人中心相关的导航功能

const { PDD_CONFIG } = require('../../config/app-config.js');
const { safeClick, findAnyElement, isInApp } = require('../common.js');
const logger = require('../logger.js');
const { waitTimeManager } = require('../wait-time-manager.js');

/**
 * 个人中心导航构造函数
 */
function PersonalNavigation() {
    this.config = PDD_CONFIG;
    this.maxRetries = 10;
    this.waitTime = 2000;
}

/**
 * 回到个人中心的通用方法
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否成功回到个人中心
 */
PersonalNavigation.prototype.goToPersonalCenter = function(window) {
    logger.addLog(window, "开始尝试回到个人中心...");
    
    // 方法1: 直接点击个人中心按钮
    if (this.clickPersonalCenterButton(window)) {
        return true;
    }
    
    // 方法2: 先回到主页，再点击个人中心
    var HomeNavigation = require('./home-navigation.js');
    var homeNav = new HomeNavigation();
    if (homeNav.goToHomePage(window)) {
        waitTimeManager.wait('back');
        if (this.clickPersonalCenterButton(window)) {
            return true;
        }
    }
    
    // 方法3: 重启应用后进入个人中心
    if (homeNav.restartApp(window)) {
        waitTimeManager.wait('back');
        if (this.clickPersonalCenterButton(window)) {
            return true;
        }
    }
    
    logger.addLog(window, "❌ 无法回到个人中心");
    return false;
};

/**
 * 点击个人中心按钮
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否成功
 */
PersonalNavigation.prototype.clickPersonalCenterButton = function(window) {
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
            waitTimeManager.wait('back');
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
 * 检查是否在个人中心
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否在个人中心
 */
PersonalNavigation.prototype.isAtPersonalCenter = function(window) {
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
    var maxScrolls = 1; // 减少到2次，更自然
    for (var i = 0; i < maxScrolls; i++) {
        try {
            logger.addLog(window, "向上滚动第 " + (i + 1) + " 次...");
            // 向上滑动
            swipe(device.width / 2, device.height / 3, device.width / 2, device.height * 2 / 3, 300);
            waitTimeManager.wait('pageStable'); // 增加等待时间，更像真实用户

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
 * 滚动到页面顶部（连续滚动，不检测内容）
 * @param {Object} window 悬浮窗对象
 * @param {number} maxScrolls 最大滚动次数
 */
PersonalNavigation.prototype.scrollToTop = function(window, maxScrolls) {
    maxScrolls = maxScrolls || 10;
    logger.addLog(window, "开始滚动到页面顶部...");

    for (var i = 0; i < maxScrolls; i++) {
        try {
            // 向上滑动到顶部
            swipe(device.width / 2, device.height / 3, device.width / 2, device.height * 2 / 3, 300);
            waitTimeManager.wait('short');
        } catch (e) {
            logger.addLog(window, "滚动操作失败: " + e.message);
            break;
        }
    }

    logger.addLog(window, "滚动到顶部完成");
};

/**
 * 紧急重置 - 当所有方法都失败时的最后手段
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否成功
 */
PersonalNavigation.prototype.emergencyReset = function(window) {
    logger.addLog(window, "执行紧急重置...");

    try {
        // 1. 强制回到桌面
        home();
        waitTimeManager.wait('pageLoad');

        // 2. 清理最近任务
        recents();
        waitTimeManager.wait('pageStable');

        // 3. 尝试清除拼多多任务
        var clearAllBtn = text("清除全部").findOne(2000);
        if (!clearAllBtn) {
            clearAllBtn = textContains("清除").findOne(2000);
        }
        if (clearAllBtn) {
            safeClick(clearAllBtn);
            waitTimeManager.wait('pageStable');
        }

        // 4. 回到桌面
        home();
        waitTimeManager.wait('pageLoad');

        // 5. 重新启动应用
        var HomeNavigation = require('./home-navigation.js');
        var homeNav = new HomeNavigation();
        if (homeNav.launchApp(window)) {
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

module.exports = PersonalNavigation;
