// 商品信息获取模块
// 从拼多多APP中提取商品信息

const { PDD_CONFIG } = require('../config/app-config.js');
const { parsePrice, safeClick } = require('./common.js');
const logger = require('./logger.js');

/**
 * 商品信息获取器构造函数
 */
function ProductInfoExtractor() {
    this.config = PDD_CONFIG;
}

/**
 * 获取当前商品页面的详细信息
 * @param {Object} window 悬浮窗对象
 * @param {string} userName 用户名
 * @returns {Object|null} 商品信息对象或null
 */
ProductInfoExtractor.prototype.extractProductInfo = function(window, userName) {
    try {
        logger.addLog(window, "开始提取商品信息...");
        
        // 等待页面加载
        sleep(this.config.waitTimes.pageLoad);
        
        var productInfo = {
            user_name: userName,
            shop_name: this.getShopName(window),
            product_url: this.getProductUrl(window),
            product_price: this.getProductPrice(window),
            product_sku: this.getProductSku(window)
        };
        
        // 验证必要信息是否获取成功
        if (!productInfo.shop_name) {
            logger.addLog(window, "❌ 无法获取店铺名称");
            return null;
        }
        
        if (!productInfo.product_url) {
            logger.addLog(window, "❌ 无法获取商品链接");
            return null;
        }
        
        if (!productInfo.product_price || productInfo.product_price <= 0) {
            logger.addLog(window, "❌ 无法获取有效的商品价格");
            return null;
        }
        
        logger.addLog(window, "✅ 商品信息提取成功");
        logger.addLog(window, "店铺: " + productInfo.shop_name);
        logger.addLog(window, "价格: " + productInfo.product_price + " 元");
        logger.addLog(window, "规格: " + (productInfo.product_sku || "默认规格"));
        
        return productInfo;
        
    } catch (e) {
        logger.addLog(window, "提取商品信息失败: " + e.message);
        return null;
    }
};

/**
 * 获取店铺名称
 * @param {Object} window 悬浮窗对象
 * @returns {string|null} 店铺名称
 */
ProductInfoExtractor.prototype.getShopName = function(window) {
    try {
        logger.addLog(window, "开始获取店铺名称...");

        // 只通过进店按钮和已拼按钮来获取店铺名称
        var shopName = this.findShopNameNearEnterButton(window);
        if (shopName) {
            logger.addLog(window, "通过进店按钮和已拼按钮找到店铺: " + shopName);
            return shopName;
        }

        logger.addLog(window, "未能通过进店按钮和已拼按钮找到店铺名称，使用默认店铺名称");
        return "未知店铺";

    } catch (e) {
        logger.addLog(window, "获取店铺名称失败: " + e.message);
        return "未知店铺";
    }
};

/**
 * 通过进店按钮附近查找店铺名称（简化版本）
 * @param {Object} window 悬浮窗对象
 * @returns {string|null} 店铺名称
 */
ProductInfoExtractor.prototype.findShopNameNearEnterButton = function(window) {
    try {
        logger.addLog(window, "查找进店按钮附近的店铺名称...");

        var maxScrolls = 3;
        var scrollCount = 0;

        while (scrollCount <= maxScrolls) {
            // 第一次不滑动，直接查找当前页面
            if (scrollCount > 0) {
                logger.addLog(window, "第 " + scrollCount + " 次下滑查找店铺...");
                scrollDown();
                sleep(8000);
            }

            // 优先使用精确的ID查找方法
            var shopName = this.findShopNameByEnterMallId(window);
            if (shopName) {
                logger.addLog(window, "通过tv_enter_mall ID找到店铺: " + shopName);
                return shopName;
            }

            // 备选方案：使用进店+已拼的方法
            var shopName = this.findShopNameNearEnterButtonAndYipin(window);
            if (shopName) {
                logger.addLog(window, "通过进店+已拼找到店铺: " + shopName);
                return shopName;
            }

            scrollCount++;
        }

        return null;
    } catch (e) {
        logger.addLog(window, "通过进店按钮查找店铺名称失败: " + e.message);
        return null;
    }
};

