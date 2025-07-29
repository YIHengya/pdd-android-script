// 检查悬浮窗权限
if (!floaty.checkPermission()) {
    toast("请授予悬浮窗权限");
    floaty.requestPermission();
    exit();
}

// 拼多多商品链接
const PDD_URL = "https://mobile.yangkeduo.com/goods.html?goods_id=777095266166";

// 创建悬浮窗
var window = floaty.window(
    <vertical bg="#88000000" padding="8">
        <horizontal>
            <text text="拼多多收藏脚本" textColor="#ffffff" textSize="14sp"/>
            <button id="closeBtn" text="×" textColor="#ffffff" bg="#44ff0000" w="30" h="30" margin="5 0 0 0"/>
        </horizontal>
        <horizontal margin="0 5 0 0">
            <button id="startBtn" text="开始" textColor="#ffffff" bg="#4400ff00" w="50" h="35"/>
            <button id="stopBtn" text="停止" textColor="#ffffff" bg="#44ff0000" w="50" h="35" margin="5 0 0 0"/>
        </horizontal>
        <ScrollView h="200" w="280">
            <text id="logText" text="点击开始执行脚本" textColor="#ffffff" textSize="12sp" margin="5"/>
        </ScrollView>
    </vertical>
);

// 设置悬浮窗初始位置
window.setPosition(50, 100);

// 日志函数
function addLog(message) {
    var timestamp = new Date().toLocaleTimeString();
    var logMessage = "[" + timestamp + "] " + message;
    ui.run(function() {
        var currentLog = window.logText.getText();
        window.logText.setText(currentLog + "\n" + logMessage);
    });
    console.log(logMessage);
}

// 脚本运行状态
var isRunning = false;
var scriptThread = null;

// 按钮事件处理
window.startBtn.click(function() {
    if (isRunning) {
        addLog("脚本正在运行中...");
        return;
    }

    addLog("开始执行脚本");
    isRunning = true;

    // 在新线程中执行脚本
    scriptThread = threads.start(function() {
        try {
            executePDDScript();
        } catch (e) {
            addLog("脚本执行出错: " + e.message);
        } finally {
            isRunning = false;
        }
    });
});

window.stopBtn.click(function() {
    if (scriptThread) {
        scriptThread.interrupt();
        addLog("脚本已停止");
        isRunning = false;
    }
});

window.closeBtn.click(function() {
    if (scriptThread) {
        scriptThread.interrupt();
    }
    window.close();
    exit();
});

