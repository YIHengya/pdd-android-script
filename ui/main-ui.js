// 主界面UI模块
// 负责创建和管理主软件界面

"ui";

const ProductFavorite = require('../modules/product-favorite.js');
const FavoriteSettlement = require('../modules/favorite-settlement.js');
const AutoPayment = require('../modules/auto-payment.js');
const DeliveryTracking = require('../modules/delivery-tracking.js');
const UserInfo = require('../modules/user-info.js');
const UserInfoManager = require('../utils/user-info-manager.js');
const FloatingWindow = require('./floating-window.js');
const { waitTimeManager } = require('../utils/wait-time-manager.js');
const SearchMode = require('../modules/search-mode.js');
const logger = require('../utils/logger.js');

/**
 * 主界面构造函数
 */
function MainUI() {
    this.floatingWindow = null;
    this.productFavorite = null;
    this.favoriteSettlement = null;
    this.autoPayment = null;
    this.deliveryTracking = null;
    this.userInfo = null;
    this.userInfoManager = null; // 用户信息管理器
    this.isFloatingWindowActive = false;
    this.scriptThread = null;
    this.currentMode = 'favorite'; // 默认为收藏模式
    this.searchMode = null;
}

/**
 * 显示主界面
 */
MainUI.prototype.show = function() {
    var self = this;
    
    ui.layout(
        <drawer id="drawer">
            <vertical>
                <appbar>
                    <toolbar id="toolbar" title="拼多多自动化工具"/>
                </appbar>
                
                <ScrollView>
                    <vertical padding="16dp">
                        
                        {/* 悬浮窗控制区域 */}
                        <card cardCornerRadius="8dp" cardElevation="4dp" margin="8dp">
                            <vertical padding="16dp">
                                <text text="悬浮窗控制" textSize="18sp" textStyle="bold" textColor="#333333" margin="0 0 12dp 0"/>
                                
                                <horizontal gravity="center_vertical" margin="0 0 8dp 0">
                                    <Switch id="floatingSwitch" text="启用悬浮窗" textSize="16sp" textColor="#333333" layout_weight="1"/>
                                    <text id="floatingStatus" text="未启动" textSize="14sp" textColor="#666666" margin="8dp 0 0 0"/>
                                </horizontal>
                                
                                <text text="启用后将显示悬浮球，可在任意界面使用自动化功能" 
                                      textSize="12sp" textColor="#888888" margin="0 0 8dp 0"/>
                                      
                            </vertical>
                        </card>

                        {/* 功能设置区域 */}
                        <card cardCornerRadius="8dp" cardElevation="4dp" margin="8dp">
                            <vertical padding="16dp">
                                <text text="功能设置" textSize="18sp" textStyle="bold" textColor="#333333" margin="0 0 12dp 0"/>
                                
                                <text id="currentModeDisplay" text="当前模式：商品收藏模式" 
                                      textSize="14sp" textColor="#333333" textStyle="bold" margin="0 0 8dp 0"/>
                                
                                <horizontal gravity="center" margin="0 0 8dp 0">
                                    <button id="favoriteModeBtn" text="商品收藏模式" textColor="#666666" bg="#E0E0E0"
                                            w="0dp" h="35dp" margin="1dp" textSize="11sp" layout_weight="1"/>
                                </horizontal>
                                
                                <horizontal gravity="center" margin="0 0 12dp 0">
                                    <button id="favoriteSettlementModeBtn" text="收藏结算" textColor="#666666" bg="#E0E0E0"
                                            w="0dp" h="35dp" margin="1dp" textSize="11sp" layout_weight="1"/>
                                    <button id="paymentModeBtn" text="支付模式" textColor="#666666" bg="#E0E0E0"
                                            w="0dp" h="35dp" margin="1dp" textSize="11sp" layout_weight="1"/>
                                    <button id="deliveryModeBtn" text="待收货" textColor="#666666" bg="#E0E0E0"
                                            w="0dp" h="35dp" margin="1dp" textSize="11sp" layout_weight="1"/>
                                    <button id="searchModeBtn" text="搜索模式" textColor="#666666" bg="#E0E0E0"
                                            w="0dp" h="35dp" margin="1dp" textSize="11sp" layout_weight="1"/>
                                </horizontal>

                                <vertical id="searchModeArea" visibility="gone" margin="0 0 8dp 0">
                                    <horizontal gravity="center_vertical" margin="0 0 8dp 0">
                                        <text text="关键词:" textSize="12sp" textColor="#666666" w="60dp"/>
                                        <input id="searchKeywordInput" hint="例如：手机壳" text="手机壳" textColor="#333333" w="*"/>
                                    </horizontal>
                                    <text text="提示：启动脚本后将自动在搜索框输入并点击搜索" textSize="10sp" textColor="#888888"/>
                                </vertical>
                                
                                {/* 模式说明区域 */}
                                <vertical id="modeDescriptionArea" margin="0 0 12dp 0" bg="#f5f5f5" padding="8dp">
                                    <text id="modeDescription" text="自动批量收藏符合价格区间的商品到收藏夹"
                                          textSize="12sp" textColor="#666666"/>
                                </vertical>
                                
                                <horizontal gravity="center_vertical" margin="0 0 8dp 0">
                                    <text text="价格区间:" textSize="14sp" textColor="#666666" w="80dp"/>
                                    <text id="priceRangeText" text="0.50-0.80元" textSize="14sp" textColor="#333333" textStyle="bold"/>
                                </horizontal>
                                
                                <horizontal gravity="center_vertical" margin="0 0 4dp 0">
                                    <text text="最低价:" textSize="12sp" textColor="#666666" w="50dp"/>
                                    <seekbar id="minPriceSeek" w="*" h="20dp" margin="0 8dp 0 8dp"
                                             max="100" progress="21" progressTint="#4CAF50" thumbTint="#4CAF50"/>
                                    <text id="minPriceValue" text="0.50" textSize="12sp" textColor="#666666" w="40dp" gravity="center"/>
                                </horizontal>
                                
                                <horizontal gravity="center_vertical" margin="0 0 8dp 0">
                                    <text text="最高价:" textSize="12sp" textColor="#666666" w="50dp"/>
                                    <seekbar id="maxPriceSeek" w="*" h="20dp" margin="0 8dp 0 8dp"
                                             max="100" progress="37" progressTint="#FF5722" thumbTint="#FF5722"/>
                                    <text id="maxPriceValue" text="0.80" textSize="12sp" textColor="#666666" w="40dp" gravity="center"/>
                                </horizontal>

                                <horizontal gravity="center_vertical">
                                    <text text="数量:" textColor="#666666" textSize="12sp" w="40dp"/>
                                    <text id="quantityText" text="(1件)" textSize="12sp" textColor="#666666" w="50dp" gravity="left"/>
                                    <seekbar id="quantitySeek" w="*" h="20dp" margin="0 4dp 0 4dp"
                                             max="99" progress="0" progressTint="#9C27B0" thumbTint="#9C27B0"/>
                                </horizontal>

                                {/* 等待时间速度设置（合并显示） */}
                                <horizontal gravity="center_vertical" margin="0 0 8dp 0">
                                    <text text="速度:" textColor="#666666" textSize="12sp" w="40dp"/>
                                    <text id="speedText" text="(1.0x)" textColor="#666666" textSize="12sp" w="50dp" gravity="left"/>
                                    <seekbar id="speedSeekbar" w="*" h="20dp" margin="0 4dp 0 4dp"
                                             max="99" progress="9" progressTint="#FF9800" thumbTint="#FF9800"/>
                                </horizontal>
                                <text text="调整等待时间可以适应不同网络环境和手机性能" 
                                      textSize="12sp" textColor="#888888" margin="0 4dp 0 0"/>
                            </vertical>
                        </card>

                {/* 操作按钮区域 */}
                <card cardCornerRadius="8dp" cardElevation="4dp" margin="8dp">
                    <vertical padding="16dp">
                        <text text="快速操作" textSize="18sp" textStyle="bold" textColor="#333333" margin="0 0 12dp 0"/>
                        
                        <horizontal gravity="center" margin="0 0 8dp 0">
                            <button id="startScriptBtn" text="启动脚本"
                                    textColor="#ffffff" bg="#FF5722"
                                    w="100dp" h="45dp" margin="8dp" textSize="14sp"/>
                            <button id="stopScriptBtn" text="停止脚本"
                                    textColor="#ffffff" bg="#9E9E9E"
                                    w="100dp" h="45dp" margin="8dp" textSize="14sp" enabled="false"/>
                        </horizontal>

                        {/* 移除与已购买记录相关的操作按钮 */}
                        
                        <horizontal gravity="center" margin="8dp 0 0 0">
                            <button id="helpBtn" text="帮助"
                                    textColor="#ffffff" bg="#607D8B"
                                    w="70dp" h="40dp" margin="2dp" textSize="12sp"/>
                            <button id="aboutBtn" text="关于"
                                    textColor="#ffffff" bg="#795548"
                                    w="70dp" h="40dp" margin="2dp" textSize="12sp"/>
                        </horizontal>
                    </vertical>
                </card>

                {/* 用户信息区域 */}
                <card cardCornerRadius="8dp" cardElevation="4dp" margin="8dp">
                    <vertical padding="16dp">
                        <horizontal gravity="center_vertical" margin="0 0 12dp 0">
                            <text text="用户信息" textSize="18sp" textStyle="bold" textColor="#333333" layout_weight="1"/>
                            <button id="refreshUserBtn" text="更新用户信息"
                                    textColor="#ffffff" bg="#4CAF50"
                                    w="100dp" h="32dp" textSize="11sp"/>
                        </horizontal>

                        <horizontal gravity="center_vertical" margin="0 0 4dp 0">
                            <text text="姓名:" textSize="14sp" textColor="#666666" w="50dp"/>
                            <text id="userName" text="未获取" textSize="14sp" textColor="#333333" layout_weight="1"/>
                        </horizontal>

                        <horizontal gravity="center_vertical" margin="0 0 4dp 0">
                            <text text="手机:" textSize="14sp" textColor="#666666" w="50dp"/>
                            <text id="userPhone" text="未获取" textSize="14sp" textColor="#333333" layout_weight="1"/>
                        </horizontal>

                        <horizontal gravity="center_vertical" margin="0 0 8dp 0">
                            <text text="地址:" textSize="14sp" textColor="#666666" w="50dp"/>
                            <text id="userAddress" text="未获取" textSize="12sp" textColor="#333333" layout_weight="1" maxLines="2"/>
                        </horizontal>

                        <horizontal gravity="center" margin="4dp 0 0 0">
                            <button id="saveUserBtn" text="保存到本地"
                                    textColor="#ffffff" bg="#2196F3"
                                    w="80dp" h="28dp" textSize="10sp" margin="2dp"/>
                            <button id="clearUserBtn" text="清除本地"
                                    textColor="#ffffff" bg="#FF5722"
                                    w="80dp" h="28dp" textSize="10sp" margin="2dp"/>
                        </horizontal>
                    </vertical>
                </card>

                        {/* 日志区域 */}
                        <card cardCornerRadius="8dp" cardElevation="4dp" margin="8dp">
                            <vertical padding="16dp">
                                <horizontal gravity="center_vertical" margin="0 0 8dp 0">
                                    <text text="运行日志" textSize="18sp" textStyle="bold" textColor="#333333" layout_weight="1"/>
                                    <button id="clearLogBtn" text="清空" 
                                            textColor="#ffffff" bg="#FF5722" 
                                            w="50dp" h="28dp" textSize="10sp"/>
                                </horizontal>
                                
                                <ScrollView h="120dp" bg="#f5f5f5">
                                    <text id="logText" text="欢迎使用拼多多自动化工具\n点击启用悬浮窗开始使用" 
                                          textSize="11sp" textColor="#333333" padding="8dp"/>
                                </ScrollView>
                            </vertical>
                        </card>
                        
                    </vertical>
                </ScrollView>
            </vertical>
        </drawer>
    );

    // 初始化事件处理器
    this.setupEventHandlers();

    // 初始化价格显示
    this.initializePriceDisplay();

    // 初始化模块
    this.initializeModules();
    
    // 初始化模式和等待倍率
    this.initializeMode();
    this.initializeSpeedDisplay();
};

