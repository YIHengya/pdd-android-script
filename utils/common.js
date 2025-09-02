// 通用工具模块
// 提供通用的工具函数

/**
 * 全局停止管理器
 */
var GlobalStopManager = {
    // 停止标志
    shouldStop: false,

    // 所有活跃的线程
    activeThreads: [],

    // 所有活跃的定时器
    activeIntervals: [],

    // 当前运行的脚本数量
    runningScripts: 0,

    /**
     * 设置停止标志
     */
    stop: function() {
        this.shouldStop = true;
        console.log("GlobalStopManager: 设置全局停止标志");
    },

    /**
     * 重置停止标志
     */
    reset: function() {
        this.shouldStop = false;
        console.log("GlobalStopManager: 重置全局停止标志");
    },

    /**
     * 智能重置 - 只有在没有运行脚本时才重置
     */
    smartReset: function() {
        if (this.runningScripts <= 0) {
            this.shouldStop = false;
            console.log("GlobalStopManager: 智能重置全局停止标志");
        } else {
            console.log("GlobalStopManager: 有脚本正在运行，跳过重置");
        }
    },

    /**
     * 开始脚本 - 增加运行计数并重置停止标志
     */
    startScript: function() {
        this.runningScripts++;
        this.shouldStop = false;
        console.log("GlobalStopManager: 开始脚本，当前运行数量: " + this.runningScripts);
    },

    /**
     * 结束脚本 - 减少运行计数
     */
    endScript: function() {
        this.runningScripts = Math.max(0, this.runningScripts - 1);
        console.log("GlobalStopManager: 结束脚本，当前运行数量: " + this.runningScripts);
    },

    /**
     * 检查是否应该停止
     * @returns {boolean} 是否应该停止
     */
    isStopRequested: function() {
        return this.shouldStop;
    },

    /**
     * 注册线程
     * @param {Object} thread 线程对象
     */
    registerThread: function(thread) {
        if (thread && this.activeThreads.indexOf(thread) === -1) {
            this.activeThreads.push(thread);
            console.log("GlobalStopManager: 注册线程，当前活跃线程数: " + this.activeThreads.length);
        }
    },

    /**
     * 注销线程
     * @param {Object} thread 线程对象
     */
    unregisterThread: function(thread) {
        var index = this.activeThreads.indexOf(thread);
        if (index !== -1) {
            this.activeThreads.splice(index, 1);
            console.log("GlobalStopManager: 注销线程，当前活跃线程数: " + this.activeThreads.length);
        }
    },

    /**
     * 注册定时器
     * @param {number} intervalId 定时器ID
     */
    registerInterval: function(intervalId) {
        if (intervalId && this.activeIntervals.indexOf(intervalId) === -1) {
            this.activeIntervals.push(intervalId);
            console.log("GlobalStopManager: 注册定时器，当前活跃定时器数: " + this.activeIntervals.length);
        }
    },

    /**
     * 停止所有线程和定时器
     */
    shutdownAll: function() {
        console.log("GlobalStopManager: 开始停止所有线程和定时器...");

        // 设置停止标志
        this.stop();

        // 停止所有线程
        for (var i = 0; i < this.activeThreads.length; i++) {
            try {
                if (this.activeThreads[i] && this.activeThreads[i].interrupt) {
                    this.activeThreads[i].interrupt();
                    console.log("GlobalStopManager: 停止线程 " + i);
                }
            } catch (e) {
                console.error("GlobalStopManager: 停止线程失败: " + e.message);
            }
        }

        // 清空线程列表
        this.activeThreads = [];

        // 清除所有定时器
        for (var j = 0; j < this.activeIntervals.length; j++) {
            try {
                clearInterval(this.activeIntervals[j]);
                console.log("GlobalStopManager: 清除定时器 " + j);
            } catch (e) {
                console.error("GlobalStopManager: 清除定时器失败: " + e.message);
            }
        }

        // 清空定时器列表
        this.activeIntervals = [];

        // 重置运行脚本计数
        this.runningScripts = 0;

        console.log("GlobalStopManager: 所有线程和定时器已停止");

        // 调用AutoJS的线程停止方法
        try {
            threads.shutDownAll();
            console.log("GlobalStopManager: 调用 threads.shutDownAll() 成功");
        } catch (e) {
            console.error("GlobalStopManager: 调用 threads.shutDownAll() 失败: " + e.message);
        }

        // 延迟重置停止标志，给脚本一些时间完全停止
        var self = this;
        setTimeout(function() {
            if (self.runningScripts <= 0) {
                self.shouldStop = false;
                console.log("GlobalStopManager: 延迟重置停止标志完成");
            }
        }, 2000);
    },

    /**
     * 强制重置所有状态 - 用于解决停止标志持久化问题
     */
    forceReset: function() {
        this.shouldStop = false;
        this.runningScripts = 0;
        this.activeThreads = [];
        this.activeIntervals = [];
        console.log("GlobalStopManager: 强制重置所有状态完成");
    }
};

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
 * @deprecated 建议使用 waitTimeManager.wait() 替代
 */
function wait(ms) {
    try {
        // 延用等待时间管理器以支持变速
        var mgr = require('./wait-time-manager.js').waitTimeManager;
        mgr.wait(ms);
    } catch (e) {
        // 兜底：如果管理器不可用则直接睡眠
        sleep(ms);
    }
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
 * 滚动页面（使用随机坐标）
 * @param {string} direction 滚动方向，'down'向下滚动，'up'向上滚动，默认'down'
 * @param {number} duration 滑动持续时间（毫秒），默认300
 */
function scrollWithRandomCoords(direction, duration) {
    direction = direction || 'down';
    duration = duration || 300;

    // 获取屏幕尺寸
    var screenWidth = device.width;
    var screenHeight = device.height;

    // 生成随机的X坐标（在屏幕中央区域，避免边缘）
    var randomX = Math.floor(screenWidth * 0.3 + Math.random() * screenWidth * 0.4);

    var startY, endY;

    if (direction === 'up') {
        // 向上滚动：起始Y坐标（屏幕上方1/4处），结束Y坐标（屏幕下方3/4处）
        startY = Math.floor(screenHeight * 0.25 + Math.random() * screenHeight * 0.05);
        endY = Math.floor(screenHeight * 0.75 + Math.random() * screenHeight * 0.05);
    } else {
        // 向下滚动：起始Y坐标（屏幕下方3/4处），结束Y坐标（屏幕上方1/4处）
        startY = Math.floor(screenHeight * 0.75 + Math.random() * screenHeight * 0.05);
        endY = Math.floor(screenHeight * 0.25 + Math.random() * screenHeight * 0.05);
    }

    try {
        // 执行滑动
        swipe(randomX, startY, randomX, endY, duration);
    } catch (e) {
        console.error(direction === 'up' ? "向上滚动失败: " : "向下滚动失败: " + e.message);
    }
}



module.exports = {
    GlobalStopManager,
    parsePrice,
    wait,
    getTimestamp,
    safeClick,
    isInApp,
    findAnyElement,
    scrollWithRandomCoords
};
