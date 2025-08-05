// 通用脚本启动器
// 确保每次启动时都正确重置停止状态，支持多种脚本模式

"ui";

// 导入必要的模块
const permissions = require('./utils/permissions.js');
const { GlobalStopManager } = require('./utils/common.js');

/**
 * 通用启动器构造函数
 */
function UniversalLauncher() {
    this.currentScript = null;
    this.scriptType = null;
}

/**
 * 启动指定类型的脚本
 * @param {string} type 脚本类型: 'main', 'floating', 'debug'
 */
UniversalLauncher.prototype.launch = function(type) {
    console.log("🚀 通用启动器: 准备启动 " + type + " 脚本");
    
    // 首先强制重置所有状态
    try {
        GlobalStopManager.forceReset();
        console.log("✅ 状态重置完成");
    } catch (e) {
        console.error("⚠️ 状态重置失败: " + e.message);
    }
    
    // 检查权限
    try {
        permissions.checkPermissions();
        console.log("✅ 权限检查完成");
    } catch (e) {
        console.error("❌ 权限检查失败: " + e.message);
        return;
    }
    
    this.scriptType = type;
    
    // 根据类型启动对应的脚本
    switch (type) {
        case 'main':
            this.launchMainScript();
            break;
        case 'floating':
            this.launchFloatingScript();
            break;
        case 'debug':
            this.launchDebugScript();
            break;
        default:
            console.error("❌ 未知的脚本类型: " + type);
            this.showUsage();
    }
};

/**
 * 启动主脚本
 */
UniversalLauncher.prototype.launchMainScript = function() {
    console.log("启动主脚本...");
    try {
        const MainApp = require('./main.js');
        // 主脚本会自动处理启动逻辑
        console.log("✅ 主脚本启动成功");
    } catch (e) {
        console.error("❌ 主脚本启动失败: " + e.message);
    }
};

/**
 * 启动悬浮窗脚本
 */
UniversalLauncher.prototype.launchFloatingScript = function() {
    console.log("启动悬浮窗脚本...");
    try {
        // 设置引擎标签为悬浮窗模式
        engines.myEngine().setTag("mode", "floating");
        const MainApp = require('./main.js');
        console.log("✅ 悬浮窗脚本启动成功");
    } catch (e) {
        console.error("❌ 悬浮窗脚本启动失败: " + e.message);
    }
};



/**
 * 启动调试脚本
 */
UniversalLauncher.prototype.launchDebugScript = function() {
    console.log("启动调试脚本...");
    try {
        require('./debug-pdd-app.js');
        console.log("✅ 调试脚本启动成功");
    } catch (e) {
        console.error("❌ 调试脚本启动失败: " + e.message);
    }
};

/**
 * 显示使用说明
 */
UniversalLauncher.prototype.showUsage = function() {
    console.log("使用方法:");
    console.log("- main: 启动主界面");
    console.log("- floating: 启动悬浮窗模式");
    console.log("- debug: 启动调试工具");
};

/**
 * 停止当前脚本
 */
UniversalLauncher.prototype.stop = function() {
    console.log("🛑 停止当前脚本...");
    GlobalStopManager.shutdownAll();
    
    // 延迟重置状态
    setTimeout(function() {
        GlobalStopManager.forceReset();
        console.log("✅ 脚本已停止并重置状态");
    }, 2000);
};

// 检查启动参数
function main() {
    var launcher = new UniversalLauncher();
    
    // 检查是否有启动参数
    var args = engines.myEngine().getTag("args");
    if (args) {
        launcher.launch(args);
    } else {
        // 默认启动主脚本
        console.log("未指定启动参数，启动主脚本");
        launcher.launch('main');
    }
}

// 程序入口
main();
