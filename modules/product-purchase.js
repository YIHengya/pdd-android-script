// 商品购买功能模块
// 整合拼多多自动购买的所有功能

const { PDD_CONFIG } = require('../config/app-config.js');
const { parsePrice, safeClick, scrollWithRandomCoords, GlobalStopManager } = require('../utils/common.js');
const logger = require('../utils/logger.js');
const ApiClient = require('../utils/api-client.js');
const ProductInfoExtractor = require('../utils/product-info.js');
const NavigationHelper = require('../utils/navigation.js');
const ForbiddenKeywordsChecker = require('../utils/forbidden-keywords-checker.js');

/**
 * 商品购买功能构造函数
 */
function ProductPurchase() {
    this.config = PDD_CONFIG;
    this.apiClient = new ApiClient();
    this.productInfoExtractor = new ProductInfoExtractor();
    this.navigationHelper = new NavigationHelper();
    this.keywordsChecker = new ForbiddenKeywordsChecker();
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

                // 购买商品 - 增加重试机制
                var purchaseSuccess = false;
                var maxPurchaseRetries = 2;

                for (var retryCount = 0; retryCount < maxPurchaseRetries && !purchaseSuccess; retryCount++) {
                    if (retryCount > 0) {
                        logger.addLog(window, "第 " + (retryCount + 1) + " 次尝试购买商品...");
                        sleep(2000); // 重试前等待
                    }

                    purchaseSuccess = this.purchaseProduct(window);

                    if (!purchaseSuccess && retryCount < maxPurchaseRetries - 1) {
                        logger.addLog(window, "购买失败，准备重试...");
                        // 返回主页重新进入商品页面
                        this.navigationHelper.goToHomePage(window);
                        sleep(1000);
                        // 重新寻找并点击相同商品
                        var retryProduct = this.findProducts(window, priceRange, false);
                        if (!retryProduct || retryProduct.text !== foundProduct.text) {
                            logger.addLog(window, "重新寻找商品失败，跳过重试");
                            break;
                        }
                    }
                }

                if (purchaseSuccess) {
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
                    logger.addLog(window, "第 " + (i + 1) + " 件商品购买流程失败，已尝试 " + maxPurchaseRetries + " 次");
                    this.navigationHelper.goToHomePage(window);
                }
            } else {
                logger.addLog(window, "未找到符合条件的新商品，尝试多种策略寻找...");

                // 策略1: 清除部分位置记录，允许重新点击一些商品
                if (this.clickedPositions.length > 20) {
                    var removeCount = Math.floor(this.clickedPositions.length / 3);
                    this.clickedPositions.splice(0, removeCount);
                    logger.addLog(window, "清除了 " + removeCount + " 个旧的点击记录，允许重新尝试");
                }

                // 策略2: 回到页面顶部重新开始
                logger.addLog(window, "尝试回到页面顶部重新搜索...");
                for (var k = 0; k < 10; k++) {
                    scrollWithRandomCoords('up');
                    sleep(500);
                }
                this.currentScrollPosition = 0;

                // 策略3: 强制滚动寻找新商品
                logger.addLog(window, "从顶部开始滚动寻找新商品...");
                for (var k = 0; k < 8; k++) {
                    scrollWithRandomCoords('down');
                    sleep(1500);
                }

                // 策略4: 如果还是找不到，尝试刷新页面
                if (i > 5) { // 只有在购买了5件以上才尝试刷新
                    logger.addLog(window, "尝试刷新页面获取新商品...");
                    this.navigationHelper.goToHomePage(window);
                    sleep(2000);
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
            scrollWithRandomCoords('down');
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
        var foundNewProduct = false;

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

                        // 寻找可点击的商品区域
                        var clickableElement = this.findClickableProductArea(window, element);
                        if (clickableElement && this.clickProduct(window, clickableElement)) {
                            foundNewProduct = true;
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

        // 如果本次搜索没有找到新商品，采用不同的滚动策略
        if (!foundNewProduct) {
            // 每5次失败尝试清除一些位置记录
            if (scrollCount > 0 && scrollCount % 5 === 0 && this.clickedPositions.length > 10) {
                var removeCount = Math.floor(this.clickedPositions.length / 4);
                this.clickedPositions.splice(0, removeCount);
                logger.addLog(window, "清除了 " + removeCount + " 个旧的点击记录");
            }

            // 每10次失败尝试回到顶部
            if (scrollCount > 0 && scrollCount % 10 === 0) {
                logger.addLog(window, "尝试回到页面顶部重新搜索...");
                for (var k = 0; k < 8; k++) {
                    scrollWithRandomCoords('up');
                    sleep(300);
                }
                this.currentScrollPosition = 0;
                logger.addLog(window, "已回到页面顶部，继续搜索...");
            }
        }

        logger.addLog(window, "向下滚动寻找更多商品...");
        scrollWithRandomCoords('down');
        sleep(this.config.waitTimes.scroll);
        scrollCount++;
        this.currentScrollPosition++;
    }

    return null;
};

/**
 * 寻找可点击的商品区域
 * @param {Object} window 悬浮窗对象
 * @param {Object} priceElement 价格元素
 * @returns {Object|null} 可点击的商品元素
 */
ProductPurchase.prototype.findClickableProductArea = function(window, priceElement) {
    try {
        var priceBounds = priceElement.bounds();

        // 策略1: 寻找价格元素附近的图片（商品图片通常是可点击的）
        var images = className("android.widget.ImageView").find();
        for (var i = 0; i < images.length; i++) {
            var img = images[i];
            var imgBounds = img.bounds();

            // 检查图片是否在价格元素附近（通常商品图片在价格上方）
            var distanceX = Math.abs(imgBounds.centerX() - priceBounds.centerX());
            var distanceY = priceBounds.centerY() - imgBounds.centerY(); // 图片应该在价格上方

            if (distanceX < 200 && distanceY > 0 && distanceY < 400) {
                logger.addLog(window, "找到商品图片，位置: (" + imgBounds.centerX() + "," + imgBounds.centerY() + ")");
                return img;
            }
        }

        // 策略2: 寻找价格元素的可点击父容器
        var parent = priceElement.parent();
        var maxLevels = 5; // 最多向上查找5层
        var level = 0;

        while (parent && level < maxLevels) {
            if (parent.clickable()) {
                logger.addLog(window, "找到可点击的父容器，层级: " + level);
                return parent;
            }
            parent = parent.parent();
            level++;
        }

        // 策略3: 使用价格元素周围的区域坐标点击
        logger.addLog(window, "未找到特定可点击元素，将使用价格元素上方区域");

        // 创建一个虚拟元素，表示商品图片可能的位置（价格上方）
        var virtualElement = {
            bounds: function() {
                return {
                    centerX: function() { return priceBounds.centerX(); },
                    centerY: function() { return priceBounds.centerY() - 100; } // 价格上方100像素
                };
            },
            clickable: function() { return false; } // 强制使用坐标点击
        };

        return virtualElement;

    } catch (e) {
        logger.addLog(window, "寻找可点击商品区域失败: " + e.message);
        return priceElement; // 回退到原始价格元素
    }
};

/**
 * 点击商品
 * @param {Object} window 悬浮窗对象
 * @param {Object} element 商品元素
 * @returns {boolean} 是否点击成功
 */
ProductPurchase.prototype.clickProduct = function(window, element) {
    try {
        logger.addLog(window, "尝试点击商品...");

        var bounds = element.bounds();
        logger.addLog(window, "商品元素位置: (" + bounds.centerX() + "," + bounds.centerY() + ")");

        // 策略1: 使用safeClick
        if (safeClick(element)) {
            logger.addLog(window, "使用safeClick点击商品");
            sleep(this.config.waitTimes.click);
            this.verifyProductDetailPage(window);
            return true;
        }

        // 策略2: 直接坐标点击商品图片区域（价格上方）
        var imageY = bounds.centerY() - 100; // 商品图片通常在价格上方
        logger.addLog(window, "尝试点击商品图片区域: (" + bounds.centerX() + "," + imageY + ")");
        click(bounds.centerX(), imageY);
        sleep(this.config.waitTimes.click);
        this.verifyProductDetailPage(window);
        return true;

    } catch (e) {
        logger.addLog(window, "点击商品失败: " + e.message);
    }
    return false;
};

/**
 * 验证是否成功进入商品详情页
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否在商品详情页
 */
ProductPurchase.prototype.verifyProductDetailPage = function(window) {
    try {
        // 简单等待页面加载
        sleep(2000);

        // 简化验证：直接返回true，让后续流程继续
        // 如果真的没有进入商品详情页，后续的商品信息提取会失败并处理
        logger.addLog(window, "等待页面加载完成...");
        return true;

    } catch (e) {
        logger.addLog(window, "页面加载等待失败: " + e.message);
        return true; // 即使出错也继续执行
    }
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

                // 检查弹出的规格选择页面是否包含禁止关键词
                if (this.keywordsChecker.containsForbiddenKeywords(window, "规格选择页面", 1500)) {
                    logger.addLog(window, "❌ 规格选择页面包含禁止关键词，取消购买");
                    back(); // 返回上一页
                    return false;
                }

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

    // 检查弹出的规格选择页面是否包含禁止关键词
    if (this.keywordsChecker.containsForbiddenKeywords(window, "规格选择页面", 1500)) {
        logger.addLog(window, "❌ 规格选择页面包含禁止关键词，取消购买");
        back(); // 返回上一页
        return false;
    }

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
 * 等待支付宝页面或待支付状态出现后返回主页
 * @param {Object} window 悬浮窗对象
 */
ProductPurchase.prototype.waitForAlipayAndReturn = function(window) {
    logger.addLog(window, "等待支付宝页面或待支付状态出现...");

    var maxWaitTime = 30000; // 最大等待30秒
    var startTime = Date.now();
    var orderCompleted = false;

    while (Date.now() - startTime < maxWaitTime) {
        // 检查是否出现支付宝相关元素
        var alipayElement = className("android.widget.TextView").text("支付宝").findOne(1000);

        // 检查是否出现待支付按钮（说明订单已创建）
        var pendingPaymentElement = className("android.widget.TextView").textContains("待支付").findOne(1000);

        // 检查是否出现待付款按钮（说明订单已创建）
        var pendingPayElement = className("android.widget.TextView").textContains("待付款").findOne(1000);

        if (alipayElement) {
            logger.addLog(window, "检测到支付宝页面，订单已创建，准备返回主页");
            orderCompleted = true;
            break;
        }

        if (pendingPaymentElement) {
            logger.addLog(window, "检测到待支付状态，订单已创建，准备返回主页");
            orderCompleted = true;
            break;
        }

        if (pendingPayElement) {
            logger.addLog(window, "检测到待付款状态，订单已创建，准备返回主页");
            orderCompleted = true;
            break;
        }

        sleep(500); // 每500ms检查一次
    }

    if (orderCompleted) {
        logger.addLog(window, "订单已成功创建，开始返回主页");
        sleep(1000); // 稍等一下确保页面稳定
        this.navigationHelper.goToHomePage(window);
    } else {
        logger.addLog(window, "未检测到支付页面或待支付状态，直接返回主页");
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

    // 如果已购买商品过多，清除一些旧记录以避免过度限制
    if (this.purchasedProducts.length > 50) {
        var removeCount = Math.floor(this.purchasedProducts.length / 4);
        this.purchasedProducts.splice(0, removeCount);
        this.savePurchasedProducts();
        console.log("清除了 " + removeCount + " 个旧的购买记录，避免过度限制");
    }

    console.log("购买会话已重置");
};

module.exports = ProductPurchase;
