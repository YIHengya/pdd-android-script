const logger = require('../../utils/logger.js');
const { GlobalStopManager } = require('../../utils/common.js');
const { waitTimeManager } = require('../../utils/wait-time-manager.js');

function getDeviceInfo() {
	var screenWidth = device.width;
	var screenHeight = device.height;
	var density = context.getResources().getDisplayMetrics().density;
	
	logger.debug("设备信息:");
	logger.debug("  屏幕: " + screenWidth + "x" + screenHeight);
	logger.debug("  密度: " + density);
	
	return {
		width: screenWidth,
		height: screenHeight,
		density: density
	};
}

function isStoreNameText(text) {
	if (!text) return false;
	text = ("" + text).trim();
	if (text.length < 2 || text.length > 15) return false;
	if (/[¥￥]/.test(text)) return false;
	if (/[;；\/]/.test(text)) return false;
	if (/×\d+/.test(text)) return false;
	if (/\d{3,}/.test(text)) return false;
	if (/立减|券后|原拼单价|再选一款|已减|限量|历史低价|好评|评价|拼单|抢光|低价|过|回头客/.test(text)) return false;
	if (/店|旗舰|店铺|专营|专用|电器|工厂|品质|用品|家居|食品|服饰/.test(text)) return true;
	if (/[店铺]$/.test(text)) return true;
	return false;
}

function detectStoreNameInChild(child) {
	try {
		var tvs = child.find(className("android.widget.TextView"));
		for (var i = 0; i < tvs.length; i++) {
			var tv = tvs[i];
			var txt = tv.text();
			if (!txt) continue;
			if (this.isStoreNameText(txt)) {
				var b = tv.bounds();
				var width = b.width();
				var height = b.height();
				if (b.left < 450 && width < device.width * 0.8 && height < 150) {
					return txt.trim();
				}
			}
		}
	} catch (e) {}
	return null;
}

function buildSignature(info) {
	if (!info) return null;
	var store = ((info.店铺 || "") + "").trim();
	var title = ((info.标题 || "") + "").trim();
	if (!title) return null;
	var spec = ((info.规格 || "") + "").trim();
	return store + "||" + title + "||" + spec;
}

