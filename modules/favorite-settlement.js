// 收藏结算功能模块
// 负责导航到拼多多收藏页面
// 通过识别"全部收藏"文本来确认是否成功进入收藏页面

const { PDD_CONFIG } = require('../config/app-config.js');
const { GlobalStopManager } = require('../utils/common.js');
const logger = require('../utils/logger.js');
const NavigationHelper = require('../utils/navigation.js');
const FavoriteNavigation = require('../utils/navigation/favorite-navigation.js');
const { waitTimeManager } = require('../utils/wait-time-manager.js');

/**
 * 收藏结算构造函数
 */
function FavoriteSettlement() {
    this.config = PDD_CONFIG;
    this.navigationHelper = new NavigationHelper();
    this.favoriteNavigation = new FavoriteNavigation();
}

/**
 * 执行收藏结算功能
 * @param {Object} window 悬浮窗对象
 * @param {string} userName 用户名
 * @returns {boolean} 是否成功
 */
FavoriteSettlement.prototype.execute = function(window, userName) {
    try {
        // 开始脚本计数
        GlobalStopManager.startScript();

        logger.addLog(window, "=== 开始收藏结算功能 ===");
        logger.addLog(window, "用户: " + userName);

        // 检查全局停止状态
        if (GlobalStopManager.isStopRequested()) {
            logger.addLog(window, "检测到停止信号，终止收藏结算流程");
            return false;
        }

        // 1. 启动应用
        if (!this.navigationHelper.launchApp(window)) {
            logger.addLog(window, "无法打开拼多多APP，请检查是否已安装");
            return false;
        }

        // 2. 导航到收藏页面
        if (!this.favoriteNavigation.goToFavoritePage(window)) {
            logger.addLog(window, "无法导航到收藏页面");
            return false;
        }

        logger.addLog(window, "✅ 成功导航到收藏页面");
        logger.addLog(window, "=== 收藏结算功能完成 ===");

        return true;

    } catch (e) {
        logger.addLog(window, "收藏结算流程出错: " + e.message);
        return false;
    } finally {
        // 结束脚本计数
        GlobalStopManager.endScript();
    }
};

module.exports = FavoriteSettlement;
