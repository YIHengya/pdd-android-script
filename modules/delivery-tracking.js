// 待收货物流追踪模块
// 负责导航到待收货页面并获取物流单号

const NavigationHelper = require('../utils/navigation.js');
const logger = require('../utils/logger.js');
const { GlobalStopManager, safeClick, findAnyElement } = require('../utils/common.js');
const { waitTimeManager } = require('../utils/wait-time-manager.js');

/**
 * 待收货物流追踪构造函数
 */
function DeliveryTracking() {
    this.navHelper = new NavigationHelper();
    this.trackingNumbers = [];
    this.maxRetries = 3;
}

/**
 * 执行待收货物流追踪功能
 * @param {Object} window 悬浮窗对象
 * @param {string} userName 用户名
 */
DeliveryTracking.prototype.execute = function(window, userName) {
    logger.addLog(window, "=== 开始执行待收货物流追踪 ===");
    
    try {
        // 导航到待收货页面
        if (!this.navigateToDeliveryPage(window)) {
            logger.addLog(window, "❌ 无法导航到待收货页面");
            return false;
        }
        
        // 获取所有快递信息
        var deliveryInfos = this.getAllTrackingNumbers(window);

        if (deliveryInfos.length > 0) {
            logger.addLog(window, "✅ 成功获取 " + deliveryInfos.length + " 个快递信息");

            // 复制到剪贴板
            this.copyDeliveryInfosToClipboard(window, deliveryInfos);

            // 显示结果
            this.displayResults(window, deliveryInfos);

            return true;
        } else {
            logger.addLog(window, "❌ 未找到任何快递信息");
            return false;
        }
        
    } catch (e) {
        logger.addLog(window, "❌ 执行过程中出错: " + e.message);
        return false;
    }
};

/**
 * 导航到待收货页面
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否成功
 */
DeliveryTracking.prototype.navigateToDeliveryPage = function(window) {
    logger.addLog(window, "正在导航到待收货页面...");
    
    // 使用智能导航
    if (this.navHelper.smartNavigate(window, "delivery")) {
        logger.addLog(window, "✅ 成功导航到待收货页面");
        waitTimeManager.wait('pageStable');
        return true;
    }
    
    logger.addLog(window, "❌ 导航到待收货页面失败");
    return false;
};

/**
 * 获取所有物流单号
 * @param {Object} window 悬浮窗对象
 * @returns {Array} 物流信息数组，每个元素包含快递公司和单号
 */
DeliveryTracking.prototype.getAllTrackingNumbers = function(window) {
    logger.addLog(window, "开始扫描物流单号...");

    var trackingInfos = [];
    var retryCount = 0;

    while (retryCount < this.maxRetries && !GlobalStopManager.isStopRequested()) {
        try {
            // 使用新的方法查找复制按钮和快递信息
            var deliveryInfos = this.findDeliveryInfosByCopyButton(window);

            if (deliveryInfos.length === 0) {
                logger.addLog(window, "未找到待收货商品，尝试刷新页面...");
                this.refreshPage(window);
                retryCount++;
                waitTimeManager.wait('back');
                continue;
            }

            logger.addLog(window, "找到 " + deliveryInfos.length + " 个待收货商品");
            trackingInfos = deliveryInfos;
            break;

        } catch (e) {
            logger.addLog(window, "扫描过程中出错: " + e.message);
            retryCount++;
            if (retryCount < this.maxRetries) {
                logger.addLog(window, "重试第 " + retryCount + " 次...");
                waitTimeManager.wait('back');
            }
        }
    }

    return trackingInfos;
};

/**
 * 通过查看物流按钮进入详情页查找快递信息（基于商品名称去重）
 * @param {Object} window 悬浮窗对象
 * @returns {Array} 快递信息数组，每个元素包含快递公司和单号
 */
