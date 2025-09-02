const logger = require('../../utils/logger.js');
const { GlobalStopManager } = require('../../utils/common.js');
const { waitTimeManager } = require('../../utils/wait-time-manager.js');

function filterSelectedProducts(window) {
	logger.addLog(window, "=== 开始处理\"已选\"功能 ===");
	
	try {
		var selectedButton = null;
		selectedButton = className("android.widget.TextView").textContains("已选").findOne(2000);
		if (!selectedButton) {
			selectedButton = className("android.widget.TextView").textMatches(/已选\d*款?/).findOne(2000);
		}
		if (!selectedButton) {
			var bottomBar = id("com.xunmeng.pinduoduo:id/bnh").findOne(2000);
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
			logger.addLog(window, "未找到\"已选\"按钮");
			return false;
		}
		
		logger.addLog(window, "找到\"已选\"按钮：" + selectedButton.text());
		
		var bounds = selectedButton.bounds();
		click(bounds.centerX(), bounds.centerY());
		logger.addLog(window, "已点击\"已选\"按钮");
		
		waitTimeManager.wait(2000);
		
		if (GlobalStopManager.isStopRequested()) {
			logger.addLog(window, "检测到停止信号，终止价格筛选流程");
			return false;
		}
		
		var clearButton = textContains("清空选择").findOne(2000);
		if (clearButton) {
			logger.addLog(window, "✅ 确认商品选择页面已成功打开，找到\"清空选择\"按钮");
			var selectedTitleText = className("android.widget.TextView").textMatches(/已选\d+款商品/).findOne(1000);
			if (selectedTitleText) {
				logger.addLog(window, "📦 " + selectedTitleText.text());
			}
			this.processProducts(window);
		} else {
			logger.addLog(window, "❌ 未检测到\"清空选择\"按钮，商品选择页面可能未成功打开");
			click(bounds.centerX(), bounds.centerY());
			waitTimeManager.wait(2000);
			clearButton = textContains("清空选择").findOne(2000);
			if (clearButton) {
				logger.addLog(window, "✅ 第二次尝试成功，商品选择页面已打开");
				this.processProducts(window);
			} else {
				logger.addLog(window, "❌ 第二次尝试失败，无法打开商品选择页面");
			}
		}
		
		logger.addLog(window, "已选功能处理完成");
		return true;
	} catch (e) {
		logger.addLog(window, "处理\"已选\"功能时出错: " + e.message);
		logger.debug("错误堆栈: " + e.stack);
		return false;
	}
}

function processProducts(window) {
	logger.addLog(window, "=== 开始处理商品列表 ===");
	var priceThreshold = this.config.PRICE_THRESHOLD || 0.8;
	var totalRemovedCount = 0;
	
	for (var round = 1; round <= 2; round++) {
		if (GlobalStopManager.isStopRequested()) {
			logger.addLog(window, "检测到停止信号，终止价格筛选流程");
			break;
		}
		
		logger.addLog(window, "=== 开始第 " + round + " 轮删除 ===");
		var removedCount = this.processProductsOnce(window, priceThreshold);
		totalRemovedCount += removedCount;
		logger.addLog(window, "第 " + round + " 轮删除完成，本轮删除 " + removedCount + " 个商品");
		
		if (removedCount == 0 && round == 1) {
			logger.addLog(window, "第一轮未删除任何商品，无需进行第二轮");
			break;
		}
		
		if (round == 1) {
			logger.addLog(window, "准备第二轮删除，先滚动回顶部...");
			this.scrollToTop(window);
			waitTimeManager.wait(1500);
		}
	}
	
	logger.addLog(window, "=== 商品处理完成，共删除 " + totalRemovedCount + " 个价格超过" + priceThreshold + "元的商品 ===");
	return totalRemovedCount;
}

