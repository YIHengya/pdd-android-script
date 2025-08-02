// 商品购买功能模块
// 整合拼多多自动购买的所有功能

const { PDD_CONFIG } = require('../config/app-config.js');
const { parsePrice, safeClick } = require('../utils/common.js');
const logger = require('../utils/logger.js');
const ApiClient = require('../utils/api-client.js');
const ProductInfoExtractor = require('../utils/product-info.js');
const NavigationHelper = require('../utils/navigation.js');

/**
 * 商品购买功能构造函数
 */
function ProductPurchase() {
    this.config = PDD_CONFIG;
    this.apiClient = new ApiClient();
    this.productInfoExtractor = new ProductInfoExtractor();
    this.navigationHelper = new NavigationHelper();
}

/**
 * 执行完整的购买流程
 * @param {Object} window 悬浮窗对象
 * @param {Object} priceRange 价格区间对象 {min: number, max: number}
 * @param {string} userName 用户名
 * @returns {boolean} 是否执行成功
 */
ProductPurchase.prototype.execute = function(window, priceRange, userName) {
    try {
        logger.addLog(window, "开始执行商品购买流程...");

        // 兼容旧的单价格参数
        if (typeof priceRange === 'number') {
            logger.addLog(window, "用户: " + userName + ", 目标价格: " + priceRange + " 元");
            priceRange = { min: 0, max: priceRange };
        } else {
            logger.addLog(window, "用户: " + userName + ", 价格区间: " + priceRange.min.toFixed(2) + "-" + priceRange.max.toFixed(2) + " 元");
        }

        // 1. 启动应用
        if (!this.navigationHelper.launchApp(window)) {
            logger.addLog(window, "无法打开拼多多APP，请检查是否已安装");
            return false;
        }

        // 2. 确保在主页
        if (!this.navigationHelper.goToHomePage(window)) {
            logger.addLog(window, "无法回到主页");
            return false;
        }

        // 3. 寻找商品
        if (this.findProducts(window, priceRange)) {
            logger.addLog(window, "成功找到并点击商品");

            // 4. 提取商品信息并检查下单权限
            var productInfo = this.productInfoExtractor.extractProductInfo(window, userName);
            if (!productInfo) {
                logger.addLog(window, "无法获取商品信息，返回主页");
                this.navigationHelper.goToHomePage(window);
                return false;
            }

            // 5. 检查是否可以下单
            var checkResult = this.apiClient.checkOrderPermissionWithRetry(window, productInfo);
            if (!checkResult.canOrder) {
                logger.addLog(window, "不能下单: " + checkResult.message);
                logger.addLog(window, "返回主页继续寻找其他商品");
                this.navigationHelper.goToHomePage(window);
                return false;
            }

            logger.addLog(window, "✅ 可以下单，开始购买流程");

            // 6. 购买商品
            if (this.purchaseProduct(window)) {
                logger.addLog(window, "购买流程已启动");

                // 7. 等待支付宝页面出现后返回主页
                this.waitForAlipayAndReturn(window);
                return true;
            } else {
                logger.addLog(window, "购买流程失败");
                this.navigationHelper.goToHomePage(window);
                return false;
            }
        } else {
            logger.addLog(window, "未找到符合条件的商品");
            return false;
        }

    } catch (e) {
        logger.addLog(window, "购买流程出错: " + e.message);
        return false;
    }
};





/**
 * 寻找符合条件的商品
 * @param {Object} window 悬浮窗对象
 * @param {Object} priceRange 价格区间对象 {min: number, max: number}
 * @returns {boolean} 是否找到商品
 */
ProductPurchase.prototype.findProducts = function(window, priceRange) {
    // 兼容旧的单价格参数
    if (typeof priceRange === 'number') {
        logger.addLog(window, "开始寻找价格低于 " + priceRange + " 元的商品...");
        priceRange = { min: 0, max: priceRange };
    } else {
        logger.addLog(window, "开始寻找价格在 " + priceRange.min.toFixed(2) + "-" + priceRange.max.toFixed(2) + " 元区间的商品...");
    }

    var scrollCount = 0;

    while (scrollCount < this.config.maxScrolls) {
        logger.addLog(window, "第 " + (scrollCount + 1) + " 次搜索商品...");

        var allTexts = textMatches(/.*/).find();

        for (var i = 0; i < allTexts.length; i++) {
            var element = allTexts[i];
            var text = element.text();

            if (!text) continue;

            // 检查价格模式
            for (var j = 0; j < this.config.pricePatterns.length; j++) {
                if (this.config.pricePatterns[j].test(text)) {
                    var price = parsePrice(text);
                    if (price !== null && price > 0 && price >= priceRange.min && price <= priceRange.max) {
                        logger.addLog(window, "找到商品: " + text + " (价格: " + price + " 元)");

                        if (this.clickProduct(window, element)) {
                            return true;
                        }
                    }
                    break;
                }
            }
        }

        logger.addLog(window, "向下滚动寻找更多商品...");
        scrollDown();
        sleep(this.config.waitTimes.scroll);
        scrollCount++;
    }

    return false;
};

