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
        <frame id="menuFrame" w="280dp" h="320dp" visibility="gone">
            <card cardCornerRadius="10dp" cardElevation="8dp" margin="5dp" cardBackgroundColor="#f8f9fa">
                <vertical padding="15dp">
                    <horizontal margin="5dp" gravity="center_vertical">
                        <Switch id="scriptSwitch" text="自动下单" textColor="#333333" textSize="14sp" checked="false" layout_weight="0"/>
                        <text id="statusText" text="就绪" textColor="#666666" textSize="12sp" layout_gravity="right" margin="10dp 0 0 0"/>
                    </horizontal>
                    
                    <vertical margin="5dp 5dp 2dp 5dp">
                        <horizontal gravity="center_vertical">
                            <text text="价格区间:" textColor="#333333" textSize="14sp"/>
                            <text id="priceRangeDisplay" text="0.50-0.80元" textColor="#333333" textSize="14sp"
                                  margin="8dp 0 0 0" textStyle="bold"/>
                        </horizontal>

                        <horizontal gravity="center_vertical" margin="0 0 3dp 0">
                            <text text="最低:" textColor="#666666" textSize="12sp" w="35dp"/>
                            <seekbar id="minPriceSeekbar" w="*" h="12dp" margin="0 4dp 0 4dp"
                                     max="100" progress="21" progressTint="#4CAF50" thumbTint="#4CAF50"/>
                            <text id="minPriceText" text="0.50" textColor="#666666" textSize="11sp" w="35dp" gravity="center"/>
                        </horizontal>

                        <horizontal gravity="center_vertical">
                            <text text="最高:" textColor="#666666" textSize="12sp" w="35dp"/>
                            <seekbar id="maxPriceSeekbar" w="*" h="12dp" margin="0 4dp 0 4dp"
                                     max="100" progress="37" progressTint="#FF5722" thumbTint="#FF5722"/>
                            <text id="maxPriceText" text="0.80" textColor="#666666" textSize="11sp" w="35dp" gravity="center"/>
                        </horizontal>
                    </vertical>

                    <horizontal margin="2dp 5dp 5dp 5dp" gravity="center">
                        <button id="purchaseBtn" text="购买模式" textColor="#ffffff" bg="#2196F3"
                                w="100dp" h="40dp" margin="5dp" textSize="12sp"/>
                        <button id="collectBtn" text="收藏模式" textColor="#ffffff" bg="#FF9800"
                                w="100dp" h="40dp" margin="5dp" textSize="12sp"/>
                    </horizontal>

                    <horizontal margin="5dp" gravity="center">
                        <button id="userInfoBtn" text="更新用户信息" textColor="#ffffff" bg="#4CAF50"
                                w="120dp" h="35dp" margin="2dp" textSize="10sp"/>
                    </horizontal>

                    <ScrollView h="80dp" w="*" margin="5dp" bg="#f9f9f9">
                        <text id="logText" text="点击启动开始执行" textColor="#333333" textSize="11sp" padding="8dp"/>
                    </ScrollView>

                    <View h="1dp" bg="#eeeeee" margin="5dp"/>

                    <vertical id="userInfoSection" margin="5dp" padding="8dp" visibility="visible">
                        <text text="收件人信息" textColor="#333333" textSize="12sp" textStyle="bold" margin="0 0 5dp 0"/>
                        <horizontal gravity="center_vertical">
                            <text text="姓名:" textColor="#666666" textSize="11sp" w="40dp"/>
                            <text id="recipientName" text="未获取" textColor="#333333" textSize="11sp" layout_weight="1"/>
                        </horizontal>
                        <horizontal gravity="center_vertical" margin="0 0 2dp 0">
                            <text text="手机:" textColor="#666666" textSize="11sp" w="40dp"/>
                            <text id="recipientPhone" text="未获取" textColor="#333333" textSize="11sp" layout_weight="1"/>
                        </horizontal>
                        <horizontal gravity="center_vertical">
                            <text text="地址:" textColor="#666666" textSize="11sp" w="40dp"/>
                            <text id="recipientAddress" text="未获取" textColor="#333333" textSize="10sp" layout_weight="1" maxLines="2"/>
                        </horizontal>
                    </vertical>
                </vertical>
            </card>
        </frame>
    );
    
    this.menuWindow.setTouchable(true);

    // 延迟设置事件处理器，确保UI元素已完全初始化
    var self = this;
    setTimeout(function() {
        self.setupEventHandlers();
        // 初始化价格显示
        self.initializePriceDisplay();
    }, 100);

    this.updateModeButtons();
    return this.menuWindow;
};

