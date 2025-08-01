// 拼多多自动购买脚本
// 功能：打开拼多多，浏览主页，找到价格低于0.8元的商品并自动购买

// 检查权限
function checkPermissions() {
    // 检查无障碍服务
    if (!auto.service) {
        toast("请先开启无障碍服务");
        auto.waitFor();
    }

    // 检查悬浮窗权限
    if (!floaty.checkPermission()) {
        toast("请授予悬浮窗权限");
        floaty.requestPermission();
        exit();
    }
}

// 创建悬浮窗控制界面
function createFloatingWindow() {
    var window = floaty.window(
        <vertical bg="#88000000" padding="4">
            <horizontal>
                <text text="PDD购买" textColor="#ffffff" textSize="12sp"/>
                <button id="closeBtn" text="×" textColor="#ffffff" bg="#44ff0000" w="25" h="25" margin="3 0 0 0"/>
            </horizontal>
            <horizontal margin="0 2 0 0">
                <Switch id="scriptSwitch" text="启动" textColor="#ffffff" textSize="10sp" checked="false"/>
                <text text="价格:" textColor="#ffffff" textSize="10sp" margin="5 0 0 0"/>
                <input id="priceInput" text="0.8" textColor="#ffffff" bg="#44ffffff" w="40" h="25" textSize="10sp"/>
            </horizontal>
            <ScrollView h="120" w="200">
                <text id="logText" text="点击启动开始执行" textColor="#ffffff" textSize="10sp" margin="2"/>
            </ScrollView>
        </vertical>
    );

    window.setPosition(50, 100);
    return window;
}

// 日志函数
function addLog(window, message) {
    var timestamp = new Date().toLocaleTimeString();
    var logMessage = "[" + timestamp + "] " + message;
    ui.run(function() {
        var currentLog = window.logText.getText();
        var newLog = currentLog + "\n" + logMessage;
        // 限制日志长度，避免内存溢出
        var lines = newLog.split('\n');
        if (lines.length > 20) {
            lines = lines.slice(-20);
            newLog = lines.join('\n');
        }
        window.logText.setText(newLog);
    });
    console.log(logMessage);
}

// 打开拼多多APP
function openPinduoduo() {
    try {
        // 可能的拼多多包名
        var pddPackages = [
            "com.xunmeng.pinduoduo",
            "com.pdd.android",
            "com.pinduoduo.android"
        ];

        console.log("准备打开拼多多APP...");

        // 先回到手机主页，避免悬浮窗干扰
        console.log("回到手机主页...");
        home();
        sleep(2000);

        // 尝试直接启动拼多多APP
        console.log("启动拼多多APP...");
        app.launchApp("拼多多");
        sleep(4000);

        // 检查是否成功打开
        var currentPkg = currentPackage();
        console.log("启动后当前包名: " + currentPkg);

        for (var i = 0; i < pddPackages.length; i++) {
            if (currentPkg === pddPackages[i]) {
                console.log("成功打开拼多多APP: " + currentPkg);
                return true;
            }
        }

        // 检查是否包含拼多多相关的包名
        if (currentPkg && (currentPkg.indexOf("pinduoduo") !== -1 || currentPkg.indexOf("pdd") !== -1)) {
            console.log("检测到拼多多相关APP: " + currentPkg);
            return true;
        }

        // 如果直接启动失败，尝试通过包名启动
        console.log("尝试通过包名启动...");
        for (var i = 0; i < pddPackages.length; i++) {
            try {
                console.log("尝试启动包名: " + pddPackages[i]);
                app.launchPackage(pddPackages[i]);
                sleep(4000);

                currentPkg = currentPackage();
                console.log("包名启动后当前包名: " + currentPkg);

                if (currentPkg === pddPackages[i]) {
                    console.log("成功通过包名启动: " + pddPackages[i]);
                    return true;
                }
            } catch (e) {
                console.log("尝试启动包名 " + pddPackages[i] + " 失败: " + e.message);
            }
        }

        // 最后尝试：检查是否有拼多多相关的UI元素
        console.log("尝试检测拼多多UI元素...");
        sleep(2000);

        // 查找拼多多特有的UI元素
        var pddElements = [
            text("拼多多"),
            text("首页"),
            text("搜索"),
            textContains("拼多多"),
            desc("拼多多"),
            descContains("拼多多")
        ];

        for (var i = 0; i < pddElements.length; i++) {
            if (pddElements[i].exists()) {
                console.log("通过UI元素检测到拼多多APP");
                return true;
            }
        }

        console.log("所有方法都失败，无法确认拼多多APP已打开");
        return false;
    } catch (e) {
        console.log("启动拼多多失败: " + e.message);
        return false;
    }
}