DeliveryTracking.prototype.findDeliveryInfosByCopyButton = function(window) {
    logger.addLog(window, "开始查找待收货商品的物流信息...");

    var deliveryInfos = [];
    var processedProducts = new Set(); // 用于记录已处理的商品名称
    var processedTrackingNumbers = new Set(); // 用于记录已处理的快递单号，避免重复
    var maxScrollAttempts = 10; // 最大滚动次数
    var scrollAttempt = 0;
    var noNewButtonsCount = 0; // 连续没有新按钮的次数

    try {
        while (scrollAttempt < maxScrollAttempts && !GlobalStopManager.isStopRequested()) {
            logger.addLog(window, "第 " + (scrollAttempt + 1) + " 次扫描当前屏幕...");

            // 获取当前屏幕可见的商品信息和对应的查看物流按钮
            var visibleProductsWithButtons = this.getVisibleProductsWithLogisticsButtons(window);

            if (visibleProductsWithButtons.length === 0) {
                logger.addLog(window, "当前屏幕未找到可见的商品和查看物流按钮");
                noNewButtonsCount++;

                // 如果连续几次都没有找到按钮，可能已经到底了
                if (noNewButtonsCount >= 2) {
                    logger.addLog(window, "连续未找到新商品，可能已扫描完所有商品");
                    break;
                }

                // 尝试向下滚动
                logger.addLog(window, "尝试在待收货页面向下滚动...");
                this.scrollDownInDeliveryPage(window);
                waitTimeManager.wait('pageStable');
                scrollAttempt++;
                continue;
            }

            logger.addLog(window, "当前屏幕找到 " + visibleProductsWithButtons.length + " 个可见的商品");
            noNewButtonsCount = 0; // 重置计数器

            // 处理当前屏幕可见的所有商品
            for (var i = 0; i < visibleProductsWithButtons.length && !GlobalStopManager.isStopRequested(); i++) {
                var productInfo = visibleProductsWithButtons[i];
                var productName = productInfo.productName;
                var logisticsButton = productInfo.button;

                logger.addLog(window, "正在处理商品: " + (productName || "未知商品"));

                // 为未知商品生成唯一标识符（基于按钮位置）
                var productIdentifier = productName;
                if (!productIdentifier) {
                    var buttonBounds = logisticsButton.bounds();
                    productIdentifier = "unknown_" + buttonBounds.centerX() + "_" + buttonBounds.centerY();
                    logger.addLog(window, "为未知商品生成标识符: " + productIdentifier);
                }

                // 检查是否已经处理过这个商品
                if (processedProducts.has(productIdentifier)) {
                    logger.addLog(window, "商品 '" + productIdentifier + "' 已经处理过，跳过");
                    continue;
                }

                // 点击查看物流按钮
                if (safeClick(logisticsButton)) {
                    logger.addLog(window, "成功点击查看物流按钮");
                    waitTimeManager.wait('pageStable');

                    // 额外等待确保物流详情页完全加载
                    logger.addLog(window, "等待物流详情页完全加载...");
                    waitTimeManager.wait('medium'); // 额外等待1.5秒

                    // 在物流详情页查找快递信息
                    var currentDeliveryInfos = this.extractDeliveryInfoFromLogisticsPage(window, deliveryInfos.length + 1);

                    if (currentDeliveryInfos && currentDeliveryInfos.length > 0) {
                        // 将当前商品的所有快递信息添加到总列表（去重处理）
                        var addedCount = 0;
                        for (var j = 0; j < currentDeliveryInfos.length; j++) {
                            var deliveryInfo = currentDeliveryInfos[j];
                            var trackingNumber = deliveryInfo.trackingNumber;

                            // 检查快递单号是否已经存在
                            if (trackingNumber && !processedTrackingNumbers.has(trackingNumber)) {
                                // 添加商品名称到快递信息中
                                deliveryInfo.productName = productName;
                                deliveryInfos.push(deliveryInfo);
                                processedTrackingNumbers.add(trackingNumber);
                                addedCount++;
                                logger.addLog(window, "添加新快递信息: " + (deliveryInfo.company || "未知快递") + " - " + trackingNumber);
                            } else if (trackingNumber) {
                                logger.addLog(window, "快递单号已存在，跳过: " + trackingNumber);
                            }
                        }

                        // 记录已处理的商品（使用标识符）
                        processedProducts.add(productIdentifier);
                        logger.addLog(window, "已记录商品: " + productIdentifier + "，新增 " + addedCount + " 个快递信息");
                    } else {
                        // 即使没有找到快递信息，也要记录已处理，避免重复点击
                        processedProducts.add(productIdentifier);
                        logger.addLog(window, "商品无快递信息，但已记录避免重复处理: " + productIdentifier);
                    }

                    // 返回上一页
                    logger.addLog(window, "返回商品列表页面...");
                    back();
                    waitTimeManager.wait('back');

                } else {
                    logger.addLog(window, "点击查看物流按钮失败");
                    // 即使点击失败，也要记录，避免重复尝试
                    processedProducts.add(productIdentifier);
                    logger.addLog(window, "点击失败，已记录避免重复尝试: " + productIdentifier);
                }

                // 短暂等待，避免操作过快
                waitTimeManager.wait('short');
            }

            // 处理完当前屏幕的所有按钮后，向下滚动查看更多
            logger.addLog(window, "当前屏幕处理完成，向下滚动查看更多商品...");
            this.scrollDownInDeliveryPage(window);
            waitTimeManager.wait('pageStable');
            scrollAttempt++;
        }

        logger.addLog(window, "扫描完成，共处理了 " + processedProducts.size + " 个商品，获取到 " + deliveryInfos.length + " 个快递信息");

    } catch (e) {
        logger.addLog(window, "查找快递信息时出错: " + e.message);
    }

    return deliveryInfos;
};

/**
 * 查找查看物流按钮
 * @param {Object} window 悬浮窗对象
 * @returns {Array} 查看物流按钮数组
 */
DeliveryTracking.prototype.findLogisticsButtons = function(window) {
    logger.addLog(window, "正在查找查看物流按钮...");

    var buttons = [];

    // 查找各种可能的物流按钮文本
    var buttonTexts = [
        "查看物流",
        "物流信息",
        "物流详情",
        "查看详情",
        "物流",
        "快递信息"
    ];

    for (var i = 0; i < buttonTexts.length; i++) {
        var found = textContains(buttonTexts[i]).find();
        for (var j = 0; j < found.length; j++) {
            // 确保是可点击的元素
            if (found[j].clickable()) {
                buttons.push(found[j]);
                logger.addLog(window, "找到物流按钮: " + found[j].text());
            }
        }
    }

    // 如果没找到，尝试通过描述查找
    if (buttons.length === 0) {
        var descTexts = ["物流", "快递", "查看"];
        for (var i = 0; i < descTexts.length; i++) {
            var found = descContains(descTexts[i]).clickable(true).find();
            for (var j = 0; j < found.length; j++) {
                buttons.push(found[j]);
                logger.addLog(window, "通过描述找到物流按钮: " + found[j].desc());
            }
        }
    }

    return buttons;
};

/**
 * 获取当前屏幕可见的商品信息和对应的查看物流按钮
 * @param {Object} window 悬浮窗对象
 * @returns {Array} 包含商品信息和按钮的对象数组
 */
DeliveryTracking.prototype.getVisibleProductsWithLogisticsButtons = function(window) {
    logger.addLog(window, "获取当前屏幕可见的商品信息和查看物流按钮...");

    var visibleProductsWithButtons = [];

    try {
        // 获取屏幕尺寸
        var screenHeight = device.height;
        var screenWidth = device.width;

        // 定义可见区域（排除状态栏和导航栏）
        var visibleTop = screenHeight * 0.1;    // 排除顶部状态栏
        var visibleBottom = screenHeight * 0.9;  // 排除底部导航栏

        logger.addLog(window, "屏幕可见区域: 0," + visibleTop + " - " + screenWidth + "," + visibleBottom);

        // 获取可见的商品名称元素
        var visibleProducts = this.getVisibleProductNames(window, visibleTop, visibleBottom);
        logger.addLog(window, "找到 " + visibleProducts.length + " 个可见商品");

        // 获取可见的查看物流按钮
        var visibleButtons = this.getVisibleLogisticsButtons(window, visibleTop, visibleBottom);
        logger.addLog(window, "找到 " + visibleButtons.length + " 个可见的查看物流按钮");

        // 将商品和按钮进行配对
        for (var i = 0; i < visibleButtons.length; i++) {
            var button = visibleButtons[i];
            var buttonBounds = button.bounds();
            var buttonY = buttonBounds.centerY();

            // 查找距离按钮最近的商品名称
            var closestProduct = null;
            var minDistance = Infinity;

            for (var j = 0; j < visibleProducts.length; j++) {
                var product = visibleProducts[j];
                var productBounds = product.bounds;
                var productY = productBounds.centerY();

                // 计算垂直距离
                var distance = Math.abs(buttonY - productY);

                // 确保商品在按钮上方（商品Y坐标小于按钮Y坐标）
                if (productY < buttonY && distance < minDistance) {
                    minDistance = distance;
                    closestProduct = product;
                }
            }

            if (closestProduct) {
                visibleProductsWithButtons.push({
                    productName: closestProduct.name,
                    button: button,
                    productBounds: closestProduct.bounds,
                    buttonBounds: buttonBounds
                });

                logger.addLog(window, "配对成功: " + closestProduct.name + " <-> 查看物流按钮");
            } else {
                // 如果没有找到对应的商品，也添加到列表中，但商品名称为空
                visibleProductsWithButtons.push({
                    productName: null,
                    button: button,
                    productBounds: null,
                    buttonBounds: buttonBounds
                });

                logger.addLog(window, "未找到对应商品的查看物流按钮");
            }
        }

        logger.addLog(window, "共配对成功 " + visibleProductsWithButtons.length + " 个商品和按钮");

    } catch (e) {
        logger.addLog(window, "获取可见商品和按钮时出错: " + e.message);
    }

    return visibleProductsWithButtons;
};