function getProductImagesWithShopNames(window) {
	logger.addLog(window, "正在获取商品图片、店铺名和价格...");
	
	waitTimeManager.wait(1000);
	
	var deviceInfo = this.getDeviceInfo();
	var root = className("android.widget.FrameLayout").findOne(1000);
	if (!root) {
		logger.addLog(window, "未找到根节点");
		return [];
	}
	
	var productImages = [];
	var allTexts = [];
	
	function getRelativePosition(bounds) {
		return {
			leftRatio: bounds.left / deviceInfo.width,
			topRatio: bounds.top / deviceInfo.height,
			widthRatio: bounds.width() / deviceInfo.width,
			heightRatio: bounds.height() / deviceInfo.height
		};
	}
	
	function traverseNode(node) {
		var bounds = node.bounds();
		var classNameStr = node.className() || "unknown";
		var relPos = getRelativePosition(bounds);
		
		if (bounds.top < 0 || bounds.top >= deviceInfo.height) {
			for (var i = 0; i < node.childCount(); i++) {
				var child = node.child(i);
				if (child) traverseNode(child);
			}
			return;
		}
		
		// 收集商品图片
		if (classNameStr === "android.widget.Image" || classNameStr === "android.widget.ImageView") {
			var width = bounds.width();
			var height = bounds.height();
			
			if (width >= 200 && height >= 200 &&
				relPos.leftRatio >= 0.08 && relPos.leftRatio <= 0.2 &&
				relPos.widthRatio >= 0.25 && relPos.widthRatio <= 0.45 &&
				relPos.heightRatio >= 0.1 && relPos.heightRatio <= 0.2 &&
				Math.abs(width - height) <= 50) {
				
				productImages.push({
					序号: productImages.length + 1,
					left: bounds.left,
					top: bounds.top,
					right: bounds.right,
					bottom: bounds.bottom,
					width: width,
					height: height,
					centerY: bounds.top + height / 2
				});
			}
		}
		
		// 收集文本信息
		if (classNameStr === "android.widget.TextView" || classNameStr === "android.view.View") {
			var text = node.text();
			if (text && text.trim() !== "") {
				allTexts.push({
					text: text,
					left: bounds.left,
					top: bounds.top,
					right: bounds.right,
					bottom: bounds.bottom,
					width: bounds.width(),
					height: bounds.height(),
					centerY: bounds.top + bounds.height() / 2
				});
			}
		}
		
		for (var i = 0; i < node.childCount(); i++) {
			var child = node.child(i);
			if (child) traverseNode(child);
		}
	}
	
	traverseNode(root);
	
	// 按位置排序
	productImages.sort(function(a, b) { return a.top - b.top; });
	allTexts.sort(function(a, b) { return a.top - b.top; });
	
	logger.addLog(window, "发现 " + productImages.length + " 个商品图片");
	
	// 智能匹配店铺名、商品标题和价格
	var results = [];
	
	for (var i = 0; i < productImages.length; i++) {
		var img = productImages[i];
		logger.debug("商品 " + (i + 1) + " 分析:");
		
		var shopName = "未找到";
		var productTitle = "未找到";
		var price = "未找到";
		var shopCandidates = [];
		var titleCandidates = [];
		var priceCandidates = [];
		
		// 收集店铺名候选
		for (var j = 0; j < allTexts.length; j++) {
			var txt = allTexts[j];
			
			var isAboveImage = txt.bottom < img.top && (img.top - txt.bottom) <= 200 && (img.top - txt.bottom) >= 30;
			var isLeftAligned = Math.abs(txt.left - img.left) <= 80;
			var isReasonableShopName = txt.text.length >= 2 && txt.text.length <= 20;
			var isNotCommonText = txt.text !== "商品收藏" && txt.text !== "搜索你收藏的商品" && 
							 !txt.text.match(/^[¥$￥]\d+/) && !txt.text.match(/^\d+$/);
			
			if (isAboveImage && isLeftAligned && isReasonableShopName && isNotCommonText) {
				shopCandidates.push({
					text: txt.text,
					distance: img.top - txt.bottom,
					leftDiff: Math.abs(txt.left - img.left),
					position: "[" + txt.left + "," + txt.top + "]"
				});
			}
		}
		
		// 收集商品标题候选
		for (var j = 0; j < allTexts.length; j++) {
			var txt2 = allTexts[j];
			
			var isRightSide = txt2.left > img.right && (txt2.left - img.right) <= 100;
			var isVerticallyAligned = !(txt2.bottom < img.top || txt2.top > img.bottom);
			var isLongText = txt2.text.length >= 8;
			var isNotButton = txt2.text !== "再选一款" && txt2.text !== "×1" && 
						 !txt2.text.match(/^[¥$￥]\d+/) && !txt2.text.match(/^\d+件.*折$/);
			
			if (isRightSide && isVerticallyAligned && isLongText && isNotButton) {
				titleCandidates.push({
					text: txt2.text,
					distance: txt2.left - img.right,
					verticalDiff: Math.abs(txt2.centerY - img.centerY),
					position: "[" + txt2.left + "," + txt2.top + "]"
				});
			}
		}
		
		// 改进的价格收集逻辑
		for (var j = 0; j < allTexts.length; j++) {
			var txt3 = allTexts[j];
			
			var isPriceFormat = false;
			var priceType = "";
			
			if (txt3.text.match(/^[¥$￥]\d+(\.\d+)?$/)) {
				isPriceFormat = true;
				priceType = "标准价格";
			} else if (txt3.text.match(/^\d+\.\d+$/) && parseFloat(txt3.text) > 0.1 && parseFloat(txt3.text) < 10000) {
				isPriceFormat = true;
				priceType = "数字价格";
			} else if (txt3.text.match(/^\d+$/) && parseInt(txt3.text) > 0 && parseInt(txt3.text) < 10000) {
				isPriceFormat = true;
				priceType = "整数价格";
			} else if (txt3.text.match(/[¥$￥]\d+/) && txt3.text.length <= 15) {
				isPriceFormat = true;
				priceType = "复合价格";
			}
			
			if (isPriceFormat) {
				var isRightSide2 = txt3.left > img.right && (txt3.left - img.right) <= 200;
				var isVerticallyNearImage = !(txt3.bottom < img.top - 100 || txt3.top > img.bottom + 100);
				
				var isBelowImage = txt3.top > img.bottom && (txt3.top - img.bottom) <= 150;
				var isHorizontallyNearImage = !(txt3.right < img.left - 100 || txt3.left > img.right + 250);
				
				var isInsideImage = txt3.left >= img.left && txt3.right <= img.right && 
							   txt3.top >= img.top && txt3.bottom <= img.bottom;
				
				if ((isRightSide2 && isVerticallyNearImage) || 
					(isBelowImage && isHorizontallyNearImage) || 
					isInsideImage) {
					
					var distance = 0;
					var positionType = "";
					var priority = 3;
					
					if (isRightSide2 && isVerticallyNearImage) {
						distance = txt3.left - img.right + Math.abs(txt3.centerY - img.centerY);
						positionType = "右侧";
						priority = 1;
					} else if (isBelowImage && isHorizontallyNearImage) {
						distance = txt3.top - img.bottom + Math.abs(txt3.left - img.left);
						positionType = "下方";
						priority = 2;
					} else if (isInsideImage) {
						distance = Math.abs(txt3.centerY - img.centerY);
						positionType = "图内";
						priority = 1;
					}
					
					priceCandidates.push({
						text: txt3.text,
						distance: distance,
						positionType: positionType,
						position: "[" + txt3.left + "," + txt3.top + "]",
						priority: priority,
						priceType: priceType
					});
				}
			}
		}
		
		if (shopCandidates.length > 0) {
			shopCandidates.sort(function(a, b) {
				return (a.distance + a.leftDiff) - (b.distance + b.leftDiff);
			});
			shopName = shopCandidates[0].text;
		}
		
		if (titleCandidates.length > 0) {
			titleCandidates.sort(function(a, b) {
				return (a.distance + a.verticalDiff) - (b.distance + b.verticalDiff);
			});
			productTitle = titleCandidates[0].text;
		}
		
		if (priceCandidates.length > 0) {
			priceCandidates.sort(function(a, b) {
				if (a.priority !== b.priority) {
					return a.priority - b.priority;
				}
				return a.distance - b.distance;
			});
			price = priceCandidates[0].text;
		}
		
		var selectX = img.left - 50;
		var selectY = img.top + img.height / 2;
		
		var result = {
			商品序号: i + 1,
			图片坐标: "[" + img.left + "," + img.top + "][" + img.right + "," + img.bottom + "]",
			店铺名: shopName,
			商品标题: productTitle,
			价格: price,
			选择坐标: {x: selectX, y: selectY},
			选中状态: "⬜未选中"
		};
		
		results.push(result);
	}
	
	var successCount = results.filter(function(r) { 
		return r.店铺名 !== "未找到" && r.商品标题 !== "未找到" && r.价格 !== "未找到"; 
	}).length;
	
	logger.addLog(window, "识别结果: " + results.length + " 个商品, " + successCount + " 个完全识别");
	return results;
}

