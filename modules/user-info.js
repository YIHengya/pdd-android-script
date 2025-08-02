// 用户信息管理模块
// 负责获取拼多多账号信息和收件人信息

const { PDD_CONFIG } = require('../config/app-config.js');
const logger = require('../utils/logger.js');
const { safeClick } = require('../utils/common.js');

/**
 * 用户信息管理构造函数
 */
function UserInfo() {
    this.config = PDD_CONFIG;
    this.currentUser = null;
    this.recipientInfo = null;
}

/**
 * 获取当前用户信息（账号信息）
 * @param {Object} window 悬浮窗对象
 * @returns {Object|null} 用户信息对象，包含用户ID等
 */
UserInfo.prototype.getCurrentUser = function(window) {
    try {
        logger.addLog(window, "开始获取当前用户信息...");

        // 确保在拼多多APP中
        if (!this.ensureInPDDApp(window)) {
            logger.addLog(window, "无法打开拼多多APP");
            return null;
        }

        // 进入个人中心
        if (!this.navigateToProfile(window)) {
            logger.addLog(window, "无法进入个人中心");
            return null;
        }

        // 获取用户信息
        var userInfo = this.extractUserInfo(window);
        if (userInfo) {
            this.currentUser = userInfo;
            logger.addLog(window, "成功获取用户信息: " + userInfo.displayName);
            return userInfo;
        } else {
            logger.addLog(window, "无法获取用户信息");
            return null;
        }

    } catch (e) {
        logger.addLog(window, "获取用户信息失败: " + e.message);
        return null;
    }
};

/**
 * 获取收件人信息
 * @param {Object} window 悬浮窗对象
 * @returns {Object|null} 收件人信息对象，包含姓名、手机号、地址
 */
UserInfo.prototype.getRecipientInfo = function(window) {
    try {
        logger.addLog(window, "开始获取收件人信息...");

        // 确保在拼多多APP中
        if (!this.ensureInPDDApp(window)) {
            logger.addLog(window, "无法打开拼多多APP");
            return null;
        }

        // 进入个人中心
        if (!this.navigateToProfile(window)) {
            logger.addLog(window, "无法进入个人中心");
            return null;
        }

        // 进入收货地址页面
        if (!this.navigateToAddressPage(window)) {
            logger.addLog(window, "无法进入收货地址页面");
            return null;
        }

        // 获取收件人信息
        var recipientInfo = this.extractRecipientInfo(window);
        if (recipientInfo) {
            this.recipientInfo = recipientInfo;
            logger.addLog(window, "成功获取收件人信息: " + recipientInfo.name);
            return recipientInfo;
        } else {
            logger.addLog(window, "无法获取收件人信息");
            return null;
        }

    } catch (e) {
        logger.addLog(window, "获取收件人信息失败: " + e.message);
        return null;
    }
};

/**
 * 获取当前包名（带重试机制）
 * @param {number} maxRetries 最大重试次数
 * @param {number} retryDelay 重试间隔（毫秒）
 * @returns {string|null} 当前包名
 */
UserInfo.prototype.getCurrentPackageWithRetry = function(maxRetries, retryDelay) {
    maxRetries = maxRetries || 3;
    retryDelay = retryDelay || 1000;

    for (var i = 0; i < maxRetries; i++) {
        try {
            var currentPkg = currentPackage();
            if (currentPkg && currentPkg !== null && currentPkg !== "") {
                return currentPkg;
            }

            if (i < maxRetries - 1) {
                sleep(retryDelay);
            }
        } catch (e) {
            if (i < maxRetries - 1) {
                sleep(retryDelay);
            }
        }
    }

    return null;
};

/**
 * 检查是否在拼多多应用中
 * @param {string} currentPkg 当前包名
 * @returns {boolean} 是否在拼多多应用中
 */
UserInfo.prototype.isPDDApp = function(currentPkg) {
    if (!currentPkg) return false;

    // 检查精确匹配
    for (var i = 0; i < this.config.packageNames.length; i++) {
        if (currentPkg === this.config.packageNames[i]) {
            return true;
        }
    }

    // 检查模糊匹配
    if (currentPkg.indexOf("pinduoduo") !== -1 ||
        currentPkg.indexOf("pdd") !== -1 ||
        currentPkg.indexOf("xunmeng") !== -1) {
        return true;
    }

    return false;
};

/**
 * 确保在拼多多APP中
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否成功
 */