/**
 * 初始化模式
 */
MainUI.prototype.initializeMode = function() {
    // 设置默认模式
    this.switchToMode(this.currentMode);
};

/**
 * 初始化等待时间倍率显示
 */
MainUI.prototype.initializeSpeedDisplay = function() {
    // 不与悬浮窗同步：直接使用默认显示 6.0x，仅更新本界面的UI，不改动全局倍率
    var defaultMultiplier = 6.0;
    var speedText = "(" + defaultMultiplier.toFixed(1) + "x)";
    ui.speedText.setText(speedText);
    // 同步滑条到默认值（0.1-10.0 -> 0-99）
    var progress = Math.round((defaultMultiplier - 0.1) / 9.9 * 99);
    try { ui.speedSeekbar.setProgress(progress); } catch (e) {}
};

/**
 * 初始化模块
 */
MainUI.prototype.initializeModules = function() {
    var self = this;

    this.productFavorite = new ProductFavorite();
    this.favoriteSettlement = new FavoriteSettlement();
    this.autoPayment = new AutoPayment();
    this.deliveryTracking = new DeliveryTracking();
    this.userInfo = new UserInfo();
    this.userInfoManager = new UserInfoManager();
    this.searchMode = new SearchMode();

    // 设置用户信息管理器的UserInfo实例
    this.userInfoManager.setUserInfoInstance(this.userInfo);

    // 自动加载本地保存的用户信息
    this.loadLocalUserInfo();
};

