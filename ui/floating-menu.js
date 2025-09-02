// 悬浮菜单面板模块
// 负责创建和管理悬浮菜单界面

const logger = require('../utils/logger.js');
const { GlobalStopManager } = require('../utils/common.js');
const { waitTimeManager } = require('../utils/wait-time-manager.js');

/**
 * 悬浮菜单构造函数
 */
function FloatingMenu() {
    this.menuWindow = null;
    this.visible = false;
    this.currentMode = 'favorite'; // 默认收藏模式
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
        <frame id="menuFrame" w="280dp" h="450dp" visibility="gone">
            <card cardCornerRadius="10dp" cardElevation="8dp" margin="5dp" cardBackgroundColor="#f8f9fa">
                <vertical padding="15dp">
                    <horizontal margin="5dp" gravity="center_vertical">
                        <Switch id="scriptSwitch" text="启动脚本" textColor="#333333" textSize="14sp" checked="false" layout_weight="0"/>
                        <text id="statusText" text="就绪" textColor="#666666" textSize="12sp" layout_gravity="right" margin="10dp 0 0 0"/>
                    </horizontal>
                    
                    <vertical id="purchaseControls" margin="5dp 5dp 2dp 5dp" visibility="visible">
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

                        <horizontal gravity="center_vertical" margin="0 0 5dp 0">
                            <text text="购买数量:" textColor="#333333" textSize="12sp" w="60dp"/>
                            <text id="quantityDisplay" text="1件" textColor="#333333" textSize="12sp" textStyle="bold" margin="5dp 0 0 0"/>
                        </horizontal>

                        <horizontal gravity="center_vertical" margin="0 0 8dp 0">
                            <text text="数量:" textColor="#666666" textSize="11sp" w="35dp"/>
                            <seekbar id="quantitySeekbar" w="*" h="12dp" margin="0 4dp 0 4dp"
                                     max="99" progress="0" progressTint="#9C27B0" thumbTint="#9C27B0"/>
                            <text id="quantityText" text="1" textColor="#666666" textSize="11sp" w="25dp" gravity="center"/>
                        </horizontal>
                    </vertical>

                    <vertical id="paymentControls" margin="5dp 5dp 2dp 5dp" visibility="gone">
                        <horizontal gravity="center_vertical" margin="0 0 8dp 0">
                            <text text="支付功能:" textColor="#333333" textSize="14sp" textStyle="bold"/>
                        </horizontal>

                        <horizontal gravity="center_vertical" margin="0 0 5dp 0">
                            <text text="• 自动导航到待支付页面" textColor="#666666" textSize="12sp"/>
                        </horizontal>

                        <horizontal gravity="center_vertical" margin="0 0 5dp 0">
                            <text text="• 检测待支付订单" textColor="#666666" textSize="12sp"/>
                        </horizontal>

                        <horizontal gravity="center_vertical" margin="0 0 8dp 0">
                            <text text="• 准备支付流程" textColor="#666666" textSize="12sp"/>
                        </horizontal>
                    </vertical>

                    <vertical id="favoriteControls" margin="5dp 5dp 2dp 5dp" visibility="gone">
                        <horizontal gravity="center_vertical" margin="0 0 8dp 0">
                            <text text="收藏功能:" textColor="#333333" textSize="14sp" textStyle="bold"/>
                        </horizontal>

                        <horizontal gravity="center_vertical" margin="0 0 5dp 0">
                            <text text="• 自动寻找符合价格的商品" textColor="#666666" textSize="12sp"/>
                        </horizontal>

                        <horizontal gravity="center_vertical" margin="0 0 5dp 0">
                            <text text="• 批量收藏商品到收藏夹" textColor="#666666" textSize="12sp"/>
                        </horizontal>

                        <horizontal gravity="center_vertical" margin="0 0 8dp 0">
                            <text text="• 避免重复收藏相同商品" textColor="#666666" textSize="12sp"/>
                        </horizontal>
                    </vertical>

                    <vertical id="favoriteSettlementControls" margin="5dp 5dp 2dp 5dp" visibility="gone">
                        <horizontal gravity="center_vertical" margin="0 0 8dp 0">
                            <text text="收藏结算功能:" textColor="#333333" textSize="14sp" textStyle="bold"/>
                        </horizontal>

                        <horizontal gravity="center_vertical" margin="0 0 5dp 0">
                            <text text="• 自动导航到收藏页面" textColor="#666666" textSize="12sp"/>
                        </horizontal>

                        <horizontal gravity="center_vertical" margin="0 0 5dp 0">
                            <text text="• 查看收藏的商品列表" textColor="#666666" textSize="12sp"/>
                        </horizontal>

                        <horizontal gravity="center_vertical" margin="0 0 8dp 0">
                            <text text="• 准备进行收藏商品结算" textColor="#666666" textSize="12sp"/>
                        </horizontal>
                    </vertical>

                    <vertical id="deliveryControls" margin="5dp 5dp 2dp 5dp" visibility="gone">
                        <horizontal gravity="center_vertical" margin="0 0 8dp 0">
                            <text text="待收货功能:" textColor="#333333" textSize="14sp" textStyle="bold"/>
                        </horizontal>

                        <horizontal gravity="center_vertical" margin="0 0 5dp 0">
                            <text text="• 自动导航到待收货页面" textColor="#666666" textSize="12sp"/>
                        </horizontal>

                        <horizontal gravity="center_vertical" margin="0 0 5dp 0">
                            <text text="• 批量获取物流单号" textColor="#666666" textSize="12sp"/>
                        </horizontal>

                        <horizontal gravity="center_vertical" margin="0 0 8dp 0">
                            <text text="• 复制单号到剪贴板" textColor="#666666" textSize="12sp"/>
                        </horizontal>
                    </vertical>

                    <vertical margin="2dp 5dp 5dp 5dp">
                        <horizontal gravity="center">
                            <button id="favoriteModeBtn" text="商品收藏模式" textColor="#666666" bg="#E0E0E0"
                                    w="52dp" h="35dp" margin="1dp" textSize="8sp"/>
                            <button id="favoriteSettlementModeBtn" text="收藏结算" textColor="#666666" bg="#E0E0E0"
                                    w="52dp" h="35dp" margin="1dp" textSize="8sp"/>
                            <button id="paymentModeBtn" text="支付模式" textColor="#666666" bg="#E0E0E0"
                                    w="52dp" h="35dp" margin="1dp" textSize="8sp"/>
                            <button id="deliveryModeBtn" text="待收货" textColor="#666666" bg="#E0E0E0"
                                    w="52dp" h="35dp" margin="1dp" textSize="8sp"/>
                        </horizontal>
                    </vertical>

                    <vertical margin="5dp">
                        <horizontal gravity="center_vertical" margin="0 0 5dp 0">
                            <text text="等待倍率:" textColor="#333333" textSize="12sp" w="60dp"/>
                            <text id="speedDisplay" text="模式 (1.0x)" textColor="#333333" textSize="12sp" textStyle="bold" layout_weight="1"/>
                        </horizontal>

                        <horizontal gravity="center_vertical" margin="0 0 8dp 0">
                            <text text="速度:" textColor="#666666" textSize="11sp" w="35dp"/>
                            <seekbar id="speedSeekbar" w="*" h="12dp" margin="0 4dp 0 4dp"
                                     max="99" progress="9" progressTint="#FF9800" thumbTint="#FF9800"/>
                            <text id="speedText" text="1.0x" textColor="#666666" textSize="11sp" w="35dp" gravity="center"/>
                        </horizontal>


                    </vertical>

                    <horizontal margin="5dp" gravity="center">
                        <button id="userInfoBtn" text="更新用户信息" textColor="#ffffff" bg="#4CAF50"
                                w="100dp" h="35dp" margin="2dp" textSize="10sp"/>
                        <button id="emergencyStopBtn" text="紧急停止" textColor="#ffffff" bg="#F44336"
                                w="80dp" h="35dp" margin="2dp" textSize="10sp"/>
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
        // 初始化购买数量显示
        self.initializeQuantityDisplay();
        // 初始化等待时间倍率显示
        self.initSpeedDisplay();
        // 初始化模式按钮状态
        self.updateModeButtons();
    }, 100);
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
 * 初始化购买数量显示
 */