UserInfo.prototype.ensureInPDDApp = function(window) {
    try {
        // 使用重试机制获取当前包名
        var currentPkg = this.getCurrentPackageWithRetry(3, 500);
        logger.addLog(window, "当前应用包名: " + (currentPkg || "null"));

        // 检查是否已经在拼多多APP中
        if (this.isPDDApp(currentPkg)) {
            logger.addLog(window, "已在拼多多APP中");
            return true;
        }

        // 尝试启动拼多多APP
        logger.addLog(window, "正在启动拼多多APP...");

        home();
        sleep(2000);

        // 尝试使用包名启动
        for (var i = 0; i < this.config.packageNames.length; i++) {
            try {
                logger.addLog(window, "尝试包名: " + this.config.packageNames[i]);
                app.launchPackage(this.config.packageNames[i]);
                sleep(this.config.waitTimes.appLaunch);

                // 使用重试机制获取当前包名
                currentPkg = this.getCurrentPackageWithRetry(5, 800);
                logger.addLog(window, "启动后当前应用: " + (currentPkg || "null"));

                if (this.isPDDApp(currentPkg)) {
                    logger.addLog(window, "成功启动拼多多APP");
                    return true;
                }
            } catch (e) {
                logger.addLog(window, "包名启动异常: " + e.message);
                continue;
            }
        }

        // 尝试使用应用名启动
        for (var i = 0; i < this.config.appNames.length; i++) {
            try {
                logger.addLog(window, "尝试应用名: " + this.config.appNames[i]);
                app.launchApp(this.config.appNames[i]);
                sleep(this.config.waitTimes.appLaunch);

                // 使用重试机制获取当前包名
                currentPkg = this.getCurrentPackageWithRetry(5, 800);
                logger.addLog(window, "启动后当前应用: " + (currentPkg || "null"));

                if (this.isPDDApp(currentPkg)) {
                    logger.addLog(window, "成功启动拼多多APP");
                    return true;
                }
            } catch (e) {
                logger.addLog(window, "应用名启动异常: " + e.message);
                continue;
            }
        }

        // 最后尝试：通过Intent启动
        logger.addLog(window, "尝试通过Intent启动...");
        try {
            var intent = new Intent();
            intent.setAction("android.intent.action.MAIN");
            intent.addCategory("android.intent.category.LAUNCHER");
            intent.setPackage("com.xunmeng.pinduoduo");
            context.startActivity(intent);

            sleep(this.config.waitTimes.appLaunch);
            currentPkg = this.getCurrentPackageWithRetry(5, 800);
            logger.addLog(window, "Intent启动后当前应用: " + (currentPkg || "null"));

            if (this.isPDDApp(currentPkg)) {
                logger.addLog(window, "Intent启动成功");
                return true;
            }
        } catch (e) {
            logger.addLog(window, "Intent启动失败: " + e.message);
        }

        return false;
    } catch (e) {
        logger.addLog(window, "启动拼多多APP失败: " + e.message);
        return false;
    }
};

/**
 * 导航到个人中心
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否成功
 */
UserInfo.prototype.navigateToProfile = function(window) {
    try {
        logger.addLog(window, "正在进入个人中心...");

        // 等待页面加载
        sleep(this.config.waitTimes.pageLoad);

        // 寻找"我的"按钮
        var profileButtons = [
            "我的",
            "个人中心",
            "用户中心",
            "账户"
        ];

        for (var i = 0; i < profileButtons.length; i++) {
            var btn = text(profileButtons[i]).findOne(2000);
            if (btn) {
                logger.addLog(window, "找到按钮: " + profileButtons[i]);
                if (safeClick(btn)) {
                    sleep(this.config.waitTimes.pageLoad);
                    logger.addLog(window, "成功进入个人中心");
                    return true;
                }
            }
        }

        // 尝试通过底部导航栏进入
        var bottomNavs = textContains("我的").find();
        for (var i = 0; i < bottomNavs.length; i++) {
            if (safeClick(bottomNavs[i])) {
                sleep(this.config.waitTimes.pageLoad);
                logger.addLog(window, "通过底部导航进入个人中心");
                return true;
            }
        }

        return false;
    } catch (e) {
        logger.addLog(window, "进入个人中心失败: " + e.message);
        return false;
    }
};

/**
 * 导航到收货地址页面
 * @param {Object} window 悬浮窗对象
 * @returns {boolean} 是否成功
 */
