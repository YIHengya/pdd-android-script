// 测试价格区间功能
// 这个文件用于测试新的价格区间功能是否正常工作

// 引入必要的模块
const FloatingMenu = require('./ui/floating-menu.js');

// 创建悬浮菜单实例
var floatingMenu = new FloatingMenu();

// 测试价格区间显示
function testPriceRangeDisplay() {
    console.log("=== 测试价格区间显示功能 ===");
    
    // 创建菜单窗口
    var window = floatingMenu.create();
    
    // 显示菜单
    floatingMenu.show(100, 100);
    
    // 测试价格区间更新
    setTimeout(function() {
        console.log("测试价格区间更新...");
        floatingMenu.updatePriceRangeDisplay(0.5, 1.2);
        
        setTimeout(function() {
            floatingMenu.updatePriceRangeDisplay(0.8, 1.5);
            
            setTimeout(function() {
                floatingMenu.updatePriceRangeDisplay(0.3, 0.9);
                console.log("价格区间显示测试完成");
            }, 2000);
        }, 2000);
    }, 2000);
}

// 测试价格区间验证
function testPriceRangeValidation() {
    console.log("=== 测试价格区间验证功能 ===");
    
    // 测试用例
    var testCases = [
        { min: 0.5, max: 1.0, expected: true },   // 正常区间
        { min: 1.0, max: 0.5, expected: false },  // 最小值大于最大值
        { min: 0, max: 1.0, expected: true },     // 最小值为0
        { min: 0.5, max: 0.5, expected: false },  // 最小值等于最大值
        { min: -0.1, max: 1.0, expected: false }, // 负数价格
    ];
    
    testCases.forEach(function(testCase, index) {
        var isValid = testCase.min >= 0 && testCase.max > 0 && testCase.min < testCase.max;
        var result = isValid === testCase.expected ? "✅ 通过" : "❌ 失败";
        console.log("测试用例 " + (index + 1) + ": " + testCase.min + "-" + testCase.max + " " + result);
    });
}

// 测试价格区间转换
function testPriceRangeConversion() {
    console.log("=== 测试价格区间转换功能 ===");
    
    // 测试滑动条进度值转换为价格
    var testProgressValues = [0, 25, 50, 75, 100];
    
    testProgressValues.forEach(function(progress) {
        var price = 0.1 + (progress / 100.0) * 1.9;
        console.log("进度值 " + progress + " -> 价格 " + price.toFixed(2) + " 元");
    });
}

// 主测试函数
function runTests() {
    console.log("开始测试价格区间功能...");
    
    try {
        testPriceRangeValidation();
        testPriceRangeConversion();
        
        // UI测试需要在UI线程中运行
        if (typeof ui !== 'undefined') {
            ui.run(function() {
                testPriceRangeDisplay();
            });
        } else {
            console.log("UI环境不可用，跳过UI测试");
        }
        
        console.log("所有测试完成！");
        
    } catch (e) {
        console.error("测试过程中出现错误: " + e.message);
    }
}

// 如果直接运行此文件，执行测试
if (typeof module === 'undefined' || require.main === module) {
    runTests();
}

// 导出测试函数
if (typeof module !== 'undefined') {
    module.exports = {
        runTests: runTests,
        testPriceRangeDisplay: testPriceRangeDisplay,
        testPriceRangeValidation: testPriceRangeValidation,
        testPriceRangeConversion: testPriceRangeConversion
    };
}
