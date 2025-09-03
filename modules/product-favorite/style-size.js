const { parsePrice } = require('../../utils/common.js');
const logger = require('../../utils/logger.js');
const { waitTimeManager } = require('../../utils/wait-time-manager.js');

function clickProductMainImage(window){
	try{
		var PDD_PKG_ID = "com.xunmeng.pinduoduo";
		// 优先通过固定ID查找
		var img = id(PDD_PKG_ID + ":id/iv_goods_img").findOne(800);
		if(!img){
			// 其次通过描述查找
			img = descContains("商品主图").findOne(800);
		}
		if(!img){
			// 兜底：寻找屏幕上面积最大的可点击 ImageView
			var imgs = className("android.widget.ImageView").find();
			var best = null;
			var bestArea = 0;
			for(var i=0;i<imgs.length;i++){
				var n = imgs[i];
				if(!n || !n.bounds) continue;
				try{
					var b = n.bounds();
					if(!b) continue;
					var area = Math.max(0, b.width() * b.height());
					var clickable = n.clickable && n.clickable();
					// 优先可点击，其次选面积最大
					if(clickable && area > bestArea){
						best = n; bestArea = area;
					}
				}catch(e){}
			}
			if(best){ img = best; }
		}
		if(!img){
			logger.addLog(window, "未找到商品主图 ImageView");
			return null;
		}
		var b = img.bounds();
		var cx = b.centerX();
		var cy = b.centerY();
		logger.addLog(window, "点击商品主图("+cx+","+cy+")");
		click(cx, cy);
		waitTimeManager.wait(600);
		return b;
	}catch(e){
		logger.addLog(window, "clickProductMainImage 出错: " + e.message);
		return null;
	}
}

function getCurrentMinPrice(window){
	try{
		var nodes = textMatches(/.*/).find();
		var prices = [];
		for(var i=0;i<nodes.length;i++){
			var t = nodes[i].text && nodes[i].text();
			if(!t) continue;
			if(/[¥$￥]/.test(t) || /券后.*[¥$￥]/.test(t)){
				var p = parsePrice(t);
				if(p !== null && p > 0 && p < 100000){
					prices.push(p);
				}
			}
		}
		if(prices.length === 0) return null;
		var min = prices.reduce(function(a,b){ return a<b?a:b; });
		return min;
	}catch(e){
		logger.addLog(window, "getCurrentMinPrice 出错: " + e.message);
		return null;
	}
}

function swipeWithin(window, bounds, direction){
	try{
		var left = bounds.left, right = bounds.right, top = bounds.top, bottom = bounds.bottom;
		var y = Math.max(10, Math.min(Math.floor((top + bottom) / 2), device.height - 10));
		var dx = Math.floor(device.width * 2 / 3); // 2/3 屏幕宽度
		var startX, endX;
		if(direction === 'right'){
			// 从图片区域偏左开始，向右滑动半屏
			startX = Math.min(Math.max(10, left + Math.floor(bounds.width()*0.2)), device.width - dx - 10);
			endX = startX + dx;
		}else{
			// 从图片区域偏右开始，向左滑动半屏
			startX = Math.max(Math.min(right - Math.floor(bounds.width()*0.2), device.width - 10), dx + 10);
			endX = startX - dx;
		}
		swipe(startX, y, endX, y, 450);
		waitTimeManager.wait(900);
		return true;
	}catch(e){
		logger.addLog(window, "swipeWithin 出错: " + e.message);
		return false;
	}
}

function swipeLeftFindCheapestVariant(window, maxSteps){
	maxSteps = maxSteps || 60;
	var imgBounds = clickProductMainImage(window);
	if(!imgBounds){
		logger.addLog(window, "❌ 无法定位主图，无法执行横向滑动");
		return false;
	}

	// 记录初始价格
	var initPrice = getCurrentMinPrice(window);
	if(initPrice === null){
		logger.addLog(window, "⚠️ 未获取到初始价格，仍尝试滑动");
	} else {
		logger.addLog(window, "当前价格: " + initPrice);
	}

	var bestPrice = initPrice !== null ? initPrice : Number.POSITIVE_INFINITY;
	var bestIndex = 0; // 相对起点的步数（向左为正）
	var currentIndex = 0;
	var noImproveSteps = 0;
	var noImproveLimit = 8; // 连续无改进达到该阈值提前结束

	for(var step=1; step<=maxSteps; step++){
		if(!swipeWithin(window, imgBounds, 'left')) break;
		currentIndex++;

		var cur = getCurrentMinPrice(window);
		if(cur !== null){
			logger.addLog(window, "第"+step+"次滑动后价格: " + cur);
			if(cur < bestPrice){
				bestPrice = cur;
				bestIndex = currentIndex;
				noImproveSteps = 0;
				logger.addLog(window, "发现更低价: " + bestPrice + "，记录步数=" + bestIndex);
			}else{
				noImproveSteps++;
			}
		}

		// 提前结束条件1：价格连续无改进
		if(noImproveSteps >= noImproveLimit){
			logger.addLog(window, "连续"+noImproveSteps+"次无更低价，提前结束搜索");
			break;
		}
		// 移除轮播回到起始价格的提前结束判断，继续尝试直到达到目标或超出最大步数
	}

	// 如果最佳步数不是0，则向右回退到最低价对应的规格
	var needBack = currentIndex - bestIndex;
	for(var k=0; k<needBack; k++){
		swipeWithin(window, imgBounds, 'right');
	}

	if(bestPrice !== Number.POSITIVE_INFINITY){
		logger.addLog(window, "✅ 已定位到最低价规格，价格: " + bestPrice);
		return true;
	}else{
		logger.addLog(window, "❌ 未能判定最低价，已停留在最后一次滑动位置");
		return false;
	}
}

