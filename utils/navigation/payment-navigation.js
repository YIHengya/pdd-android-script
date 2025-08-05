// 待支付页面导航模块
// 专门处理拼多多待支付页面相关的导航功能

const { PDD_CONFIG } = require('../../config/app-config.js');
const { safeClick, findAnyElement, isInApp } = require('../common.js');
const logger = require('../logger.js');

/**
 * 待支付页面导航构造函数
 */
function PaymentNavigation() {
    this.config = PDD_CONFIG;
    this.maxRetries = 10;
    this.waitTime = 2000;
}

/**
 * 进入待支付页面的主要方法
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否成功进入待支付页面
 */
PaymentNavigation.prototype.goToPendingPaymentPage = function(window) {
    logger.addLog(window, "开始尝试进入待支付页面...");
    
    // 方法1: 通过个人中心进入待支付页面
    if (this.goToPendingPaymentViaPersonalCenter(window)) {
        return true;
    }
    
    // 方法2: 通过主页底部导航进入
    if (this.goToPendingPaymentViaBottomNav(window)) {
        return true;
    }
    
    // 方法3: 通过搜索或其他入口
    if (this.goToPendingPaymentViaAlternativeRoute(window)) {
        return true;
    }
    
    logger.addLog(window, "❌ 无法进入待支付页面");
    return false;
};

/**
 * 通过个人中心进入待支付页面
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否成功
 */
PaymentNavigation.prototype.goToPendingPaymentViaPersonalCenter = function(window) {
    logger.addLog(window, "尝试通过个人中心进入待支付页面...");
    
    try {
        // 先进入个人中心
        var PersonalNavigation = require('./personal-navigation.js');
        var personalNav = new PersonalNavigation();
        
        if (!personalNav.goToPersonalCenter(window)) {
            logger.addLog(window, "无法进入个人中心");
            return false;
        }
        
        sleep(this.waitTime);
        
        // 查找"待付款"或相关按钮
        var paymentSelectors = [
            text("待付款"),
            textContains("待付款"),
            text("待支付"),
            textContains("待支付"),
            text("未付款"),
            textContains("未付款"),
            desc("待付款"),
            descContains("待付款"),
            desc("待支付"),
            descContains("待支付")
        ];
        
        var paymentButton = findAnyElement(paymentSelectors);
        if (paymentButton) {
            logger.addLog(window, "找到待支付按钮: " + paymentButton.text());
            if (safeClick(paymentButton)) {
                sleep(this.waitTime);
                if (this.isAtPendingPaymentPage(window)) {
                    logger.addLog(window, "✅ 成功通过个人中心进入待支付页面");
                    return true;
                }
            }
        }
        
        // 如果没有直接的待支付按钮，尝试点击"我的订单"
        var orderSelectors = [
            text("我的订单"),
            textContains("我的订单"),
            text("订单"),
            textContains("订单"),
            desc("我的订单"),
            descContains("我的订单")
        ];
        
        var orderButton = findAnyElement(orderSelectors);
        if (orderButton) {
            logger.addLog(window, "找到订单按钮: " + orderButton.text());
            if (safeClick(orderButton)) {
                sleep(this.waitTime);
                
                // 在订单页面查找待支付标签
                var pendingPaymentTab = findAnyElement(paymentSelectors);
                if (pendingPaymentTab) {
                    logger.addLog(window, "找到待支付标签: " + pendingPaymentTab.text());
                    if (safeClick(pendingPaymentTab)) {
                        sleep(this.waitTime);
                        if (this.isAtPendingPaymentPage(window)) {
                            logger.addLog(window, "✅ 成功通过订单页面进入待支付页面");
                            return true;
                        }
                    }
                }
            }
        }
        
        logger.addLog(window, "通过个人中心进入待支付页面失败");
        return false;
        
    } catch (e) {
        logger.addLog(window, "通过个人中心进入待支付页面出错: " + e.message);
        return false;
    }
};

/**
 * 通过底部导航进入待支付页面
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否成功
 */