/**
 * 初始化价格显示
 */
FloatingMenu.prototype.initializePriceDisplay = function() {
    if (!this.menuWindow) return;

    try {
        // 获取当前滑动条的进度值
        var minProgress = this.menuWindow.minPriceSeekbar.getProgress();
        var maxProgress = this.menuWindow.maxPriceSeekbar.getProgress();

        // 计算对应的价格
        var minPrice = 0.1 + (minProgress / 100.0) * 1.9;
        var maxPrice = 0.1 + (maxProgress / 100.0) * 1.9;

        // 更新价格显示
        this.updatePriceRangeDisplay(minPrice, maxPrice);
    } catch (e) {
        console.error("初始化价格显示失败: " + e.message);
    }
};

/**
 * 设置事件处理器
 */
FloatingMenu.prototype.setupEventHandlers = function() {
    var self = this;

    try {
        // 检查UI元素是否已初始化
        if (!this.menuWindow.scriptSwitch) {
            console.log("scriptSwitch element not found, retrying in 200ms...");
            setTimeout(function() {
                self.setupEventHandlers();
            }, 200);
            return;
        }

        console.log("Setting up event handlers for floating menu...");

        // 开关事件处理
        this.menuWindow.scriptSwitch.setOnCheckedChangeListener(function(_, checked) {
            if (checked) {
                self.startScript();
            } else {
                self.stopScript();
            }
        });

        // 最低价格滑动条事件处理
        this.menuWindow.minPriceSeekbar.setOnSeekBarChangeListener({
            onProgressChanged: function(seekBar, progress, fromUser) {
                if (fromUser) {
                    // 将进度值转换为价格（0-100对应0.1-2.0元）
                    var minPrice = 0.1 + (progress / 100.0) * 1.9;
                    var maxProgress = self.menuWindow.maxPriceSeekbar.getProgress();
                    var maxPrice = 0.1 + (maxProgress / 100.0) * 1.9;

                    // 确保最低价格不超过最高价格
                    if (minPrice >= maxPrice) {
                        var newMaxProgress = Math.min(100, progress + 10);
                        self.menuWindow.maxPriceSeekbar.setProgress(newMaxProgress);
                        maxPrice = 0.1 + (newMaxProgress / 100.0) * 1.9;
                    }

                    self.updatePriceRangeDisplay(minPrice, maxPrice);
                }
            }
        });

        // 最高价格滑动条事件处理
        this.menuWindow.maxPriceSeekbar.setOnSeekBarChangeListener({
            onProgressChanged: function(seekBar, progress, fromUser) {
                if (fromUser) {
                    // 将进度值转换为价格（0-100对应0.1-2.0元）
                    var maxPrice = 0.1 + (progress / 100.0) * 1.9;
                    var minProgress = self.menuWindow.minPriceSeekbar.getProgress();
                    var minPrice = 0.1 + (minProgress / 100.0) * 1.9;

                    // 确保最高价格不低于最低价格
                    if (maxPrice <= minPrice) {
                        var newMinProgress = Math.max(0, progress - 10);
                        self.menuWindow.minPriceSeekbar.setProgress(newMinProgress);
                        minPrice = 0.1 + (newMinProgress / 100.0) * 1.9;
                    }

                    self.updatePriceRangeDisplay(minPrice, maxPrice);
                }
            }
        });



        // 购买模式按钮
        this.menuWindow.purchaseBtn.click(function() {
            self.setMode('purchase');
        });

        // 收藏模式按钮
        this.menuWindow.collectBtn.click(function() {
            self.setMode('collect');
        });

        // 更新用户信息按钮
        this.menuWindow.userInfoBtn.click(function() {
            self.addLog("正在更新用户信息...");
            if (self.onUserInfoCallback) {
                self.onUserInfoCallback(self.menuWindow, function(userInfo) {
                    // 获取成功后更新显示
                    self.updateRecipientInfo(userInfo);
                    self.addLog("✅ 用户信息更新完成");
                });
            } else {
                self.addLog("用户信息功能未初始化");
            }
        });

    } catch (e) {
        console.error("Error setting up event handlers: " + e.message);
        // 如果设置事件处理器失败，稍后重试
        setTimeout(function() {
            self.setupEventHandlers();
        }, 500);
    }
};