function getProductItemsFromUI(window) {
	logger.addLog(window, "正在识别商品项...");
	try {
		waitTimeManager.wait(500);
		var products = [];
		var recyclerView = id("com.xunmeng.pinduoduo:id/pdd").className("android.support.v7.widget.RecyclerView").findOne(1500);
		if (!recyclerView) {
			logger.addLog(window, "未找到商品列表RecyclerView");
			return [];
		}
		var childCount = recyclerView.childCount();
		var currentStoreName = null;
		for (var i = 0; i < childCount; i++) {
			var child = recyclerView.child(i);
			if (!child) continue;
			var detectedStore = this.detectStoreNameInChild(child);
			if (detectedStore) {
				currentStoreName = detectedStore;
				logger.debug("店铺: " + currentStoreName);
				continue;
			}
			var frames = child.find(className("android.widget.FrameLayout"));
			for (var j = 0; j < frames.length; j++) {
				var frame = frames[j];
				var b = frame.bounds();
				var h = b.height();
				var w = b.width();
				if (h < 260 || w < device.width * 0.6) continue;
				var selectBtn = null;
				try {
					if (typeof descMatches === "function") {
						selectBtn = frame.findOne(descMatches(/勾选按钮/));
					}
				} catch (e) {}
				if (!selectBtn) {
					try {
						if (typeof descContains === "function") {
							selectBtn = frame.findOne(descContains("勾选按钮"));
						}
					} catch (e) {}
				}
				if (!selectBtn) continue;
				var info = this.extractProductInfo(frame, currentStoreName);
				var sig = this.buildSignature(info);
				if (!sig) {
					logger.debug("跳过一条没有标题的商品");
					continue;
				}
				var btnDesc = (selectBtn.desc && selectBtn.desc()) || "";
				var alreadySelected = /已选中/.test(btnDesc);
				var sb = selectBtn.bounds();
				products.push({
					序号: products.length + 1,
					容器位置: b,
					选择按钮: sb,
					选择按钮中心: { x: sb.centerX(), y: sb.centerY() },
					商品信息: info,
					签名: sig,
					已选中: alreadySelected
				});
			}
		}
		logger.addLog(window, "找到商品项: " + products.length + "个");
		return products;
	} catch (e) {
		logger.addLog(window, "获取商品信息时出错: " + e.message);
		logger.debug("错误堆栈: " + e.stack);
		return [];
	}
}