/**
 * 初始化价格显示
 */
MainUI.prototype.initializePriceDisplay = function() {
    var minProgress = ui.minPriceSeek.getProgress();
    var maxProgress = ui.maxPriceSeek.getProgress();

    var minPrice = 0.1 + (minProgress / 100.0) * 1.9;
    var maxPrice = 0.1 + (maxProgress / 100.0) * 1.9;

    this.updatePriceDisplay(minPrice, maxPrice);

    // 初始化购买数量显示
    var quantityProgress = ui.quantitySeek.getProgress();
    var quantity = quantityProgress + 1; // 0-99对应1-100件
    this.updateQuantityDisplay(quantity);
};

/**
 * 设置事件处理器
 */
MainUI.prototype.setupEventHandlers = function() {
    var self = this;

    // 悬浮窗开关
    ui.floatingSwitch.setOnCheckedChangeListener(function(_, checked) {
        if (checked) {
            self.startFloatingWindow();
        } else {
            self.stopFloatingWindow();
        }
    });

    // 模式切换按钮事件处理
    ui.favoriteModeBtn.click(function() {
        self.switchToMode('favorite');
    });
    ui.favoriteSettlementModeBtn && ui.favoriteSettlementModeBtn.click(function() {
        self.switchToMode('favoriteSettlement');
    });
    ui.paymentModeBtn && ui.paymentModeBtn.click(function() {
        self.switchToMode('payment');
    });
    ui.deliveryModeBtn && ui.deliveryModeBtn.click(function() {
        self.switchToMode('delivery');
    });
    ui.searchModeBtn && ui.searchModeBtn.click(function() {
        self.switchToMode('search');
    });
    
    // 等待时间倍率滑动条事件处理
    ui.speedSeekbar.setOnSeekBarChangeListener({
        onProgressChanged: function(seekBar, progress, fromUser) {
            if (fromUser) {
                // 将进度值转换为倍率（0-99对应0.1-10.0）
                var multiplier = 0.1 + (progress / 99.0) * 9.9;
                self.updateSpeedMultiplier(multiplier);
            }
        }
    });

    // 价格滑动条事件
    ui.minPriceSeek.setOnSeekBarChangeListener({
        onProgressChanged: function(seekBar, progress, fromUser) {
            if (fromUser) {
                var minPrice = 0.1 + (progress / 100.0) * 1.9;
                var maxProgress = ui.maxPriceSeek.getProgress();
                var maxPrice = 0.1 + (maxProgress / 100.0) * 1.9;

                if (minPrice >= maxPrice) {
                    var newMaxProgress = Math.min(100, progress + 10);
                    ui.maxPriceSeek.setProgress(newMaxProgress);
                    maxPrice = 0.1 + (newMaxProgress / 100.0) * 1.9;
                }

                self.updatePriceDisplay(minPrice, maxPrice);
            }
        }
    });

    ui.maxPriceSeek.setOnSeekBarChangeListener({
        onProgressChanged: function(seekBar, progress, fromUser) {
            if (fromUser) {
                var maxPrice = 0.1 + (progress / 100.0) * 1.9;
                var minProgress = ui.minPriceSeek.getProgress();
                var minPrice = 0.1 + (minProgress / 100.0) * 1.9;

                if (maxPrice <= minPrice) {
                    var newMinProgress = Math.max(0, progress - 10);
                    ui.minPriceSeek.setProgress(newMinProgress);
                    minPrice = 0.1 + (newMinProgress / 100.0) * 1.9;
                }

                self.updatePriceDisplay(minPrice, maxPrice);
            }
        }
    });

    // 购买数量滑动条事件
    ui.quantitySeek.setOnSeekBarChangeListener({
        onProgressChanged: function(seekBar, progress, fromUser) {
            if (fromUser) {
                var quantity = progress + 1; // 0-99对应1-100件
                self.updateQuantityDisplay(quantity);
            }
        }
    });

    // 更新用户信息按钮
    ui.refreshUserBtn.click(function() {
        self.refreshUserInfo();
    });

    // 保存用户信息到本地按钮
    ui.saveUserBtn.click(function() {
        self.saveUserInfoToLocal();
    });

    // 清除本地用户信息按钮
    ui.clearUserBtn.click(function() {
        self.clearLocalUserInfo();
    });

    // 启动脚本按钮
    ui.startScriptBtn.click(function() {
        self.startScript();
    });

    // 停止脚本按钮
    ui.stopScriptBtn.click(function() {
        self.stopScript();
    });

    // 清空日志按钮
    ui.clearLogBtn.click(function() {
        ui.logText.setText("日志已清空");
    });



    // 帮助按钮
    ui.helpBtn.click(function() {
        self.showHelp();
    });

    // 关于按钮
    ui.aboutBtn.click(function() {
        self.showAbout();
    });


};

