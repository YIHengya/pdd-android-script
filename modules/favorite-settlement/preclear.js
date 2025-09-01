const { GlobalStopManager } = require('../../utils/common.js');
const logger = require('../../utils/logger.js');

function preClearSelections(window) {
	logger.addLog(window, "=== 预处理：清空已选 ===");
	try {
		if (GlobalStopManager.isStopRequested()) {
			return false;
		}

		// 查找“已选”按钮
		var selectedButton = className("android.widget.TextView").textContains("已选").findOne(1500);
		if (!selectedButton) {
			selectedButton = className("android.widget.TextView").textMatches(/已选\d*款?/).findOne(1500);
		}
		if (!selectedButton) {
			var bottomBar = id("com.xunmeng.pinduoduo:id/bnh").findOne(1500);
			if (bottomBar) {
				var buttons = bottomBar.find(className("android.widget.TextView"));
				for (var i = 0; i < buttons.size(); i++) {
					var btn = buttons.get(i);
					if (btn && btn.text() && btn.text().indexOf("已选") >= 0) {
						selectedButton = btn;
						break;
					}
				}
			}
		}

		if (!selectedButton) {
			logger.addLog(window, "未找到“已选”按钮，跳过预清空");
			return false;
		}

		// 如果显示“已选0”，则无需清空，直接回顶
		var selText = selectedButton.text() || "";
		var countMatch = selText.match(/已选\s*(\d+)/);
		if (countMatch && parseInt(countMatch[1]) === 0) {
			logger.addLog(window, "当前为“已选0”，无需清空");
			this.scrollToTop(window);
			logger.addLog(window, "预处理完成：已回到顶部");
			return true;
		}

		var selBounds = selectedButton.bounds();
		click(selBounds.centerX(), selBounds.centerY());
		logger.addLog(window, "已点击“已选”按钮");
		sleep(1500);

		if (GlobalStopManager.isStopRequested()) {
			return false;
		}

		// 点击“清空选择”
		var clearBtn = textContains("清空选择").clickable(true).findOne(2000);
		if (!clearBtn) {
			clearBtn = textContains("清空选择").findOne(2000);
		}
		if (clearBtn) {
			var cb = clearBtn.bounds();
			click(cb.centerX(), cb.centerY());
			logger.addLog(window, "已点击“清空选择”");
			sleep(800);
		} else {
			logger.addLog(window, "未找到“清空选择”按钮");
		}

		// 检测底部“已选0款”，确认已清空；然后回到顶部
		sleep(1000);
		var zeroSelected = className("android.widget.TextView").textMatches(/已选\s*0款?/).findOne(1500) || className("android.widget.TextView").textContains("已选0").findOne(1500);
		if (zeroSelected) {
			logger.addLog(window, "已清空选择：检测到“已选0款”");
		} else {
			logger.addLog(window, "未检测到“已选0款”，仍返回顶部");
		}
		this.scrollToTop(window);
		logger.addLog(window, "预清空完成，已回到顶部");
		return true;
	} catch (e) {
		logger.addLog(window, "预清空已选时出错: " + e.message);
		logger.debug("错误堆栈: " + e.stack);
		return false;
	}
}

function scrollToTop(window) {
	logger.debug("滚动回列表顶部");
	var scrollView = className("android.support.v7.widget.RecyclerView").scrollable(true).findOne(3000);
	if (!scrollView) {
		logger.addLog(window, "未找到可滚动的列表视图");
		return;
	}

	// 使用向下滑动手势回到顶部，避免方向反转问题
	var deviceInfo = this.getDeviceInfo();
	var centerX = Math.floor(deviceInfo.width * 0.5);
	var startY = Math.floor(deviceInfo.height * 0.28);
	var endY = Math.floor(deviceInfo.height * 0.78);

	var scrollCount = 0;
	var maxScrolls = 12; // 最大滚动次数
	var stableCount = 0; // 连续稳定（无明显位移）计数
	var lastTop = -1;

	while (scrollCount < maxScrolls && stableCount < 2 && !GlobalStopManager.isStopRequested()) {
		var firstChild = scrollView.childCount() > 0 ? scrollView.child(0) : null;
		var beforeTop = firstChild ? firstChild.bounds().top : -1;

		// 向下滑动（手指从上往下），使内容回退到列表顶部
		gesture(500, [centerX, startY], [centerX, endY]);
		sleep(500);

		var newFirstChild = scrollView.childCount() > 0 ? scrollView.child(0) : null;
		var afterTop = newFirstChild ? newFirstChild.bounds().top : -1;

		if (beforeTop >= 0 && afterTop >= 0 && Math.abs(afterTop - beforeTop) < 4) {
			stableCount++;
		} else {
			stableCount = 0;
		}

		if (afterTop >= 0 && lastTop >= 0 && Math.abs(afterTop - lastTop) < 4) {
			stableCount++;
		}

		lastTop = afterTop;
		scrollCount++;
	}

	logger.debug("已滚动回列表顶部，共滚动 " + scrollCount + " 次");
}

module.exports = {
	preClearSelections,
	scrollToTop
}; 