/**
 * 获取当前屏幕可见区域内的商品名称
 * @param {Object} window 悬浮窗对象
 * @param {number} visibleTop 可见区域顶部
 * @param {number} visibleBottom 可见区域底部
 * @returns {Array} 可见的商品名称数组
 */
DeliveryTracking.prototype.getVisibleProductNames = function(window, visibleTop, visibleBottom) {
    logger.addLog(window, "获取当前屏幕可见区域内的商品名称...");

    var visibleProducts = [];

    try {
        // 通过descContains查找包含"商品名称"的元素（参考测试文件的方法）
        var productElements = descContains("商品名称").find();
        logger.addLog(window, "找到 " + productElements.length + " 个包含'商品名称'的元素");

        for (var i = 0; i < productElements.length; i++) {
            try {
                var element = productElements[i];
                var bounds = element.bounds();
                var desc = element.desc() || "";

                // 检查元素是否在可见区域内
                var elementCenterY = bounds.centerY();

                if (elementCenterY >= visibleTop && elementCenterY <= visibleBottom && bounds.left > 0) {
                    // 提取商品名称（去掉"商品名称："前缀）
                    var productName = desc.replace("商品名称：", "").trim();

                    if (productName) {
                        visibleProducts.push({
                            name: productName,
                            bounds: bounds,
                            element: element
                        });

                        logger.addLog(window, "找到可见商品: " + productName);
                    }
                }
            } catch (e) {
                logger.addLog(window, "处理商品元素时出错: " + e.message);
            }
        }

        logger.addLog(window, "共找到 " + visibleProducts.length + " 个可见的商品名称");

    } catch (e) {
        logger.addLog(window, "获取可见商品名称时出错: " + e.message);
    }

    return visibleProducts;
};

/**
 * 获取当前屏幕可见区域内的查看物流按钮
 * @param {Object} window 悬浮窗对象
 * @param {number} visibleTop 可见区域顶部
 * @param {number} visibleBottom 可见区域底部
 * @returns {Array} 可见的查看物流按钮数组
 */
DeliveryTracking.prototype.getVisibleLogisticsButtons = function(window, visibleTop, visibleBottom) {
    logger.addLog(window, "获取当前屏幕可见区域内的查看物流按钮...");

    var visibleButtons = [];

    try {
        // 如果没有传入可见区域参数，使用默认值
        if (typeof visibleTop === 'undefined' || typeof visibleBottom === 'undefined') {
            var screenHeight = device.height;
            visibleTop = screenHeight * 0.1;
            visibleBottom = screenHeight * 0.9;
        }

        // 查找所有查看物流按钮
        var allButtons = this.findLogisticsButtons(window);

        // 筛选出在可见区域内的按钮
        for (var i = 0; i < allButtons.length; i++) {
            try {
                var button = allButtons[i];
                var bounds = button.bounds();

                // 检查按钮是否在可见区域内
                var buttonCenterY = bounds.centerY();

                if (buttonCenterY >= visibleTop && buttonCenterY <= visibleBottom && bounds.left > 0) {
                    visibleButtons.push(button);
                    logger.addLog(window, "找到可见按钮，位置: " + bounds.centerX() + "," + buttonCenterY);
                }
            } catch (e) {
                logger.addLog(window, "检查按钮可见性时出错: " + e.message);
            }
        }

        logger.addLog(window, "共找到 " + visibleButtons.length + " 个可见的查看物流按钮");

    } catch (e) {
        logger.addLog(window, "获取可见按钮时出错: " + e.message);
    }

    return visibleButtons;
};

/**
 * 从物流详情页获取店铺名称（只使用"店铺名称"精确匹配，带重试机制）
 * @param {Object} window 悬浮窗对象
 * @returns {string|null} 店铺名称
 */