/**
 * 启动悬浮窗
 */
MainUI.prototype.startFloatingWindow = function() {
    var self = this;

    try {
        if (this.isFloatingWindowActive) {
            this.addLog("悬浮窗已在运行中");
            return;
        }

        this.addLog("正在启动悬浮窗...");

        // 在当前进程中创建悬浮窗实例
        this.floatingWindow = new FloatingWindow();
        this.floatingWindow.create();

        // 设置悬浮窗回调函数
        this.setupFloatingWindowCallbacks();

        this.isFloatingWindowActive = true;
        ui.floatingStatus.setText("已启动");
        this.addLog("✅ 悬浮窗启动成功");

    } catch (e) {
        this.addLog("❌ 悬浮窗启动失败: " + e.message);
        ui.floatingSwitch.setChecked(false);
        this.isFloatingWindowActive = false;
        ui.floatingStatus.setText("启动失败");
    }
};

/**
 * 停止悬浮窗
 */
MainUI.prototype.stopFloatingWindow = function() {
    try {
        if (this.floatingWindow) {
            this.floatingWindow.close();
            this.floatingWindow = null;
        }

        this.isFloatingWindowActive = false;
        ui.floatingStatus.setText("未启动");
        this.addLog("悬浮窗已关闭");

    } catch (e) {
        this.addLog("关闭悬浮窗时出错: " + e.message);
    }
};

