const logger = require('../../utils/logger.js');

function checkAndClosePopup(window) {
	logger.debug("检查是否出现规格选择弹窗...");
	sleep(1000);
	
	var deviceInfo = this.getDeviceInfo();
	var screenWidth = deviceInfo.width;
	var screenHeight = deviceInfo.height;
	
	var detected = textMatches(/(请选择|规格|颜色|尺码|型号|款式)/).findOne(800);
	if (detected) {
		logger.addLog(window, "检测到规格/选择弹窗，优先点击顶部空白关闭");
		var topBlankX = Math.floor(screenWidth * 0.5);
		var topBlankY = Math.floor(screenHeight * 0.12);
		click(topBlankX, topBlankY);
		sleep(800);
		if (!textMatches(/(请选择|规格|颜色|尺码|型号|款式)/).findOne(500)) {
			return true;
		}
	}
	
	var closeBtn = text("关闭弹窗").findOne(1500);
	
	if (closeBtn) {
		logger.addLog(window, "检测到规格选择弹窗，准备关闭");
		var closeBounds = closeBtn.bounds();
		click(closeBounds.centerX(), closeBounds.centerY());
		logger.addLog(window, "已关闭规格选择弹窗");
		sleep(1000);
		return true;
	}
	
	var possibleCloseBtn = id("com.xunmeng.pinduoduo:id/aqj").findOne(1000);
	if (possibleCloseBtn) {
		logger.addLog(window, "检测到可能的弹窗，尝试关闭");
		var closeBounds2 = possibleCloseBtn.bounds();
		click(closeBounds2.centerX(), closeBounds2.centerY());
		logger.addLog(window, "已尝试关闭弹窗");
		sleep(1000);
		return true;
	}
	
	if (textMatches(/(请选择|规格|颜色|尺码|型号|款式)/).findOne(800)) {
		var topBlankX2 = Math.floor(screenWidth * 0.5);
		var topBlankY2 = Math.floor(screenHeight * 0.12);
		click(topBlankX2, topBlankY2);
		sleep(800);
		if (!textMatches(/(请选择|规格|颜色|尺码|型号|款式)/).findOne(500)) {
			return true;
		}
		var topRightX = screenWidth * 0.95;
		var topRightY = screenHeight * 0.1;
		logger.addLog(window, "顶部空白未能关闭，尝试点击右上角");
		click(topRightX, topRightY);
		sleep(1000);
		return true;
	}
	
	return false;
}

module.exports = {
	checkAndClosePopup
}; 