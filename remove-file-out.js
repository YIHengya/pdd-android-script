// 点击"已选"按钮
function handleSelectedItems() {
    console.log("\n=== 开始处理\"已选\"功能 ===");
    
    // 查找"已选"按钮
    var selectedButton = className("android.widget.TextView").textContains("已选").clickable(true).findOne(3000);
    
    if (!selectedButton) {
        console.log("未找到\"已选\"按钮");
        return false;
    }
    
    console.log("找到\"已选\"按钮：" + selectedButton.text());
    
    // 点击"已选"按钮
    var bounds = selectedButton.bounds();
    click(bounds.centerX(), bounds.centerY());
    console.log("已点击\"已选\"按钮");
    
    // 等待弹出界面加载
    sleep(2000);
    
    // 检查是否有"清空选择"按钮，确认页面是否成功打开
    var clearButton = textContains("清空选择").findOne(2000);
    if (clearButton) {
        console.log("✅ 确认商品选择页面已成功打开，找到\"清空选择\"按钮");
        
        // 获取已选商品数量
        var selectedTitleText = className("android.widget.TextView").textMatches(/已选\d+款商品/).findOne(1000);
        if (selectedTitleText) {
            console.log("📦 " + selectedTitleText.text());
        }
    } else {
        console.log("❌ 未检测到\"清空选择\"按钮，商品选择页面可能未成功打开");
        
        // 再次尝试点击"已选"按钮
        click(bounds.centerX(), bounds.centerY());
        sleep(2000);
        
        // 再次检查
        clearButton = textContains("清空选择").findOne(2000);
        if (clearButton) {
            console.log("✅ 第二次尝试成功，商品选择页面已打开");
        } else {
            console.log("❌ 第二次尝试失败，无法打开商品选择页面");
        }
    }
    
    console.log("已选功能处理完成");
    return true;
}

// 主函数
function main() {
    if (!auto.service) {
        console.log("请先开启无障碍服务");
        return;
    }
    
    console.log("\n=== 开始执行脚本 ===");
    
    // 只处理"已选"功能
    handleSelectedItems();
    
    console.log("\n=== 脚本执行完毕 ===");
}

// 执行
main();
