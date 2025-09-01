// 收藏结算功能模块入口（拆分版）
// 将原有大文件按职责拆分到 modules/favorite-settlement/* 子文件

const { PDD_CONFIG } = require('../config/app-config.js');
const { GlobalStopManager, safeClick } = require('../utils/common.js');
const logger = require('../utils/logger.js');
const NavigationHelper = require('../utils/navigation.js');
const FavoriteNavigation = require('../utils/navigation/favorite-navigation.js');
const { waitTimeManager } = require('../utils/wait-time-manager.js');

// 子模块
const Preclear = require('./favorite-settlement/preclear.js');
const Product = require('./favorite-settlement/product.js');
const Popup = require('./favorite-settlement/popup.js');
const Selection = require('./favorite-settlement/selection.js');
const Filter = require('./favorite-settlement/filter.js');

function FavoriteSettlement() {
	this.config = PDD_CONFIG;
	this.navigationHelper = new NavigationHelper();
	this.favoriteNavigation = new FavoriteNavigation();
	this.processedSignatures = new Set();
	this.selectedSignatures = new Set();
	this.lastBottomSignature = null;
}

FavoriteSettlement.prototype.execute = function(window, userName) {
	try {
		GlobalStopManager.startScript();
		logger.addLog(window, "=== 开始收藏结算功能 ===");
		logger.addLog(window, "用户: " + userName);
		if (GlobalStopManager.isStopRequested()) return false;
		if (!this.navigationHelper.launchApp(window)) {
			logger.addLog(window, "无法打开拼多多APP，请检查是否已安装");
			return false;
		}
		if (!this.favoriteNavigation.goToFavoritePage(window)) {
			logger.addLog(window, "无法导航到收藏页面");
			return false;
		}
		logger.addLog(window, "✅ 成功导航到收藏页面");
		logger.addLog(window, "开始预处理：点击“已选”->“清空选择”，并回到顶部...");
		this.preClearSelections(window);
		logger.addLog(window, "开始勾选收藏商品...");
		this.autoSelectFavoriteProducts(window);
		logger.addLog(window, "开始价格筛选...");
		this.filterSelectedProducts(window);
		logger.addLog(window, "=== 收藏结算功能完成 ===");
		return true;
	} catch (e) {
		logger.addLog(window, "收藏结算流程出错: " + e.message);
		return false;
	} finally {
		GlobalStopManager.endScript();
	}
};

// 设备信息
FavoriteSettlement.prototype.getDeviceInfo = function() {
	return Product.getDeviceInfo();
};

// 店铺名判定/检出/签名
FavoriteSettlement.prototype.isStoreNameText = function(text) {
	return Product.isStoreNameText(text);
};
FavoriteSettlement.prototype.detectStoreNameInChild = function(child) {
	return Product.detectStoreNameInChild.call(this, child);
};
FavoriteSettlement.prototype.buildSignature = function(info) {
	return Product.buildSignature(info);
};

// 预处理与回顶
FavoriteSettlement.prototype.preClearSelections = function(window) {
	return Preclear.preClearSelections.call(this, window);
};
FavoriteSettlement.prototype.scrollToTop = function(window) {
	return Preclear.scrollToTop.call(this, window);
};

// 规格弹窗
FavoriteSettlement.prototype.checkAndClosePopup = function(window) {
	return Popup.checkAndClosePopup.call(this, window);
};

// 商品识别/抓取
FavoriteSettlement.prototype.getProductImagesWithShopNames = function(window) {
	return Product.getProductImagesWithShopNames.call(this, window);
};
FavoriteSettlement.prototype.getProductItemsFromUI = function(window) {
	return Product.getProductItemsFromUI.call(this, window);
};
FavoriteSettlement.prototype.extractProductInfo = function(container, currentStoreName) {
	return Product.extractProductInfo.call(this, container, currentStoreName);
};

// 自动选择
FavoriteSettlement.prototype.autoSelectFavoriteProducts = function(window) {
	return Selection.autoSelectFavoriteProducts.call(this, window);
};

// 价格筛选
FavoriteSettlement.prototype.filterSelectedProducts = function(window) {
	return Filter.filterSelectedProducts.call(this, window);
};
FavoriteSettlement.prototype.processProducts = function(window) {
	return Filter.processProducts.call(this, window);
};
FavoriteSettlement.prototype.processProductsOnce = function(window, priceThreshold) {
	return Filter.processProductsOnce.call(this, window, priceThreshold);
};

// 辅助：滑动封装（为了兼容原有接口）
function swipe(startX, startY, endX, endY, duration) {
	gesture(duration, [startX, startY], [endX, endY]);
}

module.exports = FavoriteSettlement;
