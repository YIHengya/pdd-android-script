// 等待时间管理器
// 统一管理所有等待时间，支持倍率调节

const { PDD_CONFIG } = require('../config/app-config.js');

/**
 * 等待时间管理器构造函数
 */
function WaitTimeManager() {
    // 默认倍率为6.0（默认6倍速）
    this.speedMultiplier = 6.0;
    
    // 基础等待时间配置（从配置文件获取）
    this.baseWaitTimes = PDD_CONFIG.waitTimes;
    
    // 扩展的等待时间类型
    this.extendedWaitTimes = {
        // 极短等待时间
        veryShort: 300,
        // 短等待时间  
        short: 500,
        // 中短等待时间
        mediumShort: 1000,
        // 中等等待时间
        medium: 1500,
        // 中长等待时间
        mediumLong: 2500,
        // 长等待时间
        long: 3000,
        // 极长等待时间
        veryLong: 5000,
        // 重试间隔
        retryInterval: 2000,
        // 页面稳定等待
        pageStable: 1000,
        // 动画等待
        animation: 800,
        // 网络请求等待
        networkRequest: 3000,
        // 用户操作反应时间
        userReaction: 1200
    };
}

/**
 * 设置速度倍率
 * @param {number} multiplier 速度倍率（0.1-10.0）
 * 0.1 = 10倍慢（调试模式）
 * 0.5 = 2倍慢
 * 1.0 = 正常速度
 * 2.0 = 2倍快
 * 10.0 = 10倍快（超极速模式）
 */
WaitTimeManager.prototype.setSpeedMultiplier = function(multiplier) {
    // 限制倍率范围
    if (multiplier < 0.1) multiplier = 0.1;
    if (multiplier > 10.0) multiplier = 10.0;
    
    this.speedMultiplier = multiplier;
    console.log("等待时间倍率已设置为: " + multiplier + "x");
};

/**
 * 获取当前速度倍率
 * @returns {number} 当前速度倍率
 */
WaitTimeManager.prototype.getSpeedMultiplier = function() {
    return this.speedMultiplier;
};

/**
 * 获取调整后的等待时间
 * @param {string} timeType 等待时间类型
 * @returns {number} 调整后的等待时间（毫秒）
 */
WaitTimeManager.prototype.getWaitTime = function(timeType) {
    var baseTime = 0;
    
    // 首先从基础配置中查找
    if (this.baseWaitTimes[timeType] !== undefined) {
        baseTime = this.baseWaitTimes[timeType];
    }
    // 然后从扩展配置中查找
    else if (this.extendedWaitTimes[timeType] !== undefined) {
        baseTime = this.extendedWaitTimes[timeType];
    }
    // 如果是数字，直接使用
    else if (typeof timeType === 'number') {
        baseTime = timeType;
    }
    // 未找到对应类型，使用默认值
    else {
        console.warn("未知的等待时间类型: " + timeType + "，使用默认值1000ms");
        baseTime = 1000;
    }
    
    // 应用速度倍率（倍率越小，等待时间越长）
    var adjustedTime = Math.round(baseTime / this.speedMultiplier);
    
    // 确保最小等待时间不少于50ms
    if (adjustedTime < 50) adjustedTime = 50;
    
    return adjustedTime;
};

/**
 * 执行等待，支持中断
 * @param {string|number} timeType 等待时间类型或具体毫秒数
 * @returns {boolean} 是否等待成功（false表示被中断）
 */
WaitTimeManager.prototype.wait = function(timeType) {
    var waitTime = this.getWaitTime(timeType);
    
    // 如果等待时间很短，直接等待
    if (waitTime <= 100) {
        sleep(waitTime);
        return true;
    }
    
    // 对于较长的等待时间，分段等待并检查停止标志
    var startTime = new Date().getTime();
    var endTime = startTime + waitTime;
    var checkInterval = 100; // 每100毫秒检查一次停止标志
    
    while (new Date().getTime() < endTime) {
        // 检查全局停止标志
        if (global.scriptStopped === true) {
            console.log("等待被中断：检测到停止标志");
            return false;
        }
        
        // 检查剩余等待时间
        var remaining = endTime - new Date().getTime();
        if (remaining <= 0) break;
        
        // 等待一个检查间隔或剩余时间（取较小值）
        sleep(Math.min(checkInterval, remaining));
    }
    
    return true;
};

/**
 * 获取所有可用的等待时间类型
 * @returns {Object} 所有等待时间类型及其基础值
 */
WaitTimeManager.prototype.getAllWaitTimeTypes = function() {
    var allTypes = {};
    
    // 合并基础配置和扩展配置
    for (var key in this.baseWaitTimes) {
        allTypes[key] = this.baseWaitTimes[key];
    }
    
    for (var key in this.extendedWaitTimes) {
        allTypes[key] = this.extendedWaitTimes[key];
    }
    
    return allTypes;
};

/**
 * 获取速度模式描述
 * @returns {string} 当前速度模式的描述
 */
WaitTimeManager.prototype.getSpeedModeDescription = function() {
    var multiplier = this.speedMultiplier;
    
    if (multiplier <= 0.2) {
        return "极慢模式 (调试用)";
    } else if (multiplier <= 0.5) {
        return "慢速模式";
    } else if (multiplier <= 0.8) {
        return "较慢模式";
    } else if (multiplier <= 1.2) {
        return "正常模式";
    } else if (multiplier <= 2.0) {
        return "快速模式";
    } else if (multiplier <= 5.0) {
        return "高速模式";
    } else {
        return "超极速模式";
    }
};

/**
 * 重置为默认速度
 */
WaitTimeManager.prototype.resetToDefault = function() {
    this.speedMultiplier = 1.0;
    console.log("等待时间倍率已重置为默认值: 1.0x");
};

/**
 * 预设速度模式
 */
WaitTimeManager.prototype.setPresetMode = function(mode) {
    switch (mode) {
        case 'debug':
            this.setSpeedMultiplier(0.1);
            break;
        case 'slow':
            this.setSpeedMultiplier(0.5);
            break;
        case 'normal':
            this.setSpeedMultiplier(1.0);
            break;
        case 'fast':
            this.setSpeedMultiplier(2.0);
            break;
        case 'turbo':
            this.setSpeedMultiplier(5.0);
            break;
        case 'ultra':
            this.setSpeedMultiplier(10.0);
            break;
        default:
            console.warn("未知的预设模式: " + mode);
            this.setSpeedMultiplier(1.0);
    }
};

// 创建全局单例实例
var globalWaitTimeManager = new WaitTimeManager();

module.exports = {
    WaitTimeManager: WaitTimeManager,
    // 导出全局实例，方便直接使用
    waitTimeManager: globalWaitTimeManager
};
