// 商品购买功能模块
// 整合拼多多自动购买的所有功能

const { PDD_CONFIG } = require('../config/app-config.js');
const { parsePrice, safeClick, scrollDownWithRandomCoords, GlobalStopManager } = require('../utils/common.js');
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
    this.purchasedProducts = []; // 已购买商品列表
    this.clickedPositions = []; // 已点击过的商品位置
    this.currentScrollPosition = 0; // 当前滚动位置
    this.loadPurchasedProducts(); // 加载本地保存的已购买商品
}

/**
 * 执行完整的购买流程
 * @param {Object} window 悬浮窗对象
 * @param {Object} priceRange 价格区间对象 {min: number, max: number}
 * @param {string} userName 用户名
 * @param {number} purchaseQuantity 购买数量，默认为1
 * @returns {boolean} 是否执行成功
 */
ProductPurchase.prototype.execute = function(window, priceRange, userName, purchaseQuantity) {
    try {
        // 设置默认购买数量
        purchaseQuantity = purchaseQuantity || 1;
        if (purchaseQuantity < 1) purchaseQuantity = 1;
        if (purchaseQuantity > 100) purchaseQuantity = 100;

        logger.addLog(window, "开始执行商品购买流程...");

        // 兼容旧的单价格参数
        if (typeof priceRange === 'number') {
            logger.addLog(window, "用户: " + userName + ", 目标价格: " + priceRange + " 元, 购买数量: " + purchaseQuantity + "件");
            priceRange = { min: 0, max: priceRange };
        } else {
            logger.addLog(window, "用户: " + userName + ", 价格区间: " + priceRange.min.toFixed(2) + "-" + priceRange.max.toFixed(2) + " 元, 购买数量: " + purchaseQuantity + "件");
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

        // 3. 重置购买会话，清除位置记录
        this.resetSession();

        // 4. 循环购买指定数量的商品
        var successCount = 0;
        for (var i = 0; i < purchaseQuantity; i++) {
            // 检查是否需要停止
            if (GlobalStopManager.isStopRequested()) {
                logger.addLog(window, "🛑 检测到停止信号，终止购买流程");
                break;
            }

            logger.addLog(window, "=== 开始购买第 " + (i + 1) + " 件商品 ===");

            // 寻找商品（第一次不强制滚动，后续强制滚动寻找新商品）
            var forceScroll = i > 0;
            var foundProduct = this.findProducts(window, priceRange, forceScroll);

            if (foundProduct) {
                logger.addLog(window, "成功找到并点击商品: " + foundProduct.text);

                // 提取商品信息并检查下单权限
                var productInfo = this.productInfoExtractor.extractProductInfo(window, userName);
                if (!productInfo) {
                    logger.addLog(window, "无法获取商品信息，返回主页继续寻找");
                    this.navigationHelper.goToHomePage(window);
                    continue;
                }

                // 检查是否可以下单
                var checkResult = this.apiClient.checkOrderPermissionWithRetry(window, productInfo);
                if (!checkResult.canOrder) {
                    logger.addLog(window, "不能下单: " + checkResult.message);
                    logger.addLog(window, "返回主页继续寻找其他商品");
                    this.navigationHelper.goToHomePage(window);
                    continue;
                }

                logger.addLog(window, "✅ 可以下单，开始购买流程");

                // 购买商品
                if (this.purchaseProduct(window)) {
                    logger.addLog(window, "第 " + (i + 1) + " 件商品购买流程已启动");
                    successCount++;

                    // 记录已购买的商品
                    this.addPurchasedProduct(foundProduct.text, foundProduct.price);
                    logger.addLog(window, "已记录购买商品，避免重复购买");

                    // 等待支付宝页面出现后返回主页
                    this.waitForAlipayAndReturn(window);

                    // 如果还有更多商品要购买，稍等一下再继续
                    if (i < purchaseQuantity - 1) {
                        logger.addLog(window, "等待 3 秒后继续购买下一件商品...");
                        sleep(3000);
                        logger.addLog(window, "准备寻找下一件不同的商品...");
                    }
                } else {
                    logger.addLog(window, "第 " + (i + 1) + " 件商品购买流程失败");
                    this.navigationHelper.goToHomePage(window);
                }
            } else {
                logger.addLog(window, "未找到符合条件的新商品，跳过第 " + (i + 1) + " 件");
                // 如果找不到商品，强制滚动更多寻找新商品
                logger.addLog(window, "尝试滚动更多寻找新商品...");
                for (var k = 0; k < 5; k++) {
                    scrollDownWithRandomCoords();
                    sleep(1000);
                }
            }
        }

        logger.addLog(window, "=== 购买任务完成 ===");
        logger.addLog(window, "目标数量: " + purchaseQuantity + " 件，成功购买: " + successCount + " 件");

        return successCount > 0;

    } catch (e) {
        logger.addLog(window, "购买流程出错: " + e.message);
        return false;
    }
};





/**
 * 寻找符合条件的商品
 * @param {Object} window 悬浮窗对象
 * @param {Object} priceRange 价格区间对象 {min: number, max: number}
 * @param {boolean} forceScroll 是否强制滚动寻找新商品
 * @returns {Object|null} 找到的商品信息，包含{text, price}，未找到返回null
 */
ProductPurchase.prototype.findProducts = function(window, priceRange, forceScroll) {
    // 兼容旧的单价格参数
    if (typeof priceRange === 'number') {
        logger.addLog(window, "开始寻找价格低于 " + priceRange + " 元的商品...");
        priceRange = { min: 0, max: priceRange };
    } else {
        logger.addLog(window, "开始寻找价格在 " + priceRange.min.toFixed(2) + "-" + priceRange.max.toFixed(2) + " 元区间的商品...");
    }

    var scrollCount = 0;
    var maxScrolls = this.config.maxScrolls;

    // 如果强制滚动，先滚动几次寻找新商品
    if (forceScroll) {
        logger.addLog(window, "强制滚动寻找新商品...");
        for (var k = 0; k < 3; k++) {
            scrollDownWithRandomCoords();
            sleep(this.config.waitTimes.scroll);
        }
        this.currentScrollPosition += 3;
    }

    while (scrollCount < maxScrolls) {
        // 检查是否需要停止
        if (GlobalStopManager.isStopRequested()) {
            logger.addLog(window, "🛑 检测到停止信号，终止商品搜索");
            break;
        }

        logger.addLog(window, "第 " + (scrollCount + 1) + " 次搜索商品...");

        var allTexts = textMatches(/.*/).find();

        for (var i = 0; i < allTexts.length; i++) {
            // 检查是否需要停止
            if (GlobalStopManager.isStopRequested()) {
                logger.addLog(window, "🛑 检测到停止信号，终止元素遍历");
                return null;
            }
            var element = allTexts[i];
            var text = element.text();

            if (!text) continue;

            // 获取元素位置信息
            var bounds = element.bounds();
            var elementPosition = {
                centerX: bounds.centerX(),
                centerY: bounds.centerY(),
                text: text
            };

            // 检查是否已点击过此位置的商品
            if (this.isPositionClicked(elementPosition)) {
                continue;
            }

            // 检查价格模式
            for (var j = 0; j < this.config.pricePatterns.length; j++) {
                if (this.config.pricePatterns[j].test(text)) {
                    var price = parsePrice(text);
                    if (price !== null && price > 0 && price >= priceRange.min && price <= priceRange.max) {
                        logger.addLog(window, "找到新商品: " + text + " (价格: " + price + " 元)");

                        // 记录点击位置
                        this.addClickedPosition(elementPosition);

                        if (this.clickProduct(window, element)) {
                            return {
                                text: text,
                                price: price
                            };
                        }
                    }
                    break;
                }
            }
        }

        logger.addLog(window, "向下滚动寻找更多商品...");
        scrollDownWithRandomCoords();
        sleep(this.config.waitTimes.scroll);
        scrollCount++;
        this.currentScrollPosition++;
    }

    return null;
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

/**
 * 加载本地保存的已购买商品列表
 */
ProductPurchase.prototype.loadPurchasedProducts = function() {
    try {
        var savedData = storages.create("purchased_products").get("products", "[]");
        this.purchasedProducts = JSON.parse(savedData);
        console.log("已加载 " + this.purchasedProducts.length + " 个已购买商品记录");
    } catch (e) {
        console.log("加载已购买商品列表失败: " + e.message);
        this.purchasedProducts = [];
    }
};

/**
 * 保存已购买商品列表到本地
 */
ProductPurchase.prototype.savePurchasedProducts = function() {
    try {
        var storage = storages.create("purchased_products");
        storage.put("products", JSON.stringify(this.purchasedProducts));
        console.log("已保存 " + this.purchasedProducts.length + " 个已购买商品记录");
    } catch (e) {
        console.log("保存已购买商品列表失败: " + e.message);
    }
};

/**
 * 添加已购买商品记录
 * @param {string} productText 商品文本
 * @param {number} price 商品价格
 */
ProductPurchase.prototype.addPurchasedProduct = function(productText, price) {
    var productRecord = {
        text: productText,
        price: price,
        timestamp: Date.now(),
        date: new Date().toLocaleString()
    };

    this.purchasedProducts.push(productRecord);
    this.savePurchasedProducts();
    console.log("已记录购买商品: " + productText + " (价格: " + price + "元)");
};

/**
 * 检查商品是否已购买
 * @param {string} productText 商品文本
 * @param {number} price 商品价格
 * @returns {boolean} 是否已购买
 */
ProductPurchase.prototype.isProductPurchased = function(productText, price) {
    for (var i = 0; i < this.purchasedProducts.length; i++) {
        var record = this.purchasedProducts[i];
        if (record.text === productText && Math.abs(record.price - price) < 0.01) {
            return true;
        }
    }
    return false;
};

/**
 * 清除已购买商品记录
 */
ProductPurchase.prototype.clearPurchasedProducts = function() {
    this.purchasedProducts = [];
    this.savePurchasedProducts();
    console.log("已清除所有已购买商品记录");
};

/**
 * 获取已购买商品数量
 * @returns {number} 已购买商品数量
 */
ProductPurchase.prototype.getPurchasedProductsCount = function() {
    return this.purchasedProducts.length;
};

/**
 * 检查位置是否已点击过
 * @param {Object} position 位置信息 {centerX, centerY, text}
 * @returns {boolean} 是否已点击过
 */
ProductPurchase.prototype.isPositionClicked = function(position) {
    for (var i = 0; i < this.clickedPositions.length; i++) {
        var clickedPos = this.clickedPositions[i];
        // 检查位置是否相近（允许一定误差）和文本是否相同
        var distanceX = Math.abs(clickedPos.centerX - position.centerX);
        var distanceY = Math.abs(clickedPos.centerY - position.centerY);

        if (distanceX < 50 && distanceY < 50 && clickedPos.text === position.text) {
            return true;
        }
    }
    return false;
};

/**
 * 添加已点击位置记录
 * @param {Object} position 位置信息 {centerX, centerY, text}
 */
ProductPurchase.prototype.addClickedPosition = function(position) {
    this.clickedPositions.push({
        centerX: position.centerX,
        centerY: position.centerY,
        text: position.text,
        timestamp: Date.now()
    });

    // 限制记录数量，避免内存占用过多
    if (this.clickedPositions.length > 100) {
        this.clickedPositions.shift(); // 移除最早的记录
    }

    console.log("已记录点击位置: " + position.text + " (" + position.centerX + "," + position.centerY + ")");
};

/**
 * 清除位置记录
 */
ProductPurchase.prototype.clearClickedPositions = function() {
    this.clickedPositions = [];
    this.currentScrollPosition = 0;
    console.log("已清除所有位置记录");
};

/**
 * 重置购买会话（清除位置记录，保留商品记录）
 */
ProductPurchase.prototype.resetSession = function() {
    this.clearClickedPositions();
    console.log("购买会话已重置");
};

module.exports = ProductPurchase;
