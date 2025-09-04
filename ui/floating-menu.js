// 悬浮菜单面板模块（精简版：仅日志）
// 仅保留日志显示与基础显示/隐藏能力

const logger = require('../utils/logger.js');

/**
 * 悬浮菜单构造函数
 */
function FloatingMenu() {
    this.menuWindow = null;
    this.visible = false;
    this.onStartCallback = null;
    this.onStopCallback = null;
    this.onUserInfoCallback = null;
    
    // 默认配置
    this.config = {
        priceRange: {
            min: 0.5,
            max: 0.8
        },
        mode: "favorite",
        purchaseQuantity: 1
    };
}

/**
 * 创建菜单窗口（包含日志和控制按钮）
 */
FloatingMenu.prototype.create = function() {
    var self = this;
    this.menuWindow = floaty.rawWindow(
        <frame id="menuFrame" w="280dp" h="280dp" visibility="gone">
            <card cardCornerRadius="10dp" cardElevation="8dp" margin="5dp" cardBackgroundColor="#f8f9fa">
                <vertical padding="15dp">
                    <horizontal margin="5dp" gravity="center_vertical">
                        <text id="statusText" text="运行日志" textColor="#333333" textSize="14sp" layout_weight="1"/>
                        <text id="modeText" text="收藏模式" textColor="#666666" textSize="12sp" layout_gravity="right"/>
                    </horizontal>
                    <ScrollView h="160dp" w="*" margin="5dp" bg="#f9f9f9">
                        <text id="logText" text="点击悬浮球打开/关闭日志面板" textColor="#333333" textSize="11sp" padding="8dp"/>
                    </ScrollView>
                    <horizontal gravity="center" margin="5dp 10dp 5dp 10dp">
                        <button id="startScriptBtn" text="启动脚本"
                                textColor="#ffffff" bg="#FF5722"
                                w="120dp" h="40dp" margin="5dp" textSize="14sp"/>
                        <button id="stopScriptBtn" text="停止脚本"
                                textColor="#ffffff" bg="#9E9E9E"
                                w="120dp" h="40dp" margin="5dp" textSize="14sp" alpha="0.6"/>
                    </horizontal>
                </vertical>
            </card>
        </frame>
    );

    // 设置按钮点击事件
    this.menuWindow.startScriptBtn.on("click", function() {
        self.addLog("启动脚本...");
        // 更新按钮状态
        self.setButtonState(false);
        // 调用启动回调函数
        if (self.onStartCallback) {
            self.onStartCallback(self.menuWindow, self.getPriceRange(), self.getCurrentMode(), self.getPurchaseQuantity());
        }
    });

    this.menuWindow.stopScriptBtn.on("click", function() {
        self.addLog("停止脚本...");
        // 设置全局停止标志
        global.scriptStopped = true;
        
        // 更新按钮状态
        self.setButtonState(true);
        
        // 强制关闭所有线程
        threads.shutDownAll();
        
        // 调用停止回调函数
        if (self.onStopCallback) {
            self.onStopCallback();
        }
    });

    this.menuWindow.setTouchable(true);
    return this.menuWindow;
};

/**
 * 获取屏幕密度
 */
FloatingMenu.prototype.getScreenDensity = function() {
    try {
        var density = device.density;
        if (density && !isNaN(density) && density > 0) return density;
    } catch (e) {}
    try {
        var displayMetrics = context.getResources().getDisplayMetrics();
        if (displayMetrics && displayMetrics.density) return displayMetrics.density;
    } catch (e) {}
    return 2.5;
};

/**
 * 显示菜单
 */
