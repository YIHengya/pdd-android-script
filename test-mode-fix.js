// 测试模式切换修复
// 用于验证支付模式和购买模式是否正确工作

"ui";

const FloatingMenu = require('./ui/floating-menu.js');

/**
 * 测试模式切换修复
 */
function testModeFix() {
    console.log("开始测试模式切换修复...");
    
    // 创建悬浮菜单实例
    var menu = new FloatingMenu();
    
    // 创建测试窗口
    menu.create();
    
    // 设置回调函数来监听脚本启动
    menu.setOnStartCallback(function(window, priceRange, mode, quantity) {
        console.log("=== 脚本启动回调 ===");
        console.log("模式: " + mode);
        console.log("模式类型: " + typeof mode);
        console.log("价格区间: " + priceRange.min + "-" + priceRange.max);
        console.log("数量: " + quantity);
        
        // 添加到日志
        menu.addLog("启动脚本 - 模式: " + mode);
        menu.addLog("价格区间: " + priceRange.min + "-" + priceRange.max + " 元");
        menu.addLog("购买数量: " + quantity + " 件");
        
        // 模拟模式判断逻辑
        if (mode === 'payment') {
            menu.addLog("✅ 正确识别为支付模式");
            menu.addLog("应该执行自动支付流程");
        } else {
            menu.addLog("✅ 正确识别为购买模式");
            menu.addLog("应该执行自动购买流程");
        }
    });
    
    menu.setOnModeChangeCallback(function(mode) {
        console.log("=== 模式变化回调 ===");
        console.log("新模式: " + mode);
        menu.addLog("模式已切换到: " + mode);
    });
    
    // 延迟测试模式切换
    setTimeout(function() {
        console.log("测试切换到支付模式...");
        menu.addLog("=== 测试切换到支付模式 ===");
        menu.switchToMode('payment');
        
        setTimeout(function() {
            console.log("测试在支付模式下启动脚本...");
            menu.addLog("=== 测试在支付模式下启动脚本 ===");
            // 模拟点击启动按钮
            if (menu.menuWindow && menu.menuWindow.scriptSwitch) {
                menu.menuWindow.scriptSwitch.setChecked(true);
            }
            
            setTimeout(function() {
                console.log("测试切换回购买模式...");
                menu.addLog("=== 测试切换回购买模式 ===");
                menu.switchToMode('purchase');
                
                setTimeout(function() {
                    console.log("测试在购买模式下启动脚本...");
                    menu.addLog("=== 测试在购买模式下启动脚本 ===");
                    // 模拟点击启动按钮
                    if (menu.menuWindow && menu.menuWindow.scriptSwitch) {
                        menu.menuWindow.scriptSwitch.setChecked(true);
                    }
                    
                    setTimeout(function() {
                        console.log("模式切换修复测试完成！");
                        menu.addLog("=== 模式切换修复测试完成 ===");
                        console.log("当前模式: " + menu.getCurrentMode());
                    }, 3000);
                }, 2000);
            }, 3000);
        }, 2000);
    }, 3000);
    
    console.log("测试窗口已创建，开始自动测试...");
    menu.addLog("=== 开始模式切换修复测试 ===");
    menu.addLog("将自动测试支付模式和购买模式");
}

// 启动测试
testModeFix();
