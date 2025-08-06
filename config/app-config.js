// 应用配置模块
// 存储应用的配置信息

/**
 * 拼多多应用配置
 */
const PDD_CONFIG = {
    // 可能的拼多多包名（只保留实际存在的）
    packageNames: [
        "com.xunmeng.pinduoduo"         // 官方拼多多
    ],

    // 应用名称（只保留实际存在的）
    appNames: [
        "拼多多"
    ],
    
    // 默认目标价格（保持向后兼容）
    defaultTargetPrice: 0.65,

    // 默认价格区间
    defaultPriceRange: {
        min: 0.5,
        max: 1.0
    },
    
    // 最大滚动次数
    maxScrolls: 10000,
    
    // 最大返回次数
    maxRetries: 10,
    
    // 等待时间配置（毫秒）
    waitTimes: {
        // 基础操作等待时间
        appLaunch: 4000,        // 启动应用等待时间
        pageLoad: 3000,         // 页面加载等待时间
        elementFind: 2000,      // 查找元素等待时间
        click: 2000,            // 点击后等待时间
        scroll: 2000,           // 滚动后等待时间
        payment: 5000,          // 支付页面等待时间
        back: 2000,             // 返回操作等待时间

        // 扩展等待时间类型
        veryShort: 300,         // 极短等待时间
        short: 500,             // 短等待时间
        mediumShort: 1000,      // 中短等待时间
        medium: 1500,           // 中等等待时间
        mediumLong: 2500,       // 中长等待时间
        long: 3000,             // 长等待时间
        veryLong: 5000,         // 极长等待时间

        // 特定场景等待时间
        retryInterval: 2000,    // 重试间隔
        pageStable: 1000,       // 页面稳定等待
        animation: 800,         // 动画等待
        networkRequest: 3000,   // 网络请求等待
        userReaction: 1200,     // 用户操作反应时间
        verification: 3000,     // 验证等待时间
        specification: 1500,    // 规格选择等待时间
        favorite: 1500          // 收藏操作等待时间
    },

    // 等待时间倍率配置
    speedMultiplier: {
        default: 1.0,           // 默认倍率
        min: 0.1,               // 最小倍率（最慢）
        max: 5.0,               // 最大倍率（最快）
        presets: {
            debug: 0.1,         // 调试模式（极慢）
            slow: 0.5,          // 慢速模式
            normal: 1.0,        // 正常模式
            fast: 2.0,          // 快速模式
            turbo: 5.0          // 极速模式
        }
    },
    
    // 价格匹配正则表达式
    pricePatterns: [
        /¥\s*\d+\.?\d*/,
        /￥\s*\d+\.?\d*/,
        /^\d+\.\d+$/,           // 只匹配纯数字.数字格式（整个文本）
        /\d+元/,
        /\d+\.\d+元/            // 匹配带元的小数价格
    ],
    
    // 购买按钮文本
    buyButtons: [
        "免拼购买",
        "立即购买", 
        "现在购买",
        "马上购买",
        "立即下单",
        "去购买",
        "购买"
    ],
    
    // 支付按钮文本
    payButtons: [
        "立即支付",
        "确认支付",
        "去支付",
        "支付",
        "提交订单",
        "确认下单"
    ],

    // 收藏按钮文本
    favoriteButtons: [
        "收藏",
        "加入收藏",
        "收藏商品",
        "♡",
        "❤",
        "🤍",
        "♥"
    ],

    // 支付按钮点击偏移配置
    paymentClickOffset: {
        // 基于"更换支付方式"按钮的Y轴偏移量（向下偏移）
        yOffset: 100
    },
    
    // 主页标识元素
    homeIndicators: [
        "首页",
        "搜索", 
        "拼多多"
    ]
};

/**
 * API配置
 */
const API_CONFIG = {
    // 下单预检查API地址
    orderCheckUrl: "http://222.186.21.30:50357/orders",

    // 请求超时时间（毫秒）
    requestTimeout: 10000,

    // 请求重试次数
    maxRetries: 3
};

/**
 * 通用配置
 */
const COMMON_CONFIG = {
    // 日志最大行数
    maxLogLines: 20,

    // 悬浮窗位置
    floatingWindow: {
        x: 50,
        y: 100
    },

    // 元素查找超时时间
    findTimeout: 2000,

    // 脚本保持运行间隔
    keepAliveInterval: 1000
};

module.exports = {
    PDD_CONFIG,
    API_CONFIG,
    COMMON_CONFIG
};