function swipeLeftUntilPriceBelow(window, threshold, maxSteps){
	maxSteps = maxSteps || 60;
	if(typeof threshold !== 'number') threshold = 0.8;

	var imgBounds = clickProductMainImage(window);
	if(!imgBounds){
		logger.addLog(window, "❌ 无法定位主图，无法执行横向滑动");
		return false;
	}

	var cur = getCurrentMinPrice(window);
	var initPrice = cur;
	if(cur !== null){
		logger.addLog(window, "初始价格: " + cur);
		if(cur < threshold){
			logger.addLog(window, "✅ 初始即满足阈值: " + cur + " < " + threshold);
			var cx0 = Math.floor(device.width / 2);
			var cy0 = Math.floor(device.height / 2);
			logger.addLog(window, "点击屏幕中间确认("+cx0+","+cy0+")");
			click(cx0, cy0);
			waitTimeManager.wait(600);
			return true;
		}
	} else {
		logger.addLog(window, "⚠️ 未获取到初始价格，开始尝试滑动");
	}

	for(var step=1; step<=maxSteps; step++){
		if(!swipeWithin(window, imgBounds, 'left')) break;
		cur = getCurrentMinPrice(window);
		if(cur !== null){
			logger.addLog(window, "第"+step+"次滑动后价格: " + cur);
			if(cur < threshold){
				logger.addLog(window, "✅ 达到目标: 价格 " + cur + " < " + threshold);
				var cx = Math.floor(device.width / 2);
				var cy = Math.floor(device.height / 2);
				logger.addLog(window, "点击屏幕中间确认("+cx+","+cy+")");
				click(cx, cy);
				waitTimeManager.wait(600);
				return true;
			}
		}
		// 仅保留达到阈值的停止条件，其余继续尝试直到超出最大步数
	}

	logger.addLog(window, "⚠️ 未在限定步数内达到目标阈值" + (cur!==null ? (", 最后价格: " + cur) : ""));
	return false;
}

function swipeLeftUntilWithinRange(window, minValue, maxValue, maxSteps){
	maxSteps = maxSteps || 60;
	if(typeof minValue !== 'number') minValue = 0;
	if(typeof maxValue !== 'number') maxValue = Number.POSITIVE_INFINITY;

	var imgBounds = clickProductMainImage(window);
	if(!imgBounds){
		logger.addLog(window, "❌ 无法定位主图，无法执行横向滑动");
		return false;
	}

	var cur = getCurrentMinPrice(window);
	var initPrice = cur;
	if(cur !== null){
		logger.addLog(window, "初始价格: " + cur);
		if(cur >= minValue && cur <= maxValue){
			logger.addLog(window, "✅ 初始即在区间内: " + cur + " ∈ ["+minValue+","+maxValue+"]");
			var cx0 = Math.floor(device.width / 2);
			var cy0 = Math.floor(device.height / 2);
			logger.addLog(window, "点击屏幕中间确认("+cx0+","+cy0+")");
			click(cx0, cy0);
			waitTimeManager.wait(600);
			return true;
		}
	} else {
		logger.addLog(window, "⚠️ 未获取到初始价格，开始尝试滑动");
	}

	for(var step=1; step<=maxSteps; step++){
		if(!swipeWithin(window, imgBounds, 'left')) break;
		cur = getCurrentMinPrice(window);
		if(cur !== null){
			logger.addLog(window, "第"+step+"次滑动后价格: " + cur);
			if(cur >= minValue && cur <= maxValue){
				logger.addLog(window, "✅ 达到目标: 价格 " + cur + " ∈ ["+minValue+","+maxValue+"]");
				var cx = Math.floor(device.width / 2);
				var cy = Math.floor(device.height / 2);
				logger.addLog(window, "点击屏幕中间确认("+cx+","+cy+")");
				click(cx, cy);
				waitTimeManager.wait(600);
				return true;
			}
		}
		// 仅保留达到区间的停止条件，其余继续尝试直到超出最大步数
	}

	logger.addLog(window, "⚠️ 未在限定步数内达到区间目标" + (cur!==null ? (", 最后价格: " + cur) : ""));
	return false;
}

module.exports = {
	clickProductMainImage: clickProductMainImage,
	getCurrentMinPrice: getCurrentMinPrice,
	swipeWithin: swipeWithin,
	swipeLeftFindCheapestVariant: swipeLeftFindCheapestVariant,
	swipeLeftUntilPriceBelow: swipeLeftUntilPriceBelow,
	selectCheapest: function(window, maxSteps){ return swipeLeftFindCheapestVariant(window, maxSteps); },
	selectUntilBelow: function(window, threshold, maxSteps){ return swipeLeftUntilPriceBelow(window, threshold, maxSteps); },
	selectWithinRange: function(window, minValue, maxValue, maxSteps){ return swipeLeftUntilWithinRange(window, minValue, maxValue, maxSteps); }
}; 