/**
 * 点击商品
 * @param {Object} window 悬浮窗对象
 * @param {Object} element 商品元素
 * @returns {boolean} 是否点击成功
 */
ProductPurchase.prototype.clickProduct = function(window, element) {
    try {
        if (safeClick(element)) {
            sleep(this.config.waitTimes.click);
            return true;
        }
    } catch (e) {
        logger.addLog(window, "点击商品失败: " + e.message);
    }
    return false;
};

/**
 * 购买商品
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否购买成功
 */
ProductPurchase.prototype.purchaseProduct = function(window) {
    logger.addLog(window, "进入商品详情页，开始购买...");

    sleep(this.config.waitTimes.pageLoad);

    // 寻找购买按钮
    for (var i = 0; i < this.config.buyButtons.length; i++) {
        var buyBtn = text(this.config.buyButtons[i]).findOne(2000);
        if (buyBtn) {
            logger.addLog(window, "找到购买按钮: " + this.config.buyButtons[i]);
            
            if (safeClick(buyBtn)) {
                sleep(this.config.waitTimes.pageLoad);
                return this.handlePayment(window);
            }
        }
    }

    // 尝试右下角点击
    logger.addLog(window, "尝试点击右下角购买区域...");
    var screenWidth = device.width;
    var screenHeight = device.height;
    click(screenWidth - 100, screenHeight - 150);
    sleep(this.config.waitTimes.pageLoad);
    
    return this.handlePayment(window);
};

/**
 * 处理支付流程
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否处理成功
 */
ProductPurchase.prototype.handlePayment = function(window) {
    logger.addLog(window, "进入支付流程...");

    sleep(this.config.waitTimes.elementFind);

    // 寻找支付按钮
    for (var i = 0; i < this.config.payButtons.length; i++) {
        var payBtn = text(this.config.payButtons[i]).findOne(1000);
        
        if (!payBtn) {
            payBtn = textContains(this.config.payButtons[i]).findOne(1000);
        }

        if (payBtn) {
            logger.addLog(window, "找到支付按钮: " + this.config.payButtons[i]);
            logger.addLog(window, "自动点击支付按钮进入支付页面...");

            if (safeClick(payBtn)) {
                sleep(this.config.waitTimes.payment);
                return true;
            }
        }
    }

    // 查找其他支付按钮
    var anyPayBtn = textContains("支付").findOne(2000);
    if (anyPayBtn) {
        logger.addLog(window, "找到支付按钮: " + anyPayBtn.text());
        
        if (safeClick(anyPayBtn)) {
            sleep(this.config.waitTimes.payment);
            return true;
        }
    }

    logger.addLog(window, "未找到支付按钮");
    return false;
};



/**
 * 等待支付宝页面出现后返回主页
 * @param {Object} window 悬浮窗对象
 */
ProductPurchase.prototype.waitForAlipayAndReturn = function(window) {
    logger.addLog(window, "等待支付宝页面出现...");

    var maxWaitTime = 30000; // 最大等待30秒
    var startTime = Date.now();
    var alipayFound = false;

    while (Date.now() - startTime < maxWaitTime) {
        // 检查是否出现支付宝相关元素
        var alipayElement = className("android.widget.TextView").text("支付宝").findOne(1000);

        if (alipayElement) {
            logger.addLog(window, "检测到支付宝页面，准备返回主页");
            alipayFound = true;
            break;
        }

        sleep(500); // 每500ms检查一次
    }

    if (alipayFound) {
        logger.addLog(window, "支付宝页面已出现，开始返回主页");
        sleep(1000); // 稍等一下确保页面稳定
        this.navigationHelper.goToHomePage(window);
    } else {
        logger.addLog(window, "未检测到支付宝页面，直接返回主页");
        this.navigationHelper.goToHomePage(window);
    }
};

module.exports = ProductPurchase;
