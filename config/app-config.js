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
    defaultTargetPrice: 0.8,

    // 默认价格区间
    defaultPriceRange: {
        min: 0.5,
        max: 1.0
    },
    
    // 最大滚动次数
    maxScrolls: 10,
    
    // 最大返回次数
    maxRetries: 10,
    
    // 等待时间配置（毫秒）
    waitTimes: {
        appLaunch: 4000,        // 启动应用等待时间
        pageLoad: 3000,         // 页面加载等待时间
        elementFind: 2000,      // 查找元素等待时间
        click: 2000,            // 点击后等待时间
        scroll: 2000,           // 滚动后等待时间
        payment: 5000,          // 支付页面等待时间
        back: 2000              // 返回操作等待时间
    },
    
    // 价格匹配正则表达式
    pricePatterns: [
        /¥\s*\d+\.?\d*/,
        /￥\s*\d+\.?\d*/,
        /\d+\.\d+/,
        /\d+元/
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