DeliveryTracking.prototype.getShopNameFromLogisticsPage = function(window) {
    logger.addLog(window, "正在获取物流详情页的店铺名称...");

    var maxRetries = 3;
    var retryDelay = 1000; // 1秒重试间隔

    for (var retry = 0; retry < maxRetries; retry++) {
        if (retry > 0) {
            logger.addLog(window, "第 " + (retry + 1) + " 次尝试获取店铺名称...");
            waitTimeManager.wait(retryDelay);
        }

        try {
            // 方法1：通过descContains查找包含"店铺名称"的元素
            var shopDescElements = descContains("店铺名称").find();
            if (shopDescElements.length > 0) {
                var shopDesc = shopDescElements[0].desc();
                logger.addLog(window, "通过descContains('店铺名称')找到desc: " + shopDesc);

                // 提取店铺名称（去掉"店铺名称："前缀）
                if (shopDesc && shopDesc.includes("店铺名称：")) {
                    var shopName = shopDesc.replace("店铺名称：", "").trim();
                    if (shopName) {
                        logger.addLog(window, "✅ 通过descContains提取到店铺名称: " + shopName);
                        return shopName;
                    }
                }
            }

            // 方法2：通过textContains查找包含"店铺名称"的元素
            var shopTextElements = textContains("店铺名称").find();
            if (shopTextElements.length > 0) {
                var shopText = shopTextElements[0].text();
                logger.addLog(window, "通过textContains('店铺名称')找到text: " + shopText);

                if (shopText && shopText.includes("店铺名称：")) {
                    var shopName = shopText.replace("店铺名称：", "").trim();
                    if (shopName) {
                        logger.addLog(window, "✅ 通过textContains提取到店铺名称: " + shopName);
                        return shopName;
                    }
                }
            }

            // 方法3：遍历所有TextView元素，查找包含"店铺名称："的内容
            logger.addLog(window, "尝试遍历所有TextView元素查找店铺名称...");
            var allElements = className("android.widget.TextView").find();

            for (var i = 0; i < allElements.length; i++) {
                var element = allElements[i];
                var text = element.text() || "";
                var desc = element.desc() || "";

                // 检查desc中的店铺名称
                if (desc && desc.includes("店铺名称：")) {
                    var shopName = desc.replace("店铺名称：", "").trim();
                    if (shopName) {
                        logger.addLog(window, "✅ 通过遍历desc提取到店铺名称: " + shopName);
                        return shopName;
                    }
                }

                // 检查text中的店铺名称
                if (text && text.includes("店铺名称：")) {
                    var shopName = text.replace("店铺名称：", "").trim();
                    if (shopName) {
                        logger.addLog(window, "✅ 通过遍历text提取到店铺名称: " + shopName);
                        return shopName;
                    }
                }
            }

            if (retry < maxRetries - 1) {
                logger.addLog(window, "第 " + (retry + 1) + " 次尝试未找到店铺名称，准备重试...");
            }

        } catch (e) {
            logger.addLog(window, "第 " + (retry + 1) + " 次获取店铺名称时出错: " + e.message);
            if (retry < maxRetries - 1) {
                logger.addLog(window, "准备重试...");
            }
        }
    }

    logger.addLog(window, "❌ 经过 " + maxRetries + " 次尝试仍未找到店铺名称");
    return null;
};

/**
 * 查找待收货商品元素（保留原方法作为备用）
 * @returns {Array} 商品元素数组
 */
DeliveryTracking.prototype.findDeliveryElements = function() {
    var deliverySelectors = [
        // 查找包含物流信息的容器
        textContains("物流"),
        textContains("快递"),
        textContains("运单"),
        textContains("单号"),
        textContains("查看物流"),
        textContains("物流信息"),
        descContains("物流"),
        descContains("快递"),
        descContains("运单"),
        descContains("单号")
    ];

    var elements = [];

    for (var i = 0; i < deliverySelectors.length; i++) {
        var found = deliverySelectors[i].find();
        for (var j = 0; j < found.length; j++) {
            elements.push(found[j]);
        }
    }

    return elements;
};

/**
 * 在物流详情页提取快递信息（通过点击复制按钮获取）
 * @param {Object} window 悬浮窗对象
 * @param {number} index 商品索引
 * @returns {Array} 快递信息数组
 */
DeliveryTracking.prototype.extractDeliveryInfoFromLogisticsPage = function(window, index) {
    logger.addLog(window, "正在从第 " + index + " 个物流详情页提取快递信息...");

    try {
        var deliveryInfos = [];
        var processedTrackingNumbers = new Set(); // 用于去重

        // 等待页面加载完成
        waitTimeManager.wait('short');

        // 保存当前剪贴板内容
        var originalClipboard = "";
        try {
            originalClipboard = getClip();
        } catch (e) {
            logger.addLog(window, "无法获取当前剪贴板内容");
        }

        // 查找页面中的复制按钮
        var copyButtons = this.findCopyButtons(window);

        if (copyButtons.length === 0) {
            logger.addLog(window, "未找到复制按钮");
            return deliveryInfos;
        }

        logger.addLog(window, "找到 " + copyButtons.length + " 个复制按钮");

        // 点击所有复制按钮获取快递单号
        for (var i = 0; i < copyButtons.length && !GlobalStopManager.isStopRequested(); i++) {
            logger.addLog(window, "尝试点击第 " + (i + 1) + " 个复制按钮");

            if (safeClick(copyButtons[i])) {
                logger.addLog(window, "成功点击第 " + (i + 1) + " 个复制按钮");

                // 等待复制操作完成
                waitTimeManager.wait('short');

                // 获取复制后的剪贴板内容
                try {
                    var newClipboard = getClip();

                    if (newClipboard && newClipboard !== originalClipboard) {
                        logger.addLog(window, "剪贴板内容已更新: " + newClipboard);

                        // 验证是否为快递单号
                        var trackingNumber = this.extractTrackingNumberFromText(newClipboard);
                        if (trackingNumber && !processedTrackingNumbers.has(trackingNumber)) {
                            processedTrackingNumbers.add(trackingNumber);

                            // 根据单号识别快递公司
                            var company = this.identifyExpressCompanyByTrackingNumber(trackingNumber);
                            if (!company) {
                                // 如果根据单号无法识别，尝试从页面查找
                                company = this.findExpressCompanyInPage(window);
                            }

                            var deliveryInfo = {
                                company: company || "未知快递",
                                trackingNumber: trackingNumber,
                                index: deliveryInfos.length + 1
                            };

                            deliveryInfos.push(deliveryInfo);
                            logger.addLog(window, "✅ 获取到快递信息: " + deliveryInfo.company + " - " + trackingNumber);
                        } else if (trackingNumber) {
                            logger.addLog(window, "快递单号已存在，跳过: " + trackingNumber);
                        } else {
                            logger.addLog(window, "复制的内容不是有效的快递单号: " + newClipboard);
                        }

                        // 更新原始剪贴板内容
                        originalClipboard = newClipboard;
                    } else {
                        logger.addLog(window, "剪贴板内容未发生变化");
                    }
                } catch (e) {
                    logger.addLog(window, "获取剪贴板内容失败: " + e.message);
                }
            } else {
                logger.addLog(window, "点击第 " + (i + 1) + " 个复制按钮失败");
            }

            // 短暂等待，避免操作过快
            waitTimeManager.wait('short');
        }

        if (deliveryInfos.length > 0) {
            logger.addLog(window, "✅ 第 " + index + " 个商品共获取到 " + deliveryInfos.length + " 个快递信息");
        } else {
            logger.addLog(window, "⚠️ 第 " + index + " 个商品未找到快递信息");
        }

        return deliveryInfos;

    } catch (e) {
        logger.addLog(window, "提取第 " + index + " 个商品快递信息时出错: " + e.message);
        return [];
    }
};

