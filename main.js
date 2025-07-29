// AutoJS 智能选择最便宜SKU脚本 - 拼多多商品页面
console.log("=== 开始智能选择最便宜SKU ===");

// 等待页面加载
sleep(2000);

// 存储价格信息的数组
var priceData = [];

// 滚动到页面底部的函数
function scrollToBottom() {
    console.log("滚动到页面底部...");
    for (var i = 0; i < 5; i++) {
        scrollDown();
        sleep(500);
    }
}

// 获取当前价格信息的函数
function getCurrentPrice() {
    var priceInfo = {};

    // 获取主价格（限1件 ¥4.68 格式）
    var mainPriceElement = textMatches(/限\d+件\s*¥[\d.]+/).findOne(1000);
    if (mainPriceElement) {
        priceInfo.mainPrice = mainPriceElement.text();
    }

    // 获取券前价格
    var originalPriceElement = textMatches(/券前¥[\d.]+/).findOne(1000);
    if (originalPriceElement) {
        priceInfo.originalPrice = originalPriceElement.text();
    }

    // 获取优惠信息
    var discountElements = textMatches(/\d+件[\d.]+折|满\d+减\d+/).find();
    priceInfo.discounts = [];
    discountElements.forEach(function(element) {
        priceInfo.discounts.push(element.text());
    });

    // 获取已选择的SKU信息
    var selectedSkuElement = textMatches(/已选择：.*/).findOne(1000);
    if (selectedSkuElement) {
        priceInfo.selectedSku = selectedSkuElement.text();
    }

    return priceInfo;
}

// 获取所有型号选项
function getModelOptions() {
    var models = [];
    var modelSection = text("型号").findOne(3000);
    if (modelSection) {
        console.log("找到型号区域");

        // 查找型号区域附近的所有可点击文本
        var allClickableTexts = clickable(true).className("android.widget.TextView").find();
        allClickableTexts.forEach(function(element) {
            var elementText = element.text();
            if (elementText && elementText.trim() !== "" && elementText !== "型号" &&
                (elementText.indexOf("6A") >= 0 || elementText.indexOf("快充") >= 0)) {
                // 检查元素位置是否在型号区域附近
                var modelBounds = modelSection.bounds();
                var elementBounds = element.bounds();
                if (Math.abs(elementBounds.top - modelBounds.top) < 200) { // 在型号区域200像素范围内
                    console.log("找到型号选项: " + elementText);
                    models.push({
                        text: elementText,
                        element: element
                    });
                }
            }
        });
    }
    return models;
}

// 选择第一个型号（通常是默认或推荐的）
function selectFirstModel() {
    var models = getModelOptions();
    if (models.length > 0) {
        console.log("选择第一个型号: " + models[0].text);
        return clickElement(models[0].element);
    }
    return false;
}

// 选择最后一个型号（如果型号在下面，最后一个可能最便宜）
function selectLastModel() {
    var models = getModelOptions();
    if (models.length > 0) {
        var lastModel = models[models.length - 1];
        console.log("选择最后一个型号: " + lastModel.text);
        return clickElement(lastModel.element);
    }
    return false;
}

// 获取所有款式选项（按位置排序，最下面的通常最便宜）
function getStyleOptions() {
    var styles = [];
    var styleSection = text("款式").findOne(3000);
    if (styleSection) {
        console.log("找到款式区域");

        // 查找款式区域附近的所有可点击文本
        var allClickableTexts = clickable(true).className("android.widget.TextView").find();
        var styleBounds = styleSection.bounds();

        allClickableTexts.forEach(function(element) {
            var elementText = element.text();
            var elementBounds = element.bounds();

            // 更宽松的匹配条件，包含更多可能的款式文本
            if (elementText && elementText.trim() !== "" && elementText !== "款式" &&
                elementBounds.top > styleBounds.top && // 在款式标题下方
                (elementText.indexOf("米") >= 0 || elementText.indexOf("条") >= 0 ||
                 elementText.indexOf("【") >= 0 || elementText.indexOf("装") >= 0 ||
                 elementText.indexOf("红绳") >= 0 || elementText.indexOf("opp") >= 0 ||
                 elementText.indexOf("礼盒") >= 0 || elementText.indexOf("项链") >= 0)) {

                styles.push({
                    text: elementText,
                    element: element,
                    top: elementBounds.top,
                    bottom: elementBounds.bottom
                });
            }
        });

        // 按位置排序，最下面的在最后
        styles.sort(function(a, b) {
            return a.top - b.top;
        });

        console.log("找到的款式选项:");
        styles.forEach(function(style, index) {
            console.log("款式选项[" + index + "]: " + style.text + " (位置: " + style.top + "-" + style.bottom + ")");
        });
    }
    return styles;
}

