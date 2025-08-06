// 商品收藏功能模块
// 基于购买逻辑实现批量收藏功能

const { PDD_CONFIG } = require('../config/app-config.js');
const { parsePrice, safeClick, scrollWithRandomCoords, GlobalStopManager } = require('../utils/common.js');
const logger = require('../utils/logger.js');
const ApiClient = require('../utils/api-client.js');
const ProductInfoExtractor = require('../utils/product-info.js');
const NavigationHelper = require('../utils/navigation.js');
const ForbiddenKeywordsChecker = require('../utils/forbidden-keywords-checker.js');

/**
 * 商品收藏构造函数
 */
function ProductFavorite() {
    this.config = PDD_CONFIG;
    this.apiClient = new ApiClient();
    this.productInfoExtractor = new ProductInfoExtractor();
    this.navigationHelper = new NavigationHelper();
    this.keywordsChecker = new ForbiddenKeywordsChecker();
    
    // 收藏相关配置
    this.favoriteButtons = [
        "收藏",
        "加入收藏",
        "收藏商品",
        "♡",
        "❤",
        "🤍",
        "♥"
    ];
    
    // 点击位置记录（避免重复点击同一位置）
    this.clickedPositions = [];
    this.currentScrollPosition = 0;
}

/**
 * 执行完整的收藏流程
 * @param {Object} window 悬浮窗对象
 * @param {Object} priceRange 价格区间对象 {min: number, max: number}
 * @param {string} userName 用户名
 * @param {number} favoriteQuantity 收藏数量，默认为10
 * @returns {boolean} 是否执行成功
 */