/**
 * 设置悬浮窗回调函数
 */
MainUI.prototype.setupFloatingWindowCallbacks = function() {
    var self = this;

    // 设置脚本启动回调
    this.floatingWindow.setOnStartCallback(function(window, priceRange, mode, purchaseQuantity) {
        var quantityText = purchaseQuantity ? ", 数量: " + purchaseQuantity + "件" : "";
        self.addLog("悬浮窗启动脚本: " + mode + "模式, 价格区间: " + priceRange.min.toFixed(2) + "-" + priceRange.max.toFixed(2) + "元" + quantityText);

        // 在新线程中执行脚本
        threads.start(function() {
            try {
                // 获取用户信息
                var userInfo = self.userInfoManager.getCompleteUserInfo(window);
                if (userInfo) {
                    ui.run(function() {
                        self.updateUserInfoDisplay(userInfo);
                    });
                }

                // 根据模式执行不同功能
                var userName = self.getUserName();

                if (mode === 'payment') {
                    // 执行自动支付功能
                    self.addLog("执行模式: 自动支付");
                    self.autoPayment.execute(window, userName);
                } else if (mode === 'favorite') {
                    // 执行收藏功能
                    self.addLog("执行模式: 批量收藏");
                    self.addLog("收藏数量: " + purchaseQuantity + "件");
                    self.productFavorite.execute(window, priceRange, userName, purchaseQuantity);
                } else if (mode === 'favoriteSettlement') {
                    // 执行收藏结算功能
                    self.addLog("执行模式: 收藏结算");
                    self.favoriteSettlement.execute(window, userName);
                } else if (mode === 'delivery') {
                    // 执行待收货物流追踪功能
                    self.addLog("✅ 匹配到delivery模式，开始执行物流追踪");
                    self.deliveryTracking.execute(window, userName);
                } else if (mode === 'search') {
                    // 执行搜索模式
                    var keyword = null;
                    try { keyword = window.searchKeywordInput.getText().toString(); } catch (e) { keyword = '手机壳'; }
                    keyword = (keyword && String(keyword).trim()) || '手机壳';
                    self.addLog("执行模式: 搜索，关键词: " + keyword);
                    self.searchMode.execute(window, keyword);
                } else {
                    self.addLog("不支持的模式: " + mode);
                }

            } catch (e) {
                ui.run(function() {
                    self.addLog("脚本执行出错: " + e.message);
                });
            }
        });
    });

    // 设置脚本停止回调
    this.floatingWindow.setOnStopCallback(function() {
        self.addLog("悬浮窗脚本已停止");
    });

    // 设置用户信息回调
    this.floatingWindow.setOnUserInfoCallback(function(window, callback) {
        threads.start(function() {
            try {
                var userInfo = self.userInfoManager.getCompleteUserInfo(window, true); // 强制刷新
                if (userInfo) {
                    ui.run(function() {
                        self.updateUserInfoDisplay(userInfo);
                        if (callback) callback(userInfo);
                    });
                }
            } catch (e) {
                ui.run(function() {
                    self.addLog("更新用户信息出错: " + e.message);
                });
            }
        });
    });
};



/**
 * 启动脚本
 */