/**
 * 通过进店按钮和已拼信息查找店铺名称
 * @param {Object} window 悬浮窗对象
 * @returns {string|null} 店铺名称
 */
ProductInfoExtractor.prototype.findShopNameNearEnterButtonAndYipin = function(window) {
    try {
        var recyclerView = id("pdd").className("android.support.v7.widget.RecyclerView").scrollable(true).findOne(2000);
        if (!recyclerView) {
            logger.addLog(window, "未找到RecyclerView");
            return null;
        }

        logger.addLog(window, "找到RecyclerView，开始查找进店按钮和已拼信息...");
        var children = recyclerView.children();

        for (var i = 0; i < children.length; i++) {
            var child = children[i];

            // 使用更精确的ID查找进店按钮
            var enterButton = child.findOne(id("tv_enter_mall"));

            // 如果通过ID没找到，再尝试文本匹配作为备选方案
            if (!enterButton) {
                enterButton = child.findOne(text("进店"));
                if (!enterButton) {
                    enterButton = child.findOne(textContains("进店"));
                }
            }

            if (enterButton) {
                logger.addLog(window, "找到进店按钮，查找同级的已拼信息...");

                // 在同一个容器中查找"已拼XX件"
                var yipinElement = child.findOne(textMatches(/已拼\d+件/));
                if (yipinElement) {
                    logger.addLog(window, "找到已拼信息: " + yipinElement.text());

                    // 在这个容器中查找店铺名称
                    var shopName = this.findRealShopNameInContainer(window, child);
                    if (shopName) {
                        return shopName;
                    }
                }
            }
        }

        return null;
    } catch (e) {
        logger.addLog(window, "通过进店+已拼查找店铺名称失败: " + e.message);
        return null;
    }
};

/**
 * 使用精确的ID查找进店按钮并获取店铺信息
 * @param {Object} window 悬浮窗对象
 * @returns {string|null} 店铺名称
 */
ProductInfoExtractor.prototype.findShopNameByEnterMallId = function(window) {
    try {
        logger.addLog(window, "使用tv_enter_mall ID查找进店按钮...");

        var recyclerView = id("pdd").className("android.support.v7.widget.RecyclerView").findOne(2000);
        if (!recyclerView) {
            logger.addLog(window, "未找到RecyclerView");
            return null;
        }

        var children = recyclerView.children();
        logger.addLog(window, "RecyclerView子元素数量: " + children.length);

        for (var i = 0; i < children.length; i++) {
            var child = children[i];

            // 使用您提供的精确ID查找进店按钮
            var enterButton = child.findOne(id("tv_enter_mall"));

            if (enterButton) {
                logger.addLog(window, "通过tv_enter_mall ID找到进店按钮");

                // 在这个容器中查找店铺名称
                var shopName = this.findRealShopNameInContainer(window, child);
                if (shopName) {
                    logger.addLog(window, "通过tv_enter_mall ID成功获取店铺名称: " + shopName);
                    return shopName;
                }
            }
        }

        logger.addLog(window, "未通过tv_enter_mall ID找到有效的店铺信息");
        return null;
    } catch (e) {
        logger.addLog(window, "使用tv_enter_mall ID查找失败: " + e.message);
        return null;
    }
};
















/**
 * 在容器中查找真正的店铺名称
 * @param {Object} window 悬浮窗对象
 * @param {Object} container 容器元素
 * @returns {string|null} 店铺名称
 */
ProductInfoExtractor.prototype.findRealShopNameInContainer = function(window, container) {
    try {
        var allTexts = container.find(className("android.widget.TextView"));
        var candidates = [];

        for (var i = 0; i < allTexts.length; i++) {
            var textElement = allTexts[i];
            var text = textElement.text();

            if (text && text.trim().length > 0) {
                text = text.trim();

                // 排除明确的无关文本
                if (this.isRealShopName(text)) {
                    candidates.push(text);
                    logger.addLog(window, "候选店铺名称: " + text);
                }
            }
        }

        // 返回第一个找到的有效店铺名称
        if (candidates.length > 0) {
            logger.addLog(window, "选择店铺名称: " + candidates[0]);
            return candidates[0];
        }

        return null;
    } catch (e) {
        logger.addLog(window, "在容器中查找真正店铺名称失败: " + e.message);
        return null;
    }
};

