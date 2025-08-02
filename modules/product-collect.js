// 商品收藏功能模块
// 负责自动收藏符合条件的商品

const { PDD_CONFIG } = require('../config/app-config.js');
const { parsePrice, safeClick, scrollDownWithRandomCoords } = require('../utils/common.js');
const logger = require('../utils/logger.js');

/**
 * 商品收藏功能构造函数
 */
function ProductCollect() {
    this.config = PDD_CONFIG;
    // 收藏相关的按钮文本
    this.collectButtons = [
        "收藏",
        "加入收藏",
        "关注",
        "喜欢",
        "❤",
        "♥"
    ];
}

/**
 * 执行完整的收藏流程
 * @param {Object} window 悬浮窗对象
 * @param {Object} priceRange 价格区间对象 {min: number, max: number}
 * @param {number} maxCollectCount 最大收藏数量
 * @returns {boolean} 是否执行成功
 */
ProductCollect.prototype.execute = function(window, priceRange, maxCollectCount) {
    if (!maxCollectCount) maxCollectCount = 10;

    try {
        logger.addLog(window, "开始执行商品收藏流程...");

        // 兼容旧的单价格参数
        if (typeof priceRange === 'number') {
            logger.addLog(window, "目标价格: " + priceRange + " 元，最大收藏: " + maxCollectCount + " 个");
            priceRange = { min: 0, max: priceRange };
        } else {
            logger.addLog(window, "价格区间: " + priceRange.min.toFixed(2) + "-" + priceRange.max.toFixed(2) + " 元，最大收藏: " + maxCollectCount + " 个");
        }

        // 1. 启动应用
        if (!this.launchApp(window)) {
            logger.addLog(window, "无法打开拼多多APP，请检查是否已安装");
            return false;
        }

        // 2. 确保在主页
        this.ensureAtHomePage(window);

        // 3. 批量收藏商品
        var collectCount = this.batchCollectProducts(window, priceRange, maxCollectCount);
        
        logger.addLog(window, "收藏流程完成，共收藏 " + collectCount + " 个商品");
        return collectCount > 0;

    } catch (e) {
        logger.addLog(window, "收藏流程出错: " + e.message);
        return false;
    }
};

/**
 * 启动拼多多应用
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否启动成功
 */
ProductCollect.prototype.launchApp = function(window) {
    try {
        logger.addLog(window, "正在打开拼多多APP...");

        home();
        sleep(2000);

        app.launchApp(this.config.appName);
        sleep(this.config.waitTimes.appLaunch);

        var currentPkg = currentPackage();
        
        // 检查是否成功打开
        for (var i = 0; i < this.config.packageNames.length; i++) {
            if (currentPkg === this.config.packageNames[i]) {
                logger.addLog(window, "成功打开拼多多APP");
                return true;
            }
        }

        return false;
    } catch (e) {
        logger.addLog(window, "启动应用失败: " + e.message);
        return false;
    }
};

/**
 * 确保在主页
 * @param {Object} window 悬浮窗对象
 */
ProductCollect.prototype.ensureAtHomePage = function(window) {
    logger.addLog(window, "确保在主页...");
    
    var homeBtn = text("首页").findOne(2000);
    if (homeBtn) {
        homeBtn.click();
        sleep(2000);
    }
};

/**
 * 批量收藏商品
 * @param {Object} window 悬浮窗对象
 * @param {Object} priceRange 价格区间对象 {min: number, max: number}
 * @param {number} maxCount 最大收藏数量
 * @returns {number} 实际收藏数量
 */
ProductCollect.prototype.batchCollectProducts = function(window, priceRange, maxCount) {
    var collectCount = 0;
    var scrollCount = 0;
    var maxScrolls = this.config.maxScrolls * 2; // 收藏模式下多滚动一些

    while (collectCount < maxCount && scrollCount < maxScrolls) {
        logger.addLog(window, "第 " + (scrollCount + 1) + " 次搜索商品进行收藏...");

        // 寻找当前屏幕上的商品
        var products = this.findProductsOnScreen(priceRange);
        
        for (var i = 0; i < products.length && collectCount < maxCount; i++) {
            var product = products[i];
            logger.addLog(window, "尝试收藏商品: " + product.text + " (价格: " + product.price + " 元)");

            if (this.collectSingleProduct(window, product.element)) {
                collectCount++;
                logger.addLog(window, "成功收藏第 " + collectCount + " 个商品");
                
                // 收藏后稍作停顿
                sleep(1000);
            } else {
                logger.addLog(window, "收藏失败，继续下一个");
            }
        }

        // 向下滚动寻找更多商品
        scrollDownWithRandomCoords();
        sleep(this.config.waitTimes.scroll);
        scrollCount++;
    }

    return collectCount;
};