/**
 * 启动脚本
 */
FloatingMenu.prototype.startScript = function() {
    // 从滑动条获取价格区间
    var minProgress = this.menuWindow.minPriceSeekbar.getProgress();
    var maxProgress = this.menuWindow.maxPriceSeekbar.getProgress();
    var minPrice = 0.1 + (minProgress / 100.0) * 1.9;
    var maxPrice = 0.1 + (maxProgress / 100.0) * 1.9;

    if (isNaN(minPrice) || isNaN(maxPrice) || minPrice <= 0 || maxPrice <= 0 || minPrice >= maxPrice) {
        this.addLog("请设置有效的价格区间");
        this.menuWindow.scriptSwitch.setChecked(false);
        return;
    }

    this.addLog("开始执行脚本，价格区间: " + minPrice.toFixed(2) + "-" + maxPrice.toFixed(2) + " 元，模式: " + this.currentMode);
    this.updateStatus("运行中");

    // 使用setTimeout避免在UI线程中执行阻塞操作
    var self = this;
    setTimeout(function() {
        if (self.onStartCallback) {
            // 传递价格区间对象而不是单一价格
            var priceRange = {
                min: minPrice,
                max: maxPrice
            };
            self.onStartCallback(self.menuWindow, priceRange, self.currentMode);
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
 * 更新价格区间显示
 */
FloatingMenu.prototype.updatePriceRangeDisplay = function(minPrice, maxPrice) {
    if (this.menuWindow) {
        ui.run(() => {
            this.menuWindow.priceRangeDisplay.setText(minPrice.toFixed(2) + "-" + maxPrice.toFixed(2) + "元");
            this.menuWindow.minPriceText.setText(minPrice.toFixed(2));
            this.menuWindow.maxPriceText.setText(maxPrice.toFixed(2));
        });
    }
};

/**
 * 更新价格显示（保持向后兼容）
 */
FloatingMenu.prototype.updatePriceDisplay = function(price) {
    if (this.menuWindow) {
        ui.run(() => {
            // 如果还有旧的priceDisplay元素，更新它
            if (this.menuWindow.priceDisplay) {
                this.menuWindow.priceDisplay.setText(price.toFixed(2) + "元");
            }
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
    var menuHeight = 320 * density;
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
 * 更新收件人信息显示
 * @param {Object} userInfo 用户信息对象
 */
FloatingMenu.prototype.updateRecipientInfo = function(userInfo) {
    if (!this.menuWindow || !userInfo) return;

    ui.run(() => {
        try {
            // 更新收件人信息
            if (userInfo.recipient) {
                var recipient = userInfo.recipient;

                // 更新姓名
                if (recipient.name) {
                    this.menuWindow.recipientName.setText(recipient.name);
                } else {
                    this.menuWindow.recipientName.setText("未获取");
                }

                // 更新手机号（显示完整号码）
                if (recipient.phone) {
                    this.menuWindow.recipientPhone.setText(recipient.phone);
                } else {
                    this.menuWindow.recipientPhone.setText("未获取");
                }

                // 更新地址
                if (recipient.address) {
                    this.menuWindow.recipientAddress.setText(recipient.address);
                } else {
                    this.menuWindow.recipientAddress.setText("未获取");
                }
            } else {
                // 如果没有收件人信息，显示默认文本
                this.menuWindow.recipientName.setText("未获取");
                this.menuWindow.recipientPhone.setText("未获取");
                this.menuWindow.recipientAddress.setText("未获取");
            }
        } catch (e) {
            console.error("更新收件人信息显示失败: " + e.message);
        }
    });
};

/**
 * 隐藏收件人信息区域
 */
FloatingMenu.prototype.hideRecipientInfo = function() {
    if (!this.menuWindow) return;

    ui.run(() => {
        this.menuWindow.userInfoSection.attr("visibility", "gone");
    });
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