/**
 * 获取按钮的唯一标识符（用于去重）
 * @param {Object} button 按钮元素
 * @returns {string} 按钮标识符
 */
DeliveryTracking.prototype.getButtonIdentifier = function(button) {
    try {
        // 使用按钮的位置和文本作为唯一标识
        var bounds = button.bounds();
        var text = button.text() || button.desc() || "";
        return bounds.left + "_" + bounds.top + "_" + text;
    } catch (e) {
        // 如果获取失败，使用随机数
        return Math.random().toString();
    }
};

/**
 * 在待收货页面向下滚动
 * @param {Object} window 悬浮窗对象
 */
DeliveryTracking.prototype.scrollDownInDeliveryPage = function(window) {
    logger.addLog(window, "在待收货页面向下滚动...");

    try {
        var screenHeight = device.height;
        var screenWidth = device.width;

        // 在页面中部向下滚动
        var startY = screenHeight * 0.7;
        var endY = screenHeight * 0.3;

        swipe(screenWidth / 2, startY, screenWidth / 2, endY, 800);

        logger.addLog(window, "待收货页面滚动操作完成");

    } catch (e) {
        logger.addLog(window, "滚动待收货页面时出错: " + e.message);
    }
};

/**
 * 从容器中提取快递信息（保留原方法作为备用）
 * @param {Object} window 悬浮窗对象
 * @param {Object} container 包含复制按钮的容器
 * @param {number} index 商品索引
 * @returns {Object|null} 包含快递公司和单号的对象
 */
DeliveryTracking.prototype.extractDeliveryInfoFromContainer = function(window, container, index) {
    logger.addLog(window, "正在从第 " + index + " 个容器提取快递信息...");

    try {
        var deliveryInfo = {
            company: null,
            trackingNumber: null,
            index: index
        };

        // 查找快递公司名称
        deliveryInfo.company = this.findExpressCompanyInContainer(window, container);

        // 查找快递单号
        var allTextElements = container.find(className("android.widget.TextView"));
        for (var i = 0; i < allTextElements.length; i++) {
            var text = allTextElements[i].text();
            var trackingNumber = this.extractTrackingNumberFromText(text);
            if (trackingNumber) {
                deliveryInfo.trackingNumber = trackingNumber;
                logger.addLog(window, "找到快递单号: " + trackingNumber);
                break;
            }
        }

        // 如果找到了快递公司或单号，返回信息
        if (deliveryInfo.company || deliveryInfo.trackingNumber) {
            logger.addLog(window, "✅ 第 " + index + " 个商品快递信息: " +
                         (deliveryInfo.company || "未知快递") + " - " +
                         (deliveryInfo.trackingNumber || "未找到单号"));
            return deliveryInfo;
        } else {
            logger.addLog(window, "⚠️ 第 " + index + " 个商品未找到完整快递信息");
        }

    } catch (e) {
        logger.addLog(window, "提取第 " + index + " 个商品快递信息时出错: " + e.message);
    }

    return null;
};

/**
 * 通过点击复制按钮获取所有快递单号（支持滚动和去重）
 * @param {Object} window 悬浮窗对象
 * @returns {Array} 快递信息数组
 */
DeliveryTracking.prototype.getAllTrackingNumbersByCopyButton = function(window) {
    logger.addLog(window, "通过点击复制按钮获取所有快递单号...");

    var allDeliveryInfos = [];
    var processedTrackingNumbers = new Set(); // 用于去重
    var maxScrollAttempts = 5; // 最大滚动次数
    var scrollAttempt = 0;

    try {
        // 保存当前剪贴板内容
        var originalClipboard = "";
        try {
            originalClipboard = getClip();
        } catch (e) {
            logger.addLog(window, "无法获取当前剪贴板内容");
        }

        while (scrollAttempt < maxScrollAttempts && !GlobalStopManager.isStopRequested()) {
            logger.addLog(window, "第 " + (scrollAttempt + 1) + " 次扫描页面...");

            // 查找当前页面的复制按钮
            var copyButtons = this.findCopyButtons(window);

            if (copyButtons.length === 0) {
                logger.addLog(window, "未找到复制按钮");
                break;
            }

            logger.addLog(window, "找到 " + copyButtons.length + " 个复制按钮");

            var foundNewTrackingNumber = false;

            // 点击所有复制按钮获取快递单号
            for (var i = 0; i < copyButtons.length; i++) {
                if (GlobalStopManager.isStopRequested()) break;

                logger.addLog(window, "尝试点击第 " + (i + 1) + " 个复制按钮");

                if (safeClick(copyButtons[i])) {
                    logger.addLog(window, "成功点击第 " + (i + 1) + " 个复制按钮");

                    // 等待复制操作完成
                    waitTimeManager.wait('short');

                    // 获取复制后的剪贴板内容
                    try {
                        var newClipboard = getClip();

                        if (newClipboard && newClipboard !== originalClipboard) {
                            logger.addLog(window, "剪贴板内容已更新: " + newClipboard);

                            // 验证是否为快递单号
                            var trackingNumber = this.extractTrackingNumberFromText(newClipboard);
                            if (trackingNumber && !processedTrackingNumbers.has(trackingNumber)) {
                                processedTrackingNumbers.add(trackingNumber);

                                // 根据单号识别快递公司
                                var company = this.identifyExpressCompanyByTrackingNumber(trackingNumber);
                                if (!company) {
                                    // 如果根据单号无法识别，尝试从页面查找
                                    company = this.findExpressCompanyInPage(window);
                                }

                                var deliveryInfo = {
                                    company: company || "未知快递",
                                    trackingNumber: trackingNumber,
                                    index: allDeliveryInfos.length + 1
                                };

                                allDeliveryInfos.push(deliveryInfo);
                                foundNewTrackingNumber = true;

                                logger.addLog(window, "✅ 获取到快递信息: " + deliveryInfo.company + " - " + trackingNumber);
                            } else if (trackingNumber) {
                                logger.addLog(window, "快递单号已存在，跳过: " + trackingNumber);
                            } else {
                                logger.addLog(window, "复制的内容不是有效的快递单号: " + newClipboard);
                            }

                            // 更新原始剪贴板内容
                            originalClipboard = newClipboard;
                        } else {
                            logger.addLog(window, "剪贴板内容未发生变化");
                        }
                    } catch (e) {
                        logger.addLog(window, "获取剪贴板内容失败: " + e.message);
                    }
                } else {
                    logger.addLog(window, "点击第 " + (i + 1) + " 个复制按钮失败");
                }

                // 短暂等待，避免操作过快
                waitTimeManager.wait('short');
            }

            // 如果没有找到新的快递单号，尝试滚动页面
            if (!foundNewTrackingNumber) {
                logger.addLog(window, "未找到新的快递单号，尝试向下滚动...");
                this.scrollDownInLogisticsPage(window);
                waitTimeManager.wait('pageStable');
            }

            scrollAttempt++;

            // 如果连续几次都没有找到新的单号，可能已经到底了
            if (!foundNewTrackingNumber && scrollAttempt >= 2) {
                logger.addLog(window, "连续未找到新单号，可能已扫描完所有内容");
                break;
            }
        }

        logger.addLog(window, "扫描完成，共获取到 " + allDeliveryInfos.length + " 个不重复的快递信息");
        return allDeliveryInfos;

    } catch (e) {
        logger.addLog(window, "通过复制按钮获取快递单号时出错: " + e.message);
        return allDeliveryInfos;
    }
};