ProductFavorite.prototype.execute = function(window, priceRange, userName, favoriteQuantity) {
    try {
        // 设置默认收藏数量
        favoriteQuantity = favoriteQuantity || 10;
        if (favoriteQuantity < 1) favoriteQuantity = 1;
        if (favoriteQuantity > 100) favoriteQuantity = 100;

        logger.addLog(window, "开始执行商品收藏流程...");

        // 兼容旧的单价格参数
        if (typeof priceRange === 'number') {
            logger.addLog(window, "用户: " + userName + ", 目标价格: " + priceRange + " 元, 收藏数量: " + favoriteQuantity + "件");
            priceRange = { min: 0, max: priceRange };
        } else {
            logger.addLog(window, "用户: " + userName + ", 价格区间: " + priceRange.min.toFixed(2) + "-" + priceRange.max.toFixed(2) + " 元, 收藏数量: " + favoriteQuantity + "件");
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

        // 3. 重置收藏会话，清除位置记录
        this.resetSession();

        // 4. 循环收藏指定数量的商品
        var successCount = 0;
        for (var i = 0; i < favoriteQuantity; i++) {
            // 检查是否需要停止
            if (GlobalStopManager.isStopRequested()) {
                logger.addLog(window, "🛑 检测到停止信号，终止收藏流程");
                break;
            }

            logger.addLog(window, "=== 开始收藏第 " + (i + 1) + " 件商品 ===");

            // 寻找商品（第一次不强制滚动，后续强制滚动寻找新商品）
            var forceScroll = i > 0;
            var foundProduct = this.findProducts(window, priceRange, forceScroll);

            if (!foundProduct) {
                logger.addLog(window, "未找到符合条件的商品，跳过");
                continue;
            }

            logger.addLog(window, "找到商品信息 - 文本: '" + foundProduct.text + "', 价格: " + foundProduct.price + " 元");

            logger.addLog(window, "✅ 找到商品，开始收藏前的权限检查");

            // 提取商品信息并检查收藏权限
            var productInfo = this.productInfoExtractor.extractProductInfo(window, userName);
            if (!productInfo) {
                logger.addLog(window, "无法获取商品信息，返回主页继续寻找");
                this.navigationHelper.goToHomePage(window);
                continue;
            }

            // 检查是否可以收藏（使用与购买相同的权限检查）
            var checkResult = this.apiClient.checkOrderPermissionWithRetry(window, productInfo);
            if (!checkResult.canOrder) {
                logger.addLog(window, "不能收藏此商品: " + checkResult.message);
                logger.addLog(window, "返回主页继续寻找其他商品");
                this.navigationHelper.goToHomePage(window);
                continue;
            }

            logger.addLog(window, "✅ 权限检查通过，开始收藏流程");

            // 收藏商品
            var favoriteSuccess = this.favoriteProduct(window);

            if (favoriteSuccess) {
                successCount++;
                logger.addLog(window, "✅ 第 " + (i + 1) + " 件商品收藏成功");

                // 返回主页准备收藏下一个商品
                this.navigationHelper.goToHomePage(window);
                sleep(1000);
            } else {
                logger.addLog(window, "❌ 第 " + (i + 1) + " 件商品收藏失败");
                // 收藏失败时返回主页重试
                this.navigationHelper.goToHomePage(window);
                sleep(1000);
            }
        }

        logger.addLog(window, "=== 收藏流程完成 ===");
        logger.addLog(window, "成功收藏: " + successCount + "/" + favoriteQuantity + " 件商品");

        return successCount > 0;

    } catch (e) {
        logger.addLog(window, "收藏流程出错: " + e.message);
        return false;
    }
};

/**
 * 重置收藏会话
 */
ProductFavorite.prototype.resetSession = function() {
    this.clearClickedPositions();
    console.log("收藏会话已重置");
};

/**
 * 寻找符合条件的商品
 * @param {Object} window 悬浮窗对象
 * @param {Object} priceRange 价格区间对象 {min: number, max: number}
 * @param {boolean} forceScroll 是否强制滚动寻找新商品
 * @returns {Object|null} 找到的商品信息，包含{text, price}，未找到返回null
 */
ProductFavorite.prototype.findProducts = function(window, priceRange, forceScroll) {
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
            var element = allTexts[i];
            var text = element.text();

            if (!text || text.trim() === "") continue;

            var elementPosition = {
                centerX: element.bounds().centerX(),
                centerY: element.bounds().centerY(),
                text: text
            };

            // 检查是否已经点击过这个位置
            if (this.isPositionClicked(elementPosition)) {
                continue;
            }

            // 检查价格模式
            for (var j = 0; j < this.config.pricePatterns.length; j++) {
                if (this.config.pricePatterns[j].test(text)) {
                    var price = parsePrice(text);
                    if (price !== null && price > 0 && price >= priceRange.min && price <= priceRange.max) {

                        // 过滤掉搜索框和其他非商品区域的文本
                        if (this.isSearchBoxOrNonProductArea(element, text)) {
                            logger.addLog(window, "跳过搜索框或非商品区域: " + text);
                            continue;
                        }

                        logger.addLog(window, "找到新商品: " + text + " (价格: " + price + " 元)");
                        logger.addLog(window, "价格元素位置: (" + elementPosition.centerX + "," + elementPosition.centerY + ")");

                        // 记录点击位置
                        this.addClickedPosition(elementPosition);

                        // 寻找可点击的商品区域
                        logger.addLog(window, "开始寻找可点击的商品区域...");
                        var clickableElement = this.findClickableProductArea(window, element);

                        if (clickableElement) {
                            var clickableBounds = clickableElement.bounds();
                            logger.addLog(window, "找到可点击元素，位置: (" + clickableBounds.centerX() + "," + clickableBounds.centerY() + ")");

                            if (this.clickProduct(window, clickableElement)) {
                                foundNewProduct = true;
                                return {
                                    text: text,
                                    price: price
                                };
                            } else {
                                logger.addLog(window, "点击商品失败，继续寻找其他商品");
                            }
                        } else {
                            logger.addLog(window, "未找到可点击的商品区域，跳过此商品");
                        }
                    }
                    break;
                }
            }
        }

        if (foundNewProduct) {
            break;
        }

        // 滚动寻找更多商品
        logger.addLog(window, "滚动寻找更多商品...");
        scrollWithRandomCoords('down');
        sleep(this.config.waitTimes.scroll);
        scrollCount++;
        this.currentScrollPosition++;
    }

    logger.addLog(window, "未找到符合条件的新商品");
    return null;
};