MainUI.prototype.startScript = function() {
    var self = this;

    // 获取价格区间
    var minProgress = ui.minPriceSeek.getProgress();
    var maxProgress = ui.maxPriceSeek.getProgress();
    var minPrice = 0.1 + (minProgress / 100.0) * 1.9;
    var maxPrice = 0.1 + (maxProgress / 100.0) * 1.9;

    var priceRange = {
        min: minPrice,
        max: maxPrice
    };

    // 获取购买数量
    var purchaseQuantity = 1;
    try {
        var quantityProgress = ui.quantitySeek.getProgress();
        purchaseQuantity = quantityProgress + 1; // 0-99对应1-100件
    } catch (e) {
        this.addLog("获取购买数量失败，使用默认值1件");
        purchaseQuantity = 1;
    }

    this.addLog("启动脚本: " + ui.currentModeDisplay.getText());
    this.addLog("价格区间: " + minPrice.toFixed(2) + "-" + maxPrice.toFixed(2) + "元");
    this.addLog("收藏数量: " + purchaseQuantity + "件");

    // 更新按钮状态
    ui.startScriptBtn.setEnabled(false);
    ui.stopScriptBtn.setEnabled(true);
    ui.startScriptBtn.attr("bg", "#9E9E9E");
    ui.stopScriptBtn.attr("bg", "#FF5722");

    // 在新线程中执行脚本
    this.scriptThread = threads.start(function() {
        try {
            // 获取用户信息
            self.addLog("正在获取用户信息...");
            var userInfo = self.userInfoManager.getCompleteUserInfo();
            if (userInfo) {
                ui.run(function() {
                    self.updateUserInfoDisplay(userInfo);
                    self.addLog("✅ 用户信息获取成功");
                });
            }

            // 根据当前模式执行不同功能
            if (self.currentMode === 'favorite') {
                self.addLog("执行模式: 批量收藏");
                self.productFavorite.execute(null, priceRange, self.getUserName(), purchaseQuantity);
            } else if (self.currentMode === 'favoriteSettlement') {
                self.addLog("执行模式: 收藏结算");
                self.favoriteSettlement.execute(null, self.getUserName());
            } else if (self.currentMode === 'payment') {
                self.addLog("执行模式: 自动支付");
                self.autoPayment.execute(null, self.getUserName());
            } else if (self.currentMode === 'delivery') {
                self.addLog("执行模式: 待收货物流追踪");
                self.deliveryTracking.execute(null, self.getUserName());
            } else if (self.currentMode === 'search') {
                var keyword = null;
                try { keyword = ui.searchKeywordInput.getText().toString(); } catch (e) { keyword = '手机壳'; }
                keyword = (keyword && String(keyword).trim()) || '手机壳';
                self.addLog("执行模式: 搜索，关键词: " + keyword);
                if (!self.searchMode) self.searchMode = new (require('../modules/search-mode.js'))();
                self.searchMode.execute(null, keyword);
            } else {
                self.addLog("不支持的模式: " + self.currentMode);
            }

        } catch (e) {
            ui.run(function() {
                self.addLog("❌ 脚本执行出错: " + e.message);
            });
        } finally {
            // 恢复按钮状态
            ui.run(function() {
                self.resetScriptButtons();
            });
        }
    });
};

/**
 * 停止脚本
 */
MainUI.prototype.stopScript = function() {
    if (this.scriptThread) {
        this.scriptThread.interrupt();
        this.scriptThread = null;
        this.addLog("脚本已停止");
    }
    this.resetScriptButtons();
};

/**
 * 重置脚本按钮状态
 */
MainUI.prototype.resetScriptButtons = function() {
    ui.startScriptBtn.setEnabled(true);
    ui.stopScriptBtn.setEnabled(false);
    ui.startScriptBtn.attr("bg", "#FF5722");
    ui.stopScriptBtn.attr("bg", "#9E9E9E");
};

/**
 * 刷新用户信息
 */
MainUI.prototype.refreshUserInfo = function() {
    var self = this;
    this.addLog("正在更新用户信息...");

    threads.start(function() {
        try {
            var userInfo = self.userInfoManager.getCompleteUserInfo(null, true); // 强制刷新
            if (userInfo) {
                ui.run(function() {
                    self.updateUserInfoDisplay(userInfo);
                    self.addLog("✅ 用户信息更新成功");
                });
            } else {
                ui.run(function() {
                    self.addLog("❌ 用户信息获取失败，请确保已登录拼多多并设置收货地址");
                });
            }
        } catch (e) {
            ui.run(function() {
                self.addLog("更新用户信息出错: " + e.message);
            });
        }
    });
};

/**
 * 更新用户信息显示
 */
MainUI.prototype.updateUserInfoDisplay = function(userInfo) {
    if (!userInfo) return;

    try {
        // 使用用户信息管理器的通用更新方法
        this.userInfoManager.updateUIDisplay({
            userName: ui.userName,
            userPhone: ui.userPhone,
            userAddress: ui.userAddress
        }, userInfo);
    } catch (e) {
        this.addLog("更新用户信息显示失败: " + e.message);
    }
};

/**
 * 更新价格显示
 */
MainUI.prototype.updatePriceDisplay = function(minPrice, maxPrice) {
    ui.priceRangeText.setText(minPrice.toFixed(2) + "-" + maxPrice.toFixed(2) + "元");
    ui.minPriceValue.setText(minPrice.toFixed(2));
    ui.maxPriceValue.setText(maxPrice.toFixed(2));
};

