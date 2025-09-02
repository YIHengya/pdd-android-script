// 商品收藏功能模块（拆分版入口）
// 参考收藏结算模块的拆分方式，将职责拆分到 modules/product-favorite/* 子文件

const { PDD_CONFIG } = require('../config/app-config.js');
const { GlobalStopManager } = require('../utils/common.js');
const logger = require('../utils/logger.js');
const ApiClient = require('../utils/api-client.js');
const ProductInfoExtractor = require('../utils/product-info.js');
const NavigationHelper = require('../utils/navigation.js');
const ForbiddenKeywordsChecker = require('../utils/forbidden-keywords-checker.js');
const { waitTimeManager } = require('../utils/wait-time-manager.js');

// 子模块
const Session = require('./product-favorite/session.js');
const Search = require('./product-favorite/search.js');
const Detail = require('./product-favorite/detail.js');
const Specification = require('./product-favorite/specification.js');
const Favorite = require('./product-favorite/favorite.js');

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

        // 保存价格区间以供后续规格选择使用
        this.currentPriceRange = priceRange;

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
                waitTimeManager.wait('pageStable');
            } else {
                logger.addLog(window, "❌ 第 " + (i + 1) + " 件商品收藏失败");
                // 收藏失败时返回主页重试
                this.navigationHelper.goToHomePage(window);
                waitTimeManager.wait('pageStable');
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

// 会话
ProductFavorite.prototype.resetSession = function() {
    return Session.resetSession.call(this);
};
ProductFavorite.prototype.clearClickedPositions = function() {
    return Session.clearClickedPositions.call(this);
};
ProductFavorite.prototype.addClickedPosition = function(position) {
    return Session.addClickedPosition.call(this, position);
};
ProductFavorite.prototype.isPositionClicked = function(position) {
    return Session.isPositionClicked.call(this, position);
};

// 搜索/点击
ProductFavorite.prototype.findProducts = function(window, priceRange, forceScroll) {
    return Search.findProducts.call(this, window, priceRange, forceScroll);
};
ProductFavorite.prototype.isSearchBoxOrNonProductArea = function(element, text) {
    return Search.isSearchBoxOrNonProductArea.call(this, element, text);
};
ProductFavorite.prototype.findClickableProductArea = function(window, priceElement) {
    return Search.findClickableProductArea.call(this, window, priceElement);
};
ProductFavorite.prototype.findImageAreaNearPrice = function(window, priceBounds) {
    return Search.findImageAreaNearPrice.call(this, window, priceBounds);
};
ProductFavorite.prototype.clickProduct = function(window, element) {
    return Search.clickProduct.call(this, window, element);
};

// 详情校验
ProductFavorite.prototype.verifyProductDetailPage = function(window) {
    return Detail.verifyProductDetailPage.call(this, window);
};

// 规格弹窗
ProductFavorite.prototype.triggerSpecificationSelection = function(window) {
    return Specification.triggerSpecificationSelection.call(this, window);
};
ProductFavorite.prototype.checkSpecificationPageVisible = function(window) {
    return Specification.checkSpecificationPageVisible.call(this, window);
};
ProductFavorite.prototype.closeSpecificationPage = function(window) {
    return Specification.closeSpecificationPage.call(this, window);
};

// 收藏操作
ProductFavorite.prototype.favoriteProduct = function(window) {
    return Favorite.favoriteProduct.call(this, window);
};
ProductFavorite.prototype.verifyFavoriteSuccess = function(window) {
    return Favorite.verifyFavoriteSuccess.call(this, window);
};
ProductFavorite.prototype.isProductAlreadyFavorited = function(window) {
    return Favorite.isProductAlreadyFavorited.call(this, window);
};

module.exports = ProductFavorite;
