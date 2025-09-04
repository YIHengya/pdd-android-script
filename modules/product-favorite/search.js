const { parsePrice, safeClick, scrollWithRandomCoords, GlobalStopManager } = require('../../utils/common.js');
const logger = require('../../utils/logger.js');
const { waitTimeManager } = require('../../utils/wait-time-manager.js');

module.exports = {
    /**
     * 寻找符合条件的商品
     * @param {Object} window 悬浮窗对象
     * @param {Object} priceRange 价格区间对象 {min: number, max: number}
     * @param {boolean} forceScroll 是否强制滚动寻找新商品
     * @returns {Object|null} 找到的商品信息，包含{text, price}，未找到返回null
     */
    findProducts: function(window, priceRange, forceScroll) {
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
                waitTimeManager.wait('scroll');
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
                var textValue = element.text();

                if (!textValue || textValue.trim() === "") continue;

                var elementPosition = {
                    centerX: element.bounds().centerX(),
                    centerY: element.bounds().centerY(),
                    text: textValue
                };

                // 检查是否已经点击过这个位置
                if (this.isPositionClicked(elementPosition)) {
                    continue;
                }

                // 检查价格模式
                for (var j = 0; j < this.config.pricePatterns.length; j++) {
                    if (this.config.pricePatterns[j].test(textValue)) {
                        var price = parsePrice(textValue);
                        if (price !== null && price > 0 && price >= priceRange.min && price <= priceRange.max) {

                            // 新增：过滤促销/满减等非实际价格文案
                            if (this.isPromotionalPriceText(textValue)) {
                                logger.addLog(window, "跳过促销文案: " + textValue);
                                continue;
                            }

                            // 过滤掉搜索框和其他非商品区域的文本
                            if (this.isSearchBoxOrNonProductArea(element, textValue)) {
                                logger.addLog(window, "跳过搜索框或非商品区域: " + textValue);
                                continue;
                            }

                            logger.addLog(window, "找到新商品: " + textValue + " (价格: " + price + " 元)");
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
                                        text: textValue,
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
            waitTimeManager.wait('scroll');
            scrollCount++;
            this.currentScrollPosition++;
        }

        logger.addLog(window, "未找到符合条件的新商品");
        return null;
    },

    /**
     * 检查是否是搜索框或非商品区域
     * @param {Object} element 元素对象
     * @param {string} text 文本内容
     * @returns {boolean} 是否是搜索框或非商品区域
     */
    isSearchBoxOrNonProductArea: function(element, text) {
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
    },

    /**
     * 过滤促销/满减等非实际价格文案
     * @param {string} text 文本内容
     * @returns {boolean} 是否属于促销文案
     */
    isPromotionalPriceText: function(text) {
        try {
            var t = String(text || '');
            var promoKeywords = [
                '立减', '满减', '每满', '优惠券', '领券', '券后', '返', '返现', '红包', '补贴', '省', '直降', '折',
                '秒杀', '特价', '活动', '赠', '加价购', '预估'
            ];
            for (var i = 0; i < promoKeywords.length; i++) {
                if (t.indexOf(promoKeywords[i]) !== -1) return true;
            }
            // 屏蔽销量/人数等数字，如“1.6万人拼”、“500件”、“100人付款”
            if (/[万万人件人]$/.test(t) || /(月销|人付款|人已拼|万人拼|销量)/.test(t)) return true;
            return false;
        } catch (e) {
            return false;
        }
    },

    /**
     * 寻找可点击的商品区域
     * @param {Object} window 悬浮窗对象
     * @param {Object} priceElement 价格元素
     * @returns {Object|null} 可点击的元素
     */
    findClickableProductArea: function(window, priceElement) {
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
    },

    /**
     * 寻找价格附近的图片区域（更精确的匹配）
     * @param {Object} window 悬浮窗对象
     * @param {Object} priceBounds 价格元素边界
     * @returns {Object|null} 图片区域元素
     */
    findImageAreaNearPrice: function(window, priceBounds) {
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
    },

    /**
     * 点击商品
     * @param {Object} window 悬浮窗对象
     * @param {Object} element 商品元素
     * @returns {boolean} 是否点击成功并进入详情页
     */
    clickProduct: function(window, element) {
        try {
            logger.addLog(window, "尝试点击商品...");

            var bounds = element.bounds();
            logger.addLog(window, "准备点击的元素位置: (" + bounds.centerX() + "," + bounds.centerY() + ")");

            // 策略1: 使用safeClick点击元素
            logger.addLog(window, "使用safeClick点击商品元素");
            if (safeClick(element)) {
                waitTimeManager.wait('click');

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
            waitTimeManager.wait('click');

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
            waitTimeManager.wait('click');

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
    }
}; 