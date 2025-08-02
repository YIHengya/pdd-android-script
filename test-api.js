// API测试脚本
// 用于测试下单预检查API功能

const ApiClient = require('./utils/api-client.js');
const logger = require('./utils/logger.js');

// 创建一个简单的测试窗口对象
var testWindow = {
    logText: {
        setText: function(text) {
            console.log("LOG: " + text);
        }
    }
};

// 测试数据
var testOrderData = {
    user_name: "热发发",
    shop_name: "木子3c数码店铺", 
    product_url: "https://example.com/",
    product_price: 0.58,
    product_sku: "6a【100w】【1条】0.28米"
};

function testApiClient() {
    console.log("=== 开始测试API客户端 ===");
    
    var apiClient = new ApiClient();
    
    logger.addLog(testWindow, "测试API预检查功能...");
    
    var result = apiClient.checkOrderPermissionWithRetry(testWindow, testOrderData);
    
    console.log("API测试结果:");
    console.log("Success: " + result.success);
    console.log("Message: " + result.message);
    console.log("Can Order: " + result.canOrder);
    
    if (result.taskId) {
        console.log("Task ID: " + result.taskId);
    }
    
    if (result.taskUuid) {
        console.log("Task UUID: " + result.taskUuid);
    }
    
    console.log("=== API测试完成 ===");
}

// 运行测试
testApiClient();