// 解析价格文本，提取数字
function parsePrice(priceText) {
    if (!priceText) return null;

    // 移除所有非数字和小数点的字符
    var cleanPrice = priceText.replace(/[^\d.]/g, '');

    // 如果包含多个小数点，只保留第一个
    var parts = cleanPrice.split('.');
    if (parts.length > 2) {
        cleanPrice = parts[0] + '.' + parts.slice(1).join('');
    }

    var price = parseFloat(cleanPrice);
    return isNaN(price) ? null : price;
}

// 在主页寻找低价商品
function findLowPriceProducts(window, targetPrice) {
    addLog(window, "开始寻找价格低于 " + targetPrice + " 元的商品...");

    var maxScrolls = 10; // 最大滚动次数
    var scrollCount = 0;

    while (scrollCount < maxScrolls) {
        addLog(window, "第 " + (scrollCount + 1) + " 次搜索商品...");

        // 寻找当前屏幕上的价格元素

        // 常见的价格相关文本模式
        var pricePatterns = [
            /¥\s*\d+\.?\d*/,
            /￥\s*\d+\.?\d*/,
            /\d+\.\d+/,
            /\d+元/
        ];

        // 寻找包含价格的文本元素
        var allTexts = textMatches(/.*/).find();

        for (var i = 0; i < allTexts.length; i++) {
            var element = allTexts[i];
            var text = element.text();

            if (!text) continue;

            // 检查是否匹配价格模式
            for (var j = 0; j < pricePatterns.length; j++) {
                if (pricePatterns[j].test(text)) {
                    var price = parsePrice(text);
                    if (price !== null && price > 0 && price < targetPrice) {
                        addLog(window, "找到低价商品: " + text + " (价格: " + price + " 元)");

                        // 尝试点击商品
                        try {
                            // 先尝试点击价格元素本身
                            if (element.clickable()) {
                                element.click();
                                sleep(2000);
                                return true;
                            }

                            // 尝试点击父元素
                            var parent = element.parent();
                            while (parent && !parent.clickable()) {
                                parent = parent.parent();
                            }

                            if (parent && parent.clickable()) {
                                parent.click();
                                sleep(2000);
                                return true;
                            }

                            // 如果都不行，尝试点击坐标
                            var bounds = element.bounds();
                            if (bounds) {
                                click(bounds.centerX(), bounds.centerY());
                                sleep(2000);
                                return true;
                            }
                        } catch (e) {
                            addLog(window, "点击商品失败: " + e.message);
                        }
                    }
                    break;
                }
            }
        }

        // 向下滚动寻找更多商品
        addLog(window, "向下滚动寻找更多商品...");
        scrollDown();
        sleep(2000);
        scrollCount++;
    }

    addLog(window, "未找到符合条件的商品");
    return false;
}