// 选择最便宜的款式（智能识别）
function selectCheapestStyle() {
    // 先滚动到底部确保看到所有选项
    scrollToBottom();
    sleep(1000);

    var styles = getStyleOptions();
    if (styles.length > 0) {
        console.log("分析款式选项，寻找最便宜的...");

        // 优先级：红绳 > opp袋 > 其他按位置排序
        var cheapestStyle = null;

        // 第一优先级：查找包含"红绳"的选项
        for (var i = 0; i < styles.length; i++) {
            if (styles[i].text.indexOf("红绳") >= 0) {
                cheapestStyle = styles[i];
                console.log("找到红绳选项（最便宜）: " + cheapestStyle.text);
                break;
            }
        }

        // 第二优先级：查找包含"opp"的选项
        if (!cheapestStyle) {
            for (var j = 0; j < styles.length; j++) {
                if (styles[j].text.toLowerCase().indexOf("opp") >= 0) {
                    cheapestStyle = styles[j];
                    console.log("找到opp袋选项（较便宜）: " + cheapestStyle.text);
                    break;
                }
            }
        }

        // 第三优先级：选择位置最下面的
        if (!cheapestStyle) {
            styles.sort(function(a, b) {
                return a.top - b.top;
            });
            cheapestStyle = styles[styles.length - 1];
            console.log("选择位置最下面的选项: " + cheapestStyle.text);
        }

        console.log("最终选择: " + cheapestStyle.text + " (位置: " + cheapestStyle.top + ")");
        return clickElement(cheapestStyle.element);
    }
    return false;
}

// 点击元素的函数
function clickElement(element) {
    try {
        var bounds = element.bounds();
        var centerX = bounds.centerX();
        var centerY = bounds.centerY();
        console.log("点击坐标: (" + centerX + ", " + centerY + ")");
        click(centerX, centerY);
        sleep(1500); // 等待页面更新
        return true;
    } catch (e) {
        console.log("点击失败: " + e);
        return false;
    }
}

// 调试函数：显示页面上所有可点击的文本元素
function debugClickableElements() {
    console.log("\n=== 调试：显示所有可点击文本元素 ===");
    var clickableTexts = clickable(true).className("android.widget.TextView").find();
    clickableTexts.forEach(function(element, index) {
        var text = element.text();
        if (text && text.trim() !== "") {
            console.log("可点击文本[" + index + "]: " + text);
            var bounds = element.bounds();
            console.log("  位置: (" + bounds.left + "," + bounds.top + "," + bounds.right + "," + bounds.bottom + ")");
        }
    });
    console.log("=== 调试结束 ===\n");
}

// 检测页面布局并智能选择
function detectLayoutAndSelect() {
    console.log("检测页面布局...");

    var modelSection = text("型号").findOne(2000);
    var styleSection = text("款式").findOne(2000);

    var modelTop = modelSection ? modelSection.bounds().top : -1;
    var styleTop = styleSection ? styleSection.bounds().top : -1;

    console.log("型号区域位置: " + modelTop);
    console.log("款式区域位置: " + styleTop);

    var selections = [];

    if (modelSection && styleSection) {
        if (modelTop < styleTop) {
            // 型号在上，款式在下
            console.log("布局：型号在上，款式在下");
            selections.push({
                name: "型号",
                action: function() { return selectFirstModel(); }
            });
            selections.push({
                name: "款式",
                action: function() { return selectCheapestStyle(); }
            });
        } else {
            // 款式在上，型号在下
            console.log("布局：款式在上，型号在下");
            selections.push({
                name: "款式",
                action: function() { return selectCheapestStyle(); }
            });
            selections.push({
                name: "型号",
                action: function() { return selectLastModel(); }
            });
        }
    } else if (modelSection) {
        console.log("只有型号选项");
        selections.push({
            name: "型号",
            action: function() { return selectFirstModel(); }
        });
    } else if (styleSection) {
        console.log("只有款式选项");
        selections.push({
            name: "款式",
            action: function() { return selectCheapestStyle(); }
        });
    }

    return selections;
}

// 主要执行逻辑 - 智能选择最便宜SKU
console.log("开始智能选择最便宜SKU...");

// 检测布局并获取选择顺序
var selections = detectLayoutAndSelect();

if (selections.length > 0) {
    // 按检测到的顺序进行选择
    for (var i = 0; i < selections.length; i++) {
        var selection = selections[i];
        console.log("\n=== 步骤" + (i + 1) + "：选择" + selection.name + " ===");

        var selected = selection.action();
        if (selected) {
            console.log(selection.name + "选择成功");
            sleep(1500); // 等待页面更新
        } else {
            console.log("未找到" + selection.name + "选项或选择失败");
        }
    }
} else {
    console.log("未检测到型号或款式区域");
}

// 获取最终价格信息
console.log("\n=== 获取最终价格信息 ===");
var finalPrice = getCurrentPrice();
if (finalPrice) {
    console.log("最便宜SKU的价格信息:");
    console.log("主价格: " + (finalPrice.mainPrice || "未找到"));
    console.log("券前价格: " + (finalPrice.originalPrice || "未找到"));
    if (finalPrice.discounts && finalPrice.discounts.length > 0) {
        console.log("优惠信息: " + finalPrice.discounts.join(", "));
    }
    console.log("完整SKU: " + (finalPrice.selectedSku || "未找到"));

    priceData.push(finalPrice);
} else {
    console.log("获取价格信息失败");
}