/**
 * 验证是否是真正的店铺名称
 * @param {string} text 文本
 * @returns {boolean} 是否是真正的店铺名称
 */
ProductInfoExtractor.prototype.isRealShopName = function(text) {
    if (!text || typeof text !== 'string') {
        return false;
    }

    text = text.trim();

    // 基本长度检查
    if (text.length < 2 || text.length > 50) {
        return false;
    }

    // 排除明确的无效文本
    var invalidTexts = [
        "进店", "进店铺", "店铺首页", "查看店铺", "店铺详情",
        "更多店铺", "进入店铺", "访问店铺", "店铺主页", "店铺",
        "分享", "收藏", "客服", "搜索", "首页", "我的", "立即购买",
        "加入购物车", "现在购买", "马上抢", "去购买", "店铺保障"
    ];

    // 精确匹配无效文本
    for (var i = 0; i < invalidTexts.length; i++) {
        if (text === invalidTexts[i]) {
            return false;
        }
    }

    // 排除包含特定关键词的文本（更严格）
    var invalidKeywords = [
        "已拼", "粉丝", "件", "万", "评价", "好评", "优惠", "%",
        "元", "￥", ".", "立即", "马上", "现在", "去", "加入"
    ];
    for (var i = 0; i < invalidKeywords.length; i++) {
        if (text.indexOf(invalidKeywords[i]) !== -1) {
            return false;
        }
    }

    return true;
};

/**
 * 验证店铺名称是否有效
 * @param {string} shopName 店铺名称
 * @returns {boolean} 是否有效
 */
ProductInfoExtractor.prototype.isValidShopName = function(shopName) {
    if (!shopName || typeof shopName !== 'string') {
        return false;
    }

    shopName = shopName.trim();

    // 基本长度检查 - 放宽限制
    if (shopName.length < 1 || shopName.length > 100) {
        return false;
    }

    // 排除明确的无效文本和包含特定关键词的文本
    var invalidTexts = [
        "进店", "进店铺", "店铺首页", "查看店铺", "店铺详情",
        "更多店铺", "进入店铺", "访问店铺", "店铺主页", "店铺",
        "分享", "收藏", "客服", "搜索", "首页", "我的", "立即购买",
        "加入购物车", "现在购买", "马上抢", "去购买", "店铺保障"
    ];

    // 精确匹配无效文本
    for (var i = 0; i < invalidTexts.length; i++) {
        if (shopName === invalidTexts[i]) {
            return false;
        }
    }

    // 排除包含特定关键词的文本
    var invalidKeywords = ["已拼", "粉丝", "件", "万", "评价", "好评"];
    for (var i = 0; i < invalidKeywords.length; i++) {
        if (shopName.indexOf(invalidKeywords[i]) !== -1) {
            return false;
        }
    }

    // 如果长度合适，就认为可能是有效的店铺名 - 非常宽松的验证
    if (shopName.length >= 2 && shopName.length <= 50) {
        return true;
    }

    return false;
};

/**
 * 获取商品链接（通过分享功能）
 * @param {Object} window 悬浮窗对象
 * @returns {string|null} 商品链接
 */
ProductInfoExtractor.prototype.getProductUrl = function(window) {
    try {
        logger.addLog(window, "尝试获取商品链接...");

        // 保存当前剪贴板内容
        var originalClip = getClip();

        // 方法1: 查找右上角分享按钮
        var shareUrl = this.getUrlFromRightCornerShare(window);
        if (shareUrl) {
            return shareUrl;
        }

        // 方法2: 查找页面中的分享按钮
        var shareUrl = this.getUrlFromPageShare(window);
        if (shareUrl) {
            return shareUrl;
        }

        // 方法3: 尝试多种分享方式
        var shareUrl = this.getUrlFromAlternativeShare(window);
        if (shareUrl) {
            return shareUrl;
        }

        // 恢复原始剪贴板内容
        if (originalClip) {
            setClip(originalClip);
        }

        logger.addLog(window, "无法获取商品链接，生成默认链接");
        return this.generateDefaultUrl();

    } catch (e) {
        logger.addLog(window, "获取商品链接失败: " + e.message);
        return this.generateDefaultUrl();
    }
};