function extractProductInfo(container, currentStoreName) {
	var productInfo = {
		标题: "未找到",
		店铺: currentStoreName || "未找到",
		价格: "未找到",
		规格: "未找到"
	};
	
	try {
		var textViews = container.find(className("android.widget.TextView"));
		for (var i = 0; i < textViews.length; i++) {
			var textView = textViews[i];
			var text = textView.text();
			if (!text || text.trim() === "") continue;
			// 标题：较长、不含价格与数量标记等
			if (productInfo.标题 === "未找到" &&
				text.length > 15 && text.length < 100 &&
				!/[¥$￥]/.test(text) &&
				!/×\d+/.test(text) &&
				!/立减|券后|原拼单价|再选一款/.test(text)) {
				productInfo.标题 = text;
				continue;
			}
			// 店铺：备用从容器内再判定一次
			if (productInfo.店铺 === "未找到" && this.isStoreNameText(text)) {
				productInfo.店铺 = text;
				continue;
			}
			// 价格：包含价格符号或券后
			if (productInfo.价格 === "未找到" && (/[¥$￥]/.test(text) || /券后.*[¥$￥]/.test(text))) {
				productInfo.价格 = text;
				continue;
			}
			// 规格：包含×数量
			if (productInfo.规格 === "未找到" && /×\d+/.test(text)) {
				productInfo.规格 = text;
				continue;
			}
		}
	} catch (e) {
		logger.debug("提取商品信息时出错: " + e.message);
	}
	
	return productInfo;
}

module.exports = {
	getDeviceInfo,
	isStoreNameText,
	detectStoreNameInChild,
	buildSignature,
	getProductImagesWithShopNames,
	getProductItemsFromUI,
	extractProductInfo
}; 