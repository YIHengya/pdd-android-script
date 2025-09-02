const logger = require('../../utils/logger.js');
const { waitTimeManager } = require('../../utils/wait-time-manager.js');

module.exports = {
	/**
	 * 验证是否成功进入商品详情页
	 * @param {Object} window 悬浮窗对象
	 * @returns {boolean} 是否在商品详情页
	 */
	verifyProductDetailPage: function(window) {
		try {
			logger.addLog(window, "验证是否进入商品详情页...");
			waitTimeManager.wait('long'); // 等待页面加载

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
	}
}; 