function executePDDScript() {
    addLog("正在打开拼多多链接...");

    // 打开浏览器访问拼多多链接
    app.openUrl(PDD_URL);

    // 等待页面加载
    addLog("等待页面加载(3秒)...");
    sleep(3000);

    // 检查当前应用是否已经是拼多多
    var currentApp = currentPackage();
    addLog("当前应用包名: " + currentApp);

    if (currentApp === "com.xunmeng.pinduoduo") {
        addLog("已直接跳转到拼多多APP");
    } else {
        addLog("等待页面完全加载(3秒)...");
        sleep(2000);

        addLog("寻找拼多多应用跳转按钮...");

        // 寻找并点击"打开拼多多"或类似的按钮
        var openAppButtons = [
            "打开拼多多",
            "立即打开",
            "打开APP",
            "去APP购买",
            "打开应用",
            "在拼多多中打开",
            "立即购买"
        ];

        var buttonFound = false;
        for (let i = 0; i < openAppButtons.length; i++) {
            if (!isRunning) return;

            var btn = text(openAppButtons[i]).findOne(1500);
            if (btn) {
                addLog("找到按钮: " + openAppButtons[i] + "，正在点击...");
                btn.click();
                buttonFound = true;
                break;
            }
        }

        if (!buttonFound) {
            // 尝试寻找包含"打开"的按钮
            var openBtn = textContains("打开").findOne(1500);
            if (openBtn) {
                addLog("找到包含'打开'的按钮，正在点击...");
                openBtn.click();
                buttonFound = true;
            }
        }

        if (!buttonFound) {
            addLog("未找到跳转按钮，可能已自动跳转或需要手动操作");
        }

        // 等待跳转
        addLog("等待跳转到拼多多APP(5秒)...");
        sleep(2000);
    }

    // 再次检查是否在拼多多APP中
    currentApp = currentPackage();
    addLog("当前应用: " + currentApp);

    if (currentApp !== "com.xunmeng.pinduoduo") {
        addLog("未成功跳转到拼多多APP，请手动打开");
        return;
    }

    addLog("已在拼多多APP中，等待页面加载(3秒)...");
    sleep(3000);

    addLog("开始寻找收藏按钮...");

    // 等待商品页面完全加载
    sleep(2000);

    var collectFound = false;
    var attempts = 0;
    var maxAttempts = 3;

    while (!collectFound && attempts < maxAttempts && isRunning) {
        attempts++;
        addLog("第 " + attempts + " 次尝试寻找收藏按钮...");

        // 方法1: 通过文字寻找收藏按钮
        var collectTextButtons = [
            "收藏",
            "♡",
            "❤",
            "🤍",
            "❤️",
            "喜欢"
        ];

        for (let i = 0; i < collectTextButtons.length; i++) {
            if (!isRunning) return;

            var collectBtn = text(collectTextButtons[i]).findOne(1000);
            if (collectBtn) {
                addLog("通过文字找到收藏按钮: " + collectTextButtons[i]);
                // 检查按钮是否可点击
                if (collectBtn.clickable()) {
                    addLog("按钮可点击，正在点击...");
                    collectBtn.click();
                    collectFound = true;
                    break;
                } else {
                    addLog("按钮不可点击，尝试点击父元素...");
                    var parent = collectBtn.parent();
                    if (parent && parent.clickable()) {
                        parent.click();
                        collectFound = true;
                        break;
                    }
                }
            }
        }

        if (!collectFound) {
            // 方法2: 通过描述寻找收藏按钮
            var collectByDesc = desc("收藏").findOne(1000);
            if (collectByDesc) {
                addLog("通过描述找到收藏按钮");
                if (collectByDesc.clickable()) {
                    collectByDesc.click();
                    collectFound = true;
                } else {
                    var parent = collectByDesc.parent();
                    if (parent && parent.clickable()) {
                        parent.click();
                        collectFound = true;
                    }
                }
            }
        }

        if (!collectFound) {
            // 方法3: 通过包含文字寻找
            var collectByContains = textContains("收藏").findOne(1000);
            if (collectByContains) {
                addLog("通过包含文字找到收藏相关元素");
                if (collectByContains.clickable()) {
                    collectByContains.click();
                    collectFound = true;
                } else {
                    var parent = collectByContains.parent();
                    if (parent && parent.clickable()) {
                        parent.click();
                        collectFound = true;
                    }
                }
            }
        }

        if (!collectFound) {
            // 方法4: 通过className寻找可能的收藏按钮
            addLog("尝试通过坐标位置寻找收藏按钮...");

            // 通常收藏按钮在右上角或商品信息下方
            // 尝试点击屏幕右上角区域
            var screenWidth = device.width;
            var screenHeight = device.height;

            // 右上角区域
            var rightTopX = screenWidth - 100;
            var rightTopY = 200;

            addLog("尝试点击右上角位置: (" + rightTopX + ", " + rightTopY + ")");
            click(rightTopX, rightTopY);
            sleep(1000);

            // 检查是否出现收藏成功的提示
            if (textContains("收藏成功").exists() || textContains("已收藏").exists()) {
                collectFound = true;
                addLog("通过坐标点击成功收藏");
            }
        }

        if (!collectFound && attempts < maxAttempts) {
            addLog("未找到收藏按钮，等待2秒后重试...");
            sleep(2000);
        }
    }

    if (collectFound) {
        addLog("收藏操作已执行");
        sleep(2000);

        // 验证收藏是否成功
        if (textContains("收藏成功").exists() || textContains("已收藏").exists() || text("❤").exists()) {
            addLog("收藏成功！");
        } else {
            addLog("收藏操作已执行，但无法确认是否成功");
        }

        addLog("脚本执行完成");
    } else {
        addLog("经过 " + maxAttempts + " 次尝试，未能找到收藏按钮");
        addLog("请手动收藏商品");
    }

    isRunning = false;
}

// 确保有必要的权限
if (!auto.service) {
    addLog("请先开启无障碍服务");
    toast("请先开启无障碍服务");
}

// 保持悬浮窗运行
setInterval(function() {
    // 空函数，保持脚本运行
}, 1000);