UserInfo.prototype.navigateToAddressPage = function(window) {
    try {
        logger.addLog(window, "正在进入收货地址页面...");

        // 寻找收货地址相关按钮
        var addressButtons = [
            "收货地址",
            "地址管理",
            "收件地址",
            "我的地址",
            "地址"
        ];

        for (var i = 0; i < addressButtons.length; i++) {
            var btn = text(addressButtons[i]).findOne(3000);
            if (btn) {
                logger.addLog(window, "找到地址按钮: " + addressButtons[i]);
                if (safeClick(btn)) {
                    sleep(this.config.waitTimes.pageLoad);
                    logger.addLog(window, "成功进入收货地址页面");
                    return true;
                }
            }
        }

        // 尝试通过包含文本查找
        var addressContains = textContains("地址").findOne(3000);
        if (addressContains) {
            logger.addLog(window, "找到包含'地址'的按钮");
            if (safeClick(addressContains)) {
                sleep(this.config.waitTimes.pageLoad);
                logger.addLog(window, "成功进入收货地址页面");
                return true;
            }
        }

        return false;
    } catch (e) {
        logger.addLog(window, "进入收货地址页面失败: " + e.message);
        return false;
    }
};

/**
 * 提取用户信息
 * @param {Object} window 悬浮窗对象
 * @returns {Object|null} 用户信息对象
 */
UserInfo.prototype.extractUserInfo = function(window) {
    try {
        logger.addLog(window, "正在提取用户信息...");

        var userInfo = {
            userId: null,
            displayName: null,
            phone: null,
            avatar: null
        };

        // 等待页面加载
        sleep(2000);

        // 尝试获取用户昵称/姓名
        var nameSelectors = [
            textMatches(/^[^\s]{1,20}$/),  // 匹配用户名格式
            className("android.widget.TextView").textMatches(/^[^\s]{1,20}$/)
        ];

        for (var i = 0; i < nameSelectors.length; i++) {
            var nameElements = nameSelectors[i].find();
            for (var j = 0; j < nameElements.length; j++) {
                var nameText = nameElements[j].text();
                if (nameText && nameText.length > 0 && nameText.length <= 20) {
                    // 排除一些常见的非用户名文本
                    var excludeTexts = ["我的", "个人中心", "设置", "退出", "登录", "注册", "首页", "搜索"];
                    var isExcluded = false;
                    for (var k = 0; k < excludeTexts.length; k++) {
                        if (nameText.indexOf(excludeTexts[k]) !== -1) {
                            isExcluded = true;
                            break;
                        }
                    }

                    if (!isExcluded && !userInfo.displayName) {
                        userInfo.displayName = nameText;
                        logger.addLog(window, "找到用户名: " + nameText);
                        break;
                    }
                }
            }
            if (userInfo.displayName) break;
        }

        // 尝试获取手机号
        var phonePattern = /1[3-9]\d{9}/;
        var phoneElements = textMatches(phonePattern).find();
        if (phoneElements.length > 0) {
            userInfo.phone = phoneElements[0].text();
            logger.addLog(window, "找到手机号: " + userInfo.phone.substring(0, 3) + "****" + userInfo.phone.substring(7));
        }

        // 生成用户ID（使用手机号或显示名称的哈希）
        if (userInfo.phone) {
            userInfo.userId = "pdd_" + userInfo.phone;
        } else if (userInfo.displayName) {
            userInfo.userId = "pdd_" + userInfo.displayName;
        } else {
            userInfo.userId = "pdd_unknown_" + Date.now();
        }

        if (userInfo.displayName || userInfo.phone) {
            logger.addLog(window, "成功提取用户信息");
            return userInfo;
        } else {
            logger.addLog(window, "未能提取到有效的用户信息");
            return null;
        }

    } catch (e) {
        logger.addLog(window, "提取用户信息失败: " + e.message);
        return null;
    }
};

/**
 * 提取收件人信息
 * @param {Object} window 悬浮窗对象
 * @returns {Object|null} 收件人信息对象
 */
