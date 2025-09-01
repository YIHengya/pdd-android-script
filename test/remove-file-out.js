// 点击"已选"按钮并处理商品
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
        
        // 开始处理商品列表
        processProducts();
    } else {
        console.log("❌ 未检测到\"清空选择\"按钮，商品选择页面可能未成功打开");
        
        // 再次尝试点击"已选"按钮
        click(bounds.centerX(), bounds.centerY());
        sleep(2000);
        
        // 再次检查
        clearButton = textContains("清空选择").findOne(2000);
        if (clearButton) {
            console.log("✅ 第二次尝试成功，商品选择页面已打开");
            // 开始处理商品列表
            processProducts();
        } else {
            console.log("❌ 第二次尝试失败，无法打开商品选择页面");
        }
    }
    
    console.log("已选功能处理完成");
    return true;
}

// 处理商品列表
function processProducts() {
    console.log("\n=== 开始处理商品列表 ===");
    var priceThreshold = 0.8; // 价格阈值
    var totalRemovedCount = 0; // 总删除商品计数
    
    // 执行两轮删除
    for (var round = 1; round <= 2; round++) {
        console.log("\n=== 开始第 " + round + " 轮删除 ===");
        var removedCount = processProductsOnce(priceThreshold);
        totalRemovedCount += removedCount;
        console.log("第 " + round + " 轮删除完成，本轮删除 " + removedCount + " 个商品");
        
        if (removedCount == 0 && round == 1) {
            console.log("第一轮未删除任何商品，无需进行第二轮");
            break;
        }
        
        // 如果是第一轮结束，回到列表顶部准备第二轮
        if (round == 1) {
            console.log("准备第二轮删除，先滚动回顶部...");
            scrollToTop();
            sleep(1500);
        }
    }
    
    console.log("\n=== 商品处理完成，共删除 " + totalRemovedCount + " 个价格超过" + priceThreshold + "元的商品 ===");
    return totalRemovedCount;
}