/**
 * 检查是否是搜索框或非商品区域
 * @param {Object} element 元素对象
 * @param {string} text 文本内容
 * @returns {boolean} 是否是搜索框或非商品区域
 */
ProductFavorite.prototype.isSearchBoxOrNonProductArea = function(element, text) {
    try {
        var bounds = element.bounds();
        var screenHeight = device.height;
        
        // 如果元素在屏幕顶部区域（可能是搜索框）
        if (bounds.centerY() < screenHeight * 0.2) {
            return true;
        }
        
        // 检查是否包含搜索相关关键词
        var searchKeywords = ["搜索", "search", "输入", "请输入"];
        for (var i = 0; i < searchKeywords.length; i++) {
            if (text.toLowerCase().includes(searchKeywords[i])) {
                return true;
            }
        }
        
        return false;
    } catch (e) {
        return false;
    }
};

/**
 * 寻找可点击的商品区域
 * @param {Object} window 悬浮窗对象
 * @param {Object} priceElement 价格元素
 * @returns {Object|null} 可点击的元素
 */
ProductFavorite.prototype.findClickableProductArea = function(window, priceElement) {
    try {
        var priceBounds = priceElement.bounds();
        logger.addLog(window, "价格元素位置: (" + priceBounds.centerX() + "," + priceBounds.centerY() + ")");

        // 策略1: 向上查找父容器，寻找可点击的商品容器
        var currentElement = priceElement;
        var maxLevels = 5; // 最多向上查找5层

        for (var level = 0; level < maxLevels; level++) {
            var parent = currentElement.parent();
            if (!parent) break;

            var parentBounds = parent.bounds();

            // 检查父容器是否是合理的商品容器（不能太大，避免选中整个页面）
            var parentWidth = parentBounds.right - parentBounds.left;
            var parentHeight = parentBounds.bottom - parentBounds.top;
            var screenWidth = device.width;
            var screenHeight = device.height;

            // 如果父容器大小合理且可点击，使用它
            if (parent.clickable() &&
                parentWidth < screenWidth * 0.8 &&
                parentHeight < screenHeight * 0.4) {
                logger.addLog(window, "找到合适的可点击父容器 (层级" + (level + 1) + ")");
                logger.addLog(window, "父容器位置: (" + parentBounds.centerX() + "," + parentBounds.centerY() + ")");
                return parent;
            }

            currentElement = parent;
        }

        // 策略2: 寻找价格附近的图片区域（更精确的范围）
        var imageArea = this.findImageAreaNearPrice(window, priceBounds);
        if (imageArea) {
            logger.addLog(window, "找到价格附近的商品图片区域");
            return imageArea;
        }

        // 策略3: 直接返回价格元素本身
        logger.addLog(window, "使用价格元素本身");
        return priceElement;

    } catch (e) {
        logger.addLog(window, "寻找可点击区域失败: " + e.message);
        return priceElement;
    }
};

/**
 * 寻找价格附近的图片区域（更精确的匹配）
 * @param {Object} window 悬浮窗对象
 * @param {Object} priceBounds 价格元素边界
 * @returns {Object|null} 图片区域元素
 */
