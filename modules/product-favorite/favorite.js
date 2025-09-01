const { safeClick } = require('../../utils/common.js');
const logger = require('../../utils/logger.js');
const { waitTimeManager } = require('../../utils/wait-time-manager.js');

module.exports = {
    /**
     * 收藏商品
     * @param {Object} window 悬浮窗对象
     * @returns {boolean} 是否收藏成功
     */
    favoriteProduct: function(window) {
        logger.addLog(window, "进入商品详情页，开始收藏...");

        waitTimeManager.wait('pageLoad');

        // 首先检查商品是否已经收藏过
        if (this.isProductAlreadyFavorited(window)) {
            logger.addLog(window, "商品已收藏过，跳过收藏");
            return false;
        }

        // 先触发规格选择（参考购买逻辑）
        logger.addLog(window, "先触发规格选择以确保商品有规格信息...");
        var specResult = this.triggerSpecificationSelection(window);
        if (specResult === false) {
            // 如果规格选择返回false，可能是因为检测到禁用词，应该终止收藏
            logger.addLog(window, "❌ 规格选择失败（可能包含禁用词），终止收藏流程");
            return false;
        } else if (specResult === true) {
            logger.addLog(window, "规格选择已触发，现在开始收藏");
        } else {
            logger.addLog(window, "规格选择状态未知，继续尝试收藏");
        }

        // 寻找收藏按钮
        for (var i = 0; i < this.favoriteButtons.length; i++) {
            var favoriteBtn = text(this.favoriteButtons[i]).findOne(2000);
            if (favoriteBtn) {
                logger.addLog(window, "找到收藏按钮: " + this.favoriteButtons[i]);

                if (safeClick(favoriteBtn)) {
                    waitTimeManager.wait('favorite');

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
                waitTimeManager.wait('favorite');

                if (this.verifyFavoriteSuccess(window)) {
                    logger.addLog(window, "✅ 商品收藏成功");
                    return true;
                }
            }
        }

        logger.addLog(window, "❌ 未找到收藏按钮或收藏失败");
        return false;
    },

    /**
     * 验证收藏是否成功
     * @param {Object} window 悬浮窗对象
     * @returns {boolean} 是否收藏成功
     */
    verifyFavoriteSuccess: function(window) {
        try {
            logger.addLog(window, "验证收藏是否成功...");

            // 等待一下让页面状态更新
            waitTimeManager.wait('verification');

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
    },

    /**
     * 检查商品是否已经收藏过（通过检测页面上是否有"已收藏"文字）
     * @param {Object} window 悬浮窗对象
     * @returns {boolean} 是否已收藏
     */
    isProductAlreadyFavorited: function(window) {
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
    }
}; 