/**
 * 在当前屏幕寻找符合条件的商品
 * @param {Object} priceRange 价格区间对象 {min: number, max: number}
 * @returns {Array} 商品信息数组
 */
ProductCollect.prototype.findProductsOnScreen = function(priceRange) {
    var products = [];
    var allTexts = textMatches(/.*/).find();

    // 兼容旧的单价格参数
    if (typeof priceRange === 'number') {
        priceRange = { min: 0, max: priceRange };
    }

    for (var i = 0; i < allTexts.length; i++) {
        var element = allTexts[i];
        var text = element.text();

        if (!text) continue;

        // 检查价格模式
        for (var j = 0; j < this.config.pricePatterns.length; j++) {
            if (this.config.pricePatterns[j].test(text)) {
                var price = parsePrice(text);
                if (price !== null && price > 0 && price >= priceRange.min && price <= priceRange.max) {
                    products.push({
                        element: element,
                        text: text,
                        price: price
                    });
                }
                break;
            }
        }
    }

    return products;
};

/**
 * 收藏单个商品
 * @param {Object} window 悬浮窗对象
 * @param {Object} element 商品元素
 * @returns {boolean} 是否收藏成功
 */
ProductCollect.prototype.collectSingleProduct = function(window, element) {
    try {
        // 点击进入商品详情页
        if (!safeClick(element)) {
            return false;
        }

        sleep(this.config.waitTimes.pageLoad);

        // 寻找收藏按钮
        var collectBtn = this.findCollectButton();
        
        if (collectBtn) {
            logger.addLog(window, "找到收藏按钮，正在收藏...");
            
            if (safeClick(collectBtn)) {
                sleep(1000);
                
                // 返回上一页
                back();
                sleep(this.config.waitTimes.back);
                
                return true;
            } else {
                logger.addLog(window, "点击收藏按钮失败");
            }
        } else {
            logger.addLog(window, "未找到收藏按钮");
        }

        // 返回上一页
        back();
        sleep(this.config.waitTimes.back);
        
        return false;

    } catch (e) {
        logger.addLog(window, "收藏商品出错: " + e.message);
        
        // 确保返回上一页
        try {
            back();
            sleep(this.config.waitTimes.back);
        } catch (e2) {
            // 忽略返回时的错误
        }
        
        return false;
    }
};

/**
 * 寻找收藏按钮
 * @returns {Object|null} 收藏按钮元素
 */
ProductCollect.prototype.findCollectButton = function() {
    // 尝试文本匹配
    for (var i = 0; i < this.collectButtons.length; i++) {
        var btn = text(this.collectButtons[i]).findOne(1000);
        if (btn) {
            return btn;
        }
        
        // 尝试包含匹配
        btn = textContains(this.collectButtons[i]).findOne(1000);
        if (btn) {
            return btn;
        }
    }

    // 尝试描述匹配
    for (var i = 0; i < this.collectButtons.length; i++) {
        var btn = desc(this.collectButtons[i]).findOne(1000);
        if (btn) {
            return btn;
        }
    }

    // 尝试寻找心形图标或收藏相关的UI元素
    var heartBtn = className("android.widget.ImageView").desc("收藏").findOne(1000);
    if (heartBtn) {
        return heartBtn;
    }

    return null;
};

/**
 * 查看收藏列表
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否成功进入收藏列表
 */
ProductCollect.prototype.viewCollectionList = function(window) {
    try {
        logger.addLog(window, "正在进入收藏列表...");

        // 尝试寻找"我的"或"个人中心"按钮
        var myBtn = text("我的").findOne(2000);
        if (!myBtn) {
            myBtn = text("个人中心").findOne(2000);
        }

        if (myBtn) {
            myBtn.click();
            sleep(2000);

            // 寻找收藏入口
            var collectEntry = text("收藏").findOne(2000);
            if (!collectEntry) {
                collectEntry = textContains("收藏").findOne(2000);
            }

            if (collectEntry) {
                collectEntry.click();
                sleep(2000);
                logger.addLog(window, "成功进入收藏列表");
                return true;
            }
        }

        logger.addLog(window, "无法进入收藏列表");
        return false;

    } catch (e) {
        logger.addLog(window, "进入收藏列表失败: " + e.message);
        return false;
    }
};

module.exports = ProductCollect;