/**
 * 查找页面中的复制按钮
 * @param {Object} window 悬浮窗对象
 * @returns {Array} 复制按钮数组
 */
DeliveryTracking.prototype.findCopyButtons = function(window) {
    logger.addLog(window, "查找页面中的复制按钮...");

    var copyButtons = [];

    try {
        // 方法1：通过RecyclerView查找复制按钮
        var recyclerView = id("pdd").className("android.support.v7.widget.RecyclerView").scrollable(true).depth(6).findOne();

        if (recyclerView) {
            logger.addLog(window, "在RecyclerView中查找复制按钮");
            var children = recyclerView.children();

            for (var i = 0; i < children.length; i++) {
                var child = children[i];
                var copyButton = child.findOne(id("pdd").className("android.widget.TextView").text("复制"));

                if (copyButton) {
                    copyButtons.push(copyButton);
                    logger.addLog(window, "在RecyclerView中找到第 " + copyButtons.length + " 个复制按钮");
                }
            }
        }

        // 方法2：如果RecyclerView中没找到，直接在页面查找
        if (copyButtons.length === 0) {
            logger.addLog(window, "在整个页面查找复制按钮");
            var allCopyButtons = text("复制").find();

            for (var i = 0; i < allCopyButtons.length; i++) {
                if (allCopyButtons[i].clickable()) {
                    copyButtons.push(allCopyButtons[i]);
                    logger.addLog(window, "在页面找到第 " + copyButtons.length + " 个复制按钮");
                }
            }
        }

        // 方法3：通过id和className查找
        if (copyButtons.length === 0) {
            logger.addLog(window, "通过id和className查找复制按钮");
            var idCopyButtons = id("pdd").className("android.widget.TextView").text("复制").find();

            for (var i = 0; i < idCopyButtons.length; i++) {
                copyButtons.push(idCopyButtons[i]);
                logger.addLog(window, "通过id找到第 " + copyButtons.length + " 个复制按钮");
            }
        }

    } catch (e) {
        logger.addLog(window, "查找复制按钮时出错: " + e.message);
    }

    return copyButtons;
};

/**
 * 在物流详情页向下滚动
 * @param {Object} window 悬浮窗对象
 */
DeliveryTracking.prototype.scrollDownInLogisticsPage = function(window) {
    logger.addLog(window, "在物流详情页向下滚动...");

    try {
        var screenHeight = device.height;
        var screenWidth = device.width;

        // 在页面中部向下滚动
        var startY = screenHeight * 0.6;
        var endY = screenHeight * 0.3;

        swipe(screenWidth / 2, startY, screenWidth / 2, endY, 500);

        logger.addLog(window, "滚动操作完成");

    } catch (e) {
        logger.addLog(window, "滚动页面时出错: " + e.message);
    }
};

/**
 * 在整个页面中查找快递公司名称
 * @param {Object} window 悬浮窗对象
 * @returns {string|null} 快递公司名称
 */
DeliveryTracking.prototype.findExpressCompanyInPage = function(window) {
    logger.addLog(window, "在整个页面查找快递公司名称...");

    try {
        // 使用 textContains("快递") 直接查找包含"快递"的元素
        var expressElements = textContains("快递").find();
        logger.addLog(window, "找到 " + expressElements.length + " 个包含'快递'的元素");

        for (var i = 0; i < expressElements.length; i++) {
            var text = expressElements[i].text();
            if (!text) continue;

            logger.addLog(window, "分析文本: " + text);
            var company = this.extractExpressCompanyFromText(text);
            if (company) {
                logger.addLog(window, "在页面找到快递公司: " + company);
                return company;
            }
        }

        logger.addLog(window, "在页面未找到快递公司信息");
        return null;

    } catch (e) {
        logger.addLog(window, "查找页面快递公司时出错: " + e.message);
        return null;
    }
};

/**
 * 在容器中查找快递公司名称
 * @param {Object} window 悬浮窗对象
 * @param {Object} container 容器元素
 * @returns {string|null} 快递公司名称
 */
DeliveryTracking.prototype.findExpressCompanyInContainer = function(window, container) {
    logger.addLog(window, "在容器中查找快递公司名称...");

    try {
        // 使用 textContains("快递") 在容器内查找包含"快递"的元素
        var expressElements = container.find(textContains("快递"));
        logger.addLog(window, "在容器中找到 " + expressElements.length + " 个包含'快递'的元素");

        for (var i = 0; i < expressElements.length; i++) {
            var text = expressElements[i].text();
            if (!text) continue;

            logger.addLog(window, "分析容器文本: " + text);
            var company = this.extractExpressCompanyFromText(text);
            if (company) {
                logger.addLog(window, "在容器找到快递公司: " + company);
                return company;
            }
        }

        logger.addLog(window, "在容器未找到快递公司信息");
        return null;

    } catch (e) {
        logger.addLog(window, "查找容器快递公司时出错: " + e.message);
        return null;
    }
};

/**
 * 从文本中提取快递公司名称
 * @param {string} text 文本内容
 * @returns {string|null} 快递公司名称
 */