/**
 * 从右上角分享获取链接
 * @param {Object} window 悬浮窗对象
 * @returns {string|null} 商品链接
 */
ProductInfoExtractor.prototype.getUrlFromRightCornerShare = function(window) {
    try {
        logger.addLog(window, "尝试点击右上角分享...");

        var screenWidth = device.width;

        // 尝试多个右上角位置
        var positions = [
            {x: screenWidth - 80, y: 100},
            {x: screenWidth - 120, y: 120},
            {x: screenWidth - 60, y: 80},
            {x: screenWidth - 100, y: 150}
        ];

        for (var i = 0; i < positions.length; i++) {
            logger.addLog(window, "尝试点击位置: (" + positions[i].x + ", " + positions[i].y + ")");
            click(positions[i].x, positions[i].y);
            sleep(1500);

            var url = this.tryGetUrlFromShareMenu(window);
            if (url) {
                return url;
            }

            // 如果没有成功，按返回键关闭可能的弹窗
            back();
            sleep(500);
        }

        return null;
    } catch (e) {
        logger.addLog(window, "右上角分享获取失败: " + e.message);
        return null;
    }
};

/**
 * 从页面分享按钮获取链接
 * @param {Object} window 悬浮窗对象
 * @returns {string|null} 商品链接
 */
ProductInfoExtractor.prototype.getUrlFromPageShare = function(window) {
    try {
        logger.addLog(window, "查找页面中的分享按钮...");

        var shareSelectors = [
            text("分享"),
            textContains("分享"),
            desc("分享"),
            descContains("分享"),
            id("share"),
            id("share_btn"),
            className("android.widget.ImageView").desc("分享"),
            className("android.widget.TextView").text("分享")
        ];

        for (var i = 0; i < shareSelectors.length; i++) {
            var shareButton = shareSelectors[i].findOne(1000);
            if (shareButton) {
                logger.addLog(window, "找到分享按钮: " + shareButton.text());

                if (safeClick(shareButton)) {
                    sleep(2000);

                    var url = this.tryGetUrlFromShareMenu(window);
                    if (url) {
                        return url;
                    }
                }

                // 关闭分享弹窗
                back();
                sleep(500);
            }
        }

        return null;
    } catch (e) {
        logger.addLog(window, "页面分享获取失败: " + e.message);
        return null;
    }
};

/**
 * 尝试从分享菜单获取URL
 * @param {Object} window 悬浮窗对象
 * @returns {string|null} 商品链接
 */
ProductInfoExtractor.prototype.tryGetUrlFromShareMenu = function(window) {
    try {
        // 查找复制链接选项
        var copyLinkSelectors = [
            text("复制链接"),
            textContains("复制链接"),
            text("复制商品链接"),
            textContains("复制商品链接"),
            text("复制"),
            textContains("复制"),
            text("链接"),
            textContains("链接")
        ];

        for (var i = 0; i < copyLinkSelectors.length; i++) {
            var copyButton = copyLinkSelectors[i].findOne(1000);
            if (copyButton) {
                logger.addLog(window, "找到复制链接按钮: " + copyButton.text());

                if (safeClick(copyButton)) {
                    sleep(1500);

                    // 获取剪贴板内容
                    var clipboardText = getClip();
                    if (clipboardText && this.isValidUrl(clipboardText)) {
                        logger.addLog(window, "成功获取商品链接");
                        logger.addLog(window,clipboardText)

                        sleep(500);

                        return clipboardText;
                    }
                }
            }
        }

        return null;
    } catch (e) {
        logger.addLog(window, "从分享菜单获取URL失败: " + e.message);
        return null;
    }
};