FloatingMenu.prototype.show = function(x, y) {
    if (!this.menuWindow) return;

    var screenWidth = device.width;
    var screenHeight = device.height;
    var density = this.getScreenDensity();

    // 菜单尺寸（dp转px）
    var menuWidth = 280 * density;
    var menuHeight = 220 * density;
    var margin = 10 * density;

    var menuX = x || 100;
    var menuY = y || 100;

    if (menuX < margin) menuX = margin; else if (menuX + menuWidth > screenWidth - margin) menuX = screenWidth - menuWidth - margin;
    if (menuY < margin) menuY = margin; else if (menuY + menuHeight > screenHeight - margin) menuY = screenHeight - menuHeight - margin;

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
 * 添加日志
 */
FloatingMenu.prototype.addLog = function(message) {
    if (this.menuWindow) {
        logger.addLog(this.menuWindow, message);
    }
};

/**
 * 设置回调函数（占位，保持兼容）
 */
FloatingMenu.prototype.setOnStartCallback = function(callback) {
    this.onStartCallback = callback;
};
FloatingMenu.prototype.setOnStopCallback = function(callback) {
    this.onStopCallback = callback;
};
FloatingMenu.prototype.setOnUserInfoCallback = function(callback) {
    this.onUserInfoCallback = callback;
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

/**
 * 设置按钮状态
 * @param {boolean} canStart - true: 可以启动脚本, false: 无法启动脚本（脚本运行中）
 */
FloatingMenu.prototype.setButtonState = function(canStart) {
    if (!this.menuWindow) return;

    ui.run(() => {
        if (canStart) {
            // 可以启动脚本状态
            this.menuWindow.startScriptBtn.attr("alpha", "1.0");
            this.menuWindow.stopScriptBtn.attr("alpha", "0.6");
            this.menuWindow.startScriptBtn.setEnabled(true);
            this.menuWindow.stopScriptBtn.setEnabled(false);
            this.updateStatus("就绪");
        } else {
            // 脚本运行中状态
            this.menuWindow.startScriptBtn.attr("alpha", "0.6");
            this.menuWindow.stopScriptBtn.attr("alpha", "1.0");
            this.menuWindow.startScriptBtn.setEnabled(false);
            this.menuWindow.stopScriptBtn.setEnabled(true);
            this.updateStatus("运行中");
        }
    });
};

/**
 * 获取价格区间
 * @returns {Object} - 包含min和max的价格范围对象
 */
FloatingMenu.prototype.getPriceRange = function() {
    return this.config.priceRange;
};

/**
 * 设置价格区间
 * @param {Object} priceRange - 包含min和max的价格范围对象
 */
FloatingMenu.prototype.setPriceRange = function(priceRange) {
    if (priceRange && typeof priceRange.min === 'number' && typeof priceRange.max === 'number') {
        this.config.priceRange = priceRange;
        this.updateStatus("价格区间: " + priceRange.min.toFixed(2) + "-" + priceRange.max.toFixed(2) + "元");
    }
};

/**
 * 获取当前模式
 * @returns {string} - 当前模式字符串
 */
FloatingMenu.prototype.getCurrentMode = function() {
    return this.config.mode;
};

/**
 * 设置当前模式
 * @param {string} mode - 模式名称
 */
FloatingMenu.prototype.setCurrentMode = function(mode) {
    if (!this.menuWindow) return;
    
    this.config.mode = mode || "favorite";
    var modeText = "收藏模式";
    
    if (mode === "favoriteSettlement") {
        modeText = "收藏结算模式";
    } else if (mode === "payment") {
        modeText = "支付模式";
    } else if (mode === "delivery") {
        modeText = "待收货模式";
    } else if (mode === "search") {
        modeText = "搜索模式";
    }
    
    ui.run(() => {
        this.menuWindow.modeText.setText(modeText);
    });
    this.addLog("当前模式: " + modeText);
};

/**
 * 获取购买数量
 * @returns {number} - 购买数量
 */
FloatingMenu.prototype.getPurchaseQuantity = function() {
    return this.config.purchaseQuantity;
};

/**
 * 设置购买数量
 * @param {number} quantity - 购买数量
 */
FloatingMenu.prototype.setPurchaseQuantity = function(quantity) {
    if (typeof quantity === 'number' && quantity > 0) {
        this.config.purchaseQuantity = quantity;
        this.addLog("购买数量: " + quantity + "件");
    }
};

module.exports = FloatingMenu;