DeliveryTracking.prototype.extractExpressCompanyFromText = function(text) {
    if (!text) return null;

    // 常见快递公司简称列表
    var expressCompanyNames = [
        "申通", "圆通", "中通", "韵达", "顺丰", "邮政", "德邦",
        "京东", "菜鸟", "百世", "天天", "国通", "汇通", "速尔",
        "宅急送", "EMS", "ems"
    ];

    // 如果文本包含"快递"，尝试提取前面的公司名称
    if (text.includes("快递")) {
        // 方法1：查找已知的快递公司名称
        for (var i = 0; i < expressCompanyNames.length; i++) {
            var companyName = expressCompanyNames[i];
            if (text.includes(companyName + "快递")) {
                return companyName + "快递";
            }
            if (text.includes(companyName)) {
                // 检查是否在"快递"前面
                var companyIndex = text.indexOf(companyName);
                var expressIndex = text.indexOf("快递", companyIndex);
                if (expressIndex > companyIndex && expressIndex - companyIndex <= 10) {
                    return companyName + "快递";
                }
            }
        }

        // 方法2：使用正则表达式提取"XX快递"格式
        var patterns = [
            /([一-龥]{2,4})快递/g,  // 2-4个中文字符 + 快递
            /([A-Za-z]{2,6})快递/g,  // 2-6个英文字符 + 快递
            /([一-龥A-Za-z]{2,6})快递/g  // 混合字符 + 快递
        ];

        for (var i = 0; i < patterns.length; i++) {
            var matches = text.match(patterns[i]);
            if (matches && matches.length > 0) {
                // 返回第一个匹配的结果
                var match = matches[0];
                // 过滤掉一些不太可能是快递公司的词
                var excludeWords = ["物流快递", "同城快递", "国际快递", "普通快递"];
                var isExcluded = false;
                for (var j = 0; j < excludeWords.length; j++) {
                    if (match.includes(excludeWords[j])) {
                        isExcluded = true;
                        break;
                    }
                }
                if (!isExcluded) {
                    return match;
                }
            }
        }

        // 方法3：如果上面都没匹配到，尝试提取"快递"前面的词
        var beforeExpress = text.match(/([一-龥A-Za-z]{1,6})快递/);
        if (beforeExpress && beforeExpress[1]) {
            var companyName = beforeExpress[1];
            // 简单验证是否可能是快递公司名称
            if (companyName.length >= 2 && companyName.length <= 4) {
                return companyName + "快递";
            }
        }
    }

    // 如果没有"快递"字样，查找已知的快递公司简称
    for (var i = 0; i < expressCompanyNames.length; i++) {
        if (text.includes(expressCompanyNames[i])) {
            return expressCompanyNames[i] + "快递";
        }
    }

    return null;
};

/**
 * 从商品元素中提取物流单号（保留原方法作为备用）
 * @param {Object} window 悬浮窗对象
 * @param {Object} element 商品元素
 * @param {number} index 商品索引
 * @returns {string|null} 物流单号
 */
DeliveryTracking.prototype.extractTrackingNumber = function(window, element, index) {
    logger.addLog(window, "正在获取第 " + index + " 个商品的物流单号...");

    try {
        // 尝试点击查看物流按钮
        if (safeClick(element)) {
            waitTimeManager.wait('pageStable');

            // 在物流详情页面查找单号
            var trackingNumber = this.findTrackingNumberInPage();

            if (trackingNumber) {
                logger.addLog(window, "✅ 获取到物流单号: " + trackingNumber);

                // 返回上一页
                back();
                waitTimeManager.wait('back');

                return trackingNumber;
            } else {
                logger.addLog(window, "⚠️ 未能在详情页找到物流单号");

                // 返回上一页
                back();
                waitTimeManager.wait('back');
            }
        }

        // 如果点击失败，尝试从当前页面直接提取
        var directNumber = this.extractTrackingNumberFromText(element.text());
        if (directNumber) {
            logger.addLog(window, "✅ 直接提取到物流单号: " + directNumber);
            return directNumber;
        }

    } catch (e) {
        logger.addLog(window, "获取第 " + index + " 个商品物流单号时出错: " + e.message);
    }

    return null;
};

/**
 * 在物流详情页面查找物流单号
 * @returns {string|null} 物流单号
 */
DeliveryTracking.prototype.findTrackingNumberInPage = function() {
    // 查找可能包含物流单号的元素
    var numberSelectors = [
        textMatches("\\d{10,}"), // 匹配10位以上数字
        textContains("单号"),
        textContains("运单"),
        descContains("单号"),
        descContains("运单")
    ];
    
    for (var i = 0; i < numberSelectors.length; i++) {
        var elements = numberSelectors[i].find();
        for (var j = 0; j < elements.length; j++) {
            var text = elements[j].text();
            var trackingNumber = this.extractTrackingNumberFromText(text);
            if (trackingNumber) {
                return trackingNumber;
            }
        }
    }
    
    return null;
};

/**
 * 从文本中提取物流单号
 * @param {string} text 文本内容
 * @returns {string|null} 物流单号
 */
DeliveryTracking.prototype.extractTrackingNumberFromText = function(text) {
    if (!text) return null;

    // 排除订单编号等非快递单号的内容
    if (this.isOrderNumber(text)) {
        return null;
    }

    // 常见的物流单号格式正则表达式（优先匹配带前缀的完整单号）
    var patterns = [
        /[A-Z]{2}\d{9,}/g,  // 两个大写字母+9位以上数字（如YT开头的圆通、JT开头的极兔）
        /[a-zA-Z]{2}\d{9,}/g,  // 两个字母+9位以上数字（如jt开头的极兔，大小写混合）
        /SF\d{10,}/gi,  // 顺丰快递（SF开头，不区分大小写）
        /\d{10,}/g,  // 10位以上纯数字（放在最后，避免截断带前缀的单号）
        /\d{4}\s?\d{4}\s?\d{4}/g,  // 分段数字格式
    ];

    for (var i = 0; i < patterns.length; i++) {
        var matches = text.match(patterns[i]);
        if (matches && matches.length > 0) {
            var trackingNumber = matches[0].replace(/\s/g, ''); // 移除空格

            // 验证提取的单号是否合理（长度检查）
            if (trackingNumber.length >= 10) {
                return trackingNumber;
            }
        }
    }

    return null;
};

