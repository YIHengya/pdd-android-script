const logger = require('../../utils/logger.js');
const { GlobalStopManager } = require('../../utils/common.js');

function autoSelectFavoriteProducts(window) {
	logger.addLog(window, "开始自动下滑选择商品...");
	var deviceInfo = this.getDeviceInfo();
	var noNewCount = 0;
	var maxNoNewScrolls = 3;
	var scrollCount = 0;
	var emptyPageCount = 0;
	
	function performSmartScroll(di) {
		var startY = Math.floor(di.height * 0.78);
		var endY = Math.floor(di.height * 0.28);
		var x = Math.floor(di.width * 0.5);
		logger.debug("滑动: (" + x + "," + startY + ") -> (" + x + "," + endY + ")");
		gesture(600, [x, startY], [x, endY]);
	}
	
	var selectProducts = function(list, selectAll) {
		var clickCount = 0;
		for (var i = 0; i < list.length; i++) {
			var p = list[i];
			var sig = p.签名;
			if (!sig) continue;
			if (this.selectedSignatures.has(sig) || p.已选中) {
				this.selectedSignatures.add(sig);
				continue;
			}
			var titlePreview = p.商品信息.标题 || "";
			if (titlePreview.length > 20) titlePreview = titlePreview.substring(0, 20) + "...";
			logger.addLog(window, "点击: " + titlePreview + " | 店铺: " + (p.商品信息.店铺 || ""));
			click(p.选择按钮中心.x, p.选择按钮中心.y);
			sleep(500);
			this.selectedSignatures.add(sig);
			clickCount++;
			if (!selectAll && clickCount >= 3) {
				logger.debug("非全选模式达到上限 3 次点击");
				break;
			}
			sleep(250);
		}
		logger.addLog(window, "本轮新点击: " + clickCount);
		return clickCount;
	}.bind(this);
	
	while (noNewCount < maxNoNewScrolls && !GlobalStopManager.isStopRequested()) {
		logger.addLog(window, "\n第 " + (scrollCount + 1) + " 次处理");
		var list = this.getProductItemsFromUI(window);
		if (!list || list.length === 0) {
			emptyPageCount++;
			logger.debug("空页，计数=" + emptyPageCount);
			if (emptyPageCount >= 2) {
				logger.addLog(window, "连续空页，结束");
				break;
			}
		} else {
			emptyPageCount = 0;
		}
		var fresh = [];
		for (var i = 0; i < list.length; i++) {
			var sig = list[i].签名;
			if (!sig) continue;
			if (!this.processedSignatures.has(sig)) {
				fresh.push(list[i]);
			}
		}
		logger.addLog(window, "本次采集: " + list.length + "  新增未处理: " + fresh.length);
		for (var k = 0; k < fresh.length; k++) {
			this.processedSignatures.add(fresh[k].签名);
		}
		selectProducts(fresh, true);
		var currentBottomSignature = list.length > 0 ? list[list.length - 1].签名 : null;
		if (fresh.length === 0) {
			if (currentBottomSignature && currentBottomSignature === this.lastBottomSignature) {
				logger.debug("底部签名未变化");
			}
			noNewCount++;
		} else {
			noNewCount = 0;
		}
		this.lastBottomSignature = currentBottomSignature;
		scrollCount++;
		if (noNewCount >= maxNoNewScrolls) {
			logger.addLog(window, "连续 " + noNewCount + " 次无新增，结束");
			break;
		}
		performSmartScroll(deviceInfo);
		sleep(1200);
	}
	logger.addLog(window, "自动勾选完成");
	logger.addLog(window, "总滚动次数: " + scrollCount);
	logger.addLog(window, "唯一商品数(签名): " + this.processedSignatures.size);
	logger.addLog(window, "已选中数: " + this.selectedSignatures.size);
	return [];
}

module.exports = {
	autoSelectFavoriteProducts
}; 