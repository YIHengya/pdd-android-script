// 命令行停止脚本
// 可以直接运行，无UI界面，快速停止所有脚本

// 导入全局停止管理器
const { GlobalStopManager } = require('./utils/common.js');

console.log("🚨 执行紧急停止...");

try {
    // 使用全局停止管理器停止所有线程和定时器
    GlobalStopManager.shutdownAll();
    console.log("✅ 全局停止管理器执行完成");
    
    // 额外的停止措施
    try {
        threads.shutDownAll();
        console.log("✅ threads.shutDownAll() 执行完成");
    } catch (e) {
        console.error("❌ threads.shutDownAll() 执行失败: " + e.message);
    }
    
    console.log("🛑 所有脚本已停止");
    
} catch (e) {
    console.error("❌ 停止过程中出错: " + e.message);
    
    // 备用停止方法
    try {
        threads.shutDownAll();
        console.log("✅ 备用停止方法执行完成");
    } catch (e2) {
        console.error("❌ 备用停止方法也失败: " + e2.message);
    }
}

// 延迟退出，确保所有操作完成
setTimeout(function() {
    console.log("退出停止脚本");
    exit();
}, 1000);