/**
 * 尝试其他分享方式
 * @param {Object} window 悬浮窗对象
 * @returns {string|null} 商品链接
 */
ProductInfoExtractor.prototype.getUrlFromAlternativeShare = function(window) {
    try {
        logger.addLog(window, "尝试其他分享方式...");

        // 尝试长按页面获取分享选项
        var screenWidth = device.width;
        var screenHeight = device.height;

        longClick(screenWidth / 2, screenHeight / 2);
        sleep(1500);

        var url = this.tryGetUrlFromShareMenu(window);
        if (url) {
            return url;
        }

        // 关闭可能的弹窗
        back();
        sleep(500);

        return null;
    } catch (e) {
        logger.addLog(window, "其他分享方式失败: " + e.message);
        return null;
    }
};

/**
 * 验证URL是否有效
 * @param {string} url URL字符串
 * @returns {boolean} 是否有效
 */
ProductInfoExtractor.prototype.isValidUrl = function(url) {
    if (!url || typeof url !== 'string') {
        return false;
    }

    return url.indexOf("http") !== -1 &&
           (url.indexOf("yangkeduo.com") !== -1 ||
            url.indexOf("pinduoduo.com") !== -1 ||
            url.indexOf("pdd.") !== -1);
};

/**
 * 生成默认URL
 * @returns {string} 默认商品链接
 */
ProductInfoExtractor.prototype.generateDefaultUrl = function() {
    var timestamp = Date.now();
    return "https://mobile.yangkeduo.com/goods.html?goods_id=unknown_" + timestamp;
};

/**
 * 获取商品价格
 * @param {Object} window 悬浮窗对象
 * @returns {number|null} 商品价格
 */
ProductInfoExtractor.prototype.getProductPrice = function(window) {
    try {
        // 查找价格元素
        var allTexts = textMatches(/.*/).find();
        var prices = [];
        
        for (var i = 0; i < allTexts.length; i++) {
            var text = allTexts[i].text();
            if (!text) continue;
            
            // 检查是否匹配价格模式
            for (var j = 0; j < this.config.pricePatterns.length; j++) {
                if (this.config.pricePatterns[j].test(text)) {
                    var price = parsePrice(text);
                    if (price !== null && price > 0 && price < 10000) {
                        prices.push(price);
                    }
                    break;
                }
            }
        }
        
        if (prices.length > 0) {
            // 返回最小价格（通常是促销价格）
            var minPrice = Math.min.apply(Math, prices);
            logger.addLog(window, "找到商品价格: " + minPrice + " 元");
            return minPrice;
        }
        
        logger.addLog(window, "未找到有效的商品价格");
        return null;
        
    } catch (e) {
        logger.addLog(window, "获取商品价格失败: " + e.message);
        return null;
    }
};

/**
 * 获取商品规格
 * @param {Object} window 悬浮窗对象
 * @returns {string} 商品规格
 */
ProductInfoExtractor.prototype.getProductSku = function(window) {
    try {
        // 查找规格相关的文本
        var skuSelectors = [
            textContains("规格"),
            textContains("型号"),
            textContains("尺寸"),
            textContains("颜色"),
            textContains("款式"),
            className("android.widget.TextView").textMatches(/.*【.*】.*/)
        ];
        
        for (var i = 0; i < skuSelectors.length; i++) {
            var skuElement = skuSelectors[i].findOne(1000);
            if (skuElement) {
                var skuText = skuElement.text().trim();
                if (skuText && skuText.length > 0 && skuText.length < 100) {
                    logger.addLog(window, "找到商品规格: " + skuText);
                    return skuText;
                }
            }
        }
        
        logger.addLog(window, "未找到具体规格，使用默认规格");
        return "默认规格";
        
    } catch (e) {
        logger.addLog(window, "获取商品规格失败: " + e.message);
        return "默认规格";
    }
};

module.exports = ProductInfoExtractor;
