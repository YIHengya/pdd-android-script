// 通用工具模块
// 提供通用的工具函数

/**
 * 解析价格文本，提取数字
 * @param {string} priceText 价格文本
 * @returns {number|null} 解析后的价格数字，失败返回null
 */
function parsePrice(priceText) {
    if (!priceText) return null;

    // 移除所有非数字和小数点的字符
    var cleanPrice = priceText.replace(/[^\d.]/g, '');

    // 如果包含多个小数点，只保留第一个
    var parts = cleanPrice.split('.');
    if (parts.length > 2) {
        cleanPrice = parts[0] + '.' + parts.slice(1).join('');
    }

    var price = parseFloat(cleanPrice);
    return isNaN(price) ? null : price;
}

/**
 * 等待指定时间
 * @param {number} ms 等待时间（毫秒）
 */
function wait(ms) {
    sleep(ms);
}

/**
 * 获取当前时间戳字符串
 * @returns {string} 格式化的时间戳
 */
function getTimestamp() {
    return new Date().toLocaleTimeString();
}

/**
 * 安全点击元素
 * @param {Object} element UI元素
 * @returns {boolean} 是否点击成功
 */
function safeClick(element) {
    if (!element) return false;
    
    try {
        // 方式1：直接点击
        if (element.clickable()) {
            element.click();
            return true;
        }
        
        // 方式2：点击父元素
        var parent = element.parent();
        if (parent && parent.clickable()) {
            parent.click();
            return true;
        }
        
        // 方式3：使用坐标点击
        var bounds = element.bounds();
        if (bounds) {
            click(bounds.centerX(), bounds.centerY());
            return true;
        }
    } catch (e) {
        console.error("点击失败: " + e.message);
    }
    
    return false;
}

/**
 * 检查是否在指定的APP中
 * @param {string[]} packageNames 包名数组
 * @returns {boolean} 是否在指定APP中
 */
function isInApp(packageNames) {
    var currentPkg = currentPackage();
    
    for (var i = 0; i < packageNames.length; i++) {
        if (currentPkg === packageNames[i]) {
            return true;
        }
    }
    
    return false;
}

/**
 * 检查UI元素是否存在
 * @param {Object[]} selectors UI选择器数组
 * @returns {Object|null} 找到的元素或null
 */
function findAnyElement(selectors) {
    for (var i = 0; i < selectors.length; i++) {
        var element = selectors[i].findOne(1000);
        if (element) {
            return element;
        }
    }
    return null;
}

/**
 * 向下滚动（使用随机坐标）
 * @param {number} duration 滑动持续时间（毫秒），默认300
 */
function scrollDownWithRandomCoords(duration) {
    duration = duration || 300;

    // 获取屏幕尺寸
    var screenWidth = device.width;
    var screenHeight = device.height;

    // 生成随机的X坐标（在屏幕中央区域，避免边缘）
    var randomX = Math.floor(screenWidth * 0.3 + Math.random() * screenWidth * 0.4);

    // 起始Y坐标（屏幕下方2/3处）
    var startY = Math.floor(screenHeight * 0.65 + Math.random() * screenHeight * 0.1);

    // 结束Y坐标（屏幕上方1/3处）
    var endY = Math.floor(screenHeight * 0.25 + Math.random() * screenHeight * 0.1);

    try {
        // 执行向下滑动（从下往上滑动实现向下滚动）
        swipe(randomX, startY, randomX, endY, duration);
    } catch (e) {
        console.error("向下滚动失败: " + e.message);
    }
}

module.exports = {
    parsePrice,
    wait,
    getTimestamp,
    safeClick,
    isInApp,
    findAnyElement,
    scrollDownWithRandomCoords
};
