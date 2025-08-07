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
 * 通过查看物流按钮进入详情页查找快递信息
 * @param {Object} window 悬浮窗对象
 * @returns {Array} 快递信息数组，每个元素包含快递公司和单号
 */
DeliveryTracking.prototype.findDeliveryInfosByCopyButton = function(window) {
    logger.addLog(window, "开始查找待收货商品的物流信息（支持页面滚动）...");

    var deliveryInfos = [];
    var globalProcessedNumbers = new Set(); // 全局去重集合
    var processedButtonCount = 0;
    var maxScrollAttempts = 10; // 最大滚动次数
    var scrollAttempt = 0;
    var consecutiveNoNewButtons = 0; // 连续未找到新按钮的次数

    try {
        while (scrollAttempt < maxScrollAttempts && !GlobalStopManager.isStopRequested()) {
            logger.addLog(window, "第 " + (scrollAttempt + 1) + " 次扫描待收货页面...");

            // 查找当前页面的"查看物流"按钮
            var logisticsButtons = this.findLogisticsButtons(window);

            if (logisticsButtons.length === 0) {
                logger.addLog(window, "未找到查看物流按钮，尝试滚动查看更多商品");
                this.scrollDownInDeliveryListPage(window);
                waitTimeManager.wait('pageStable');
                scrollAttempt++;
                consecutiveNoNewButtons++;

                // 如果连续3次都没找到按钮，可能已经到底了
                if (consecutiveNoNewButtons >= 3) {
                    logger.addLog(window, "连续未找到查看物流按钮，可能已扫描完所有商品");
                    break;
                }
                continue;
            }

            logger.addLog(window, "找到 " + logisticsButtons.length + " 个查看物流按钮");

            var foundNewButtons = false;
            var currentRoundProcessed = 0;

            // 遍历当前页面的每个查看物流按钮
            for (var i = 0; i < logisticsButtons.length && !GlobalStopManager.isStopRequested(); i++) {
                processedButtonCount++;
                currentRoundProcessed++;

                logger.addLog(window, "正在处理第 " + processedButtonCount + " 个商品（当前页面第 " + (i + 1) + " 个）...");

                // 点击查看物流按钮
                if (safeClick(logisticsButtons[i])) {
                    logger.addLog(window, "成功点击第 " + processedButtonCount + " 个查看物流按钮");
                    waitTimeManager.wait('pageStable');

                    // 在物流详情页查找快递信息
                    var currentDeliveryInfos = this.extractDeliveryInfoFromLogisticsPage(window, processedButtonCount);

                    if (currentDeliveryInfos && currentDeliveryInfos.length > 0) {
                        // 对当前商品的快递信息进行全局去重
                        for (var j = 0; j < currentDeliveryInfos.length; j++) {
                            var info = currentDeliveryInfos[j];
                            if (!globalProcessedNumbers.has(info.trackingNumber)) {
                                globalProcessedNumbers.add(info.trackingNumber);
                                info.index = deliveryInfos.length + 1; // 重新编号
                                deliveryInfos.push(info);
                                logger.addLog(window, "添加新快递信息: " + info.company + " - " + info.trackingNumber);
                                foundNewButtons = true;
                            } else {
                                logger.addLog(window, "跳过重复快递单号: " + info.trackingNumber);
                            }
                        }
                    }

                    // 返回上一页
                    logger.addLog(window, "返回商品列表页面...");
                    back();
                    waitTimeManager.wait('back');

                } else {
                    logger.addLog(window, "点击第 " + processedButtonCount + " 个查看物流按钮失败");
                }

                // 短暂等待，避免操作过快
                waitTimeManager.wait('short');
            }

            logger.addLog(window, "本轮处理了 " + currentRoundProcessed + " 个商品，累计处理 " + processedButtonCount + " 个商品");

            // 更新连续未找到新按钮的计数
            if (foundNewButtons) {
                consecutiveNoNewButtons = 0;
            } else {
                consecutiveNoNewButtons++;
            }

            // 如果连续2次都没有找到新的有效按钮，可能已经到底了
            if (consecutiveNoNewButtons >= 2) {
                logger.addLog(window, "连续 " + consecutiveNoNewButtons + " 次未找到新的有效商品，可能已扫描完所有内容");
                break;
            }

            // 向下滚动待收货页面查看更多商品
            logger.addLog(window, "向下滚动待收货页面查看更多商品...");
            this.scrollDownInDeliveryListPage(window);
            waitTimeManager.wait('pageStable');

            scrollAttempt++;
        }

        logger.addLog(window, "扫描完成，共处理 " + processedButtonCount + " 个商品，获得 " + deliveryInfos.length + " 个不重复的快递信息");

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
 * 在物流详情页提取快递信息（支持滚动获取所有单号）
 * @param {Object} window 悬浮窗对象
 * @param {number} index 商品索引
 * @returns {Array} 快递信息数组
 */
DeliveryTracking.prototype.extractDeliveryInfoFromLogisticsPage = function(window, index) {
    logger.addLog(window, "正在从第 " + index + " 个物流详情页提取所有快递信息...");

    try {
        // 等待页面加载完成
        waitTimeManager.wait('short');

        // 通过点击复制按钮获取所有快递单号（支持滚动和去重）
        var deliveryInfos = this.getAllTrackingNumbersByCopyButton(window);

        if (deliveryInfos.length > 0) {
            logger.addLog(window, "✅ 第 " + index + " 个商品共获取到 " + deliveryInfos.length + " 个快递信息");
            return deliveryInfos;
        } else {
            logger.addLog(window, "⚠️ 第 " + index + " 个商品未找到快递信息");
            return [];
        }

    } catch (e) {
        logger.addLog(window, "提取第 " + index + " 个商品快递信息时出错: " + e.message);
        return [];
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
 * 通过点击复制按钮获取快递单号（简化版，不滚动）
 * @param {Object} window 悬浮窗对象
 * @returns {Array} 快递信息数组
 */
DeliveryTracking.prototype.getAllTrackingNumbersByCopyButton = function(window) {
    logger.addLog(window, "通过点击复制按钮获取快递单号...");

    var allDeliveryInfos = [];
    var processedTrackingNumbers = new Set(); // 用于去重

    try {
        // 保存当前剪贴板内容
        var originalClipboard = "";
        try {
            originalClipboard = getClip();
        } catch (e) {
            logger.addLog(window, "无法获取当前剪贴板内容");
        }

        // 查找当前页面的复制按钮
        var copyButtons = this.findCopyButtons(window);

        if (copyButtons.length === 0) {
            logger.addLog(window, "未找到复制按钮");
            return allDeliveryInfos;
        }

        logger.addLog(window, "找到 " + copyButtons.length + " 个复制按钮");

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

        logger.addLog(window, "获取完成，共获取到 " + allDeliveryInfos.length + " 个快递信息");
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
 * 在待收货页面向下滚动
 * @param {Object} window 悬浮窗对象
 */
DeliveryTracking.prototype.scrollDownInDeliveryListPage = function(window) {
    logger.addLog(window, "在待收货页面向下滚动...");

    try {
        var screenHeight = device.height;
        var screenWidth = device.width;

        // 在待收货页面向下滚动，从屏幕的80%位置滚动到30%位置
        var startY = screenHeight * 0.8;
        var endY = screenHeight * 0.3;

        swipe(screenWidth / 2, startY, screenWidth / 2, endY, 1000);

        logger.addLog(window, "待收货页面滚动操作完成");

    } catch (e) {
        logger.addLog(window, "滚动待收货页面时出错: " + e.message);
    }
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

        // 执行多次小幅度滚动，确保能看到更多内容
        for (var i = 0; i < 3; i++) {
            // 从屏幕的70%位置滚动到20%位置，滚动幅度更大
            var startY = screenHeight * 0.7;
            var endY = screenHeight * 0.2;

            swipe(screenWidth / 2, startY, screenWidth / 2, endY, 800);

            // 每次滚动后稍作等待
            waitTimeManager.wait('short');
        }

        logger.addLog(window, "完成3次滚动操作");

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

    // 常见的物流单号格式正则表达式
    var patterns = [
        /\d{10,}/g,  // 10位以上数字
        /[A-Z]{2}\d{9,}/g,  // 两个字母+9位以上数字（如YT开头的圆通）
        /[a-zA-Z]{2}\d{9,}/g,  // 两个字母+9位以上数字（如jt开头的极兔）
        /\d{4}\s?\d{4}\s?\d{4}/g,  // 分段数字格式
    ];

    for (var i = 0; i < patterns.length; i++) {
        var matches = text.match(patterns[i]);
        if (matches && matches.length > 0) {
            return matches[0].replace(/\s/g, ''); // 移除空格
        }
    }

    return null;
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

    // 申通快递：6开头或7开头的数字
    if (/^[67]\d{12,}$/.test(trackingNumber)) {
        return "申通快递";
    }

    // 极兔快递：JT开头
    if (/^JT\d{10,}$/i.test(upperTrackingNumber)) {
        return "极兔快递";
    }

    // 韵达快递：4开头的数字
    if (/^4\d{12,}$/.test(trackingNumber)) {
        return "韵达快递";
    }

    // 圆通快递：YT开头
    if (/^YT\d{10,}$/i.test(upperTrackingNumber)) {
        return "圆通快递";
    }

    // 中通快递：通常以数字开头，长度12-15位
    if (/^[1-9]\d{11,14}$/.test(trackingNumber) && !trackingNumber.startsWith('4') && !trackingNumber.startsWith('6') && !trackingNumber.startsWith('7')) {
        return "中通快递";
    }

    // 顺丰快递：SF开头或特定数字格式
    if (/^SF\d{10,}$/i.test(upperTrackingNumber)) {
        return "顺丰快递";
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