// 单轮处理商品列表
function processProductsOnce(priceThreshold) {
    var removedCount = 0; // 已删除商品计数
    
    // 查找可滚动的列表视图
    var scrollView = className("android.support.v7.widget.RecyclerView").scrollable(true).findOne(3000);
    if (!scrollView) {
        console.log("未找到可滚动的商品列表视图");
        return 0;
    }
    
    var scrollCount = 0;
    var maxScrolls = 20; // 最大滚动次数，防止无限循环
    var keepScrolling = true;
    
    // 已处理过的商品标题，避免重复处理相同商品
    var processedTitles = new Set();
    
    while (keepScrolling && scrollCount < maxScrolls) {
        // 每次循环都重新获取当前可见的商品
        var itemFrames = scrollView.find(className("android.widget.FrameLayout"));
        console.log("找到 " + itemFrames.size() + " 个商品项");
        
        if (itemFrames.size() == 0) {
            console.log("未发现商品，向下滚动...");
            scrollView.scrollForward();
            scrollCount++;
            sleep(1000);
            continue;
        }
        
        var foundDeleteTarget = false;
        
        // 处理每个商品
        for (var i = 0; i < itemFrames.size(); i++) {
            var itemFrame = itemFrames.get(i);
            
            // 获取商品标题
            var title = "";
            var titleTexts = itemFrame.find(className("android.widget.TextView"));
            if (titleTexts.size() > 0) {
                title = titleTexts.get(0).text();
                if (title.length > 10) {  // 确保是有效标题
                    // 如果已处理过该商品，跳过
                    var shortTitle = title.substring(0, 10); // 使用标题前10个字符作为唯一标识
                    if (processedTitles.has(shortTitle)) {
                        continue;
                    }
                    processedTitles.add(shortTitle);
                }
            }
            
            // 查找价格 - 先找¥符号，再找数字
            var priceSymbols = itemFrame.find(className("android.widget.TextView").text("¥"));
            if (priceSymbols.size() > 0) {
                var priceSymbol = priceSymbols.get(0);
                var symbolBounds = priceSymbol.bounds();
                
                // 查找价格数字（位于¥符号右侧）
                var priceTexts = itemFrame.find(className("android.widget.TextView"));
                var price = -1;
                var priceStr = "";
                
                for (var j = 0; j < priceTexts.size(); j++) {
                    var priceText = priceTexts.get(j);
                    var textBounds = priceText.bounds();
                    
                    // 判断是否是价格数字（在¥符号右侧，垂直位置接近）
                    if (textBounds.left > symbolBounds.right - 5 && 
                        Math.abs(textBounds.centerY() - symbolBounds.centerY()) < 20) {
                        var numText = priceText.text();
                        if (numText && /^\d+(\.\d+)?$/.test(numText)) {
                            priceStr = numText;
                            price = parseFloat(priceStr);
                            break;
                        }
                    }
                }
                
                if (price > 0) {
                    // 获取显示标题
                    var displayTitle = title;
                    if (displayTitle.length > 20) {
                        displayTitle = displayTitle.substring(0, 20) + "...";
                    }
                    
                    console.log("商品: " + displayTitle + ", 价格: " + price);
                    
                    // 如果价格超过阈值，执行删除
                    if (price > priceThreshold) {
                        console.log("价格超过阈值" + priceThreshold + "元，准备删除");
                        
                        // 执行左滑显示删除按钮
                        var bounds = itemFrame.bounds();
                        var startX = bounds.right - 100;
                        var endX = bounds.left + 100;
                        var y = bounds.centerY();
                        
                        console.log("左滑显示删除按钮: " + startX + "," + y + " -> " + endX + "," + y);
                        swipe(startX, y, endX, y, 300);
                        sleep(1000);
                        
                        // 点击删除按钮
                        var deleteTexts = textContains("删除").find();
                        if (deleteTexts.size() > 0) {
                            var deleteText = deleteTexts.get(0);
                            console.log("找到删除按钮，点击删除");
                            click(device.width - 50, y); // 点击屏幕右侧边缘
                            sleep(1000);
                            
                            // 检查是否有确认删除对话框
                            var confirmButton = textMatches(/(确认|确定|删除)/).clickable(true).findOne(2000);
                            if (confirmButton) {
                                console.log("找到确认按钮，点击确认");
                                click(confirmButton.bounds().centerX(), confirmButton.bounds().centerY());
                            }
                            
                            removedCount++;
                            foundDeleteTarget = true;
                            sleep(1500); // 等待删除操作完成
                            
                            // 重要：删除商品后立即跳出循环，重新获取商品列表
                            break;
                        } else {
                            console.log("未找到删除按钮，尝试点击右侧区域");
                            click(device.width - 50, y);
                            sleep(1000);
                            
                            // 再次检查确认删除
                            var confirmButton = textMatches(/(确认|确定|删除)/).clickable(true).findOne(2000);
                            if (confirmButton) {
                                console.log("找到确认按钮，点击确认");
                                click(confirmButton.bounds().centerX(), confirmButton.bounds().centerY());
                                removedCount++;
                                foundDeleteTarget = true;
                                sleep(1500);
                                
                                // 重要：删除商品后立即跳出循环，重新获取商品列表
                                break;
                            }
                        }
                    }
                } else {
                    console.log("未能解析商品价格");
                }
            }
        }
        
        // 如果删除了商品，不进行滚动，直接重新获取列表（因为UI已更新）
        if (foundDeleteTarget) {
            continue;
        }
        
        // 如果处理完所有可见商品，向下滚动
        console.log("向下滚动列表...");
        var scrollSuccess = scrollView.scrollForward();
        scrollCount++;
        
        if (!scrollSuccess) {
            console.log("已滚动到底部或无法继续滚动");
            keepScrolling = false;
        }
        
        sleep(1000);
    }
    
    return removedCount;
}

// 滚动到列表顶部
function scrollToTop() {
    console.log("滚动回列表顶部");
    var scrollView = className("android.support.v7.widget.RecyclerView").scrollable(true).findOne(3000);
    if (!scrollView) {
        console.log("未找到可滚动的列表视图");
        return;
    }
    
    // 尝试多次向上滚动，直到到达顶部
    var scrollCount = 0;
    var maxScrolls = 20; // 最大滚动次数
    var reachedTop = false;
    
    while (!reachedTop && scrollCount < maxScrolls) {
        var scrollSuccess = scrollView.scrollBackward();
        scrollCount++;
        
        if (!scrollSuccess) {
            console.log("已到达列表顶部或无法继续向上滚动");
            reachedTop = true;
        }
        
        sleep(500);
    }
    
    console.log("已滚动回列表顶部，共滚动 " + scrollCount + " 次");
}

// 辅助函数：执行滑动操作
function swipe(startX, startY, endX, endY, duration) {
    // 使用gesture函数实现滑动手势
    gesture(duration, [startX, startY], [endX, endY]);
}

// 主函数
function main() {
    if (!auto.service) {
        console.log("请先开启无障碍服务");
        return;
    }
    
    console.log("\n=== 开始执行脚本 ===");
    
    // 处理"已选"功能并删除高价商品
    handleSelectedItems();
    
    console.log("\n=== 脚本执行完毕 ===");
}

// 执行
main();
