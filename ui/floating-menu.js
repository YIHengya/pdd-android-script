// 悬浮菜单面板模块
// 负责创建和管理悬浮菜单界面

const logger = require('../utils/logger.js');

/**
 * 悬浮菜单构造函数
 */
function FloatingMenu() {
    this.menuWindow = null;
    this.visible = false;
    this.currentMode = 'purchase'; // 默认购买模式
    this.onStartCallback = null;
    this.onStopCallback = null;
    this.onModeChangeCallback = null;
    this.onUserInfoCallback = null;
}

/**
 * 创建菜单窗口
 */
FloatingMenu.prototype.create = function() {
    this.menuWindow = floaty.rawWindow(
        <frame id="menuFrame" w="280dp" h="220dp" visibility="gone" bg="#88000000">
            <card cardCornerRadius="10dp" cardElevation="8dp" cardBackgroundColor="#ffffff" margin="5dp">
                <vertical padding="15dp">
                    <horizontal gravity="center_vertical">
                        <text text="PDD自动脚本" textColor="#333333" textSize="18sp" textStyle="bold" layout_weight="1"/>
                        <button id="closeMenuBtn" text="×" textColor="#ffffff" bg="#ff4444" 
                                w="35dp" h="35dp" textSize="16sp"/>
                    </horizontal>
                    
                    <View h="1dp" bg="#eeeeee" margin="0 10dp 0 0"/>
                    
                    <horizontal margin="0 10dp 0 0" gravity="center_vertical">
                        <Switch id="scriptSwitch" text="启动脚本" textColor="#333333" textSize="14sp" checked="false"/>
                        <View layout_weight="1"/>
                        <text id="statusText" text="就绪" textColor="#666666" textSize="12sp"/>
                    </horizontal>
                    
                    <horizontal margin="0 8dp 0 0" gravity="center_vertical">
                        <text text="目标价格:" textColor="#333333" textSize="14sp"/>
                        <input id="priceInput" text="0.8" textColor="#333333" bg="#f5f5f5" 
                               w="80dp" h="40dp" textSize="14sp" margin="8dp 0 0 0" 
                               inputType="numberDecimal"/>
                        <text text="元" textColor="#333333" textSize="14sp" margin="5dp 0 0 0"/>
                    </horizontal>
                    
                    <horizontal margin="0 8dp 0 0" gravity="center">
                        <button id="purchaseBtn" text="购买模式" textColor="#ffffff" bg="#2196F3" 
                                w="100dp" h="40dp" margin="5dp" textSize="12sp"/>
                        <button id="collectBtn" text="收藏模式" textColor="#ffffff" bg="#FF9800" 
                                w="100dp" h="40dp" margin="5dp" textSize="12sp"/>
                    </horizontal>
                    
                    <horizontal margin="0 5dp 0 0" gravity="center">
                        <button id="userInfoBtn" text="用户信息" textColor="#ffffff" bg="#4CAF50"
                                w="80dp" h="35dp" margin="2dp" textSize="10sp"/>
                        <button id="settingsBtn" text="设置" textColor="#ffffff" bg="#9C27B0"
                                w="60dp" h="35dp" margin="2dp" textSize="10sp"/>
                        <button id="helpBtn" text="帮助" textColor="#ffffff" bg="#607D8B"
                                w="60dp" h="35dp" margin="2dp" textSize="10sp"/>
                    </horizontal>
                    
                    <ScrollView h="80dp" w="*" margin="0 5dp 0 0" bg="#f9f9f9">
                        <text id="logText" text="点击启动开始执行" textColor="#333333" textSize="11sp" padding="8dp"/>
                    </ScrollView>
                </vertical>
            </card>
        </frame>
    );
    
    this.menuWindow.setTouchable(true);
    this.setupEventHandlers();
    this.updateModeButtons();
    return this.menuWindow;
};

/**
 * 设置事件处理器
 */
FloatingMenu.prototype.setupEventHandlers = function() {
    var self = this;

    // 开关事件处理
    this.menuWindow.scriptSwitch.setOnCheckedChangeListener(function(_, checked) {
        if (checked) {
            self.startScript();
        } else {
            self.stopScript();
        }
    });

    // 关闭菜单按钮事件
    this.menuWindow.closeMenuBtn.click(function() {
        self.hide();
    });

    // 购买模式按钮
    this.menuWindow.purchaseBtn.click(function() {
        self.setMode('purchase');
    });

    // 收藏模式按钮
    this.menuWindow.collectBtn.click(function() {
        self.setMode('collect');
    });

    // 设置按钮
    this.menuWindow.settingsBtn.click(function() {
        self.addLog("设置功能开发中...");
        // 这里可以添加设置功能
    });

    // 用户信息按钮
    this.menuWindow.userInfoBtn.click(function() {
        self.addLog("正在获取用户信息...");
        if (self.onUserInfoCallback) {
            self.onUserInfoCallback(self.menuWindow);
        } else {
            self.addLog("用户信息功能未初始化");
        }
    });

    // 设置按钮
    this.menuWindow.settingsBtn.click(function() {
        self.addLog("设置功能开发中...");
        // 这里可以添加设置功能
    });

    // 帮助按钮
    this.menuWindow.helpBtn.click(function() {
        self.addLog("帮助: 选择模式后输入价格点击启动");
        self.addLog("用户信息: 点击获取当前账号和收件人信息");
        // 这里可以添加帮助功能
    });
};

/**
 * 启动脚本
 */
