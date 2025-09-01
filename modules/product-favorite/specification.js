const { safeClick } = require('../../utils/common.js');
const logger = require('../../utils/logger.js');
const { waitTimeManager } = require('../../utils/wait-time-manager.js');

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
                            waitTimeManager.wait('pageStable');
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
            waitTimeManager.wait('specification');

            // 检查弹出的规格选择页面是否包含禁止关键词
            if (this.keywordsChecker.containsForbiddenKeywords(window, "规格选择页面", 1500)) {
                logger.addLog(window, "❌ 规格选择页面包含禁止关键词，取消收藏");
                back(); // 返回上一页
                return false;
            }

            // 检查是否弹出了规格选择页面
            var specificationPageVisible = this.checkSpecificationPageVisible(window);
            if (specificationPageVisible) {
                logger.addLog(window, "规格选择页面已弹出，关闭页面");
                this.closeSpecificationPage(window);
                return true;
            } else {
                logger.addLog(window, "未检测到规格选择页面，可能直接进入支付流程");
                // 如果直接进入支付流程，返回上一页
                back();
                waitTimeManager.wait('pageStable');
                return true;
            }

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

            logger.addLog(window, "规格选择页面已关闭");
        } catch (e) {
            logger.addLog(window, "关闭规格选择页面失败: " + e.message);
        }
    }
}; 