/**
 * 更新购买数量显示
 */
MainUI.prototype.updateQuantityDisplay = function(quantity) {
    ui.quantityText.setText("(" + quantity + "件)");
};

/**
 * 切换到指定模式
 */
MainUI.prototype.switchToMode = function(mode) {
    var self = this;
    this.currentMode = mode;
    
    // 重置所有按钮样式
    ui.favoriteModeBtn.attr('textColor', '#666666');
    ui.favoriteModeBtn.attr('bg', '#E0E0E0');
    ui.favoriteSettlementModeBtn.attr('textColor', '#666666');
    ui.favoriteSettlementModeBtn.attr('bg', '#E0E0E0');
    ui.paymentModeBtn.attr('textColor', '#666666');
    ui.paymentModeBtn.attr('bg', '#E0E0E0');
    ui.deliveryModeBtn.attr('textColor', '#666666');
    ui.deliveryModeBtn.attr('bg', '#E0E0E0');
    ui.searchModeBtn && ui.searchModeBtn.attr('textColor', '#666666');
    ui.searchModeBtn && ui.searchModeBtn.attr('bg', '#E0E0E0');
    
    // 设置当前模式按钮样式
    if (mode === 'favorite') {
        ui.favoriteModeBtn.attr('textColor', '#ffffff');
        ui.favoriteModeBtn.attr('bg', '#E91E63');
        ui.currentModeDisplay.setText("当前模式：商品收藏模式");
        ui.modeDescription.setText("自动批量收藏符合价格区间的商品到收藏夹");
        ui.searchModeArea && ui.searchModeArea.attr('visibility', 'gone');
    } else if (mode === 'favoriteSettlement') {
        ui.favoriteSettlementModeBtn.attr('textColor', '#ffffff');
        ui.favoriteSettlementModeBtn.attr('bg', '#9C27B0');
        ui.currentModeDisplay.setText("当前模式：收藏结算模式");
        ui.modeDescription.setText("自动导航到收藏页面，查看收藏商品并进行结算");
        ui.searchModeArea && ui.searchModeArea.attr('visibility', 'gone');
    } else if (mode === 'payment') {
        ui.paymentModeBtn.attr('textColor', '#ffffff');
        ui.paymentModeBtn.attr('bg', '#FF9800');
        ui.currentModeDisplay.setText("当前模式：支付模式");
        ui.modeDescription.setText("自动导航到待支付页面，检测待支付订单并准备支付流程");
        ui.searchModeArea && ui.searchModeArea.attr('visibility', 'gone');
    } else if (mode === 'delivery') {
        ui.deliveryModeBtn.attr('textColor', '#ffffff');
        ui.deliveryModeBtn.attr('bg', '#FF5722');
        ui.currentModeDisplay.setText("当前模式：待收货模式");
        ui.modeDescription.setText("自动导航到待收货页面，批量获取物流单号并复制到剪贴板");
        ui.searchModeArea && ui.searchModeArea.attr('visibility', 'gone');
    } else if (mode === 'search') {
        ui.searchModeBtn && ui.searchModeBtn.attr('textColor', '#ffffff');
        ui.searchModeBtn && ui.searchModeBtn.attr('bg', '#03A9F4');
        ui.currentModeDisplay.setText("当前模式：搜索模式");
        ui.modeDescription.setText("在搜索框输入关键词并点击搜索，进入结果列表页");
        ui.searchModeArea && ui.searchModeArea.attr('visibility', 'visible');
    }
    
    this.addLog("已切换到" + ui.currentModeDisplay.getText());
};

/**
 * 更新等待倍率
 */
MainUI.prototype.updateSpeedMultiplier = function(multiplier) {
    var speedText = "(" + multiplier.toFixed(1) + "x)";
    ui.speedText.setText(speedText);
    
    // 更新等待时间管理器的倍率
    waitTimeManager.setSpeedMultiplier(multiplier);
    
    // 更新模式描述（仅用于日志，不再显示在UI中）
    var modeDescription = waitTimeManager.getSpeedModeDescription();
    
    // 同步滑条位置到当前倍率（0.1-10.0 -> 0-99）
    var progress = Math.round((multiplier - 0.1) / 9.9 * 99);
    try {
        ui.speedSeekbar.setProgress(progress);
    } catch (e) {}
    
    this.addLog("等待倍率已更新为: " + speedText + " - " + modeDescription);
};

/**
 * 获取用户名
 */
MainUI.prototype.getUserName = function() {
    return this.userInfoManager.getUserName();
};

/**
 * 添加日志
 */
