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
}

/**
 * 创建菜单窗口（仅日志）
 */
FloatingMenu.prototype.create = function() {
    this.menuWindow = floaty.rawWindow(
        <frame id="menuFrame" w="280dp" h="220dp" visibility="gone">
            <card cardCornerRadius="10dp" cardElevation="8dp" margin="5dp" cardBackgroundColor="#f8f9fa">
                <vertical padding="15dp">
                    <horizontal margin="5dp" gravity="center_vertical">
                        <text id="statusText" text="运行日志" textColor="#333333" textSize="14sp" layout_gravity="left"/>
                    </horizontal>
                    <ScrollView h="160dp" w="*" margin="5dp" bg="#f9f9f9">
                        <text id="logText" text="点击悬浮球打开/关闭日志面板" textColor="#333333" textSize="11sp" padding="8dp"/>
                    </ScrollView>
                </vertical>
            </card>
        </frame>
    );

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

module.exports = FloatingMenu;