// 在商品详情页进行购买操作
function purchaseProduct(window) {
    addLog(window, "进入商品详情页，开始购买流程...");

    // 等待页面加载
    sleep(3000);

    // 寻找购买相关按钮
    var buyButtons = [
        "免拼购买",
        "立即购买",
        "现在购买",
        "马上购买",
        "立即下单",
        "去购买",
        "购买"
    ];

    var buyButtonFound = false;

    // 尝试寻找购买按钮
    for (var i = 0; i < buyButtons.length; i++) {
        var buyBtn = text(buyButtons[i]).findOne(2000);
        if (buyBtn) {
            addLog(window, "找到购买按钮: " + buyButtons[i]);
            try {
                if (buyBtn.clickable()) {
                    buyBtn.click();
                    buyButtonFound = true;
                    break;
                } else {
                    // 尝试点击父元素
                    var parent = buyBtn.parent();
                    if (parent && parent.clickable()) {
                        parent.click();
                        buyButtonFound = true;
                        break;
                    }
                }
            } catch (e) {
                addLog(window, "点击购买按钮失败: " + e.message);
            }
        }
    }

    // 如果没找到文字按钮，尝试寻找右下角的按钮
    if (!buyButtonFound) {
        addLog(window, "未找到购买按钮，尝试点击右下角区域...");
        var screenWidth = device.width;
        var screenHeight = device.height;

        // 右下角区域通常是购买按钮
        var rightBottomX = screenWidth - 100;
        var rightBottomY = screenHeight - 150;

        click(rightBottomX, rightBottomY);
        buyButtonFound = true;
    }

    if (buyButtonFound) {
        addLog(window, "已点击购买按钮，等待页面跳转...");
        sleep(3000);

        // 进入支付流程
        return proceedToPayment(window);
    } else {
        addLog(window, "未找到购买按钮");
        return false;
    }
}