FloatingMenu.prototype.initializeQuantityDisplay = function() {
    if (!this.menuWindow) return;

    try {
        // 获取当前滑动条的进度值
        var quantityProgress = this.menuWindow.quantitySeekbar.getProgress();

        // 计算对应的数量（0-99对应1-100件）
        var quantity = quantityProgress + 1;

        // 更新数量显示
        this.updateQuantityDisplay(quantity);
    } catch (e) {
        console.error("初始化购买数量显示失败: " + e.message);
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

        // 购买数量滑动条事件处理
        this.menuWindow.quantitySeekbar.setOnSeekBarChangeListener({
            onProgressChanged: function(seekBar, progress, fromUser) {
                if (fromUser) {
                    // 将进度值转换为数量（0-99对应1-100件）
                    var quantity = progress + 1;
                    self.updateQuantityDisplay(quantity);
                }
            }
        });

        // 等待时间倍率滑动条事件处理
        this.menuWindow.speedSeekbar.setOnSeekBarChangeListener({
            onProgressChanged: function(seekBar, progress, fromUser) {
                if (fromUser) {
                    // 将进度值转换为倍率（0-99对应0.1-10.0）
                    var multiplier = 0.1 + (progress / 99.0) * 9.9;
                    self.updateSpeedMultiplier(multiplier);
                }
            }
        });

        // 购买模式已固定，无需按钮事件

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

        // 紧急停止按钮
        this.menuWindow.emergencyStopBtn.click(function() {
            self.addLog("🚨 紧急停止所有脚本...");

            // 先关闭开关
            if (self.menuWindow.scriptSwitch) {
                self.menuWindow.scriptSwitch.setChecked(false);
            }

            // 使用全局停止管理器强制停止所有线程
            GlobalStopManager.shutdownAll();

            // 延迟强制重置，确保脚本完全停止
            setTimeout(function() {
                GlobalStopManager.forceReset();
                self.addLog("🔄 状态已重置，可以重新启动");
            }, 3000);

            self.addLog("🛑 所有脚本已紧急停止");
            self.updateStatus("紧急停止");

            // 调用停止回调
            if (self.onStopCallback) {
                self.onStopCallback();
            }
        });

        // 支付模式按钮事件处理
        this.menuWindow.paymentModeBtn.click(function() {
            self.switchToMode('payment');
        });

        // 收藏模式按钮事件处理
        this.menuWindow.favoriteModeBtn.click(function() {
            self.switchToMode('favorite');
        });

        // 收藏结算模式按钮事件处理
        this.menuWindow.favoriteSettlementModeBtn.click(function() {
            self.switchToMode('favoriteSettlement');
        });

        // 待收货模式按钮事件处理
        this.menuWindow.deliveryModeBtn.click(function() {
            self.switchToMode('delivery');
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
    // 智能重置全局停止标志
    GlobalStopManager.startScript();

    // 从滑动条获取价格区间
    var minProgress = this.menuWindow.minPriceSeekbar.getProgress();
    var maxProgress = this.menuWindow.maxPriceSeekbar.getProgress();
    var minPrice = 0.1 + (minProgress / 100.0) * 1.9;
    var maxPrice = 0.1 + (maxProgress / 100.0) * 1.9;

    if (isNaN(minPrice) || isNaN(maxPrice) || minPrice <= 0 || maxPrice <= 0 || minPrice >= maxPrice) {
        this.addLog("请设置有效的价格区间");
        this.menuWindow.scriptSwitch.setChecked(false);
        GlobalStopManager.endScript(); // 启动失败，减少计数
        return;
    }

    // 获取购买数量
    var purchaseQuantity = 1;
    try {
        var quantityProgress = this.menuWindow.quantitySeekbar.getProgress();
        purchaseQuantity = quantityProgress + 1; // 0-99对应1-100件
    } catch (e) {
        this.addLog("获取购买数量失败，使用默认值1件");
        purchaseQuantity = 1;
    }

    this.addLog("开始执行脚本，价格区间: " + minPrice.toFixed(2) + "-" + maxPrice.toFixed(2) + " 元，模式: " + this.currentMode + "，数量: " + purchaseQuantity + "件");
    this.updateStatus("运行中");

    // 使用setTimeout避免在UI线程中执行阻塞操作
    var self = this;
    setTimeout(function() {
        if (self.onStartCallback) {
            // 传递价格区间对象和购买数量
            var priceRange = {
                min: minPrice,
                max: maxPrice
            };

            // 添加调试日志
            self.addLog("当前模式: " + self.currentMode);
            self.addLog("传递参数 - 模式: " + self.currentMode + ", 价格区间: " + minPrice + "-" + maxPrice + " 元, 数量: " + purchaseQuantity + "件");

            self.onStartCallback(self.menuWindow, priceRange, self.currentMode, purchaseQuantity);
        }
    }, 100);
};

/**
 * 停止脚本
 */
FloatingMenu.prototype.stopScript = function() {
    this.addLog("正在停止脚本...");

    // 使用全局停止管理器停止所有线程
    GlobalStopManager.shutdownAll();

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
    this.currentMode = mode || 'favorite';
    this.switchToMode(this.currentMode);
};

/**
 * 切换到指定模式
 */
FloatingMenu.prototype.switchToMode = function(mode) {
    this.currentMode = mode;

    // 重置所有按钮样式
    this.menuWindow.paymentModeBtn.attr('textColor', '#666666');
    this.menuWindow.paymentModeBtn.attr('bg', '#E0E0E0');
    this.menuWindow.favoriteModeBtn.attr('textColor', '#666666');
    this.menuWindow.favoriteModeBtn.attr('bg', '#E0E0E0');
    this.menuWindow.favoriteSettlementModeBtn.attr('textColor', '#666666');
    this.menuWindow.favoriteSettlementModeBtn.attr('bg', '#E0E0E0');
    this.menuWindow.deliveryModeBtn.attr('textColor', '#666666');
    this.menuWindow.deliveryModeBtn.attr('bg', '#E0E0E0');

    // 隐藏所有控件
    this.menuWindow.purchaseControls.attr('visibility', 'gone');
    this.menuWindow.paymentControls.attr('visibility', 'gone');
    this.menuWindow.favoriteControls.attr('visibility', 'gone');
    this.menuWindow.favoriteSettlementControls.attr('visibility', 'gone');
    this.menuWindow.deliveryControls.attr('visibility', 'gone');

    if (mode === 'payment') {
        // 切换到支付模式
        this.menuWindow.paymentModeBtn.attr('textColor', '#ffffff');
        this.menuWindow.paymentModeBtn.attr('bg', '#FF9800');
        this.menuWindow.paymentControls.attr('visibility', 'visible');
        this.addLog("切换到支付模式");
    } else if (mode === 'favorite') {
        // 切换到收藏模式
        this.menuWindow.favoriteModeBtn.attr('textColor', '#ffffff');
        this.menuWindow.favoriteModeBtn.attr('bg', '#E91E63');
        this.menuWindow.purchaseControls.attr('visibility', 'visible'); // 收藏模式也需要价格和数量设置
        this.addLog("切换到收藏模式");
    } else if (mode === 'favoriteSettlement') {
        // 切换到收藏结算模式
        this.menuWindow.favoriteSettlementModeBtn.attr('textColor', '#ffffff');
        this.menuWindow.favoriteSettlementModeBtn.attr('bg', '#9C27B0');
        this.menuWindow.favoriteSettlementControls.attr('visibility', 'visible');
        this.addLog("切换到收藏结算模式");
    } else if (mode === 'delivery') {
        // 切换到待收货模式
        this.menuWindow.deliveryModeBtn.attr('textColor', '#ffffff');
        this.menuWindow.deliveryModeBtn.attr('bg', '#FF5722');
        this.menuWindow.deliveryControls.attr('visibility', 'visible');
        this.addLog("切换到待收货模式");
    }

    if (this.onModeChangeCallback) {
        this.onModeChangeCallback(mode);
    }
};

/**
 * 更新模式按钮状态
 */
FloatingMenu.prototype.updateModeButtons = function() {
    // 初始化时设置默认的收藏模式
    this.switchToMode(this.currentMode);
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
 * 更新购买数量显示
 */
FloatingMenu.prototype.updateQuantityDisplay = function(quantity) {
    if (this.menuWindow) {
        ui.run(() => {
            this.menuWindow.quantityDisplay.setText(quantity + "件");
            this.menuWindow.quantityText.setText(quantity.toString());
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
    var menuHeight = 360 * density;
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

/**
 * 更新等待时间倍率显示
 * @param {number} multiplier 倍率值
 */
FloatingMenu.prototype.updateSpeedMultiplier = function(multiplier) {
    if (!this.menuWindow) return;

    // 设置等待时间管理器的倍率
    waitTimeManager.setSpeedMultiplier(multiplier);

    ui.run(() => {
        try {
            // 更新倍率文本显示
            this.menuWindow.speedText.setText(multiplier.toFixed(1) + "x");

            // 更新模式描述
            var modeDescription = waitTimeManager.getSpeedModeDescription();
            this.menuWindow.speedDisplay.setText(modeDescription + " (" + multiplier.toFixed(1) + "x)");

            // 更新滑动条位置
            var progress = Math.round((multiplier - 0.1) / 9.9 * 99);
            this.menuWindow.speedSeekbar.setProgress(progress);

        } catch (e) {
            console.error("更新等待时间倍率显示失败: " + e.message);
        }
    });
};

/**
 * 设置等待时间倍率预设
 * @param {string} preset 预设模式
 */
FloatingMenu.prototype.setSpeedPreset = function(preset) {
    waitTimeManager.setPresetMode(preset);
    var multiplier = waitTimeManager.getSpeedMultiplier();
    this.updateSpeedMultiplier(multiplier);
    this.addLog("等待时间已设置为: " + waitTimeManager.getSpeedModeDescription());
};

/**
 * 初始化等待时间倍率显示
 */
FloatingMenu.prototype.initSpeedDisplay = function() {
    var currentMultiplier = waitTimeManager.getSpeedMultiplier();
    this.updateSpeedMultiplier(currentMultiplier);
};

module.exports = FloatingMenu;