ProductFavorite.prototype.findImageAreaNearPrice = function(window, priceBounds) {
    try {
        logger.addLog(window, "寻找价格附近的商品图片...");

        // 在价格附近寻找ImageView
        var imageViews = className("android.widget.ImageView").find();
        var bestMatch = null;
        var minDistance = Infinity;

        for (var i = 0; i < imageViews.length; i++) {
            var imageView = imageViews[i];
            var imageBounds = imageView.bounds();

            // 计算图片与价格的距离
            var horizontalDistance = Math.abs(imageBounds.centerX() - priceBounds.centerX());
            var verticalDistance = Math.abs(imageBounds.centerY() - priceBounds.centerY());
            var totalDistance = Math.sqrt(horizontalDistance * horizontalDistance + verticalDistance * verticalDistance);

            // 检查图片是否在合理的位置范围内
            // 1. 水平位置相近（同一列商品）
            // 2. 垂直距离合理（通常商品图片在价格上方100-300像素内）
            // 3. 图片大小合理（不能太小，避免选中装饰性图标）
            var imageWidth = imageBounds.right - imageBounds.left;
            var imageHeight = imageBounds.bottom - imageBounds.top;

            if (horizontalDistance < 100 && // 水平距离小于100像素
                imageBounds.centerY() < priceBounds.centerY() && // 图片在价格上方
                verticalDistance < 300 && // 垂直距离小于300像素
                imageWidth > 50 && imageHeight > 50 && // 图片大小合理
                totalDistance < minDistance) {

                bestMatch = imageView;
                minDistance = totalDistance;
                logger.addLog(window, "找到候选图片，距离: " + Math.round(totalDistance) +
                    ", 位置: (" + imageBounds.centerX() + "," + imageBounds.centerY() + ")");
            }
        }

        if (bestMatch) {
            var bestBounds = bestMatch.bounds();
            logger.addLog(window, "选择最佳匹配图片，位置: (" + bestBounds.centerX() + "," + bestBounds.centerY() + ")");
            return bestMatch;
        }

        logger.addLog(window, "未找到合适的商品图片");
        return null;
    } catch (e) {
        logger.addLog(window, "寻找商品图片失败: " + e.message);
        return null;
    }
};

/**
 * 点击商品
 * @param {Object} window 悬浮窗对象
 * @param {Object} element 商品元素
 * @returns {boolean} 是否点击成功并进入详情页
 */