MainUI.prototype.addLog = function(message) {
    var self = this;
    var timestamp = new Date().toLocaleTimeString();
    var logMessage = "[" + timestamp + "] " + message;

    // 控制台输出，便于调试
    try { console.log(logMessage); } catch (e) {}

    // 主界面日志区更新
    ui.run(function() {
        try {
            var currentText = ui.logText.getText();
            var newText = currentText + "\n" + logMessage;

            // 限制日志长度，保留最后1000个字符
            if (newText.length > 1000) {
                newText = "...\n" + newText.substring(newText.length - 900);
            }

            ui.logText.setText(newText);
        } catch (e) {}
    });

    // 同步到悬浮窗日志（如果悬浮窗已创建）
    try {
        if (self.floatingWindow && typeof self.floatingWindow.addLog === 'function') {
            self.floatingWindow.addLog(message);
        }
    } catch (e) {}
};

/**
 * 显示帮助信息
 */
MainUI.prototype.showHelp = function() {
    dialogs.alert("使用帮助",
        "1. 启用悬浮窗：开启后可在任意界面使用\n" +
        "2. 设置价格区间：调整最低价和最高价\n" +
        "3. 设置购买数量：调整每次购买的商品数量\n" +
        "4. 更新用户信息：获取最新的账号和收件人信息\n" +
        "5. 保存到本地：将用户信息保存到本地存储\n" +
        "6. 清除本地：清除本地保存的用户信息\n" +
        "7. 启动脚本：开始自动化购买操作\n\n" +
        "本地存储功能：\n" +
        "• 应用启动时自动加载本地保存的用户信息\n" +
        "• 获取用户信息后自动保存到本地\n" +
        "• 存储位置：/sdcard/PDD_AutoScript/\n\n" +
        "注意：使用前请确保已登录拼多多账号并设置收货地址"
    );
};

/**
 * 显示关于信息
 */
MainUI.prototype.showAbout = function() {
    dialogs.alert("关于",
        "拼多多自动化工具 v1.0.0\n\n" +
        "功能特性：\n" +
        "• 悬浮窗控制\n" +
        "• 自动购买商品\n" +
        "• 价格区间设置\n" +
        "• 购买数量设置\n" +
        "• 用户信息管理\n\n" +
        "使用须知：\n" +
        "请遵守相关法律法规，合理使用自动化工具"
    );
};

/**
 * 加载本地保存的用户信息
 */
MainUI.prototype.loadLocalUserInfo = function() {
    var self = this;

    try {
        // 检查是否有本地保存的用户信息
        if (this.userInfoManager.hasLocalUserInfo()) {
            this.addLog("发现本地保存的用户信息，正在加载...");

            // 在后台线程中加载，避免阻塞UI
            threads.start(function() {
                try {
                    var userInfo = self.userInfoManager.initializeFromLocal();
                    if (userInfo) {
                        ui.run(function() {
                            self.updateUserInfoDisplay(userInfo);
                            self.addLog("✅ 本地用户信息加载成功");
                        });
                    }
                } catch (e) {
                    ui.run(function() {
                        self.addLog("加载本地用户信息出错: " + e.message);
                    });
                }
            });
        } else {
            this.addLog("本地没有保存的用户信息，请点击'更新用户信息'获取");
        }
    } catch (e) {
        this.addLog("检查本地用户信息失败: " + e.message);
    }
};

/**
 * 保存当前用户信息到本地
 */
MainUI.prototype.saveUserInfoToLocal = function() {
    var self = this;

    threads.start(function() {
        try {
            var success = self.userInfoManager.manualSaveToLocal();
            ui.run(function() {
                if (success) {
                    self.addLog("✅ 用户信息已手动保存到本地");
                } else {
                    self.addLog("❌ 保存用户信息到本地失败");
                }
            });
        } catch (e) {
            ui.run(function() {
                self.addLog("保存用户信息出错: " + e.message);
            });
        }
    });
};

/**
 * 清除本地保存的用户信息
 */
MainUI.prototype.clearLocalUserInfo = function() {
    var self = this;

    dialogs.confirm("确认清除", "确定要清除本地保存的用户信息吗？").then(function(confirmed) {
        if (confirmed) {
            threads.start(function() {
                try {
                    var success = self.userInfoManager.clearLocalUserInfo();
                    ui.run(function() {
                        if (success) {
                            self.addLog("✅ 本地用户信息已清除");
                            // 清空UI显示
                            ui.userName.setText("未获取");
                            ui.userPhone.setText("未获取");
                            ui.userAddress.setText("未获取");
                        } else {
                            self.addLog("❌ 清除本地用户信息失败");
                        }
                    });
                } catch (e) {
                    ui.run(function() {
                        self.addLog("清除本地用户信息出错: " + e.message);
                    });
                }
            });
        }
    });
};

/**
 * 获取用户名
 */
MainUI.prototype.getUserName = function() {
    return ui.userName.getText().toString() || "未知用户";
};

module.exports = MainUI;