// 处理支付流程
function proceedToPayment(window) {
    addLog(window, "进入支付流程...");

    // 等待支付页面加载
    sleep(2000);

    // 寻找支付按钮
    var payButtons = [
        "立即支付",
        "确认支付",
        "去支付",
        "支付",
        "提交订单",
        "确认下单"
    ];

    var payButtonFound = false;

    for (var i = 0; i < payButtons.length; i++) {
        // 先尝试精确匹配
        var payBtn = text(payButtons[i]).findOne(1000);

        // 如果精确匹配失败，尝试包含匹配（用于处理带价格的按钮文本）
        if (!payBtn) {
            payBtn = textContains(payButtons[i]).findOne(1000);
        }

        if (payBtn) {
            addLog(window, "找到支付按钮: " + payButtons[i] + " (实际文本: " + payBtn.text() + ")");

            // 自动点击支付按钮进入支付页面（仅下单，不实际支付）
            addLog(window, "自动点击支付按钮进入支付页面...");

            // 尝试多种点击方式
            var clickSuccess = false;

            // 方式1：直接点击
            try {
                if (payBtn.clickable()) {
                    payBtn.click();
                    clickSuccess = true;
                    addLog(window, "使用直接点击成功");
                }
            } catch (e) {
                addLog(window, "直接点击失败: " + e.message);
            }

            // 方式2：点击父元素
            if (!clickSuccess) {
                try {
                    var parent = payBtn.parent();
                    if (parent && parent.clickable()) {
                        parent.click();
                        clickSuccess = true;
                        addLog(window, "使用父元素点击成功");
                    }
                } catch (e) {
                    addLog(window, "父元素点击失败: " + e.message);
                }
            }

            // 方式3：使用坐标点击
            if (!clickSuccess) {
                try {
                    var bounds = payBtn.bounds();
                    if (bounds) {
                        var centerX = bounds.centerX();
                        var centerY = bounds.centerY();
                        addLog(window, "使用坐标点击: (" + centerX + ", " + centerY + ")");
                        click(centerX, centerY);
                        clickSuccess = true;
                        addLog(window, "使用坐标点击成功");
                    }
                } catch (e) {
                    addLog(window, "坐标点击失败: " + e.message);
                }
            }

            if (clickSuccess) {
                addLog(window, "已点击支付按钮，等待支付页面加载...");
                sleep(5000); // 增加等待时间，确保支付页面完全加载

                // 进入支付页面后，开始返回流程
                addLog(window, "支付页面已加载，开始返回到主页...");
                returnToHome(window);
            } else {
                addLog(window, "所有点击方式都失败，无法点击支付按钮");
            }

            payButtonFound = true;
            break;
        }
    }

    if (!payButtonFound) {
        // 尝试通过className和文本模式查找支付按钮
        addLog(window, "尝试其他方式查找支付按钮...");

        // 查找包含价格的立即支付按钮
        var payBtnWithPrice = className("android.widget.TextView").textMatches(/立即支付.*¥.*/).findOne(2000);
        if (payBtnWithPrice) {
            addLog(window, "找到带价格的支付按钮: " + payBtnWithPrice.text());
            addLog(window, "自动点击支付按钮进入支付页面...");

            // 使用坐标点击带价格的支付按钮
            var clickSuccess = false;
            try {
                var bounds = payBtnWithPrice.bounds();
                if (bounds) {
                    var centerX = bounds.centerX();
                    var centerY = bounds.centerY();
                    addLog(window, "使用坐标点击带价格按钮: (" + centerX + ", " + centerY + ")");
                    click(centerX, centerY);
                    clickSuccess = true;
                    addLog(window, "使用坐标点击成功");
                }
            } catch (e) {
                addLog(window, "坐标点击失败: " + e.message);
                // 备用方案：直接点击
                try {
                    payBtnWithPrice.click();
                    clickSuccess = true;
                    addLog(window, "使用直接点击成功");
                } catch (e2) {
                    addLog(window, "直接点击也失败: " + e2.message);
                }
            }

            if (clickSuccess) {
                addLog(window, "已点击支付按钮，等待支付页面加载...");
                sleep(5000);
                addLog(window, "支付页面已加载，开始返回到主页...");
                returnToHome(window);
            }
            payButtonFound = true;
        } else {
            // 查找任何包含"支付"的按钮
            var anyPayBtn = textContains("支付").findOne(2000);
            if (anyPayBtn) {
                addLog(window, "找到包含'支付'的按钮: " + anyPayBtn.text());
                addLog(window, "自动点击支付按钮进入支付页面...");

                // 使用坐标点击任意支付按钮
                var clickSuccess = false;
                try {
                    var bounds = anyPayBtn.bounds();
                    if (bounds) {
                        var centerX = bounds.centerX();
                        var centerY = bounds.centerY();
                        addLog(window, "使用坐标点击支付按钮: (" + centerX + ", " + centerY + ")");
                        click(centerX, centerY);
                        clickSuccess = true;
                        addLog(window, "使用坐标点击成功");
                    }
                } catch (e) {
                    addLog(window, "坐标点击失败: " + e.message);
                    // 备用方案：直接点击
                    try {
                        anyPayBtn.click();
                        clickSuccess = true;
                        addLog(window, "使用直接点击成功");
                    } catch (e2) {
                        addLog(window, "直接点击也失败: " + e2.message);
                    }
                }

                if (clickSuccess) {
                    addLog(window, "已点击支付按钮，等待支付页面加载...");
                    sleep(5000);
                    addLog(window, "支付页面已加载，开始返回到主页...");
                    returnToHome(window);
                }
                payButtonFound = true;
            }
        }

        if (!payButtonFound) {
            addLog(window, "未找到支付按钮，可能需要手动操作");
        }
    }

    return payButtonFound;
}

