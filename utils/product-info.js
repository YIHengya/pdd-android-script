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

        // 方法1: 优先通过进店按钮附近查找
        var shopName = this.findShopNameNearEnterButton(window);
        if (shopName) {
            logger.addLog(window, "通过进店按钮附近找到店铺: " + shopName);
            return shopName;
        }

        // 方法2: 直接查找店铺相关元素
        shopName = this.findShopNameDirect(window);
        if (shopName) {
            return shopName;
        }

        // 方法3: 通过下滑查找店铺信息
        logger.addLog(window, "直接查找失败，尝试下滑查找店铺信息...");
        shopName = this.findShopNameByScrolling(window);
        if (shopName) {
            return shopName;
        }

        // 方法4: 通过RecyclerView遍历查找
        logger.addLog(window, "下滑查找失败，尝试通过RecyclerView查找...");
        shopName = this.findShopNameInRecyclerView(window);
        if (shopName) {
            return shopName;
        }

        logger.addLog(window, "所有方法都失败，使用默认店铺名称");
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

        // 先找到进店按钮，再在其附近查找店铺名称
        var shopName = this.findShopNameNearEnterButtonAndYipin(window);
        if (shopName) {
            logger.addLog(window, "通过进店+已拼找到店铺: " + shopName);
            return shopName;
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

            // 首先检查是否有进店按钮
            var enterButton = child.findOne(text("进店"));
            if (!enterButton) {
                enterButton = child.findOne(textContains("进店"));
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
 * 通过关键词查找店铺名称
 * @param {Object} window 悬浮窗对象
 * @param {string} keyword 关键词（如"已拼"、"粉丝"）
 * @returns {string|null} 店铺名称
 */
ProductInfoExtractor.prototype.findShopNameByKeyword = function(window, keyword) {
    try {
        // 查找包含关键词的元素
        var keywordElements = textContains(keyword).find();

        for (var i = 0; i < keywordElements.length; i++) {
            var element = keywordElements[i];
            if (element) {
                logger.addLog(window, "找到'" + keyword + "'元素: " + element.text());

                // 在同一个父容器中查找店铺名称
                var parent = element.parent();
                if (parent) {
                    var shopName = this.findShopNameInContainerExcluding(window, parent, element);
                    if (shopName) {
                        return shopName;
                    }
                }
            }
        }

        return null;
    } catch (e) {
        logger.addLog(window, "通过'" + keyword + "'查找店铺名称失败: " + e.message);
        return null;
    }
};

/**
 * 简化的RecyclerView店铺名称查找
 * @param {Object} window 悬浮窗对象
 * @returns {string|null} 店铺名称
 */
ProductInfoExtractor.prototype.findShopNameInRecyclerViewSimple = function(window) {
    try {
        var recyclerView = id("pdd").className("android.support.v7.widget.RecyclerView").scrollable(true).findOne(2000);
        if (!recyclerView) {
            return null;
        }

        logger.addLog(window, "找到RecyclerView，开始查找店铺名称...");
        var children = recyclerView.children();

        for (var i = 0; i < children.length; i++) {
            var child = children[i];

            // 基于你的代码思路：查找包含"已拼XX件"的元素
            var yipinElement = child.findOne(textMatches(/已拼\d+件/));
            if (yipinElement) {
                logger.addLog(window, "找到'已拼XX件'元素: " + yipinElement.text());

                // 在同一个容器中查找所有文本元素
                var allTexts = child.find(className("android.widget.TextView"));
                for (var j = 0; j < allTexts.length; j++) {
                    var textElement = allTexts[j];
                    var text = textElement.text();
                    if (text && text.trim().length > 0) {
                        text = text.trim();

                        // 跳过"已拼XX件"、"粉丝"、"进店"等文本
                        if (text.indexOf("已拼") !== -1 ||
                            text.indexOf("粉丝") !== -1 ||
                            text.indexOf("进店") !== -1 ||
                            text.indexOf("件") !== -1) {
                            continue;
                        }

                        // 检查是否是有效的店铺名称
                        if (this.isValidShopName(text)) {
                            logger.addLog(window, "在'已拼'附近找到店铺名称: " + text);
                            return text;
                        }
                    }
                }
            }
        }

        return null;
    } catch (e) {
        logger.addLog(window, "简化RecyclerView查找失败: " + e.message);
        return null;
    }
};

/**
 * 直接查找店铺名称
 * @param {Object} window 悬浮窗对象
 * @returns {string|null} 店铺名称
 */
ProductInfoExtractor.prototype.findShopNameDirect = function(window) {
    try {
        // 方法1: 查找具体的店铺名称（包含店铺关键词的完整名称）
        var specificShopName = this.findSpecificShopName(window);
        if (specificShopName) {
            return specificShopName;
        }

        // 方法2: 通过常见选择器查找
        var shopSelectors = [
            id("shop_name"),
            id("store_name"),
            id("pdd"),
            className("android.widget.TextView").textMatches(/.*旗舰店$/),
            className("android.widget.TextView").textMatches(/.*专营店$/),
            className("android.widget.TextView").textMatches(/.*官方店$/),
            className("android.widget.TextView").textMatches(/.*数码店$/),
            className("android.widget.TextView").textMatches(/.*店$/),
        ];

        for (var i = 0; i < shopSelectors.length; i++) {
            var shopElement = shopSelectors[i].findOne(1000);
            if (shopElement) {
                var shopName = shopElement.text().trim();
                if (this.isValidShopName(shopName)) {
                    logger.addLog(window, "通过选择器找到店铺名称: " + shopName);
                    return shopName;
                }
            }
        }

        return null;
    } catch (e) {
        logger.addLog(window, "直接查找店铺名称失败: " + e.message);
        return null;
    }
};

/**
 * 查找具体的店铺名称
 * @param {Object} window 悬浮窗对象
 * @returns {string|null} 店铺名称
 */
ProductInfoExtractor.prototype.findSpecificShopName = function(window) {
    try {
        // 查找所有文本元素
        var allTexts = textMatches(/.*/).find();
        var candidateShops = [];

        for (var i = 0; i < allTexts.length; i++) {
            var text = allTexts[i].text();
            if (!text) continue;

            text = text.trim();

            // 查找包含店铺关键词的文本
            if ((text.indexOf("旗舰店") !== -1 ||
                 text.indexOf("专营店") !== -1 ||
                 text.indexOf("官方店") !== -1 ||
                 text.indexOf("数码店") !== -1) &&
                text.length >= 4 && text.length <= 30) {

                candidateShops.push({
                    name: text,
                    priority: this.getShopNamePriority(text)
                });
            }
        }

        // 按优先级排序，选择最佳的店铺名称
        if (candidateShops.length > 0) {
            candidateShops.sort(function(a, b) {
                return b.priority - a.priority;
            });

            var bestShop = candidateShops[0].name;
            logger.addLog(window, "找到具体店铺名称: " + bestShop);
            return bestShop;
        }

        return null;
    } catch (e) {
        logger.addLog(window, "查找具体店铺名称失败: " + e.message);
        return null;
    }
};

/**
 * 获取店铺名称的优先级分数
 * @param {string} shopName 店铺名称
 * @returns {number} 优先级分数
 */
ProductInfoExtractor.prototype.getShopNamePriority = function(shopName) {
    var score = 0;

    // 长度适中的店铺名称优先级更高
    if (shopName.length >= 6 && shopName.length <= 20) {
        score += 10;
    }

    // 包含具体店铺类型的优先级更高
    if (shopName.indexOf("旗舰店") !== -1) {
        score += 15;
    } else if (shopName.indexOf("专营店") !== -1) {
        score += 12;
    } else if (shopName.indexOf("官方店") !== -1) {
        score += 10;
    } else if (shopName.indexOf("数码店") !== -1) {
        score += 8;
    }

    // 包含数字或字母的店铺名称优先级更高（通常更具体）
    if (/[0-9a-zA-Z]/.test(shopName)) {
        score += 5;
    }

    // 包含中文字符的优先级更高
    if (/[\u4e00-\u9fa5]/.test(shopName)) {
        score += 5;
    }

    return score;
};

/**
 * 通过下滑查找店铺名称
 * @param {Object} window 悬浮窗对象
 * @returns {string|null} 店铺名称
 */
ProductInfoExtractor.prototype.findShopNameByScrolling = function(window) {
    try {
        var maxScrolls = 3;
        var scrollCount = 0;

        while (scrollCount < maxScrolls) {
            scrollCount++;
            logger.addLog(window, "第 " + scrollCount + " 次下滑查找店铺...");

            // 下滑页面
            scrollDown();
            sleep(1500);

            // 查找店铺相关信息
            var shopName = this.findShopNameDirect(window);
            if (shopName) {
                logger.addLog(window, "下滑后找到店铺: " + shopName);
                return shopName;
            }

            // 查找包含"店"字的文本
            var allTexts = textMatches(/.*店.*/).find();
            for (var i = 0; i < allTexts.length; i++) {
                var text = allTexts[i].text().trim();
                if (this.isValidShopName(text)) {
                    logger.addLog(window, "下滑后通过模糊匹配找到店铺: " + text);
                    return text;
                }
            }
        }

        return null;
    } catch (e) {
        logger.addLog(window, "下滑查找店铺名称失败: " + e.message);
        return null;
    }
};

/**
 * 通过RecyclerView查找店铺名称
 * @param {Object} window 悬浮窗对象
 * @returns {string|null} 店铺名称
 */
ProductInfoExtractor.prototype.findShopNameInRecyclerView = function(window) {
    try {
        // 查找RecyclerView
        var recyclerViews = [
            id("pdd").className("android.support.v7.widget.RecyclerView"),
            className("android.support.v7.widget.RecyclerView"),
            className("androidx.recyclerview.widget.RecyclerView")
        ];

        for (var i = 0; i < recyclerViews.length; i++) {
            var recyclerView = recyclerViews[i].findOne(2000);
            if (recyclerView) {
                logger.addLog(window, "找到RecyclerView，开始遍历子元素...");

                var children = recyclerView.children();
                for (var j = 0; j < children.length; j++) {
                    var child = children[j];

                    // 方法1: 查找进店按钮附近的店铺名称
                    var shopName = this.findShopNameNearEnterMall(window, child);
                    if (shopName) {
                        return shopName;
                    }

                    // 方法2: 在子元素中查找店铺信息
                    var target = child.findOne(id("pdd"));
                    if (target) {
                        var shopName = target.text();
                        if (this.isValidShopName(shopName)) {
                            logger.addLog(window, "在RecyclerView中找到店铺: " + shopName);
                            return shopName;
                        }
                    }

                    // 方法3: 查找子元素中的店铺相关文本
                    var shopTexts = child.find(textMatches(/.*店.*/));
                    for (var k = 0; k < shopTexts.length; k++) {
                        var shopText = shopTexts[k].text().trim();
                        if (this.isValidShopName(shopText)) {
                            logger.addLog(window, "在RecyclerView子元素中找到店铺: " + shopText);
                            return shopText;
                        }
                    }
                }
            }
        }

        return null;
    } catch (e) {
        logger.addLog(window, "RecyclerView查找店铺名称失败: " + e.message);
        return null;
    }
};

/**
 * 在进店按钮附近查找店铺名称
 * @param {Object} window 悬浮窗对象
 * @param {Object} child RecyclerView的子元素
 * @returns {string|null} 店铺名称
 */
ProductInfoExtractor.prototype.findShopNameNearEnterMall = function(window, child) {
    try {
        // 查找进店按钮
        var enterMallButton = this.findEnterMallButton(child);

        if (enterMallButton) {
            logger.addLog(window, "找到进店按钮，查找附近的店铺名称...");

            // 方法1: 在进店按钮的父容器中查找店铺名称（排除进店按钮本身）
            var parent = enterMallButton.parent();
            if (parent) {
                var shopName = this.findShopNameInContainerExcluding(window, parent, enterMallButton);
                if (shopName) {
                    logger.addLog(window, "在进店按钮父容器中找到店铺: " + shopName);
                    return shopName;
                }
            }

            // 方法2: 在更高层级的父容器中查找
            if (parent && parent.parent()) {
                var grandParent = parent.parent();
                var shopName = this.findShopNameInContainerExcluding(window, grandParent, enterMallButton);
                if (shopName) {
                    logger.addLog(window, "在进店按钮祖父容器中找到店铺: " + shopName);
                    return shopName;
                }
            }

            // 方法3: 在整个子容器中查找（排除进店按钮）
            var shopName = this.findShopNameInContainerExcluding(window, child, enterMallButton);
            if (shopName) {
                logger.addLog(window, "在子容器中找到店铺: " + shopName);
                return shopName;
            }
        }

        return null;
    } catch (e) {
        logger.addLog(window, "在进店按钮附近查找店铺名称失败: " + e.message);
        return null;
    }
};

/**
 * 查找进店按钮
 * @param {Object} container 容器元素
 * @returns {Object|null} 进店按钮元素
 */
ProductInfoExtractor.prototype.findEnterMallButton = function(container) {
    try {
        // 尝试多种进店按钮的查找方式
        var enterMallSelectors = [
            id("tv_enter_mall"),
            id("enter_mall"),
            id("btn_enter_mall"),
            text("进店"),
            textContains("进店")
        ];

        for (var i = 0; i < enterMallSelectors.length; i++) {
            var enterMallButton = container.findOne(enterMallSelectors[i]);
            if (enterMallButton) {
                return enterMallButton;
            }
        }

        return null;
    } catch (e) {
        return null;
    }
};

/**
 * 在指定容器中查找店铺名称（排除指定元素）
 * @param {Object} window 悬浮窗对象
 * @param {Object} container 容器元素
 * @param {Object} excludeElement 要排除的元素
 * @returns {string|null} 店铺名称
 */
ProductInfoExtractor.prototype.findShopNameInContainerExcluding = function(window, container, excludeElement) {
    try {
        // 查找容器中所有的文本元素
        var textElements = container.find(className("android.widget.TextView"));
        var candidates = [];

        for (var i = 0; i < textElements.length; i++) {
            var textElement = textElements[i];

            // 跳过要排除的元素
            if (excludeElement && textElement.equals && textElement.equals(excludeElement)) {
                continue;
            }

            var text = textElement.text();
            if (text && text.trim().length > 0) {
                text = text.trim();

                // 排除"进店"相关的文本
                if (text === "进店" || text === "进店铺" || text.indexOf("进店") !== -1) {
                    continue;
                }

                // 检查是否是有效的店铺名称
                if (this.isValidShopName(text)) {
                    candidates.push({
                        name: text,
                        priority: this.getShopNamePriority(text)
                    });
                }
            }
        }

        // 如果找到候选店铺名，返回优先级最高的
        if (candidates.length > 0) {
            candidates.sort(function(a, b) {
                return b.priority - a.priority;
            });
            return candidates[0].name;
        }

        return null;
    } catch (e) {
        logger.addLog(window, "在容器中查找店铺名称失败: " + e.message);
        return null;
    }
};

/**
 * 在指定容器中查找店铺名称
 * @param {Object} window 悬浮窗对象
 * @param {Object} container 容器元素
 * @returns {string|null} 店铺名称
 */
ProductInfoExtractor.prototype.findShopNameInContainer = function(window, container) {
    try {
        // 查找容器中所有的文本元素
        var textElements = container.find(className("android.widget.TextView"));

        for (var i = 0; i < textElements.length; i++) {
            var textElement = textElements[i];
            var text = textElement.text();

            if (text && text.trim().length > 0) {
                text = text.trim();

                // 检查是否是有效的店铺名称
                if (this.isValidShopName(text)) {
                    return text;
                }
            }
        }

        return null;
    } catch (e) {
        logger.addLog(window, "在容器中查找店铺名称失败: " + e.message);
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
                    candidates.push({
                        name: text,
                        priority: this.getShopNamePriority(text)
                    });
                    logger.addLog(window, "候选店铺名称: " + text);
                }
            }
        }

        // 返回优先级最高的候选店铺名称
        if (candidates.length > 0) {
            candidates.sort(function(a, b) {
                return b.priority - a.priority;
            });
            logger.addLog(window, "选择店铺名称: " + candidates[0].name);
            return candidates[0].name;
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
