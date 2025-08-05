// 自动支付模块
// 主要功能：导航到待支付页面，检测待支付订单

const NavigationHelper = require('../utils/navigation.js');
const { PDD_CONFIG } = require('../config/app-config.js');
const { safeClick, findAnyElement, isInApp, GlobalStopManager } = require('../utils/common.js');
const logger = require('../utils/logger.js');

/**
 * 自动支付模块构造函数
 */
function AutoPayment() {
    this.config = PDD_CONFIG;
    this.navigationHelper = new NavigationHelper();
    this.maxRetries = 5;
    this.waitTime = 2000;
    this.isRunning = false;
}

/**
 * 执行自动支付流程
 * @param {Object} window 悬浮窗对象
 * @param {string} userName 用户名（用于日志记录）
 * @returns {boolean} 是否执行成功
 */
AutoPayment.prototype.execute = function(window, userName) {
    logger.addLog(window, "=== 开始执行自动支付流程 ===");
    logger.addLog(window, "用户: " + (userName || "未知用户"));
    
    this.isRunning = true;
    
    try {
        // 步骤1: 检查是否在拼多多应用中
        if (!this.ensureInPDDApp(window)) {
            return false;
        }
        
        // 步骤2: 导航到待支付页面
        if (!this.navigateToPendingPaymentPage(window)) {
            return false;
        }
        
        // 步骤3: 检测待支付订单
        if (!this.detectPendingOrders(window)) {
            return false;
        }
        
        // 步骤4: 准备支付流程（目前只是检测，不实际支付）
        this.preparePaymentProcess(window);
        
        logger.addLog(window, "✅ 自动支付流程执行完成");
        return true;
        
    } catch (e) {
        logger.addLog(window, "❌ 自动支付流程执行出错: " + e.message);
        return false;
    } finally {
        this.isRunning = false;
    }
};

/**
 * 确保在拼多多应用中
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否成功
 */
AutoPayment.prototype.ensureInPDDApp = function(window) {
    logger.addLog(window, "检查是否在拼多多应用中...");
    
    if (GlobalStopManager.isStopRequested()) {
        logger.addLog(window, "⏹️ 收到停止信号，终止执行");
        return false;
    }
    
    if (!isInApp(this.config.packageNames)) {
        logger.addLog(window, "不在拼多多应用中，尝试启动应用...");
        if (!this.navigationHelper.launchApp(window)) {
            logger.addLog(window, "❌ 无法启动拼多多应用");
            return false;
        }
    }
    
    logger.addLog(window, "✅ 确认在拼多多应用中");
    return true;
};

/**
 * 导航到待支付页面
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否成功
 */
AutoPayment.prototype.navigateToPendingPaymentPage = function(window) {
    logger.addLog(window, "开始导航到待支付页面...");
    
    if (GlobalStopManager.isStopRequested()) {
        logger.addLog(window, "⏹️ 收到停止信号，终止执行");
        return false;
    }
    
    // 检查是否已经在待支付页面
    if (this.navigationHelper.isAtPendingPaymentPage(window)) {
        logger.addLog(window, "✅ 已经在待支付页面");
        return true;
    }
    
    // 使用智能导航到待支付页面
    if (this.navigationHelper.smartNavigate(window, "payment")) {
        logger.addLog(window, "✅ 成功导航到待支付页面");
        return true;
    }
    
    logger.addLog(window, "❌ 无法导航到待支付页面");
    return false;
};

/**
 * 检测待支付订单
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否检测到待支付订单
 */
AutoPayment.prototype.detectPendingOrders = function(window) {
    logger.addLog(window, "检测待支付订单...");
    
    if (GlobalStopManager.isStopRequested()) {
        logger.addLog(window, "⏹️ 收到停止信号，终止执行");
        return false;
    }
    
    // 查找待支付订单的标识
    var pendingOrderSelectors = [
        text("去支付"),
        textContains("去支付"),
        text("立即支付"),
        textContains("立即支付"),
        text("支付订单"),
        textContains("支付订单"),
        text("待付款"),
        textContains("待付款"),
        desc("去支付"),
        descContains("去支付"),
        desc("立即支付"),
        descContains("立即支付")
    ];
    
    var foundOrders = [];
    
    // 检查每个选择器
    for (var i = 0; i < pendingOrderSelectors.length; i++) {
        var elements = pendingOrderSelectors[i].find();
        for (var j = 0; j < elements.length; j++) {
            var element = elements[j];
            if (element && element.clickable()) {
                foundOrders.push({
                    text: element.text() || element.desc() || "未知",
                    element: element
                });
            }
        }
    }
    
    if (foundOrders.length > 0) {
        logger.addLog(window, "✅ 检测到 " + foundOrders.length + " 个待支付订单");
        for (var k = 0; k < foundOrders.length; k++) {
            logger.addLog(window, "  - 订单 " + (k + 1) + ": " + foundOrders[k].text);
        }
        return true;
    } else {
        logger.addLog(window, "⚠️ 未检测到待支付订单");
        
        // 尝试滚动查找更多订单
        logger.addLog(window, "尝试滚动查找更多订单...");
        this.scrollToFindOrders(window);
        
        // 再次检测
        for (var i = 0; i < pendingOrderSelectors.length; i++) {
            var elements = pendingOrderSelectors[i].find();
            if (elements.length > 0) {
                logger.addLog(window, "✅ 滚动后检测到待支付订单");
                return true;
            }
        }
        
        logger.addLog(window, "❌ 确认没有待支付订单");
        return false;
    }
};

/**
 * 滚动查找更多订单
 * @param {Object} window 悬浮窗对象
 */
AutoPayment.prototype.scrollToFindOrders = function(window) {
    logger.addLog(window, "滚动查找更多订单...");
    
    var maxScrolls = 3;
    for (var i = 0; i < maxScrolls; i++) {
        if (GlobalStopManager.isStopRequested()) {
            logger.addLog(window, "⏹️ 收到停止信号，终止滚动");
            break;
        }
        
        try {
            // 向下滑动
            swipe(device.width / 2, device.height * 2 / 3, device.width / 2, device.height / 3, 500);
            sleep(1000);
            
            logger.addLog(window, "滚动第 " + (i + 1) + " 次");
        } catch (e) {
            logger.addLog(window, "滚动操作失败: " + e.message);
            break;
        }
    }
};

/**
 * 准备支付流程
 * @param {Object} window 悬浮窗对象
 */
AutoPayment.prototype.preparePaymentProcess = function(window) {
    logger.addLog(window, "准备支付流程...");
    
    // 目前只是记录状态，不实际执行支付
    logger.addLog(window, "📋 支付准备工作:");
    logger.addLog(window, "  ✅ 已导航到待支付页面");
    logger.addLog(window, "  ✅ 已检测待支付订单");
    logger.addLog(window, "  ⚠️ 实际支付功能待开发");
    
    logger.addLog(window, "💡 提示: 您可以手动完成支付操作");
};

/**
 * 停止执行
 */
AutoPayment.prototype.stop = function() {
    this.isRunning = false;
    logger.addLog(null, "自动支付模块已停止");
};

/**
 * 检查是否正在运行
 * @returns {boolean} 是否正在运行
 */
AutoPayment.prototype.isExecuting = function() {
    return this.isRunning;
};

module.exports = AutoPayment;
