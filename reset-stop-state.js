// 重置停止状态脚本
// 用于解决停止标志持久化问题，可以独立运行

"ui";

// 导入全局停止管理器
const { GlobalStopManager } = require('./utils/common.js');

console.log("🔄 开始重置停止状态...");

try {
    // 使用新的强制重置方法
    GlobalStopManager.forceReset();

    console.log("🎉 停止状态重置完成，现在可以正常启动脚本了");

} catch (e) {
    console.error("❌ 重置过程中出错: " + e.message);

    // 备用重置方法
    try {
        GlobalStopManager.shouldStop = false;
        GlobalStopManager.runningScripts = 0;
        GlobalStopManager.activeThreads = [];
        GlobalStopManager.activeIntervals = [];
        console.log("✅ 备用重置方法执行完成");
    } catch (e2) {
        console.error("❌ 备用重置方法也失败: " + e2.message);
    }
}

// 延迟退出，确保所有操作完成
setTimeout(function() {
    console.log("退出重置脚本");
    exit();
}, 1000);
