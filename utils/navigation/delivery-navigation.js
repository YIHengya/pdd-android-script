// 待收货页面导航模块
// 专门处理拼多多待收货页面相关的导航功能

const { PDD_CONFIG } = require('../../config/app-config.js');
const { safeClick, findAnyElement, isInApp } = require('../common.js');
const logger = require('../logger.js');
const { waitTimeManager } = require('../wait-time-manager.js');

/**
 * 待收货页面导航构造函数
 */
function DeliveryNavigation() {
    this.config = PDD_CONFIG;
    this.maxRetries = 10;
    this.waitTime = 2000;
}

/**
 * 进入待收货页面的主要方法
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否成功进入待收货页面
 */
DeliveryNavigation.prototype.goToPendingDeliveryPage = function(window) {
    logger.addLog(window, "开始尝试进入待收货页面...");
    
    // 方法1: 通过个人中心进入待收货页面
    if (this.goToPendingDeliveryViaPersonalCenter(window)) {
        return true;
    }
    
    // 方法2: 通过主页底部导航进入
    if (this.goToPendingDeliveryViaBottomNav(window)) {
        return true;
    }
    
    // 方法3: 通过搜索或其他入口
    if (this.goToPendingDeliveryViaAlternativeRoute(window)) {
        return true;
    }
    
    logger.addLog(window, "❌ 无法进入待收货页面");
    return false;
};

/**
 * 通过个人中心进入待收货页面
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否成功
 */
DeliveryNavigation.prototype.goToPendingDeliveryViaPersonalCenter = function(window) {
    logger.addLog(window, "尝试通过个人中心进入待收货页面...");
    
    try {
        // 先进入个人中心
        var PersonalNavigation = require('./personal-navigation.js');
        var personalNav = new PersonalNavigation();
        
        if (!personalNav.goToPersonalCenter(window)) {
            logger.addLog(window, "无法进入个人中心");
            return false;
        }
        
        waitTimeManager.wait(this.waitTime);
        
        // 查找"待收货"或相关按钮
        var deliverySelectors = [
            text("待收货"),
            textContains("待收货"),
            text("待发货"),
            textContains("待发货"),
            text("已发货"),
            textContains("已发货"),
            text("运输中"),
            textContains("运输中"),
            desc("待收货"),
            descContains("待收货"),
            desc("待发货"),
            descContains("待发货"),
            desc("已发货"),
            descContains("已发货")
        ];
        
        var deliveryButton = findAnyElement(deliverySelectors);
        if (deliveryButton) {
            logger.addLog(window, "找到待收货按钮: " + deliveryButton.text());
            if (safeClick(deliveryButton)) {
                waitTimeManager.wait(this.waitTime);
                if (this.isAtPendingDeliveryPage(window)) {
                    logger.addLog(window, "✅ 成功通过个人中心进入待收货页面");
                    return true;
                }
            }
        }
        
        // 如果没有直接的待收货按钮，尝试点击"我的订单"
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
                waitTimeManager.wait(this.waitTime);
                
                // 在订单页面查找待收货标签
                var pendingDeliveryTab = findAnyElement(deliverySelectors);
                if (pendingDeliveryTab) {
                    logger.addLog(window, "找到待收货标签: " + pendingDeliveryTab.text());
                    if (safeClick(pendingDeliveryTab)) {
                        waitTimeManager.wait(this.waitTime);
                        if (this.isAtPendingDeliveryPage(window)) {
                            logger.addLog(window, "✅ 成功通过订单页面进入待收货页面");
                            return true;
                        }
                    }
                }
            }
        }
        
        logger.addLog(window, "通过个人中心进入待收货页面失败");
        return false;
        
    } catch (e) {
        logger.addLog(window, "通过个人中心进入待收货页面出错: " + e.message);
        return false;
    }
};

/**
 * 通过底部导航进入待收货页面
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否成功
 */
DeliveryNavigation.prototype.goToPendingDeliveryViaBottomNav = function(window) {
    logger.addLog(window, "尝试通过底部导航进入待收货页面...");
    
    try {
        // 先确保在主页
        var HomeNavigation = require('./home-navigation.js');
        var homeNav = new HomeNavigation();
        
        if (!homeNav.goToHomePage(window)) {
            logger.addLog(window, "无法回到主页");
            return false;
        }
        
        waitTimeManager.wait(this.waitTime);
        
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
                        waitTimeManager.wait(this.waitTime);
                        
                        // 在新页面查找待收货相关内容
                        if (this.findAndClickPendingDelivery(window)) {
                            return true;
                        }
                    }
                    break;
                }
            }
        }
        
        logger.addLog(window, "通过底部导航进入待收货页面失败");
        return false;
        
    } catch (e) {
        logger.addLog(window, "通过底部导航进入待收货页面出错: " + e.message);
        return false;
    }
};

