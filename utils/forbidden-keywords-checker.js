// 禁止关键词检测工具模块
// 提供统一的关键词检测功能，避免代码重复

const logger = require('./logger.js');
const { waitTimeManager } = require('./wait-time-manager.js');

/**
 * 禁止关键词检测器构造函数
 */
function ForbiddenKeywordsChecker() {
    // 定义禁止购买的关键词列表
    this.forbiddenKeywords = [
        "定制",
        "顺丰",
        "定做",
        "私人定制",
        "个性定制",
        "专属定制",
        "来图定制",
        "按需定制",
        "客制化",
        "个人定制",
        "DIY定制",
        "补差价",
        "偏远地区",
        "勿拍",
        "请勿拍",
        "不要拍",
        "禁止拍",
        "联系客服",
        "无需下单",
        "预售"
    ];
}

/**
 * 检查页面是否包含禁止购买的关键词
 * @param {Object} window 悬浮窗对象
 * @param {string} context 检测上下文描述（如"商品详情页"、"规格选择页面"等）
 * @param {number} waitTime 等待页面加载的时间（毫秒），默认0
 * @returns {boolean} 是否包含禁止关键词
 */
ForbiddenKeywordsChecker.prototype.containsForbiddenKeywords = function(window, context, waitTime) {
    try {
        context = context || "页面";
        waitTime = waitTime || 0;
        
        logger.addLog(window, "检查" + context + "是否包含禁止购买的关键词...");
        
        // 如果指定了等待时间，先等待页面加载
        if (waitTime > 0) {
            waitTimeManager.wait(waitTime);
        }
        
        // 获取页面所有文本元素
        var allTexts = textMatches(/.*/).find();
        
        for (var i = 0; i < allTexts.length; i++) {
            var element = allTexts[i];
            var text = element.text();
            
            if (!text) continue;
            
            // 检查文本是否包含禁止关键词
            for (var j = 0; j < this.forbiddenKeywords.length; j++) {
                if (text.indexOf(this.forbiddenKeywords[j]) !== -1) {
                    logger.addLog(window, "🚫 " + context + "发现禁止关键词: '" + this.forbiddenKeywords[j] + "' 在文本: '" + text + "'");
                    return true;
                }
            }
        }
        
        logger.addLog(window, "✅ " + context + "未发现禁止购买的关键词，可以继续购买");
        return false;
        
    } catch (e) {
        logger.addLog(window, "检查" + context + "禁止关键词时出错: " + e.message);
        // 出错时为了安全起见，返回false允许继续
        return false;
    }
};

/**
 * 添加新的禁止关键词
 * @param {string|Array} keywords 要添加的关键词（字符串或字符串数组）
 */
ForbiddenKeywordsChecker.prototype.addForbiddenKeywords = function(keywords) {
    if (typeof keywords === 'string') {
        if (this.forbiddenKeywords.indexOf(keywords) === -1) {
            this.forbiddenKeywords.push(keywords);
        }
    } else if (Array.isArray(keywords)) {
        for (var i = 0; i < keywords.length; i++) {
            if (this.forbiddenKeywords.indexOf(keywords[i]) === -1) {
                this.forbiddenKeywords.push(keywords[i]);
            }
        }
    }
};

/**
 * 移除禁止关键词
 * @param {string|Array} keywords 要移除的关键词（字符串或字符串数组）
 */
ForbiddenKeywordsChecker.prototype.removeForbiddenKeywords = function(keywords) {
    if (typeof keywords === 'string') {
        var index = this.forbiddenKeywords.indexOf(keywords);
        if (index !== -1) {
            this.forbiddenKeywords.splice(index, 1);
        }
    } else if (Array.isArray(keywords)) {
        for (var i = 0; i < keywords.length; i++) {
            var index = this.forbiddenKeywords.indexOf(keywords[i]);
            if (index !== -1) {
                this.forbiddenKeywords.splice(index, 1);
            }
        }
    }
};

/**
 * 获取当前的禁止关键词列表
 * @returns {Array} 禁止关键词数组
 */
ForbiddenKeywordsChecker.prototype.getForbiddenKeywords = function() {
    return this.forbiddenKeywords.slice(); // 返回副本，避免外部修改
};

/**
 * 重置禁止关键词列表为默认值
 */
ForbiddenKeywordsChecker.prototype.resetToDefault = function() {
    this.forbiddenKeywords = [
        "定制",
        "顺丰",
        "定做",
        "私人定制",
        "个性定制",
        "专属定制",
        "来图定制",
        "按需定制",
        "无需下单",
        "客制化",
        "个人定制",
        "DIY定制",
        "补差价",
        "偏远地区",
        "教学视频",
        "视频",
        "教程",
        "代发",
        "淘宝"

    ];
};

module.exports = ForbiddenKeywordsChecker;