// 返回到主页的函数
function returnToHome(window) {
    addLog(window, "开始返回到主页流程...");

    var maxRetries = 10; // 最多尝试10次返回
    var retryCount = 0;

    while (retryCount < maxRetries) {
        retryCount++;
        addLog(window, "第 " + retryCount + " 次尝试返回...");

        // 按返回键
        back();
        sleep(2000);

        // 检查是否已经回到主页
        var currentPkg = currentPackage();
        addLog(window, "当前包名: " + currentPkg);

        // 检查是否回到了拼多多主页
        var homeIndicators = [
            text("首页"),
            text("搜索"),
            text("拼多多"),
            textContains("首页"),
            textContains("搜索"),
            desc("首页"),
            desc("搜索")
        ];

        var isAtHome = false;
        for (var i = 0; i < homeIndicators.length; i++) {
            if (homeIndicators[i].exists()) {
                addLog(window, "检测到主页元素: " + homeIndicators[i]);
                isAtHome = true;
                break;
            }
        }

        if (isAtHome) {
            addLog(window, "成功返回到拼多多主页！");
            break;
        }

        // 如果不在拼多多APP中，说明已经退出了APP
        var pddPackages = [
            "com.xunmeng.pinduoduo",
            "com.pdd.android",
            "com.pinduoduo.android"
        ];

        var isInPDD = false;
        for (var i = 0; i < pddPackages.length; i++) {
            if (currentPkg === pddPackages[i]) {
                isInPDD = true;
                break;
            }
        }

        if (!isInPDD) {
            addLog(window, "已退出拼多多APP，任务完成");
            break;
        }

        addLog(window, "还未回到主页，继续返回...");
    }

    if (retryCount >= maxRetries) {
        addLog(window, "返回主页超时，可能需要手动操作");
    }

    addLog(window, "返回流程结束");
}

// 主执行函数
function executePDDAutoBuy(window, targetPrice) {
    try {
        addLog(window, "开始执行拼多多自动购买脚本...");

        // 1. 打开拼多多APP
        addLog(window, "正在打开拼多多APP...");
        if (!openPinduoduo()) {
            addLog(window, "无法打开拼多多APP，请检查是否已安装");
            return false;
        }

        addLog(window, "成功打开拼多多APP");
        sleep(3000);

        // 2. 确保在主页
        addLog(window, "确保在主页...");
        // 尝试点击首页按钮
        var homeBtn = text("首页").findOne(2000);
        if (homeBtn) {
            homeBtn.click();
            sleep(2000);
        }

        // 3. 寻找低价商品
        if (findLowPriceProducts(window, targetPrice)) {
            addLog(window, "成功找到并点击低价商品");

            // 4. 进行购买操作
            if (purchaseProduct(window)) {
                addLog(window, "购买流程已启动");
                return true;
            } else {
                addLog(window, "购买流程失败");
                return false;
            }
        } else {
            addLog(window, "未找到符合条件的商品");
            return false;
        }

    } catch (e) {
        addLog(window, "脚本执行出错: " + e.message);
        return false;
    }
}

// 主程序入口
function main() {
    // 检查权限
    checkPermissions();

    // 创建悬浮窗
    var window = createFloatingWindow();

    // 脚本运行状态
    var isRunning = false;
    var scriptThread = null;

    // 开关事件处理
    window.scriptSwitch.setOnCheckedChangeListener(function(_, checked) {
        if (checked) {
            // 开关打开，开始执行脚本
            if (isRunning) {
                addLog(window, "脚本正在运行中...");
                return;
            }

            // 获取目标价格
            var targetPriceText = window.priceInput.getText().toString();
            var targetPrice = parseFloat(targetPriceText);

            if (isNaN(targetPrice) || targetPrice <= 0) {
                addLog(window, "请输入有效的目标价格");
                window.scriptSwitch.setChecked(false);
                return;
            }

            addLog(window, "开始执行脚本，目标价格: " + targetPrice + " 元");
            isRunning = true;

            // 在新线程中执行脚本
            scriptThread = threads.start(function() {
                try {
                    executePDDAutoBuy(window, targetPrice);
                } catch (e) {
                    addLog(window, "脚本执行出错: " + e.message);
                } finally {
                    isRunning = false;
                    // 脚本结束时自动关闭开关
                    ui.run(function() {
                        window.scriptSwitch.setChecked(false);
                    });
                }
            });
        } else {
            // 开关关闭，停止脚本
            if (scriptThread) {
                scriptThread.interrupt();
                addLog(window, "脚本已停止");
                isRunning = false;
            }
        }
    });

    // 关闭按钮事件
    window.closeBtn.click(function() {
        if (scriptThread) {
            scriptThread.interrupt();
        }
        window.close();
        exit();
    });

    // 保持悬浮窗运行
    setInterval(function() {
        // 空函数，保持脚本运行
    }, 1000);
}

// 启动主程序
main();