// 拼多多应用检测和启动调试脚本
// 用于诊断拼多多APP启动问题

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

// 创建简单的调试悬浮窗
var debugWindow = floaty.window(
    <vertical bg="#88000000" padding="8">
        <text text="拼多多APP调试工具" textColor="#ffffff" textSize="14sp"/>
        <button id="detectBtn" text="检测应用" textColor="#ffffff" bg="#4444ff" margin="5"/>
        <button id="launchBtn" text="启动应用" textColor="#ffffff" bg="#44ff44" margin="5"/>
        <button id="closeBtn" text="关闭" textColor="#ffffff" bg="#ff4444" margin="5"/>
        <ScrollView h="300" w="300">
            <text id="logText" text="点击按钮开始调试" textColor="#ffffff" textSize="12sp" margin="5"/>
        </ScrollView>
    </vertical>
);

debugWindow.setPosition(50, 100);

function addLog(message) {
    var timestamp = new Date().toLocaleTimeString();
    var currentText = debugWindow.logText.getText();
    var newText = "[" + timestamp + "] " + message + "\n" + currentText;
    
    // 限制日志行数
    var lines = newText.split('\n');
    if (lines.length > 20) {
        lines = lines.slice(0, 20);
        newText = lines.join('\n');
    }
    
    debugWindow.logText.setText(newText);
}

// 检测拼多多应用
debugWindow.detectBtn.click(function() {
    addLog("开始检测拼多多应用...");
    
    var knownPackages = [
        "com.xunmeng.pinduoduo",
        "com.pdd.android", 
        "com.pinduoduo.android"
    ];
    
    var foundApps = [];
    
    for (var i = 0; i < knownPackages.length; i++) {
        try {
            var packageName = knownPackages[i];
            var packageManager = context.getPackageManager();
            var appInfo = packageManager.getApplicationInfo(packageName, 0);
            
            if (appInfo) {
                var appName = packageManager.getApplicationLabel(appInfo).toString();
                foundApps.push({
                    packageName: packageName,
                    appName: appName
                });
                addLog("✓ 发现: " + appName + " (" + packageName + ")");
            }
        } catch (e) {
            addLog("✗ 未安装: " + knownPackages[i]);
        }
    }
    
    if (foundApps.length === 0) {
        addLog("❌ 未检测到任何拼多多应用");
        addLog("请从应用商店安装拼多多APP");
    } else {
        addLog("✅ 检测完成，找到 " + foundApps.length + " 个应用");
    }
    
    // 检查当前应用
    var currentPkg = currentPackage();
    addLog("当前应用: " + currentPkg);
});

// 启动拼多多应用
debugWindow.launchBtn.click(function() {
    addLog("开始尝试启动拼多多应用...");
    
    var knownPackages = [
        "com.xunmeng.pinduoduo",
        "com.pdd.android", 
        "com.pinduoduo.android"
    ];
    
    var appNames = ["拼多多", "PDD", "Pinduoduo"];
    
    // 方法1: 使用包名启动
    addLog("方法1: 使用包名启动");
    for (var i = 0; i < knownPackages.length; i++) {
        try {
            addLog("尝试启动包名: " + knownPackages[i]);
            app.launchPackage(knownPackages[i]);
            waitTimeManager.wait('long');
            
            var currentPkg = currentPackage();
            addLog("启动后当前应用: " + currentPkg);
            
            if (currentPkg === knownPackages[i]) {
                addLog("✅ 成功启动: " + knownPackages[i]);
                return;
            }
        } catch (e) {
            addLog("✗ 包名启动失败: " + e.message);
        }
    }
    
    // 方法2: 使用应用名启动
    addLog("方法2: 使用应用名启动");
    for (var j = 0; j < appNames.length; j++) {
        try {
            addLog("尝试启动应用名: " + appNames[j]);
            app.launchApp(appNames[j]);
            waitTimeManager.wait('long');
            
            var currentPkg = currentPackage();
            addLog("启动后当前应用: " + currentPkg);
            
            // 检查是否是拼多多相关应用
            if (currentPkg && (currentPkg.indexOf("pinduoduo") !== -1 || 
                              currentPkg.indexOf("pdd") !== -1 ||
                              currentPkg.indexOf("xunmeng") !== -1)) {
                addLog("✅ 成功启动拼多多相关应用");
                return;
            }
        } catch (e) {
            addLog("✗ 应用名启动失败: " + e.message);
        }
    }
    
    // 方法3: 尝试通过Intent启动
    addLog("方法3: 尝试通过Intent启动");
    try {
        var intent = new Intent();
        intent.setAction("android.intent.action.MAIN");
        intent.addCategory("android.intent.category.LAUNCHER");
        intent.setPackage("com.xunmeng.pinduoduo");
        context.startActivity(intent);

        waitTimeManager.wait('long');
        var currentPkg = currentPackage();
        addLog("Intent启动后当前应用: " + currentPkg);
        
        if (currentPkg === "com.xunmeng.pinduoduo") {
            addLog("✅ Intent启动成功");
            return;
        }
    } catch (e) {
        addLog("✗ Intent启动失败: " + e.message);
    }
    
    addLog("❌ 所有启动方法都失败了");
    addLog("请确认已安装拼多多APP并重试");
});

// 关闭按钮
debugWindow.closeBtn.click(function() {
    debugWindow.close();
    exit();
});

addLog("调试工具已启动");
addLog("请先点击'检测应用'按钮");

// 导入全局停止管理器
const { GlobalStopManager } = require('./utils/common.js');
const { waitTimeManager } = require('./utils/wait-time-manager.js');

// 保持脚本运行
var keepAliveInterval = setInterval(function() {
    // 检查是否需要停止
    if (GlobalStopManager.isStopRequested()) {
        clearInterval(keepAliveInterval);
        return;
    }
    // 空函数，保持脚本运行
}, 1000);

// 注册定时器到全局停止管理器
GlobalStopManager.registerInterval(keepAliveInterval);
