// 紧急停止脚本
// 可以独立运行，用于强制停止所有相关脚本

"ui";

// 导入全局停止管理器
const { GlobalStopManager } = require('./utils/common.js');

/**
 * 紧急停止所有脚本
 */
function emergencyStop() {
    console.log("🚨 开始紧急停止所有脚本...");
    
    try {
        // 使用全局停止管理器停止所有线程和定时器
        GlobalStopManager.shutdownAll();
        
        console.log("✅ 全局停止管理器执行完成");
        
        // 额外的停止措施
        try {
            // 停止所有线程
            threads.shutDownAll();
            console.log("✅ threads.shutDownAll() 执行完成");
        } catch (e) {
            console.error("❌ threads.shutDownAll() 执行失败: " + e.message);
        }
        
        // 强制退出
        setTimeout(function() {
            console.log("🛑 强制退出脚本");
            exit();
        }, 2000);
        
        console.log("🛑 紧急停止完成");
        
    } catch (e) {
        console.error("❌ 紧急停止过程中出错: " + e.message);
        
        // 如果全局停止管理器失败，直接使用AutoJS的停止方法
        try {
            threads.shutDownAll();
            console.log("✅ 备用停止方法执行完成");
        } catch (e2) {
            console.error("❌ 备用停止方法也失败: " + e2.message);
        }
        
        // 最后的手段：强制退出
        exit();
    }
}

// 创建简单的UI界面
ui.layout(
    <vertical padding="20dp" gravity="center">
        <text text="紧急停止工具" textSize="24sp" textColor="#333333" gravity="center" margin="0 0 20dp 0"/>
        <text text="点击下方按钮可以强制停止所有正在运行的脚本" textSize="14sp" textColor="#666666" 
              gravity="center" margin="0 0 30dp 0"/>
        
        <button id="emergencyStopBtn" text="🚨 紧急停止所有脚本" textColor="#ffffff" bg="#F44336"
                w="250dp" h="60dp" textSize="16sp" margin="0 0 20dp 0"/>
        
        <button id="exitBtn" text="退出" textColor="#ffffff" bg="#9E9E9E"
                w="150dp" h="45dp" textSize="14sp"/>
        
        <text text="注意：此操作将强制停止所有相关脚本，请谨慎使用" textSize="12sp" textColor="#FF5722" 
              gravity="center" margin="20dp 0 0 0"/>
    </vertical>
);

// 紧急停止按钮事件
ui.emergencyStopBtn.click(function() {
    ui.emergencyStopBtn.setText("正在停止...");
    ui.emergencyStopBtn.setEnabled(false);
    
    // 延迟执行，让UI有时间更新
    setTimeout(function() {
        emergencyStop();
    }, 500);
});

// 退出按钮事件
ui.exitBtn.click(function() {
    exit();
});

console.log("紧急停止工具已启动");
console.log("可以通过界面或直接调用 emergencyStop() 函数来停止所有脚本");

// 导出函数供外部调用
module.exports = {
    emergencyStop: emergencyStop
};