FloatingMenu.prototype.startScript = function() {
    // 获取目标价格
    var targetPriceText = this.menuWindow.priceInput.getText().toString();
    var targetPrice = parseFloat(targetPriceText);

    if (isNaN(targetPrice) || targetPrice <= 0) {
        this.addLog("请输入有效的目标价格");
        this.menuWindow.scriptSwitch.setChecked(false);
        return;
    }

    this.addLog("开始执行脚本，目标价格: " + targetPrice + " 元，模式: " + this.currentMode);
    this.updateStatus("运行中");

    // 使用setTimeout避免在UI线程中执行阻塞操作
    var self = this;
    setTimeout(function() {
        if (self.onStartCallback) {
            self.onStartCallback(self.menuWindow, targetPrice, self.currentMode);
        }
    }, 100);
};

/**
 * 停止脚本
 */
FloatingMenu.prototype.stopScript = function() {
    this.addLog("脚本已停止");
    this.updateStatus("已停止");

    if (this.onStopCallback) {
        this.onStopCallback();
    }
};

/**
 * 设置模式
 */
FloatingMenu.prototype.setMode = function(mode) {
    this.currentMode = mode;
    this.updateModeButtons();
    this.addLog("切换到" + (mode === 'purchase' ? '购买' : '收藏') + "模式");
    
    if (this.onModeChangeCallback) {
        this.onModeChangeCallback(mode);
    }
};

/**
 * 更新模式按钮状态
 */
FloatingMenu.prototype.updateModeButtons = function() {
    if (!this.menuWindow) return;
    
    ui.run(() => {
        if (this.currentMode === 'purchase') {
            this.menuWindow.purchaseBtn.attr("bg", "#1976D2");
            this.menuWindow.collectBtn.attr("bg", "#FF9800");
        } else {
            this.menuWindow.purchaseBtn.attr("bg", "#2196F3");
            this.menuWindow.collectBtn.attr("bg", "#F57C00");
        }
    });
};

/**
 * 更新状态文本
 */
FloatingMenu.prototype.updateStatus = function(status) {
    if (this.menuWindow) {
        ui.run(() => {
            this.menuWindow.statusText.setText(status);
        });
    }
};

/**
 * 获取屏幕密度
 */
FloatingMenu.prototype.getScreenDensity = function() {
    // 尝试获取屏幕密度，如果失败则使用默认值
    try {
        var density = device.density;
        if (density && !isNaN(density) && density > 0) {
            return density;
        }
    } catch (e) {
        // 忽略错误
    }

    // 尝试通过context获取密度
    try {
        var displayMetrics = context.getResources().getDisplayMetrics();
        if (displayMetrics && displayMetrics.density) {
            return displayMetrics.density;
        }
    } catch (e) {
        // 忽略错误
    }

    // 使用默认密度值（通常为2-3）
    return 2.5;
};

/**
 * 显示菜单
 */
FloatingMenu.prototype.show = function(x, y) {
    if (!this.menuWindow) return;

    var screenWidth = device.width;
    var screenHeight = device.height;

    // 获取屏幕密度
    var density = this.getScreenDensity();

    // 菜单尺寸（dp转px）
    var menuWidth = 280 * density;
    var menuHeight = 220 * density;
    var margin = 10 * density;

    // 计算菜单位置，确保完全在屏幕内
    var menuX = x || 100;
    var menuY = y || 100;

    // 水平边界检查
    if (menuX < margin) {
        menuX = margin;
    } else if (menuX + menuWidth > screenWidth - margin) {
        menuX = screenWidth - menuWidth - margin;
    }

    // 垂直边界检查
    if (menuY < margin) {
        menuY = margin;
    } else if (menuY + menuHeight > screenHeight - margin) {
        menuY = screenHeight - menuHeight - margin;
    }

    this.menuWindow.setPosition(menuX, menuY);
    this.menuWindow.menuFrame.attr("visibility", "visible");
    this.visible = true;
};

/**
 * 隐藏菜单
 */
FloatingMenu.prototype.hide = function() {
    if (this.menuWindow) {
        this.menuWindow.menuFrame.attr("visibility", "gone");
        this.visible = false;
    }
};

/**
 * 切换显示/隐藏
 */
FloatingMenu.prototype.toggle = function(x, y) {
    if (this.visible) {
        this.hide();
    } else {
        this.show(x, y);
    }
};

/**
 * 添加日志
 */
FloatingMenu.prototype.addLog = function(message) {
    if (this.menuWindow) {
        logger.addLog(this.menuWindow, message);
    }
};

/**
 * 设置回调函数
 */
FloatingMenu.prototype.setOnStartCallback = function(callback) {
    this.onStartCallback = callback;
};

FloatingMenu.prototype.setOnStopCallback = function(callback) {
    this.onStopCallback = callback;
};

FloatingMenu.prototype.setOnModeChangeCallback = function(callback) {
    this.onModeChangeCallback = callback;
};

FloatingMenu.prototype.setOnUserInfoCallback = function(callback) {
    this.onUserInfoCallback = callback;
};

/**
 * 获取当前模式
 */
FloatingMenu.prototype.getCurrentMode = function() {
    return this.currentMode;
};

/**
 * 获取菜单窗口
 */
FloatingMenu.prototype.getWindow = function() {
    return this.menuWindow;
};

/**
 * 是否可见
 */
FloatingMenu.prototype.isVisible = function() {
    return this.visible;
};

/**
 * 关闭菜单
 */
FloatingMenu.prototype.close = function() {
    if (this.menuWindow) {
        this.menuWindow.close();
    }
};

module.exports = FloatingMenu;
