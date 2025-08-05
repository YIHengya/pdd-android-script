// 模式切换测试脚本
// 用于测试购买模式和支付模式的切换功能

"ui";

const FloatingMenu = require('../ui/floating-menu.js');

/**
 * 测试模式切换功能
 */
function testModeSwitch() {
    console.log("开始测试模式切换功能...");
    
    // 创建悬浮菜单实例
    var menu = new FloatingMenu();
    
    // 创建测试窗口
    menu.create();
    
    // 设置回调函数来监听模式变化
    menu.setOnStartCallback(function(window, priceRange, mode, quantity) {
        console.log("=== 脚本启动回调 ===");
        console.log("模式: " + mode);
        console.log("价格区间: " + priceRange.min + "-" + priceRange.max);
        console.log("数量: " + quantity);
        
        // 添加到日志
        menu.addLog("启动脚本 - 模式: " + mode);
        menu.addLog("价格区间: " + priceRange.min + "-" + priceRange.max + " 元");
        menu.addLog("购买数量: " + quantity + " 件");
    });
    
    menu.setOnModeChangeCallback(function(mode) {
        console.log("=== 模式变化回调 ===");
        console.log("新模式: " + mode);
        menu.addLog("模式已切换到: " + mode);
    });
    
    // 延迟测试模式切换
    setTimeout(function() {
        console.log("测试切换到支付模式...");
        menu.switchToMode('payment');
        
        setTimeout(function() {
            console.log("测试切换回购买模式...");
            menu.switchToMode('purchase');
            
            setTimeout(function() {
                console.log("再次测试切换到支付模式...");
                menu.switchToMode('payment');
                
                console.log("模式切换测试完成！");
                console.log("当前模式: " + menu.getCurrentMode());
            }, 2000);
        }, 2000);
    }, 3000);
    
    console.log("测试窗口已创建，等待用户交互...");
    console.log("您可以手动点击模式按钮测试切换功能");
}

// 启动测试
testModeSwitch();