/**
 * 通过其他路径进入待收货页面
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否成功
 */
DeliveryNavigation.prototype.goToPendingDeliveryViaAlternativeRoute = function(window) {
    logger.addLog(window, "尝试通过其他路径进入待收货页面...");
    
    try {
        // 尝试通过搜索功能
        var searchSelectors = [
            textContains("搜索"),
            desc("搜索"),
            descContains("搜索")
        ];
        
        var searchButton = findAnyElement(searchSelectors);
        if (searchButton) {
            logger.addLog(window, "找到搜索按钮，尝试搜索待收货相关内容");
            if (safeClick(searchButton)) {
                waitTimeManager.wait('pageStable');
                
                // 输入搜索关键词
                var searchInput = className("android.widget.EditText").findOne(2000);
                if (searchInput) {
                    searchInput.setText("我的订单");
                    waitTimeManager.wait('pageStable');
                    
                    // 点击搜索或回车
                    var searchConfirm = text("搜索").findOne(1000);
                    if (searchConfirm) {
                        safeClick(searchConfirm);
                    } else {
                        // 尝试按回车键
                        searchInput.performAction(android.view.accessibility.AccessibilityNodeInfo.ACTION_IME_ENTER);
                    }
                    
                    waitTimeManager.wait('back');
                    
                    // 在搜索结果中查找订单相关内容
                    if (this.findAndClickPendingDelivery(window)) {
                        return true;
                    }
                }
            }
        }
        
        logger.addLog(window, "通过其他路径进入待收货页面失败");
        return false;
        
    } catch (e) {
        logger.addLog(window, "通过其他路径进入待收货页面出错: " + e.message);
        return false;
    }
};

/**
 * 查找并点击待收货相关内容
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否成功
 */
DeliveryNavigation.prototype.findAndClickPendingDelivery = function(window) {
    logger.addLog(window, "查找待收货相关内容...");
    
    var deliverySelectors = [
        text("待收货"),
        textContains("待收货"),
        text("待发货"),
        textContains("待发货"),
        text("已发货"),
        textContains("已发货"),
        text("运输中"),
        textContains("运输中"),
        desc("待收货"),
        descContains("待收货"),
        desc("待发货"),
        descContains("待发货"),
        desc("已发货"),
        descContains("已发货")
    ];
    
    var deliveryElement = findAnyElement(deliverySelectors);
    if (deliveryElement) {
        logger.addLog(window, "找到待收货元素: " + deliveryElement.text());
        if (safeClick(deliveryElement)) {
            waitTimeManager.wait('back');
            if (this.isAtPendingDeliveryPage(window)) {
                logger.addLog(window, "✅ 成功进入待收货页面");
                return true;
            }
        }
    }
    
    return false;
};

/**
 * 检查是否在待收货页面
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否在待收货页面
 */
DeliveryNavigation.prototype.isAtPendingDeliveryPage = function(window) {
    logger.addLog(window, "检查是否在待收货页面...");
    
    // 检查待收货页面特征
    var pendingDeliveryIndicators = [
        text("待收货"),
        textContains("待收货"),
        text("待发货"),
        textContains("待发货"),
        text("已发货"),
        textContains("已发货"),
        text("运输中"),
        textContains("运输中"),
        text("物流信息"),
        textContains("物流信息"),
        text("查看物流"),
        textContains("查看物流"),
        text("确认收货"),
        textContains("确认收货"),
        desc("待收货"),
        descContains("待收货"),
        desc("待发货"),
        descContains("待发货"),
        desc("已发货"),
        descContains("已发货"),
        desc("运输中"),
        descContains("运输中")
    ];
    
    for (var i = 0; i < pendingDeliveryIndicators.length; i++) {
        if (pendingDeliveryIndicators[i].exists()) {
            logger.addLog(window, "✅ 确认在待收货页面 - 找到标识: " + pendingDeliveryIndicators[i].findOne().text());
            return true;
        }
    }
    
    logger.addLog(window, "❌ 不在待收货页面");
    return false;
};

module.exports = DeliveryNavigation;
