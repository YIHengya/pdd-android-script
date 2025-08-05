// 支付按钮偏移量调整工具
// 用于快速调整支付按钮点击的偏移量

const fs = require('fs');
const path = require('path');

/**
 * 调整支付按钮偏移量
 * @param {number} newOffset 新的偏移量（像素）
 */
function adjustPaymentOffset(newOffset) {
    try {
        var configPath = path.join(__dirname, '../config/app-config.js');
        var configContent = fs.readFileSync(configPath, 'utf8');
        
        // 使用正则表达式替换偏移量
        var regex = /(paymentClickOffset:\s*{\s*\/\/[^}]*yOffset:\s*)(\d+)/;
        var newContent = configContent.replace(regex, '$1' + newOffset);
        
        if (newContent !== configContent) {
            fs.writeFileSync(configPath, newContent, 'utf8');
            console.log("✓ 支付按钮偏移量已更新为: " + newOffset + "像素");
            return true;
        } else {
            console.log("❌ 未找到偏移量配置或配置未改变");
            return false;
        }
    } catch (e) {
        console.error("❌ 更新配置失败:", e.message);
        return false;
    }
}

/**
 * 获取当前偏移量
 */
function getCurrentOffset() {
    try {
        var configPath = path.join(__dirname, '../config/app-config.js');
        var configContent = fs.readFileSync(configPath, 'utf8');
        
        var regex = /yOffset:\s*(\d+)/;
        var match = configContent.match(regex);
        
        if (match) {
            return parseInt(match[1]);
        } else {
            console.log("❌ 未找到偏移量配置");
            return null;
        }
    } catch (e) {
        console.error("❌ 读取配置失败:", e.message);
        return null;
    }
}

/**
 * 显示使用说明
 */
function showUsage() {
    console.log("=== 支付按钮偏移量调整工具 ===");
    console.log("用法:");
    console.log("1. 查看当前偏移量: getCurrentOffset()");
    console.log("2. 调整偏移量: adjustPaymentOffset(新偏移量)");
    console.log("");
    console.log("建议偏移量:");
    console.log("- 50像素: 轻微向下偏移");
    console.log("- 100像素: 中等向下偏移（默认）");
    console.log("- 150像素: 较大向下偏移");
    console.log("- 200像素: 大幅向下偏移");
    console.log("");
    console.log("当前偏移量: " + getCurrentOffset() + "像素");
}

// 如果直接运行此脚本，显示使用说明
if (require.main === module) {
    showUsage();
}

module.exports = {
    adjustPaymentOffset,
    getCurrentOffset,
    showUsage
};