UserInfo.prototype.extractRecipientInfo = function(window) {
    try {
        logger.addLog(window, "正在提取收件人信息...");

        var recipientInfo = {
            name: null,
            phone: null,
            address: null,
            isDefault: false
        };

        // 等待页面加载
        sleep(2000);

        // 使用您提供的方法查找默认地址
        logger.addLog(window, "查找默认地址...");

        try {
            // 首先尝试直接查找完整地址文本
            logger.addLog(window, "尝试直接查找完整地址...");

            // 查找RecyclerView容器
            var recyclerView = id("pdd").className("android.support.v7.widget.RecyclerView").findOne(3000);
            if (!recyclerView) {
                // 尝试其他可能的容器
                recyclerView = className("android.support.v7.widget.RecyclerView").findOne(3000);
            }

            if (recyclerView) {
                logger.addLog(window, "找到地址列表容器");
                var children = recyclerView.children();

                for (var i = 0; i < children.length; i++) {
                    var child = children[i];

                    // 查找包含"已设默认"的项目
                    var defaultTarget = child.findOne(className("android.widget.TextView").text("已设默认"));
                    if (defaultTarget) {
                        logger.addLog(window, "找到默认地址项");
                        recipientInfo.isDefault = true;

                        // 在这个子项中查找所有TextView
                        var textViews = child.find(className("android.widget.TextView"));
                        var allTexts = []; // 收集所有文本用于分析

                        // 首先收集所有文本
                        for (var j = 0; j < textViews.length; j++) {
                            var textView = textViews[j];
                            var text = textView.text();

                            if (text && text.length > 0 && text !== "已设默认") {
                                allTexts.push(text);
                                logger.addLog(window, "发现文本: " + text);
                            }
                        }

                        // 分析收集到的文本
                        for (var j = 0; j < allTexts.length; j++) {
                            var text = allTexts[j];

                            // 提取姓名（通常是较短的中文名字，2-10个字符）
                            if (!recipientInfo.name && text.length >= 2 && text.length <= 10) {
                                var namePattern = /^[\u4e00-\u9fa5a-zA-Z]{2,10}$/;
                                if (namePattern.test(text) && text.indexOf("省") === -1 && text.indexOf("市") === -1 && text.indexOf("区") === -1) {
                                    recipientInfo.name = text;
                                    logger.addLog(window, "找到收件人姓名: " + text);
                                    continue;
                                }
                            }

                            // 提取手机号
                            if (!recipientInfo.phone) {
                                var phonePattern = /1[3-9]\d{9}/;
                                var phoneMatch = text.match(phonePattern);
                                if (phoneMatch) {
                                    recipientInfo.phone = phoneMatch[0];
                                    logger.addLog(window, "找到手机号: " + recipientInfo.phone.substring(0, 3) + "****" + recipientInfo.phone.substring(7));
                                    continue;
                                }
                            }

                            // 提取地址（检查是否包含地址关键词）
                            if (text.length > 5) {
                                var addressKeywords = ["省", "市", "区", "县", "镇", "街道", "路", "号", "小区", "村", "栋", "单元", "室"];
                                var hasAddressKeyword = false;
                                for (var k = 0; k < addressKeywords.length; k++) {
                                    if (text.indexOf(addressKeywords[k]) !== -1) {
                                        hasAddressKeyword = true;
                                        break;
                                    }
                                }

                                if (hasAddressKeyword) {
                                    // 如果已经有地址，比较长度，保留更长的
                                    if (!recipientInfo.address || text.length > recipientInfo.address.length) {
                                        recipientInfo.address = text;
                                        logger.addLog(window, "找到地址: " + text);
                                    }
                                }
                            }
                        }

                        // 如果还没找到完整地址，尝试组合多个包含地址关键词的文本
                        if (!recipientInfo.address) {
                            var addressParts = [];
                            for (var j = 0; j < allTexts.length; j++) {
                                var text = allTexts[j];
                                var addressKeywords = ["省", "市", "区", "县", "镇", "街道", "路", "号", "小区", "村", "栋", "单元", "室"];
                                for (var k = 0; k < addressKeywords.length; k++) {
                                    if (text.indexOf(addressKeywords[k]) !== -1) {
                                        addressParts.push(text);
                                        break;
                                    }
                                }
                            }

                            if (addressParts.length > 0) {
                                recipientInfo.address = addressParts.join(" ");
                                logger.addLog(window, "组合地址: " + recipientInfo.address);
                            }
                        }

                        // 如果地址信息不完整，尝试查找完整地址
                        if (!recipientInfo.address || recipientInfo.address.length < 20) {
                            logger.addLog(window, "尝试查找完整地址文本...");

                            // 查找所有可能的完整地址文本
                            var allTextViews = child.find(className("android.widget.TextView"));
                            var longestAddress = recipientInfo.address || "";

                            for (var k = 0; k < allTextViews.length; k++) {
                                var textView = allTextViews[k];
                                var text = textView.text();

                                if (text && text.length > 15) {
                                    // 检查是否是完整地址（包含多个地址关键词）
                                    var addressKeywords = ["省", "市", "区", "县", "镇", "街道", "路", "号", "小区", "村", "栋", "单元", "室"];
                                    var keywordCount = 0;
                                    for (var l = 0; l < addressKeywords.length; l++) {
                                        if (text.indexOf(addressKeywords[l]) !== -1) {
                                            keywordCount++;
                                        }
                                    }

                                    // 如果包含多个地址关键词且比当前地址更长，则使用这个
                                    if (keywordCount >= 2 && text.length > longestAddress.length) {
                                        longestAddress = text;
                                        logger.addLog(window, "找到更完整的地址: " + text);
                                    }
                                }
                            }

                            if (longestAddress.length > 0) {
                                recipientInfo.address = longestAddress;
                            }
                        }

                        // 如果地址信息不完整，尝试查找完整地址
                        if (!recipientInfo.address || recipientInfo.address.length < 20) {
                            logger.addLog(window, "尝试查找完整地址文本...");

                            // 查找所有可能的完整地址文本
                            var allTextViews = child.find(className("android.widget.TextView"));
                            var longestAddress = recipientInfo.address || "";

                            for (var k = 0; k < allTextViews.length; k++) {
                                var textView = allTextViews[k];
                                var text = textView.text();

                                if (text && text.length > 15) {
                                    // 检查是否是完整地址（包含多个地址关键词）
                                    var addressKeywords = ["省", "市", "区", "县", "镇", "街道", "路", "号", "小区", "村", "栋", "单元", "室"];
                                    var keywordCount = 0;
                                    for (var l = 0; l < addressKeywords.length; l++) {
                                        if (text.indexOf(addressKeywords[l]) !== -1) {
                                            keywordCount++;
                                        }
                                    }

                                    // 如果包含多个地址关键词且比当前地址更长，则使用这个
                                    if (keywordCount >= 2 && text.length > longestAddress.length) {
                                        longestAddress = text;
                                        logger.addLog(window, "找到更完整的地址: " + text);
                                    }
                                }
                            }

                            if (longestAddress.length > 0) {
                                recipientInfo.address = longestAddress;
                            }
                        }

                        // 找到默认地址后就退出循环
                        break;
                    }
                }
            } else {
                logger.addLog(window, "未找到地址列表容器，尝试其他方法");
            }

            // 如果还没有获取到完整地址，尝试直接查找长地址文本
            if (!recipientInfo.address || recipientInfo.address.length < 20) {
                logger.addLog(window, "尝试直接查找完整地址文本...");

                // 查找所有长文本的TextView
                var longTextViews = className("android.widget.TextView").find();
                var bestAddress = recipientInfo.address || "";

                for (var i = 0; i < longTextViews.length; i++) {
                    var textView = longTextViews[i];
                    var text = textView.text();

                    if (text && text.length > 20) {
                        // 检查是否包含完整地址的特征
                        var hasProvince = text.indexOf("省") !== -1 || text.indexOf("市") !== -1;
                        var hasDistrict = text.indexOf("区") !== -1 || text.indexOf("县") !== -1;
                        var hasDetail = text.indexOf("路") !== -1 || text.indexOf("街") !== -1 || text.indexOf("号") !== -1;

                        if (hasProvince && hasDistrict && hasDetail && text.length > bestAddress.length) {
                            bestAddress = text;
                            logger.addLog(window, "找到候选完整地址: " + text);
                        }
                    }
                }

                if (bestAddress.length > 0) {
                    recipientInfo.address = bestAddress;
                    logger.addLog(window, "使用最佳地址: " + bestAddress);
                }
            }

            if (!recipientInfo.address) {
                logger.addLog(window, "未找到地址列表容器，尝试其他方法");

                // 备用方法：直接查找包含"已设默认"的元素
                var defaultElement = text("已设默认").findOne(3000);
                if (defaultElement) {
                    logger.addLog(window, "找到默认地址标识");
                    recipientInfo.isDefault = true;

                    // 查找父容器中的所有TextView
                    var parent = defaultElement.parent();
                    if (parent) {
                        var textViews = parent.find(className("android.widget.TextView"));

                        for (var i = 0; i < textViews.length; i++) {
                            var textView = textViews[i];
                            var text = textView.text();

                            if (!text || text.length === 0 || text === "已设默认") continue;

                            // 提取信息的逻辑与上面相同
                            if (!recipientInfo.name && text.length >= 2 && text.length <= 10) {
                                var namePattern = /^[\u4e00-\u9fa5a-zA-Z]{2,10}$/;
                                if (namePattern.test(text) && text.indexOf("省") === -1 && text.indexOf("市") === -1 && text.indexOf("区") === -1) {
                                    recipientInfo.name = text;
                                    logger.addLog(window, "找到收件人姓名: " + text);
                                    continue;
                                }
                            }

                            if (!recipientInfo.phone) {
                                var phonePattern = /1[3-9]\d{9}/;
                                var phoneMatch = text.match(phonePattern);
                                if (phoneMatch) {
                                    recipientInfo.phone = phoneMatch[0];
                                    logger.addLog(window, "找到手机号: " + recipientInfo.phone.substring(0, 3) + "****" + recipientInfo.phone.substring(7));
                                    continue;
                                }
                            }

                            if (!recipientInfo.address && text.length > 10) {
                                var addressKeywords = ["省", "市", "区", "县", "镇", "街道", "路", "号", "小区", "村"];
                                var hasAddressKeyword = false;
                                for (var j = 0; j < addressKeywords.length; j++) {
                                    if (text.indexOf(addressKeywords[j]) !== -1) {
                                        hasAddressKeyword = true;
                                        break;
                                    }
                                }

                                if (hasAddressKeyword) {
                                    recipientInfo.address = text;
                                    logger.addLog(window, "找到地址: " + text);
                                }
                            }
                        }
                    }
                }
            }
        } catch (e) {
            logger.addLog(window, "查找默认地址时出错: " + e.message);
        }

        // 验证是否获取到必要信息
        if (recipientInfo.name && recipientInfo.phone && recipientInfo.address) {
            logger.addLog(window, "成功提取收件人信息");
            return recipientInfo;
        } else {
            logger.addLog(window, "收件人信息不完整");
            logger.addLog(window, "姓名: " + (recipientInfo.name || "未获取"));
            logger.addLog(window, "手机: " + (recipientInfo.phone ? "已获取" : "未获取"));
            logger.addLog(window, "地址: " + (recipientInfo.address ? "已获取" : "未获取"));
            return recipientInfo; // 即使不完整也返回，让调用者决定如何处理
        }

    } catch (e) {
        logger.addLog(window, "提取收件人信息失败: " + e.message);
        return null;
    }
};

