const { safeClick } = require('../../utils/common.js');
const logger = require('../../utils/logger.js');
const { waitTimeManager } = require('../../utils/wait-time-manager.js');
const StyleSize = require('./style-size.js');

module.exports = {
	/**
	 * 触发规格选择（参考购买逻辑）
	 * @param {Object} window 悬浮窗对象
	 * @returns {boolean} 是否成功触发规格选择
	 */
	triggerSpecificationSelection: function(window) {
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
						waitTimeManager.wait('specification'); // 等待规格选择页面弹出

						// 检查弹出的规格选择页面是否包含禁止关键词
						if (this.keywordsChecker.containsForbiddenKeywords(window, "规格选择页面", 1500)) {
							logger.addLog(window, "❌ 规格选择页面包含禁止关键词，取消收藏");
							back(); // 返回上一页
							return false;
						}

						// 不再判定规格选择页面，改为检测支付相关元素并进行选择规格
						logger.addLog(window, "已触发规格选择，检查是否出现支付相关元素...");
						var hasPayment = textContains("立即支付").findOne(800) ||
									 	textContains("更换支付方式").findOne(800) ||
									 	textContains("支付宝").findOne(800) ||
									 	textContains("微信支付").findOne(800);
						if (hasPayment) {
							logger.addLog(window, "检测到支付元素，开始点开主图并按价格规则选择规格...");
						} else {
							logger.addLog(window, "未检测到支付元素，仍尝试选择规格以提高成功率...");
						}
						var selected = false;
						if (this.currentPriceRange && typeof this.currentPriceRange.min === 'number' && typeof this.currentPriceRange.max === 'number') {
							selected = StyleSize.selectWithinRange(window, this.currentPriceRange.min, this.currentPriceRange.max, 60);
						} else if (this.currentPriceRange && typeof this.currentPriceRange.max === 'number') {
							selected = StyleSize.selectUntilBelow(window, this.currentPriceRange.max, 60);
						} else {
							selected = StyleSize.selectCheapest(window, 55);
						}
						logger.addLog(window, selected ? "✅ 选择规格完成" : "⚠️ 未能完成选择，尝试关闭弹窗");
						waitTimeManager.wait('medium');
						this.closeSpecificationPage(window);
						return true;
					}
				}
			}

			// 尝试右下角点击（参考购买模块的备用策略）
			logger.addLog(window, "尝试点击右下角购买区域触发规格选择...");
			var screenWidth = device.width;
			var screenHeight = device.height;
			click(screenWidth - 100, screenHeight - 150);
			waitTimeManager.wait('specification');

			// 检查弹出的规格选择页面是否包含禁止关键词
			if (this.keywordsChecker.containsForbiddenKeywords(window, "规格选择页面", 1500)) {
				logger.addLog(window, "❌ 规格选择页面包含禁止关键词，取消收藏");
				back(); // 返回上一页
				return false;
			}

			// 不再判定规格选择页面，改为检测支付相关元素并进行选择规格
			logger.addLog(window, "已触发规格选择，检查是否出现支付相关元素...");
			var hasPayment = textContains("立即支付").findOne(800) ||
						 	textContains("更换支付方式").findOne(800) ||
						 	textContains("支付宝").findOne(800) ||
						 	textContains("微信支付").findOne(800);
			if (hasPayment) {
				logger.addLog(window, "检测到支付元素，开始点开主图并按价格规则选择规格...");
			} else {
				logger.addLog(window, "未检测到支付元素，仍尝试选择规格以提高成功率...");
			}
			var selected = false;
			if (this.currentPriceRange && typeof this.currentPriceRange.min === 'number' && typeof this.currentPriceRange.max === 'number') {
				selected = StyleSize.selectWithinRange(window, this.currentPriceRange.min, this.currentPriceRange.max, 60);
			} else if (this.currentPriceRange && typeof this.currentPriceRange.max === 'number') {
				selected = StyleSize.selectUntilBelow(window, this.currentPriceRange.max, 60);
			} else {
				selected = StyleSize.selectCheapest(window, 55);
			}
			logger.addLog(window, selected ? "✅ 选择规格完成" : "⚠️ 未能完成选择，尝试关闭弹窗");
			this.closeSpecificationPage(window);
			return true;

		} catch (e) {
			logger.addLog(window, "触发规格选择失败: " + e.message);
			return false;
		}
	},

	/**
	 * 检查规格选择页面是否可见
	 * @param {Object} window 悬浮窗对象
	 * @returns {boolean} 规格选择页面是否可见
	 */
	checkSpecificationPageVisible: function(window) {
		try {
			// 仅以“更换支付方式”作为是否仍在规格/支付弹层的标志
			if (textContains("更换支付方式").findOne(500)) {
				logger.addLog(window, "检测到“更换支付方式”，仍处于规格选择/支付弹层");
				return true;
			}
			return false;
		} catch (e) {
			logger.addLog(window, "检查规格选择页面失败: " + e.message);
			return false;
		}
	},

	/**
	 * 关闭规格选择页面
	 * @param {Object} window 悬浮窗对象
	 */
	closeSpecificationPage: function(window) {
		try {
			logger.addLog(window, "使用返回键关闭规格选择页面...");

			// 使用返回键关闭规格选择页面（最安全的方式）
			back();
			waitTimeManager.wait('medium'); // 等待页面关闭

			// 如果仍处于规格选择/支付弹层，执行二次关闭
			if (this.checkSpecificationPageVisible(window)) {
				logger.addLog(window, "仍检测到规格选择/支付弹层，执行二次关闭...");
				back();
				waitTimeManager.wait('medium');
			}

			logger.addLog(window, "规格选择页面已关闭");
		} catch (e) {
			logger.addLog(window, "关闭规格选择页面失败: " + e.message);
		}
	}
}; 