// 如果上述方法都失败，尝试备用方案
if (selections.length === 0) {
    console.log("\n=== 备用方案：手动查找选项 ===");

    // 先运行调试，看看所有可点击元素
    debugClickableElements();

    // 查找包含关键词的可点击元素
    var keywords = ["6A", "米", "条", "装", "快充"];
    var foundOptions = [];

    keywords.forEach(function(keyword) {
        var elements = textContains(keyword).clickable(true).find();
        elements.forEach(function(element) {
            var text = element.text();
            if (text && text.trim() !== "") {
                var exists = foundOptions.some(function(option) {
                    return option.text === text;
                });
                if (!exists) {
                    foundOptions.push({
                        text: text,
                        element: element,
                        bounds: element.bounds()
                    });
                }
            }
        });
    });

    if (foundOptions.length > 0) {
        console.log("找到 " + foundOptions.length + " 个可能的选项:");
        foundOptions.forEach(function(option, index) {
            console.log("[" + index + "] " + option.text + " (位置: " + option.bounds.top + ")");
        });

        // 选择位置最靠下的选项（通常最便宜）
        foundOptions.sort(function(a, b) {
            return b.bounds.top - a.bounds.top;
        });

        var cheapestOption = foundOptions[0];
        console.log("选择最下方的选项: " + cheapestOption.text);
        if (clickElement(cheapestOption.element)) {
            var price = getCurrentPrice();
            price.selectedOption = cheapestOption.text;
            priceData.push(price);
            console.log("备用方案价格信息: " + JSON.stringify(price, null, 2));
        }
    }
}

// 点击确定按钮
console.log("\n=== 点击确定按钮 ===");

function clickConfirmButton() {
    // 查找确定按钮的多种可能文本
    var confirmTexts = ["确定", "确认", "确认款式", "确定款式", "立即购买", "加入购物车"];

    for (var i = 0; i < confirmTexts.length; i++) {
        var confirmText = confirmTexts[i];
        console.log("查找按钮文本: " + confirmText);

        // 方法1：直接查找文本
        var confirmBtn = text(confirmText).findOne(2000);
        if (confirmBtn) {
            console.log("找到确定按钮: " + confirmText);
            if (clickElement(confirmBtn)) {
                console.log("成功点击确定按钮");
                return true;
            }
        }

        // 方法2：查找包含该文本的按钮
        var confirmBtnContains = textContains(confirmText).findOne(2000);
        if (confirmBtnContains) {
            console.log("找到包含'" + confirmText + "'的按钮: " + confirmBtnContains.text());
            if (clickElement(confirmBtnContains)) {
                console.log("成功点击确定按钮");
                return true;
            }
        }
    }

    // 方法3：查找页面底部的按钮（确定按钮通常在底部）
    console.log("尝试查找页面底部的按钮...");
    var allButtons = clickable(true).find();
    var bottomButtons = [];

    // 获取屏幕高度
    var screenHeight = device.height;

    allButtons.forEach(function(button) {
        var bounds = button.bounds();
        var buttonText = button.text() || button.desc() || "";

        // 如果按钮在屏幕下半部分，且包含可能的确定文本
        if (bounds.top > screenHeight * 0.6 && buttonText.trim() !== "") {
            bottomButtons.push({
                element: button,
                text: buttonText,
                top: bounds.top
            });
        }
    });

    // 按位置排序，最下面的优先
    bottomButtons.sort(function(a, b) {
        return b.top - a.top;
    });

    // 尝试点击最下面的几个按钮
    for (var j = 0; j < Math.min(3, bottomButtons.length); j++) {
        var btn = bottomButtons[j];
        console.log("尝试点击底部按钮: " + btn.text + " (位置: " + btn.top + ")");
        if (clickElement(btn.element)) {
            console.log("成功点击底部按钮");
            return true;
        }
    }

    return false;
}

// 执行点击确定
var confirmClicked = clickConfirmButton();
if (confirmClicked) {
    console.log("确定按钮点击成功！");
    sleep(2000); // 等待页面跳转
} else {
    console.log("未找到确定按钮，请手动点击");
}

// 输出汇总结果
console.log("\n=== 最便宜SKU选择完成，汇总结果 ===");
if (priceData.length > 0) {
    var finalData = priceData[priceData.length - 1]; // 最后一个是最终选择的
    console.log("已选择最便宜的SKU:");
    if (finalData.model) console.log("型号: " + finalData.model);
    if (finalData.style) console.log("款式: " + finalData.style);
    if (finalData.mainPrice) console.log("主价格: " + finalData.mainPrice);
    if (finalData.originalPrice) console.log("券前价格: " + finalData.originalPrice);
    if (finalData.discounts && finalData.discounts.length > 0) {
        console.log("优惠信息: " + finalData.discounts.join(", "));
    }
    if (finalData.selectedSku) console.log("完整SKU: " + finalData.selectedSku);

    console.log("\n✅ 最便宜SKU已选择" + (confirmClicked ? "并确认" : "，请手动点击确定"));
} else {
    console.log("未获取到价格信息");
}

console.log("\n=== 脚本执行完成 ===");
