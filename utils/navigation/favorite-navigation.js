// 收藏页面导航模块
// 负责导航到拼多多收藏页面的各种方法

const { safeClick, findAnyElement, GlobalStopManager } = require('../common.js');
const logger = require('../logger.js');
const { waitTimeManager } = require('../wait-time-manager.js');

/**
 * 收藏页面导航构造函数
 */
function FavoriteNavigation() {
    this.waitTime = 2000; // 默认等待时间
}

/**
 * 导航到收藏页面的主方法
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否成功
 */
FavoriteNavigation.prototype.goToFavoritePage = function(window) {
    logger.addLog(window, "开始导航到收藏页面...");

    // 检查停止状态
    if (GlobalStopManager.isStopRequested()) {
        logger.addLog(window, "🛑 检测到停止信号，终止收藏页面导航");
        return false;
    }

    // 方法1: 先进入个人中心，再找收藏
    if (this.navigateViaPersonalCenter(window)) {
        return true;
    }

    // 检查停止状态
    if (GlobalStopManager.isStopRequested()) {
        logger.addLog(window, "🛑 检测到停止信号，终止收藏页面导航");
        return false;
    }

    // 方法2: 从主页直接寻找收藏入口
    if (this.navigateViaHomePage(window)) {
        return true;
    }

    // 检查停止状态
    if (GlobalStopManager.isStopRequested()) {
        logger.addLog(window, "🛑 检测到停止信号，终止收藏页面导航");
        return false;
    }

    // 方法3: 通过底部导航栏寻找收藏
    if (this.navigateViaBottomNavigation(window)) {
        return true;
    }

    logger.addLog(window, "❌ 所有导航方法都失败了");
    return false;
};

/**
 * 通过个人中心导航到收藏页面
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否成功
 */
FavoriteNavigation.prototype.navigateViaPersonalCenter = function(window) {
    logger.addLog(window, "尝试通过个人中心导航到收藏页面...");

    try {
        // 先进入个人中心
        var PersonalNavigation = require('./personal-navigation.js');
        var personalNav = new PersonalNavigation();
        
        if (!personalNav.goToPersonalCenter(window)) {
            logger.addLog(window, "无法进入个人中心");
            return false;
        }

        waitTimeManager.wait('pageLoad');

        // 查找收藏相关按钮
        var favoriteSelectors = [
            text("我的收藏"),
            textContains("我的收藏"),
            text("收藏夹"),
            textContains("收藏夹"),
            text("收藏"),
            textContains("收藏"),
            desc("我的收藏"),
            descContains("我的收藏"),
            desc("收藏夹"),
            descContains("收藏夹"),
            desc("收藏"),
            descContains("收藏"),
            className("android.widget.TextView").textContains("收藏"),
            className("android.widget.Button").textContains("收藏")
        ];

        var favoriteButton = findAnyElement(favoriteSelectors);
        if (favoriteButton) {
            logger.addLog(window, "找到收藏按钮: " + favoriteButton.text());
            if (safeClick(favoriteButton)) {
                waitTimeManager.wait('pageLoad');
                if (this.isAtFavoritePage(window)) {
                    logger.addLog(window, "✅ 成功通过个人中心进入收藏页面");
                    return true;
                }
            }
        }

        logger.addLog(window, "通过个人中心进入收藏页面失败");
        return false;

    } catch (e) {
        logger.addLog(window, "通过个人中心导航失败: " + e.message);
        return false;
    }
};

/**
 * 通过主页导航到收藏页面
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否成功
 */
FavoriteNavigation.prototype.navigateViaHomePage = function(window) {
    logger.addLog(window, "尝试通过主页导航到收藏页面...");

    try {
        // 先回到主页
        var HomeNavigation = require('./home-navigation.js');
        var homeNav = new HomeNavigation();
        
        if (!homeNav.goToHomePage(window)) {
            logger.addLog(window, "无法回到主页");
            return false;
        }

        waitTimeManager.wait('pageLoad');

        // 在主页寻找收藏入口
        var favoriteSelectors = [
            text("收藏"),
            textContains("收藏"),
            desc("收藏"),
            descContains("收藏"),
            id("favorite"),
            id("collection"),
            className("android.widget.TextView").textContains("收藏"),
            className("android.widget.Button").textContains("收藏"),
            className("android.widget.ImageView").descContains("收藏")
        ];

        var favoriteButton = findAnyElement(favoriteSelectors);
        if (favoriteButton) {
            logger.addLog(window, "在主页找到收藏按钮: " + favoriteButton.text());
            if (safeClick(favoriteButton)) {
                waitTimeManager.wait('pageLoad');
                if (this.isAtFavoritePage(window)) {
                    logger.addLog(window, "✅ 成功通过主页进入收藏页面");
                    return true;
                }
            }
        }

        logger.addLog(window, "通过主页进入收藏页面失败");
        return false;

    } catch (e) {
        logger.addLog(window, "通过主页导航失败: " + e.message);
        return false;
    }
};

