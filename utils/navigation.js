// 导航工具模块 - 主入口
// 提供统一的导航接口，整合各个页面的导航功能

const HomeNavigation = require('./navigation/home-navigation.js');
const PersonalNavigation = require('./navigation/personal-navigation.js');
const PaymentNavigation = require('./navigation/payment-navigation.js');
const { PDD_CONFIG } = require('../config/app-config.js');
const { isInApp } = require('./common.js');
const logger = require('./logger.js');

/**
 * 导航工具构造函数 - 统一导航管理器
 */
function NavigationHelper() {
    this.config = PDD_CONFIG;
    this.homeNav = new HomeNavigation();
    this.personalNav = new PersonalNavigation();
    this.paymentNav = new PaymentNavigation();
}

/**
 * 回到主页的通用方法
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否成功回到主页
 */
NavigationHelper.prototype.goToHomePage = function(window) {
    return this.homeNav.goToHomePage(window);
};

/**
 * 回到个人中心的通用方法
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否成功回到个人中心
 */
NavigationHelper.prototype.goToPersonalCenter = function(window) {
    return this.personalNav.goToPersonalCenter(window);
};

/**
 * 进入待支付页面的方法
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否成功进入待支付页面
 */
NavigationHelper.prototype.goToPendingPaymentPage = function(window) {
    return this.paymentNav.goToPendingPaymentPage(window);
};

/**
 * 检查是否在主页
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否在主页
 */
NavigationHelper.prototype.isAtHomePage = function(window) {
    return this.homeNav.isAtHomePage(window);
};

/**
 * 检查是否在个人中心
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否在个人中心
 */
NavigationHelper.prototype.isAtPersonalCenter = function(window) {
    return this.personalNav.isAtPersonalCenter(window);
};

/**
 * 检查是否在待支付页面
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否在待支付页面
 */
NavigationHelper.prototype.isAtPendingPaymentPage = function(window) {
    return this.paymentNav.isAtPendingPaymentPage(window);
};

/**
 * 启动拼多多应用
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否启动成功
 */
NavigationHelper.prototype.launchApp = function(window) {
    return this.homeNav.launchApp(window);
};

/**
 * 智能导航 - 根据当前状态选择最佳导航方式
 * @param {Object} window 悬浮窗对象
 * @param {string} target 目标页面 ("home", "personal", "payment")
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
    switch (target) {
        case "home":
            return this.goToHomePage(window);
        case "personal":
            return this.goToPersonalCenter(window);
        case "payment":
            return this.goToPendingPaymentPage(window);
        default:
            logger.addLog(window, "❌ 未知的导航目标: " + target);
            return false;
    }
};







module.exports = NavigationHelper;
