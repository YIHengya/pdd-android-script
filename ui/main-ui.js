// 主界面UI模块
// 负责创建和管理主软件界面

"ui";

const ProductPurchase = require('../modules/product-purchase.js');
const ProductCollect = require('../modules/product-collect.js');
const UserInfo = require('../modules/user-info.js');
const UserInfoManager = require('../utils/user-info-manager.js');
const FloatingWindow = require('./floating-window.js');

/**
 * 主界面构造函数
 */
function MainUI() {
    this.floatingWindow = null;
    this.productPurchase = null;
    this.productCollect = null;
    this.userInfo = null;
    this.userInfoManager = null; // 用户信息管理器
    this.isFloatingWindowActive = false;
    this.scriptThread = null;
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
                                
                                <horizontal gravity="center_vertical" margin="0 0 8dp 0">
                                    <text text="默认模式:" textSize="14sp" textColor="#666666" w="80dp"/>
                                    <radiogroup id="modeGroup" orientation="horizontal">
                                        <radio id="purchaseMode" text="购买模式" textSize="14sp" checked="true" margin="0 16dp 0 0"/>
                                        <radio id="collectMode" text="收藏模式" textSize="14sp"/>
                                    </radiogroup>
                                </horizontal>
                                
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

                                <horizontal gravity="center_vertical" margin="0 0 4dp 0">
                                    <text text="购买数量:" textSize="12sp" textColor="#666666" w="80dp"/>
                                    <text id="quantityDisplay" text="1件" textSize="12sp" textColor="#333333" textStyle="bold"/>
                                </horizontal>

                                <horizontal gravity="center_vertical">
                                    <text text="数量:" textSize="12sp" textColor="#666666" w="50dp"/>
                                    <seekbar id="quantitySeek" w="*" h="20dp" margin="0 8dp 0 8dp"
                                             max="99" progress="0" progressTint="#9C27B0" thumbTint="#9C27B0"/>
                                    <text id="quantityValue" text="1" textSize="12sp" textColor="#666666" w="40dp" gravity="center"/>
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

                                <horizontal gravity="center" margin="0 0 4dp 0">
                                    <button id="viewPurchasedBtn" text="查看已购买"
                                            textColor="#ffffff" bg="#9C27B0"
                                            w="100dp" h="35dp" margin="4dp" textSize="12sp"/>
                                    <button id="clearPurchasedBtn" text="清除记录"
                                            textColor="#ffffff" bg="#FF9800"
                                            w="100dp" h="35dp" margin="4dp" textSize="12sp"/>
                                </horizontal>

                                <horizontal gravity="center">
                                    <button id="resetSessionBtn" text="重置会话"
                                            textColor="#ffffff" bg="#607D8B"
                                            w="100dp" h="35dp" margin="4dp" textSize="12sp"/>
                                    <text text="清除位置记录" textSize="10sp" textColor="#666666" gravity="center" layout_weight="1"/>
                                </horizontal>
                                
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
};

/**
 * 初始化模块
 */