PaymentNavigation.prototype.goToPendingPaymentViaBottomNav = function(window) {
    logger.addLog(window, "尝试通过底部导航进入待支付页面...");
    
    try {
        // 先确保在主页
        var HomeNavigation = require('./home-navigation.js');
        var homeNav = new HomeNavigation();
        
        if (!homeNav.goToHomePage(window)) {
            logger.addLog(window, "无法回到主页");
            return false;
        }
        
        sleep(this.waitTime);
        
        // 查找底部导航中的订单或购物车相关按钮
        var bottomNavSelectors = [
            text("订单"),
            textContains("订单"),
            text("购物车"),
            textContains("购物车"),
            desc("订单"),
            descContains("订单"),
            desc("购物车"),
            descContains("购物车")
        ];
        
        for (var i = 0; i < bottomNavSelectors.length; i++) {
            var elements = bottomNavSelectors[i].find();
            for (var j = 0; j < elements.length; j++) {
                var bounds = elements[j].bounds();
                // 检查是否在屏幕底部（底部导航栏区域）
                if (bounds.bottom > device.height * 0.8) {
                    logger.addLog(window, "找到底部导航按钮: " + elements[j].text());
                    if (safeClick(elements[j])) {
                        sleep(this.waitTime);
                        
                        // 在新页面查找待支付相关内容
                        if (this.findAndClickPendingPayment(window)) {
                            return true;
                        }
                    }
                    break;
                }
            }
        }
        
        logger.addLog(window, "通过底部导航进入待支付页面失败");
        return false;
        
    } catch (e) {
        logger.addLog(window, "通过底部导航进入待支付页面出错: " + e.message);
        return false;
    }
};

/**
 * 通过其他路径进入待支付页面
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否成功
 */
PaymentNavigation.prototype.goToPendingPaymentViaAlternativeRoute = function(window) {
    logger.addLog(window, "尝试通过其他路径进入待支付页面...");
    
    try {
        // 尝试通过搜索功能
        var searchSelectors = [
            textContains("搜索"),
            desc("搜索"),
            descContains("搜索")
        ];
        
        var searchButton = findAnyElement(searchSelectors);
        if (searchButton) {
            logger.addLog(window, "找到搜索按钮，尝试搜索待支付相关内容");
            if (safeClick(searchButton)) {
                sleep(1000);
                
                // 输入搜索关键词
                var searchInput = className("android.widget.EditText").findOne(2000);
                if (searchInput) {
                    searchInput.setText("我的订单");
                    sleep(1000);
                    
                    // 点击搜索或回车
                    var searchConfirm = text("搜索").findOne(1000);
                    if (searchConfirm) {
                        safeClick(searchConfirm);
                    } else {
                        // 尝试按回车键
                        searchInput.performAction(android.view.accessibility.AccessibilityNodeInfo.ACTION_IME_ENTER);
                    }
                    
                    sleep(this.waitTime);
                    
                    // 在搜索结果中查找订单相关内容
                    if (this.findAndClickPendingPayment(window)) {
                        return true;
                    }
                }
            }
        }
        
        logger.addLog(window, "通过其他路径进入待支付页面失败");
        return false;
        
    } catch (e) {
        logger.addLog(window, "通过其他路径进入待支付页面出错: " + e.message);
        return false;
    }
};

/**
 * 查找并点击待支付相关内容
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否成功
 */
PaymentNavigation.prototype.findAndClickPendingPayment = function(window) {
    logger.addLog(window, "查找待支付相关内容...");
    
    var paymentSelectors = [
        text("待付款"),
        textContains("待付款"),
        text("待支付"),
        textContains("待支付"),
        text("未付款"),
        textContains("未付款"),
        desc("待付款"),
        descContains("待付款"),
        desc("待支付"),
        descContains("待支付")
    ];
    
    var paymentElement = findAnyElement(paymentSelectors);
    if (paymentElement) {
        logger.addLog(window, "找到待支付元素: " + paymentElement.text());
        if (safeClick(paymentElement)) {
            sleep(this.waitTime);
            if (this.isAtPendingPaymentPage(window)) {
                logger.addLog(window, "✅ 成功进入待支付页面");
                return true;
            }
        }
    }
    
    return false;
};

/**
 * 检查是否在待支付页面
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否在待支付页面
 */
PaymentNavigation.prototype.isAtPendingPaymentPage = function(window) {
    logger.addLog(window, "检查是否在待支付页面...");
    
    // 检查待支付页面特征
    var pendingPaymentIndicators = [
        text("待付款"),
        textContains("待付款"),
        text("待支付"),
        textContains("待支付"),
        text("去支付"),
        textContains("去支付"),
        text("立即支付"),
        textContains("立即支付"),
        text("支付订单"),
        textContains("支付订单"),
        desc("待付款"),
        descContains("待付款"),
        desc("待支付"),
        descContains("待支付")
    ];
    
    for (var i = 0; i < pendingPaymentIndicators.length; i++) {
        if (pendingPaymentIndicators[i].exists()) {
            logger.addLog(window, "✅ 确认在待支付页面 - 找到标识: " + pendingPaymentIndicators[i].findOne().text());
            return true;
        }
    }
    
    logger.addLog(window, "❌ 不在待支付页面");
    return false;
};

module.exports = PaymentNavigation;
