// 精确移除价格超过0.8元的商品
function removeExpensiveItems() {
    console.log("=== 开始精确移除价格超过0.8元的商品 ===");
    
    sleep(1000);
    
    var removedCount = 0;
    var maxAttempts = 10;
    var attempt = 0;
    
    while (attempt < maxAttempts) {
        attempt++;
        console.log("第" + attempt + "次扫描商品");
        
        var foundAndRemoved = false;
        
        // 方法1：查找所有商品容器
        var itemContainers = className("android.view.View").find();
        
        for (var i = 0; i < itemContainers.size(); i++) {
            var container = itemContainers.get(i);
            var bounds = container.bounds();
            
            // 查找该容器内的价格文本
            var priceTexts = container.find(className("android.widget.TextView").textMatches(/^￥\d+\.\d+$/));
            
            if (priceTexts.size() > 0) {
                var priceText = priceTexts.get(0);
                var priceStr = priceText.text();
                var price = parseFloat(priceStr.replace("￥", ""));
                
                console.log("找到商品价格：" + priceStr + " = " + price);
                
                if (price > 0.8) {
                    console.log("需要移除价格为 " + priceStr + " 的商品");
                    
                    // 查找减号按钮 - 根据UI分析，减号按钮通常在价格右侧
                    var allButtons = container.find(className("android.widget.TextView").clickable(true));
                    
                    for (var j = 0; j < allButtons.size(); j++) {
                        var button = allButtons.get(j);
                        var buttonBounds = button.bounds();
                        var priceBounds = priceText.bounds();
                        
                        // 减号按钮通常在价格的右侧，且y坐标相近
                        if (buttonBounds.left > priceBounds.right && 
                            Math.abs(buttonBounds.centerY() - priceBounds.centerY()) < 100) {
                            
                            console.log("找到减号按钮，位置：[" + buttonBounds.left + "," + buttonBounds.top + "][" + buttonBounds.right + "," + buttonBounds.bottom + "]");
                            
                            // 点击减号按钮
                            click(buttonBounds.centerX(), buttonBounds.centerY());
                            removedCount++;
                            foundAndRemoved = true;
                            sleep(1500); // 等待界面更新
                            break;
                        }
                    }
                    
                    if (foundAndRemoved) break;
                }
            }
        }
        
        if (!foundAndRemoved) {
            console.log("未找到更多需要移除的商品");
            break;
        }
    }
    
    console.log("=== 处理完成，共移除 " + removedCount + " 个商品 ===");
}

// 方法2：基于具体坐标的精确移除
function removeBySpecificCoordinates() {
    console.log("=== 使用具体坐标移除商品 ===");
    
    // 根据你的UI信息，我看到了这些减号按钮的大概位置
    // 需要根据实际情况调整
    var itemsToCheck = [
        {price: 3.39, minusX: 794, minusY: 1053}, // 筷子四件套
        {price: 1.62, minusX: 794, minusY: 1388}, // 门栓螺丝
        // 其他价格都在0.8以下，不需要移除
    ];
    
    for (var i = 0; i < itemsToCheck.length; i++) {
        var item = itemsToCheck[i];
        if (item.price > 0.8) {
            console.log("移除价格为 ￥" + item.price + " 的商品");
            click(item.minusX, item.minusY);
            sleep(1500);
        }
    }
}

// 方法3：更直接的方法 - 查找EditText旁边的减号
function removeByEditTextMethod() {
    console.log("=== 通过EditText查找减号按钮 ===");
    
    var removedCount = 0;
    
    // 查找所有EditText（数量输入框）
    var editTexts = className("android.widget.EditText").find();
    console.log("找到 " + editTexts.size() + " 个数量输入框");
    
    for (var i = 0; i < editTexts.size(); i++) {
        var editText = editTexts.get(i);
        var editBounds = editText.bounds();
        
        // 查找该EditText所在的商品容器
        var parent = editText.parent();
        while (parent && parent.className() !== "android.view.View") {
            parent = parent.parent();
        }
        
        if (parent) {
            // 在该容器中查找价格
            var priceTexts = parent.find(className("android.widget.TextView").textMatches(/^￥\d+\.\d+$/));
            
            if (priceTexts.size() > 0) {
                var priceText = priceTexts.get(0);
                var priceStr = priceText.text();
                var price = parseFloat(priceStr.replace("￥", ""));
                
                console.log("商品价格：" + priceStr + " = " + price);
                
                if (price > 0.8) {
                    // 查找EditText左侧的减号按钮
                    var buttons = parent.find(className("android.widget.TextView").clickable(true));
                    
                    for (var j = 0; j < buttons.size(); j++) {
                        var button = buttons.get(j);
                        var buttonBounds = button.bounds();
                        
                        // 减号按钮通常在EditText的左侧
                        if (buttonBounds.right <= editBounds.left && 
                            Math.abs(buttonBounds.centerY() - editBounds.centerY()) < 50) {
                            
                            console.log("点击减号按钮移除商品，价格：" + priceStr);
                            click(buttonBounds.centerX(), buttonBounds.centerY());
                            removedCount++;
                            sleep(1500);
                            break;
                        }
                    }
                }
            }
        }
    }
    
    console.log("=== 移除完成，共移除 " + removedCount + " 个商品 ===");
}

// 调试方法：显示所有可点击的按钮位置
function debugClickableButtons() {
    console.log("=== 调试：显示所有可点击按钮 ===");
    
    var clickableViews = className("android.widget.TextView").clickable(true).find();
    console.log("找到 " + clickableViews.size() + " 个可点击的TextView");
    
    for (var i = 0; i < clickableViews.size(); i++) {
        var view = clickableViews.get(i);
        var bounds = view.bounds();
        var text = view.text();
        var desc = view.desc();
        
        console.log("按钮 " + i + ": 位置[" + bounds.left + "," + bounds.top + "][" + bounds.right + "," + bounds.bottom + "] 文本:'" + text + "' 描述:'" + desc + "'");
        
        // 如果按钮位置看起来像减号按钮（通常在右侧且较小）
        if (bounds.right > 700 && bounds.width() < 100 && bounds.height() < 100) {
            console.log("  -> 这可能是减号按钮");
        }
    }
}

// 主函数
function main() {
    if (!auto.service) {
        console.log("请先开启无障碍服务");
        return;
    }
    
    // 选择执行方法
    console.log("请选择执行方法：");
    console.log("1. 智能识别方法");
    console.log("2. 坐标方法");
    console.log("3. EditText方法");
    console.log("4. 调试按钮位置");
    
    // 这里我推荐先用调试方法，看看按钮的实际位置
    debugClickableButtons();
    
    // 然后尝试EditText方法，这个方法比较可靠
    removeByEditTextMethod();
}

// 执行
main();
