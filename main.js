// 通过坐标点击"请选择款式"按钮
var styleBtn = text("请选择款式").findOne(3000);
if (styleBtn) {
    var bounds = styleBtn.bounds();
    var centerX = bounds.centerX();
    var centerY = bounds.centerY();
    console.log("点击坐标: (" + centerX + ", " + centerY + ")");
    click(centerX, centerY);
} else {
    console.log("未找到'请选择款式'按钮");
}
