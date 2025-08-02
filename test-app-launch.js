// 测试拼多多应用启动修复
// 用于验证currentPackage()返回null的问题是否已解决

// 检查权限
if (!auto.service) {
    toast("请先开启无障碍服务");
    auto.waitFor();
}

if (!floaty.checkPermission()) {
    toast("请授予悬浮窗权限");
    floaty.requestPermission();
    exit();
}

// 导入修复后的模块
const NavigationHelper = require('./utils/navigation.js');
const logger = require('./utils/logger.js');

// 创建测试悬浮窗
var testWindow = floaty.window(
    <vertical bg="#88000000" padding="8">
        <text text="拼多多启动测试" textColor="#ffffff" textSize="14sp"/>
        <button id="testBtn" text="测试启动" textColor="#ffffff" bg="#44ff44" margin="5"/>
        <button id="detectBtn" text="检测状态" textColor="#ffffff" bg="#4444ff" margin="5"/>
        <button id="closeBtn" text="关闭" textColor="#ffffff" bg="#ff4444" margin="5"/>
        <ScrollView h="300" w="300">
            <text id="logText" text="点击按钮开始测试" textColor="#ffffff" textSize="12sp" margin="5"/>
        </ScrollView>
    </vertical>
);

testWindow.setPosition(50, 100);

// 日志函数
function addLog(message) {
    var timestamp = new Date().toLocaleTimeString();
    var logMessage = "[" + timestamp + "] " + message;
    
    ui.run(function() {
        var currentText = testWindow.logText.getText();
        var lines = currentText.split('\n');
        
        // 保持最多20行日志
        if (lines.length >= 20) {
            lines = lines.slice(-19);
        }
        
        lines.push(logMessage);
        testWindow.logText.setText(lines.join('\n'));
    });
    
    console.log(logMessage);
}

// 创建导航助手实例
var navigationHelper = new NavigationHelper();

// 测试启动按钮
testWindow.testBtn.click(function() {
    addLog("=== 开始测试拼多多启动 ===");
    
    threads.start(function() {
        try {
            // 创建模拟窗口对象
            var mockWindow = {
                logText: {
                    getText: function() { return ""; },
                    setText: function(text) { addLog(text.split('] ').pop()); }
                }
            };
            
            // 测试启动
            var result = navigationHelper.launchApp(mockWindow);
            
            if (result) {
                addLog("✅ 启动测试成功");
            } else {
                addLog("❌ 启动测试失败");
            }
            
            addLog("=== 测试完成 ===");
            
        } catch (e) {
            addLog("测试异常: " + e.message);
        }
    });
});

// 检测状态按钮
testWindow.detectBtn.click(function() {
    addLog("=== 开始检测当前状态 ===");
    
    threads.start(function() {
        try {
            // 检测当前包名
            var currentPkg = navigationHelper.getCurrentPackageWithRetry(3, 500);
            addLog("当前包名: " + (currentPkg || "null"));
            
            // 检测是否是拼多多
            var isPDD = navigationHelper.isPDDApp(currentPkg);
            addLog("是否为拼多多: " + isPDD);
            
            // 检测UI
            var uiDetection = navigationHelper.detectPDDByUI();
            addLog("UI检测结果: " + uiDetection);
            
            // 检测安装状态
            var mockWindow = {
                logText: {
                    getText: function() { return ""; },
                    setText: function(text) { 
                        var msg = text.split('] ').pop();
                        if (msg.indexOf("检查应用安装状态") !== -1) {
                            addLog(msg);
                        }
                    }
                }
            };
            var isInstalled = navigationHelper.isPDDInstalled(mockWindow);
            addLog("应用安装状态: " + isInstalled);
            
            addLog("=== 检测完成 ===");
            
        } catch (e) {
            addLog("检测异常: " + e.message);
        }
    });
});

// 关闭按钮
testWindow.closeBtn.click(function() {
    testWindow.close();
    exit();
});

addLog("测试工具已启动");
addLog("请先点击'检测状态'查看当前状态");
addLog("然后点击'测试启动'验证修复效果");

// 保持脚本运行
setInterval(function() {
    // 空函数，保持脚本运行
}, 1000);