ProductFavorite.prototype.clickProduct = function(window, element) {
    try {
        logger.addLog(window, "尝试点击商品...");

        var bounds = element.bounds();
        logger.addLog(window, "准备点击的元素位置: (" + bounds.centerX() + "," + bounds.centerY() + ")");

        // 策略1: 使用safeClick点击元素
        logger.addLog(window, "使用safeClick点击商品元素");
        if (safeClick(element)) {
            sleep(this.config.waitTimes.click);

            // 验证是否成功进入商品详情页
            if (this.verifyProductDetailPage(window)) {
                logger.addLog(window, "✅ 成功进入商品详情页");
                return true;
            } else {
                logger.addLog(window, "safeClick未能进入商品详情页，尝试其他方式");
            }
        } else {
            logger.addLog(window, "safeClick失败，尝试坐标点击");
        }

        // 策略2: 直接坐标点击元素中心
        logger.addLog(window, "尝试坐标点击元素中心: (" + bounds.centerX() + "," + bounds.centerY() + ")");
        click(bounds.centerX(), bounds.centerY());
        sleep(this.config.waitTimes.click);

        // 验证是否成功进入商品详情页
        if (this.verifyProductDetailPage(window)) {
            logger.addLog(window, "✅ 成功进入商品详情页");
            return true;
        } else {
            logger.addLog(window, "坐标点击元素中心未成功，尝试点击上方区域");
        }

        // 策略3: 点击元素上方区域（可能是商品图片）
        var imageY = bounds.centerY() - 80;
        logger.addLog(window, "尝试点击元素上方区域: (" + bounds.centerX() + "," + imageY + ")");
        click(bounds.centerX(), imageY);
        sleep(this.config.waitTimes.click);

        // 验证是否成功进入商品详情页
        if (this.verifyProductDetailPage(window)) {
            logger.addLog(window, "✅ 成功进入商品详情页");
            return true;
        } else {
            logger.addLog(window, "❌ 所有点击策略都未能进入商品详情页");
            return false;
        }

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
ProductFavorite.prototype.verifyProductDetailPage = function(window) {
    try {
        logger.addLog(window, "验证是否进入商品详情页...");
        sleep(3000); // 等待页面加载

        // 检查商品详情页的特征元素
        var detailPageIndicators = [
            "立即购买",
            "马上抢",
            "立即抢购",
            "现在购买",
            "立即下单",
            "去购买",
            "购买",
            "收藏",
            "加入收藏",
            "商品详情",
            "规格参数",
            "商品评价"
        ];

        for (var i = 0; i < detailPageIndicators.length; i++) {
            if (text(detailPageIndicators[i]).findOne(1000)) {
                logger.addLog(window, "检测到商品详情页元素: " + detailPageIndicators[i]);
                return true;
            }
        }

        // 检查是否还在主页或列表页（如果是，说明没有成功进入详情页）
        var homePageIndicators = [
            "搜索",
            "首页",
            "分类",
            "个人中心"
        ];

        for (var j = 0; j < homePageIndicators.length; j++) {
            if (text(homePageIndicators[j]).findOne(500)) {
                logger.addLog(window, "检测到主页元素，可能没有进入商品详情页: " + homePageIndicators[j]);
                return false;
            }
        }

        logger.addLog(window, "无法确定是否在商品详情页，继续执行");
        return true;

    } catch (e) {
        logger.addLog(window, "验证商品详情页失败: " + e.message);
        return false;
    }
};

/**
 * 收藏商品
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否收藏成功
 */
ProductFavorite.prototype.favoriteProduct = function(window) {
    logger.addLog(window, "进入商品详情页，开始收藏...");

    sleep(this.config.waitTimes.pageLoad);

    // 首先检查商品是否已经收藏过
    if (this.isProductAlreadyFavorited(window)) {
        logger.addLog(window, "商品已收藏过，跳过收藏");
        return false;
    }

    // 先触发规格选择（参考购买逻辑）
    logger.addLog(window, "先触发规格选择以确保商品有规格信息...");
    if (this.triggerSpecificationSelection(window)) {
        logger.addLog(window, "规格选择已触发，现在开始收藏");
    } else {
        logger.addLog(window, "规格选择触发失败，继续尝试收藏");
    }

    // 寻找收藏按钮
    for (var i = 0; i < this.favoriteButtons.length; i++) {
        var favoriteBtn = text(this.favoriteButtons[i]).findOne(2000);
        if (favoriteBtn) {
            logger.addLog(window, "找到收藏按钮: " + this.favoriteButtons[i]);

            if (safeClick(favoriteBtn)) {
                sleep(1500);

                // 检查是否出现收藏成功的提示或者按钮状态变化
                if (this.verifyFavoriteSuccess(window)) {
                    logger.addLog(window, "✅ 商品收藏成功");
                    return true;
                } else {
                    logger.addLog(window, "收藏按钮点击后未确认成功");
                }
            }
        }
    }

    // 尝试寻找心形图标收藏按钮
    logger.addLog(window, "尝试寻找心形收藏按钮...");
    var heartButtons = descContains("收藏").find();
    for (var j = 0; j < heartButtons.length; j++) {
        var heartBtn = heartButtons[j];
        if (safeClick(heartBtn)) {
            logger.addLog(window, "点击心形收藏按钮");
            sleep(1500);

            if (this.verifyFavoriteSuccess(window)) {
                logger.addLog(window, "✅ 商品收藏成功");
                return true;
            }
        }
    }

    // 尝试右上角区域点击（收藏按钮通常在右上角）
    logger.addLog(window, "尝试点击右上角收藏区域...");
    var screenWidth = device.width;
    click(screenWidth - 80, 150);
    sleep(1500);

    if (this.verifyFavoriteSuccess(window)) {
        logger.addLog(window, "✅ 商品收藏成功");
        return true;
    }

    logger.addLog(window, "❌ 未找到收藏按钮或收藏失败");
    return false;
};

/**
 * 触发规格选择（参考购买逻辑）
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否成功触发规格选择
 */
ProductFavorite.prototype.triggerSpecificationSelection = function(window) {
    try {
        logger.addLog(window, "尝试触发规格选择...");

        // 寻找购买按钮（参考购买模块的逻辑）
        var buyButtons = [
            "立即购买",
            "马上抢",
            "立即抢购",
            "现在购买",
            "立即下单",
            "去购买",
            "购买"
        ];

        for (var i = 0; i < buyButtons.length; i++) {
            var buyBtn = text(buyButtons[i]).findOne(1000);
            if (buyBtn) {
                logger.addLog(window, "找到购买按钮: " + buyButtons[i] + "，点击触发规格选择");

                if (safeClick(buyBtn)) {
                    sleep(2000); // 等待规格选择页面弹出

                    // 检查是否弹出了规格选择页面
                    var specificationPageVisible = this.checkSpecificationPageVisible(window);
                    if (specificationPageVisible) {
                        logger.addLog(window, "规格选择页面已弹出，关闭页面");
                        // 关闭规格选择页面
                        this.closeSpecificationPage(window);
                        return true;
                    } else {
                        logger.addLog(window, "未检测到规格选择页面，可能直接进入了支付流程");
                        // 如果直接进入支付流程，返回上一页
                        back();
                        sleep(1000);
                        return true;
                    }
                }
            }
        }

        // 尝试右下角点击（参考购买模块的备用策略）
        logger.addLog(window, "尝试点击右下角购买区域触发规格选择...");
        var screenWidth = device.width;
        var screenHeight = device.height;
        click(screenWidth - 100, screenHeight - 150);
        sleep(2000);

        // 检查是否弹出了规格选择页面
        var specificationPageVisible = this.checkSpecificationPageVisible(window);
        if (specificationPageVisible) {
            logger.addLog(window, "规格选择页面已弹出，关闭页面");
            this.closeSpecificationPage(window);
            return true;
        } else {
            logger.addLog(window, "未检测到规格选择页面，可能直接进入了支付流程");
            // 如果直接进入支付流程，返回上一页
            back();
            sleep(1000);
            return true;
        }

    } catch (e) {
        logger.addLog(window, "触发规格选择失败: " + e.message);
        return false;
    }
};

/**
 * 检查规格选择页面是否可见
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 规格选择页面是否可见
 */
ProductFavorite.prototype.checkSpecificationPageVisible = function(window) {
    try {
        // 检查常见的规格选择页面元素
        var specificationKeywords = [
            "选择规格",
            "规格选择",
            "选择颜色",
            "选择尺寸",
            "选择型号",
            "请选择",
            "颜色分类",
            "尺码",
            "款式"
        ];

        for (var i = 0; i < specificationKeywords.length; i++) {
            if (textContains(specificationKeywords[i]).findOne(500)) {
                logger.addLog(window, "检测到规格选择页面关键词: " + specificationKeywords[i]);
                return true;
            }
        }

        // 检查是否有"确定"或"确认"按钮（通常在规格选择页面底部）
        if (text("确定").findOne(500) || text("确认").findOne(500)) {
            logger.addLog(window, "检测到确定/确认按钮，可能是规格选择页面");
            return true;
        }

        return false;
    } catch (e) {
        logger.addLog(window, "检查规格选择页面失败: " + e.message);
        return false;
    }
};

/**
 * 关闭规格选择页面
 * @param {Object} window 悬浮窗对象
 */
ProductFavorite.prototype.closeSpecificationPage = function(window) {
    try {
        logger.addLog(window, "使用返回键关闭规格选择页面...");

        // 使用返回键关闭规格选择页面（最安全的方式）
        back();
        sleep(1500); // 等待页面关闭

        logger.addLog(window, "规格选择页面已关闭");
    } catch (e) {
        logger.addLog(window, "关闭规格选择页面失败: " + e.message);
    }
};

/**
 * 验证收藏是否成功
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否收藏成功
 */
ProductFavorite.prototype.verifyFavoriteSuccess = function(window) {
    try {
        logger.addLog(window, "验证收藏是否成功...");

        // 等待一下让页面状态更新
        sleep(2000);

        // 首先检查是否出现收藏成功的提示文字
        var successTexts = [
            "收藏成功",
            "已收藏",
            "加入收藏成功",
            "收藏完成",
            "已添加到收藏"
        ];

        for (var i = 0; i < successTexts.length; i++) {
            if (textContains(successTexts[i]).findOne(1000)) {
                logger.addLog(window, "✅ 检测到收藏成功提示: " + successTexts[i]);
                return true;
            }
        }

        // 检查收藏按钮是否变成已收藏状态
        var favoritedTexts = [
            "已收藏",
            "取消收藏"
        ];

        for (var j = 0; j < favoritedTexts.length; j++) {
            if (text(favoritedTexts[j]).findOne(1000)) {
                logger.addLog(window, "✅ 检测到收藏状态变化: " + favoritedTexts[j]);
                return true;
            }
        }

        // 检查是否有收藏失败的提示
        var failureTexts = [
            "收藏失败",
            "网络错误",
            "请稍后重试",
            "操作失败"
        ];

        for (var k = 0; k < failureTexts.length; k++) {
            if (textContains(failureTexts[k]).findOne(500)) {
                logger.addLog(window, "❌ 检测到收藏失败提示: " + failureTexts[k]);
                return false;
            }
        }

        // 如果没有明确的成功或失败提示，返回false（更严格的验证）
        logger.addLog(window, "❌ 未检测到明确的收藏成功标识");
        return false;

    } catch (e) {
        logger.addLog(window, "验证收藏结果失败: " + e.message);
        return false; // 出错时返回失败
    }
};

/**
 * 检查商品是否已经收藏过（通过检测页面上是否有"已收藏"文字）
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否已收藏
 */
ProductFavorite.prototype.isProductAlreadyFavorited = function(window) {
    try {
        logger.addLog(window, "检查商品是否已收藏...");

        // 检查页面上是否有"已收藏"相关文字
        var favoritedTexts = [
            "已收藏",
            "取消收藏"
        ];

        for (var i = 0; i < favoritedTexts.length; i++) {
            if (text(favoritedTexts[i]).findOne(1000)) {
                logger.addLog(window, "检测到已收藏标识: " + favoritedTexts[i]);
                return true;
            }
        }

        logger.addLog(window, "商品未收藏，可以进行收藏操作");
        return false;
    } catch (e) {
        logger.addLog(window, "检查收藏状态失败: " + e.message);
        return false;
    }
};

/**
 * 检查位置是否已经点击过
 * @param {Object} position 位置信息 {centerX, centerY, text}
 * @returns {boolean} 是否已点击过
 */
ProductFavorite.prototype.isPositionClicked = function(position) {
    var threshold = 50; // 位置阈值，像素

    for (var i = 0; i < this.clickedPositions.length; i++) {
        var clickedPos = this.clickedPositions[i];
        var distance = Math.sqrt(
            Math.pow(position.centerX - clickedPos.centerX, 2) +
            Math.pow(position.centerY - clickedPos.centerY, 2)
        );

        if (distance < threshold) {
            return true;
        }
    }
    return false;
};



/**
 * 添加已点击位置记录
 * @param {Object} position 位置信息 {centerX, centerY, text}
 */
ProductFavorite.prototype.addClickedPosition = function(position) {
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
ProductFavorite.prototype.clearClickedPositions = function() {
    this.clickedPositions = [];
    this.currentScrollPosition = 0;
    console.log("已清除所有位置记录");
};



module.exports = ProductFavorite;
