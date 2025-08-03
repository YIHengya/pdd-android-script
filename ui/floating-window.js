// 悬浮球UI模块
// 负责创建和管理悬浮球界面

const FloatingMenu = require('./floating-menu.js');

/**
 * 悬浮球构造函数
 */
function FloatingWindow() {
    this.ballWindow = null;
    this.floatingMenu = null;
    this.onStartCallback = null;
    this.onStopCallback = null;
}

/**
 * 创建悬浮球
 * @returns {Object} 悬浮球对象
 */
FloatingWindow.prototype.create = function() {
    this.createFloatingBall();
    this.createFloatingMenu();
    this.setupBallEventHandlers();
    return this.ballWindow;
};

/**
 * 创建悬浮球主体
 */
FloatingWindow.prototype.createFloatingBall = function() {
    // 创建悬浮球
    this.ballWindow = floaty.rawWindow(
        <frame w="40dp" h="40dp">
            <card id="ballCard" w="40dp" h="40dp" cardCornerRadius="20dp"
                  cardBackgroundColor="#4CAF50" cardElevation="8dp"
                  foreground="?selectableItemBackground" gravity="center">
                <img id="ballIcon" w="24dp" h="24dp" src="@drawable/ic_android_black_48dp"
                     tint="#ffffff" gravity="center" layout_gravity="center"/>
            </card>
        </frame>
    );

    this.ballWindow.setPosition(50, 200);
    this.ballWindow.setTouchable(true);
};

/**
 * 创建悬浮菜单
 */
FloatingWindow.prototype.createFloatingMenu = function() {
    this.floatingMenu = new FloatingMenu();
    this.floatingMenu.create();

    // 设置菜单回调
    var self = this;
    this.floatingMenu.setOnStartCallback(function(window, priceRange, mode, purchaseQuantity) {
        if (self.onStartCallback) {
            self.onStartCallback(window, priceRange, mode, purchaseQuantity);
        }
    });

    this.floatingMenu.setOnStopCallback(function() {
        if (self.onStopCallback) {
            self.onStopCallback();
        }
    });
};

/**
 * 设置悬浮球事件处理器
 */
FloatingWindow.prototype.setupBallEventHandlers = function() {
    var self = this;
    var startX, startY, windowX, windowY;
    var isMoving = false;
    var downTime = 0;

    // 悬浮球触摸事件
    this.ballWindow.ballCard.setOnTouchListener(function(_, event) {
        switch (event.getAction()) {
            case event.ACTION_DOWN:
                startX = event.getRawX();
                startY = event.getRawY();
                windowX = self.ballWindow.getX();
                windowY = self.ballWindow.getY();
                downTime = new Date().getTime();
                isMoving = false;
                return true;

            case event.ACTION_MOVE:
                var deltaX = Math.abs(event.getRawX() - startX);
                var deltaY = Math.abs(event.getRawY() - startY);

                if (deltaX > 10 || deltaY > 10) {
                    isMoving = true;
                    self.ballWindow.setPosition(
                        windowX + (event.getRawX() - startX),
                        windowY + (event.getRawY() - startY)
                    );
                }
                return true;

            case event.ACTION_UP:
                var upTime = new Date().getTime();
                var deltaTime = upTime - downTime;

                if (!isMoving && deltaTime < 300) {
                    // 短按，显示/隐藏菜单
                    self.toggleMenu();
                } else if (isMoving) {
                    // 拖拽结束，自动吸附到屏幕边缘
                    self.snapToEdge();
                }
                return true;
        }
        return false;
    });
};

/**
 * 获取屏幕密度
 */
