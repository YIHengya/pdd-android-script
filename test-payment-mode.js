// 测试支付模式修复
// 用于验证支付模式是否能正常工作

"ui";

const AutoPayment = require('./modules/auto-payment.js');
const { GlobalStopManager } = require('./utils/common.js');

/**
 * 测试支付模式
 */
function testPaymentMode() {
    console.log("开始测试支付模式修复...");
    
    // 创建一个简单的测试窗口
    var testWindow = {
        logText: {
            setText: function(text) {
                console.log("LOG: " + text);
            },
            getText: function() {
                return "";
            }
        }
    };
    
    // 创建自动支付实例
    var autoPayment = new AutoPayment();
    
    console.log("✅ AutoPayment 实例创建成功");
    
    // 测试基本方法调用
    try {
        console.log("测试 GlobalStopManager.isStopRequested() 调用...");
        var shouldStop = GlobalStopManager.isStopRequested();
        console.log("✅ GlobalStopManager.isStopRequested() 返回: " + shouldStop);
        
        console.log("测试 AutoPayment.execute() 方法...");
        // 注意：这会尝试实际执行支付流程，但应该会因为不在拼多多应用中而快速返回
        var result = autoPayment.execute(testWindow, "测试用户");
        console.log("✅ AutoPayment.execute() 执行完成，返回: " + result);
        
    } catch (e) {
        console.error("❌ 测试过程中出错: " + e.message);
        console.error("错误堆栈: " + e.stack);
    }
    
    console.log("=== 支付模式测试完成 ===");
}

// 启动测试
testPaymentMode();