/**
 * 通过底部导航栏导航到收藏页面
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否成功
 */
FavoriteNavigation.prototype.navigateViaBottomNavigation = function(window) {
    logger.addLog(window, "尝试通过底部导航栏导航到收藏页面...");

    try {
        // 寻找底部导航栏中的收藏按钮
        var bottomNavSelectors = [
            text("收藏"),
            desc("收藏"),
            className("android.widget.TextView").text("收藏"),
            className("android.widget.ImageView").desc("收藏")
        ];

        // 检查屏幕下半部分
        var screenHeight = device.height;
        var bottomArea = {
            top: screenHeight * 0.7,
            bottom: screenHeight,
            left: 0,
            right: device.width
        };

        for (var i = 0; i < bottomNavSelectors.length; i++) {
            var elements = bottomNavSelectors[i].find();
            for (var j = 0; j < elements.length; j++) {
                var element = elements[j];
                var bounds = element.bounds();
                
                // 检查元素是否在底部区域
                if (bounds.top >= bottomArea.top && bounds.bottom <= bottomArea.bottom) {
                    logger.addLog(window, "在底部导航栏找到收藏按钮: " + element.text());
                    if (safeClick(element)) {
                        waitTimeManager.wait('pageLoad');
                        if (this.isAtFavoritePage(window)) {
                            logger.addLog(window, "✅ 成功通过底部导航栏进入收藏页面");
                            return true;
                        }
                    }
                }
            }
        }

        logger.addLog(window, "通过底部导航栏进入收藏页面失败");
        return false;

    } catch (e) {
        logger.addLog(window, "通过底部导航栏导航失败: " + e.message);
        return false;
    }
};

/**
 * 检查是否在收藏页面
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否在收藏页面
 */
FavoriteNavigation.prototype.isAtFavoritePage = function(window) {
    try {
        logger.addLog(window, "正在检查是否在收藏页面...");

        // 优先检查"全部收藏"这个最准确的标识
        var primaryIndicators = [
            text("全部收藏"),
            textContains("全部收藏"),
            desc("全部收藏"),
            descContains("全部收藏")
        ];

        logger.addLog(window, "首先检查主要标识: '全部收藏'");

        // 首先检查主要标识
        for (var i = 0; i < primaryIndicators.length; i++) {
            if (primaryIndicators[i].exists()) {
                var element = primaryIndicators[i].findOne();
                if (element) {
                    logger.addLog(window, "✅ 检测到收藏页面主要特征: " + element.text());
                    logger.addLog(window, "确认已成功进入收藏页面！");
                    return true;
                }
            }
        }

        logger.addLog(window, "未找到'全部收藏'标识，检查其他收藏页面特征...");

        // 如果没有找到"全部收藏"，再检查其他可能的收藏页面特征
        var secondaryIndicators = [
            text("我的收藏"),
            textContains("我的收藏"),
            text("收藏夹"),
            textContains("收藏夹"),
            text("收藏的商品"),
            textContains("收藏的商品"),
            text("已收藏"),
            textContains("已收藏"),
            text("收藏列表"),
            textContains("收藏列表"),
            desc("我的收藏"),
            descContains("我的收藏"),
            desc("收藏夹"),
            descContains("收藏夹")
        ];

        for (var j = 0; j < secondaryIndicators.length; j++) {
            if (secondaryIndicators[j].exists()) {
                var element = secondaryIndicators[j].findOne();
                if (element) {
                    logger.addLog(window, "检测到收藏页面次要特征: " + element.text());
                    return true;
                }
            }
        }

        logger.addLog(window, "未检测到收藏页面特征");
        return false;
    } catch (e) {
        logger.addLog(window, "检查收藏页面状态失败: " + e.message);
        return false;
    }
};

module.exports = FavoriteNavigation;