FloatingWindow.prototype.getScreenDensity = function() {
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
 * 切换菜单显示/隐藏
 */
FloatingWindow.prototype.toggleMenu = function() {
    var ballX = this.ballWindow.getX();
    var ballY = this.ballWindow.getY();
    var screenWidth = device.width;
    var screenHeight = device.height;

    // 获取屏幕密度
    var density = this.getScreenDensity();

    // 悬浮球尺寸（dp转px）
    var ballSize = 40 * density;
    // 菜单尺寸（dp转px）
    var menuWidth = 280 * density;
    var menuHeight = 360 * density;

    // 计算菜单位置，智能选择显示方向
    var menuX, menuY;

    // 水平位置：优先显示在右侧，如果右侧空间不够则显示在左侧
    if (ballX + ballSize + menuWidth + 10 <= screenWidth) {
        // 右侧有足够空间
        menuX = ballX + ballSize + 10;
    } else if (ballX - menuWidth - 10 >= 0) {
        // 左侧有足够空间
        menuX = ballX - menuWidth - 10;
    } else {
        // 两侧都没有足够空间，居中显示
        menuX = (screenWidth - menuWidth) / 2;
    }

    // 垂直位置：尽量与悬浮球对齐，但确保不超出屏幕
    menuY = ballY - 50;
    if (menuY < 0) {
        menuY = 10;
    } else if (menuY + menuHeight > screenHeight) {
        menuY = screenHeight - menuHeight - 10;
    }

    this.floatingMenu.toggle(menuX, menuY);
};

/**
 * 自动吸附到屏幕边缘
 */
FloatingWindow.prototype.snapToEdge = function() {
    var currentX = this.ballWindow.getX();
    var currentY = this.ballWindow.getY();
    var screenWidth = device.width;
    var screenHeight = device.height;

    // 获取屏幕密度
    var density = this.getScreenDensity();

    // 正确计算悬浮球尺寸（dp转px）
    var ballWidth = 40 * density;
    var ballHeight = 40 * density;

    // 确保悬浮球不超出屏幕边界
    var targetX = currentX < screenWidth / 2 ? 0 : screenWidth - ballWidth;
    var targetY = currentY;

    // 垂直方向也要确保不超出边界
    if (targetY < 0) {
        targetY = 0;
    } else if (targetY + ballHeight > screenHeight) {
        targetY = screenHeight - ballHeight;
    }

    // 简单的动画效果
    var self = this;
    var startX = currentX;
    var startY = currentY;
    var distanceX = targetX - startX;
    var distanceY = targetY - startY;
    var duration = 300;
    var startTime = new Date().getTime();

    var animateInterval = setInterval(function() {
        var elapsed = new Date().getTime() - startTime;
        var progress = Math.min(elapsed / duration, 1);

        // 使用缓动函数
        var easeProgress = 1 - Math.pow(1 - progress, 3);
        var newX = startX + distanceX * easeProgress;
        var newY = startY + distanceY * easeProgress;

        self.ballWindow.setPosition(newX, newY);

        if (progress >= 1) {
            clearInterval(animateInterval);
        }
    }, 16);
};

/**
 * 添加日志到菜单
 * @param {string} message 日志消息
 */
FloatingWindow.prototype.addLog = function(message) {
    if (this.floatingMenu) {
        this.floatingMenu.addLog(message);
    }
};

/**
 * 设置脚本启动回调
 * @param {Function} callback 回调函数
 */
FloatingWindow.prototype.setOnStartCallback = function(callback) {
    this.onStartCallback = callback;
};

/**
 * 设置脚本停止回调
 * @param {Function} callback 回调函数
 */
FloatingWindow.prototype.setOnStopCallback = function(callback) {
    this.onStopCallback = callback;
};

/**
 * 设置用户信息回调
 * @param {Function} callback 回调函数
 */
FloatingWindow.prototype.setOnUserInfoCallback = function(callback) {
    if (this.floatingMenu) {
        this.floatingMenu.setOnUserInfoCallback(callback);
    }
};

/**
 * 关闭悬浮球
 */
FloatingWindow.prototype.close = function() {
    if (this.ballWindow) {
        this.ballWindow.close();
        this.ballWindow = null;
    }
    if (this.floatingMenu) {
        this.floatingMenu.close();
        this.floatingMenu = null;
    }
};

/**
 * 关闭悬浮球并退出应用
 */
FloatingWindow.prototype.closeAndExit = function() {
    this.close();
    exit();
};

/**
 * 获取悬浮球对象
 * @returns {Object} 悬浮球对象
 */
FloatingWindow.prototype.getWindow = function() {
    return this.ballWindow;
};

/**
 * 获取菜单对象
 * @returns {Object} 菜单对象
 */
FloatingWindow.prototype.getFloatingMenu = function() {
    return this.floatingMenu;
};

/**
 * 获取菜单窗口对象
 * @returns {Object} 菜单窗口对象
 */
FloatingWindow.prototype.getMenuWindow = function() {
    return this.floatingMenu ? this.floatingMenu.getWindow() : null;
};

module.exports = FloatingWindow;
