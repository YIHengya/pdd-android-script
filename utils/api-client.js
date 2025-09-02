// API客户端模块
// 处理与服务器的API通信

const { API_CONFIG } = require('../config/app-config.js');
const logger = require('./logger.js');
const { waitTimeManager } = require('./wait-time-manager.js');

/**
 * API客户端构造函数
 */
function ApiClient() {
    this.config = API_CONFIG;
}

/**
 * 检查是否可以下单
 * @param {Object} window 悬浮窗对象
 * @param {Object} orderData 订单数据
 * @param {string} orderData.user_name 用户名
 * @param {string} orderData.shop_name 店铺名称
 * @param {string} orderData.product_url 商品链接
 * @param {number} orderData.product_price 商品价格
 * @param {string} orderData.product_sku 商品规格
 * @returns {Object} 检查结果 {success: boolean, message: string, canOrder: boolean}
 */
ApiClient.prototype.checkOrderPermission = function(window, orderData) {
    try {
        logger.addLog(window, "正在检查下单权限...");
        logger.addLog(window, "用户: " + orderData.user_name + ", 店铺: " + orderData.shop_name);
        
        // 构建请求数据
        var requestData = {
            user_name: orderData.user_name,
            shop_name: orderData.shop_name,
            product_url: orderData.product_url,
            product_price: orderData.product_price,
            product_sku: orderData.product_sku
        };
        
        logger.addLog(window, "发送API请求到: " + this.config.orderCheckUrl);
        
        // 发送HTTP请求
        var response = this.sendHttpRequest(window, requestData);
        
        if (response) {
            logger.addLog(window, "API响应: " + response.message);
            
            if (response.success) {
                logger.addLog(window, "✅ 可以下单，任务ID: " + response.task_id);
                return {
                    success: true,
                    message: response.message,
                    canOrder: true,
                    taskId: response.task_id,
                    taskUuid: response.task_uuid
                };
            } else {
                logger.addLog(window, "❌ 不能下单: " + response.message);
                return {
                    success: true,
                    message: response.message,
                    canOrder: false,
                    taskUuid: response.task_uuid
                };
            }
        } else {
            logger.addLog(window, "❌ API请求失败");
            return {
                success: false,
                message: "API请求失败",
                canOrder: false
            };
        }
        
    } catch (e) {
        logger.addLog(window, "检查下单权限出错: " + e.message);
        return {
            success: false,
            message: "检查下单权限出错: " + e.message,
            canOrder: false
        };
    }
};

/**
 * 发送HTTP请求
 * @param {Object} window 悬浮窗对象
 * @param {Object} data 请求数据
 * @returns {Object|null} 响应数据或null
 */
ApiClient.prototype.sendHttpRequest = function(window, data) {
    try {
        // 使用AutoJS的http模块发送请求
        var response = http.postJson(this.config.orderCheckUrl, data, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: this.config.requestTimeout
        });
        
        if (response && response.statusCode === 200) {
            var responseBody = response.body.string();
            logger.addLog(window, "收到响应: " + responseBody);
            
            try {
                return JSON.parse(responseBody);
            } catch (parseError) {
                logger.addLog(window, "解析响应JSON失败: " + parseError.message);
                return null;
            }
        } else {
            var statusCode = response ? response.statusCode : "未知";
            logger.addLog(window, "HTTP请求失败，状态码: " + statusCode);
            return null;
        }
        
    } catch (e) {
        logger.addLog(window, "发送HTTP请求异常: " + e.message);
        return null;
    }
};

/**
 * 带重试的API请求
 * @param {Object} window 悬浮窗对象
 * @param {Object} orderData 订单数据
 * @returns {Object} 检查结果
 */
ApiClient.prototype.checkOrderPermissionWithRetry = function(window, orderData) {
    var retryCount = 0;
    var result = null;
    
    while (retryCount < this.config.maxRetries) {
        retryCount++;
        logger.addLog(window, "第 " + retryCount + " 次尝试API请求...");
        
        result = this.checkOrderPermission(window, orderData);
        
        if (result.success) {
            return result;
        }
        
        if (retryCount < this.config.maxRetries) {
            logger.addLog(window, "请求失败，2秒后重试...");
            waitTimeManager.wait('retryInterval');
        }
    }
    
    logger.addLog(window, "API请求重试 " + this.config.maxRetries + " 次后仍然失败");
    return result || {
        success: false,
        message: "API请求重试失败",
        canOrder: false
    };
};

module.exports = ApiClient;