/**
 * 判断文本是否为订单编号而非快递单号
 * @param {string} text 文本内容
 * @returns {boolean} 是否为订单编号
 */
DeliveryTracking.prototype.isOrderNumber = function(text) {
    if (!text) return false;

    // 转换为小写进行检查
    var lowerText = text.toLowerCase();

    // 订单编号的特征关键词
    var orderKeywords = [
        "订单编号",
        "订单号",
        "order",
        "订单",
        "order number",
        "order id",
        "单号：",
        "编号：",
        "order:",
        "订单:",
        "单据编号",
        "交易编号",
        "支付编号"
    ];

    // 检查是否包含订单编号关键词
    for (var i = 0; i < orderKeywords.length; i++) {
        if (lowerText.includes(orderKeywords[i])) {
            return true;
        }
    }

    // 检查是否为特定的订单编号格式（如：250806-600616476241872）
    if (/\d{6}-\d{15}/.test(text)) {
        return true;
    }

    // 检查是否包含连字符分隔的数字格式（通常是订单编号）
    if (/\d+-\d+/.test(text) && text.includes("-")) {
        return true;
    }

    return false;
};

/**
 * 根据快递单号识别快递公司
 * @param {string} trackingNumber 快递单号
 * @returns {string|null} 快递公司名称
 */
DeliveryTracking.prototype.identifyExpressCompanyByTrackingNumber = function(trackingNumber) {
    if (!trackingNumber) return null;

    // 根据快递单号规律识别快递公司
    var upperTrackingNumber = trackingNumber.toUpperCase();

    // 极兔快递：JT开头（优先检查，避免被其他规则误判）
    if (/^JT\d{10,}$/i.test(upperTrackingNumber)) {
        return "极兔快递";
    }

    // 圆通快递：YT开头
    if (/^YT\d{10,}$/i.test(upperTrackingNumber)) {
        return "圆通快递";
    }

    // 顺丰快递：SF开头
    if (/^SF\d{10,}$/i.test(upperTrackingNumber)) {
        return "顺丰快递";
    }

    // 申通快递：6开头或7开头的数字
    if (/^[67]\d{12,}$/.test(trackingNumber)) {
        return "申通快递";
    }

    // 韵达快递：4开头的数字
    if (/^4\d{12,}$/.test(trackingNumber)) {
        return "韵达快递";
    }

    // 中通快递：通常以数字开头，长度12-15位（排除其他已知规则）
    if (/^[1-9]\d{11,14}$/.test(trackingNumber) &&
        !trackingNumber.startsWith('4') &&
        !trackingNumber.startsWith('6') &&
        !trackingNumber.startsWith('7')) {
        return "中通快递";
    }

    // EMS/邮政：特定格式
    if (/^[A-Z]{2}\d{9}[A-Z]{2}$/i.test(upperTrackingNumber)) {
        return "邮政EMS";
    }

    // 百世快递：特定格式
    if (/^[A-Z]\d{12}$/i.test(upperTrackingNumber)) {
        return "百世快递";
    }

    return null;
};

/**
 * 刷新页面
 * @param {Object} window 悬浮窗对象
 */
DeliveryTracking.prototype.refreshPage = function(window) {
    logger.addLog(window, "正在刷新页面...");
    
    // 尝试下拉刷新
    var screenHeight = device.height;
    var screenWidth = device.width;
    
    swipe(screenWidth / 2, screenHeight * 0.3, screenWidth / 2, screenHeight * 0.7, 500);
    waitTimeManager.wait('pageStable');
};

/**
 * 复制快递信息到剪贴板
 * @param {Object} window 悬浮窗对象
 * @param {Array} deliveryInfos 快递信息数组
 */
DeliveryTracking.prototype.copyDeliveryInfosToClipboard = function(window, deliveryInfos) {
    if (deliveryInfos.length === 0) return;

    var clipboardLines = [];

    for (var i = 0; i < deliveryInfos.length; i++) {
        var info = deliveryInfos[i];
        var line = "";

        if (info.company) {
            line += info.company;
        }

        if (info.trackingNumber) {
            if (line) line += " - ";
            line += info.trackingNumber;
        }

        if (line) {
            clipboardLines.push(line);
        }
    }

    var clipboardText = clipboardLines.join('\n');

    try {
        setClip(clipboardText);
        logger.addLog(window, "✅ 快递信息已复制到剪贴板");
        toast("快递信息已复制到剪贴板");
    } catch (e) {
        logger.addLog(window, "❌ 复制到剪贴板失败: " + e.message);
    }
};

/**
 * 复制物流单号到剪贴板（保留原方法作为备用）
 * @param {Object} window 悬浮窗对象
 * @param {Array} trackingNumbers 物流单号数组
 */
DeliveryTracking.prototype.copyTrackingNumbersToClipboard = function(window, trackingNumbers) {
    if (trackingNumbers.length === 0) return;

    var clipboardText = trackingNumbers.join('\n');

    try {
        setClip(clipboardText);
        logger.addLog(window, "✅ 物流单号已复制到剪贴板");
        toast("物流单号已复制到剪贴板");
    } catch (e) {
        logger.addLog(window, "❌ 复制到剪贴板失败: " + e.message);
    }
};

/**
 * 显示结果
 * @param {Object} window 悬浮窗对象
 * @param {Array} deliveryInfos 快递信息数组
 */
DeliveryTracking.prototype.displayResults = function(window, deliveryInfos) {
    logger.addLog(window, "=== 快递信息获取结果 ===");

    for (var i = 0; i < deliveryInfos.length; i++) {
        var info = deliveryInfos[i];
        var displayText = (i + 1) + ". ";

        // 添加商品名称（如果有）
        if (info.productName) {
            // 截取商品名称前30个字符，避免显示过长
            var shortProductName = info.productName.length > 30 ?
                info.productName.substring(0, 30) + "..." :
                info.productName;
            displayText += "[" + shortProductName + "] ";
        }

        if (info.company) {
            displayText += info.company;
        } else {
            displayText += "未知快递";
        }

        if (info.trackingNumber) {
            displayText += " - " + info.trackingNumber;
        } else {
            displayText += " - 未找到单号";
        }

        logger.addLog(window, displayText);
    }

    logger.addLog(window, "总计: " + deliveryInfos.length + " 个快递信息");
    logger.addLog(window, "=== 功能执行完成 ===");
};

module.exports = DeliveryTracking;