function processProductsOnce(window, priceThreshold) {
	var removedCount = 0;
	var scrollView = className("android.support.v7.widget.RecyclerView").scrollable(true).findOne(3000);
	if (!scrollView) {
		logger.addLog(window, "未找到可滚动的商品列表视图");
		return 0;
	}
	
	var scrollCount = 0;
	var maxScrolls = 20;
	var keepScrolling = true;
	var processedTitles = new Set();
	
	while (keepScrolling && scrollCount < maxScrolls && !GlobalStopManager.isStopRequested()) {
		var itemFrames = scrollView.find(className("android.widget.FrameLayout"));
		logger.debug("找到 " + itemFrames.size() + " 个商品项");
		
		if (itemFrames.size() == 0) {
			logger.debug("未发现商品，向下滚动...");
			scrollView.scrollForward();
			scrollCount++;
			waitTimeManager.wait(1000);
			continue;
		}
		
		var foundDeleteTarget = false;
		
		for (var i = 0; i < itemFrames.size(); i++) {
			if (GlobalStopManager.isStopRequested()) {
				logger.addLog(window, "检测到停止信号，中断价格筛选流程");
				return removedCount;
			}
			
			var itemFrame = itemFrames.get(i);
			var title = "";
			var titleTexts = itemFrame.find(className("android.widget.TextView"));
			if (titleTexts.size() > 0) {
				title = titleTexts.get(0).text();
				if (title && title.length > 10) {
					var shortTitle = title.substring(0, 10);
					if (processedTitles.has(shortTitle)) {
						continue;
					}
					processedTitles.add(shortTitle);
				}
			}
			
			var priceSymbols = itemFrame.find(className("android.widget.TextView").text("¥"));
			if (priceSymbols.size() > 0) {
				var priceSymbol = priceSymbols.get(0);
				var symbolBounds = priceSymbol.bounds();
				
				var priceTexts = itemFrame.find(className("android.widget.TextView"));
				var price = -1;
				var priceStr = "";
				
				for (var j = 0; j < priceTexts.size(); j++) {
					var priceText = priceTexts.get(j);
					var textBounds = priceText.bounds();
					
					if (textBounds.left > symbolBounds.right - 5 && 
						Math.abs(textBounds.centerY() - symbolBounds.centerY()) < 20) {
						var numText = priceText.text();
						if (numText && /^\d+(\.\d+)?$/.test(numText)) {
							priceStr = numText;
							price = parseFloat(priceStr);
							break;
						}
					}
				}
				
				if (price > 0) {
					var displayTitle = title || "未知商品";
					if (displayTitle.length > 20) {
						displayTitle = displayTitle.substring(0, 20) + "...";
					}
					
					logger.debug("商品: " + displayTitle + ", 价格: " + price);
					
					if (price > priceThreshold) {
						logger.addLog(window, "商品[" + displayTitle + "]价格" + price + "元，超过阈值" + priceThreshold + "元，准备删除");
						
						var bounds = itemFrame.bounds();
						var startX = bounds.right - 100;
						var endX = bounds.left + 100;
						var y = bounds.centerY();
						
						logger.debug("左滑显示删除按钮: " + startX + "," + y + " -> " + endX + "," + y);
						gesture(300, [startX, y], [endX, y]);
						waitTimeManager.wait(1000);
						
						var deleteTexts = textContains("删除").find();
						if (deleteTexts.size() > 0) {
							logger.debug("找到删除按钮，点击删除");
							click(device.width - 50, y);
							waitTimeManager.wait(1000);
							
							var confirmButton = textMatches(/(确认|确定|删除)/).clickable(true).findOne(2000);
							if (confirmButton) {
								logger.debug("找到确认按钮，点击确认");
								click(confirmButton.bounds().centerX(), confirmButton.bounds().centerY());
							}
							
							removedCount++;
							foundDeleteTarget = true;
							waitTimeManager.wait(1500);
							break;
						} else {
							logger.debug("未找到删除按钮，尝试点击右侧区域");
							click(device.width - 50, y);
							waitTimeManager.wait(1000);
							
							var confirmButton2 = textMatches(/(确认|确定|删除)/).clickable(true).findOne(2000);
							if (confirmButton2) {
								logger.debug("找到确认按钮，点击确认");
								click(confirmButton2.bounds().centerX(), confirmButton2.bounds().centerY());
								removedCount++;
								foundDeleteTarget = true;
								waitTimeManager.wait(1500);
								break;
							}
						}
					}
				} else {
					logger.debug("未能解析商品价格");
				}
			}
		}
		
		if (foundDeleteTarget) {
			continue;
		}
		
		logger.debug("向下滚动列表...");
		var scrollSuccess = scrollView.scrollForward();
		scrollCount++;
		
		if (!scrollSuccess) {
			logger.addLog(window, "已滚动到底部或无法继续滚动");
			keepScrolling = false;
		}
		
		waitTimeManager.wait(1000);
	}
	
	return removedCount;
}

module.exports = {
	filterSelectedProducts,
	processProducts,
	processProductsOnce
}; 