/**
 * 获取缓存的用户信息
 * @returns {Object|null} 缓存的用户信息
 */
UserInfo.prototype.getCachedUser = function() {
    return this.currentUser;
};

/**
 * 获取缓存的收件人信息
 * @returns {Object|null} 缓存的收件人信息
 */
UserInfo.prototype.getCachedRecipientInfo = function() {
    return this.recipientInfo;
};

/**
 * 获取完整的手机号（不带星号）
 * @returns {string|null} 完整的手机号
 */
UserInfo.prototype.getFullPhoneNumber = function() {
    if (this.recipientInfo && this.recipientInfo.phone) {
        return this.recipientInfo.phone;
    }
    return null;
};

/**
 * 获取完整的地址信息
 * @returns {string|null} 完整的地址
 */
UserInfo.prototype.getFullAddress = function() {
    if (this.recipientInfo && this.recipientInfo.address) {
        return this.recipientInfo.address;
    }
    return null;
};

/**
 * 清除缓存的信息
 */
UserInfo.prototype.clearCache = function() {
    this.currentUser = null;
    this.recipientInfo = null;
};

/**
 * 获取完整的用户信息（包括账号和收件人信息）
 * @param {Object} window 悬浮窗对象
 * @returns {Object|null} 完整的用户信息对象
 */
UserInfo.prototype.getCompleteUserInfo = function(window) {
    try {
        logger.addLog(window, "开始获取完整用户信息...");

        var userInfo = this.getCurrentUser(window);
        if (!userInfo) {
            logger.addLog(window, "无法获取用户账号信息");
            return null;
        }

        var recipientInfo = this.getRecipientInfo(window);
        if (!recipientInfo) {
            logger.addLog(window, "无法获取收件人信息");
            return userInfo; // 返回部分信息
        }

        // 合并信息
        var completeInfo = {
            user: userInfo,
            recipient: recipientInfo,
            timestamp: Date.now()
        };

        logger.addLog(window, "成功获取完整用户信息");
        console.log("完整用户信息: " + JSON.stringify(completeInfo) );
        return completeInfo;

    } catch (e) {
        logger.addLog(window, "获取完整用户信息失败: " + e.message);
        return null;
    }
};

module.exports = UserInfo;