MainUI.prototype.initializeModules = function() {
    var self = this;

    this.productPurchase = new ProductPurchase();
    this.productCollect = new ProductCollect();
    this.userInfo = new UserInfo();
    this.userInfoManager = new UserInfoManager();

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

    // 查看已购买商品按钮
    ui.viewPurchasedBtn.click(function() {
        self.viewPurchasedProducts();
    });

    // 清除已购买记录按钮
    ui.clearPurchasedBtn.click(function() {
        self.clearPurchasedProducts();
    });

    // 重置会话按钮
    ui.resetSessionBtn.click(function() {
        self.resetPurchaseSession();
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

                // 执行对应功能
                if (mode === 'collect') {
                    self.productCollect.execute(window, priceRange);
                } else {
                    var userName = self.getUserName();
                    self.productPurchase.execute(window, priceRange, userName, purchaseQuantity);
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

    // 获取模式
    var mode = ui.purchaseMode.isChecked() ? 'purchase' : 'collect';

    // 获取购买数量
    var purchaseQuantity = 1;
    try {
        var quantityProgress = ui.quantitySeek.getProgress();
        purchaseQuantity = quantityProgress + 1; // 0-99对应1-100件
    } catch (e) {
        this.addLog("获取购买数量失败，使用默认值1件");
        purchaseQuantity = 1;
    }

    this.addLog("启动脚本: " + (mode === 'purchase' ? '购买' : '收藏') + "模式");
    this.addLog("价格区间: " + minPrice.toFixed(2) + "-" + maxPrice.toFixed(2) + "元");
    if (mode === 'purchase') {
        this.addLog("购买数量: " + purchaseQuantity + "件");
    }

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

            // 执行对应功能
            if (mode === 'collect') {
                self.productCollect.execute(null, priceRange);
            } else {
                var userName = self.getUserName();
                self.productPurchase.execute(null, priceRange, userName, purchaseQuantity);
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
    ui.quantityDisplay.setText(quantity + "件");
    ui.quantityValue.setText(quantity.toString());
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
    var timestamp = new Date().toLocaleTimeString();
    var logMessage = "[" + timestamp + "] " + message;

    ui.run(function() {
        var currentText = ui.logText.getText();
        var newText = currentText + "\n" + logMessage;

        // 限制日志长度，保留最后1000个字符
        if (newText.length > 1000) {
            newText = "...\n" + newText.substring(newText.length - 900);
        }

        ui.logText.setText(newText);
    });
};

/**
 * 显示帮助信息
 */
MainUI.prototype.showHelp = function() {
    dialogs.alert("使用帮助",
        "1. 启用悬浮窗：开启后可在任意界面使用\n" +
        "2. 设置价格区间：调整最低价和最高价\n" +
        "3. 选择模式：购买模式或收藏模式\n" +
        "4. 更新用户信息：获取最新的账号和收件人信息\n" +
        "5. 保存到本地：将用户信息保存到本地存储\n" +
        "6. 清除本地：清除本地保存的用户信息\n" +
        "7. 启动脚本：开始自动化操作\n\n" +
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
        "• 自动收藏商品\n" +
        "• 价格区间设置\n" +
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

/**
 * 查看已购买商品
 */
MainUI.prototype.viewPurchasedProducts = function() {
    var self = this;

    if (!this.productPurchase) {
        this.addLog("购买模块未初始化");
        return;
    }

    var count = this.productPurchase.getPurchasedProductsCount();
    if (count === 0) {
        this.addLog("暂无已购买商品记录");
        return;
    }

    this.addLog("=== 已购买商品记录 (" + count + "件) ===");

    // 获取已购买商品列表
    var purchasedProducts = this.productPurchase.purchasedProducts;
    for (var i = 0; i < Math.min(purchasedProducts.length, 10); i++) {
        var product = purchasedProducts[i];
        this.addLog((i + 1) + ". " + product.text + " - " + product.price + "元 (" + product.date + ")");
    }

    if (purchasedProducts.length > 10) {
        this.addLog("... 还有 " + (purchasedProducts.length - 10) + " 条记录");
    }

    this.addLog("=== 记录查看完毕 ===");
};

/**
 * 清除已购买商品记录
 */
MainUI.prototype.clearPurchasedProducts = function() {
    var self = this;

    if (!this.productPurchase) {
        this.addLog("购买模块未初始化");
        return;
    }

    var count = this.productPurchase.getPurchasedProductsCount();
    if (count === 0) {
        this.addLog("暂无已购买商品记录需要清除");
        return;
    }

    // 确认对话框
    dialogs.confirm("确认清除", "确定要清除所有已购买商品记录吗？\n当前共有 " + count + " 条记录。")
        .then(function(confirmed) {
            if (confirmed) {
                self.productPurchase.clearPurchasedProducts();
                self.addLog("✅ 已清除所有已购买商品记录 (" + count + "条)");
            } else {
                self.addLog("取消清除操作");
            }
        });
};

/**
 * 重置购买会话
 */
MainUI.prototype.resetPurchaseSession = function() {
    var self = this;

    if (!this.productPurchase) {
        this.addLog("购买模块未初始化");
        return;
    }

    // 确认对话框
    dialogs.confirm("重置会话", "确定要重置购买会话吗？\n这将清除所有已点击的商品位置记录，\n但保留已购买商品记录。")
        .then(function(confirmed) {
            if (confirmed) {
                self.productPurchase.resetSession();
                self.addLog("✅ 购买会话已重置，位置记录已清除");
                self.addLog("现在可以重新寻找之前点击过的商品位置");
            } else {
                self.addLog("取消重置操作");
            }
        });
};

module.exports = MainUI;
