// 点击商品主图以触发“左右滑动查看规格”提示（不执行实际滑动）

var PDD_PKG_ID = "com.xunmeng.pinduoduo";
function parsePrice(priceText){
  if(!priceText) return null;
  try{
    var clean = String(priceText).replace(/[^\d.]/g, '');
    var parts = clean.split('.');
    if(parts.length > 2){
      clean = parts[0] + '.' + parts.slice(1).join('');
    }
    var p = parseFloat(clean);
    return isNaN(p) ? null : p;
  }catch(e){
    return null;
  }
}

function clickProductMainImage(){
  try{
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
      console.log("未找到商品主图 ImageView");
      return null;
    }
    var b = img.bounds();
    var cx = b.centerX();
    var cy = b.centerY();
    console.log("点击商品主图("+cx+","+cy+")");
    click(cx, cy);
    sleep(600);
    return b;
  }catch(e){
    console.log("clickProductMainImage 出错: " + e.message);
    return null;
  }
}

// 采集当前页面的最低价格（通过扫描文本）
function getCurrentMinPrice(){
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
    console.log("getCurrentMinPrice 出错: " + e.message);
    return null;
  }
}

function swipeWithin(bounds, direction){
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
    sleep(900);
    return true;
  }catch(e){
    console.log("swipeWithin 出错: " + e.message);
    return false;
  }
}

// 向左滑动遍历规格，记录最低价，并回到最低价对应的规格
function swipeLeftFindCheapestVariant(maxSteps){
  maxSteps = maxSteps || 12;
  var imgBounds = clickProductMainImage();
  if(!imgBounds){
    console.log("❌ 无法定位主图，无法执行横向滑动");
    return false;
  }

  // 记录初始价格
  var initPrice = getCurrentMinPrice();
  if(initPrice === null){
    console.log("⚠️ 未获取到初始价格，仍尝试滑动");
  } else {
    console.log("当前价格: " + initPrice);
  }

  var bestPrice = initPrice !== null ? initPrice : Number.POSITIVE_INFINITY;
  var bestIndex = 0; // 相对起点的步数（向左为正）
  var currentIndex = 0;

  for(var step=1; step<=maxSteps; step++){
    if(!swipeWithin(imgBounds, 'left')) break;
    currentIndex++;

    var cur = getCurrentMinPrice();
    if(cur !== null){
      console.log("第"+step+"次滑动后价格: " + cur);
      if(cur < bestPrice){
        bestPrice = cur;
        bestIndex = currentIndex;
        console.log("发现更低价: " + bestPrice + "，记录步数=" + bestIndex);
      }
    }
  }

  // 如果最佳步数不是0，则向右回退到最低价对应的规格
  var needBack = currentIndex - bestIndex;
  for(var k=0; k<needBack; k++){
    swipeWithin(imgBounds, 'right');
  }

  if(bestPrice !== Number.POSITIVE_INFINITY){
    console.log("✅ 已定位到最低价规格，价格: " + bestPrice);
    return true;
  }else{
    console.log("❌ 未能判定最低价，已停留在最后一次滑动位置");
    return false;
  }
}

// 基于价格阈值：向左滑动直到价格小于给定阈值，或达到最大步数
function swipeLeftUntilPriceBelow(threshold, maxSteps){
  maxSteps = maxSteps || 15;
  if(typeof threshold !== 'number') threshold = 0.8;

  var imgBounds = clickProductMainImage();
  if(!imgBounds){
    console.log("❌ 无法定位主图，无法执行横向滑动");
    return false;
  }

  var cur = getCurrentMinPrice();
  if(cur !== null){
    console.log("初始价格: " + cur);
    if(cur < threshold){
      console.log("✅ 初始即满足阈值: " + cur + " < " + threshold);
      var cx0 = Math.floor(device.width / 2);
      var cy0 = Math.floor(device.height / 2);
      console.log("点击屏幕中间确认("+cx0+","+cy0+")");
      click(cx0, cy0);
      sleep(600);
      return true;
    }
  } else {
    console.log("⚠️ 未获取到初始价格，开始尝试滑动");
  }

  for(var step=1; step<=maxSteps; step++){
    if(!swipeWithin(imgBounds, 'left')) break;
    cur = getCurrentMinPrice();
    if(cur !== null){
      console.log("第"+step+"次滑动后价格: " + cur);
      if(cur < threshold){
        console.log("✅ 达到目标: 价格 " + cur + " < " + threshold);
        var cx = Math.floor(device.width / 2);
        var cy = Math.floor(device.height / 2);
        console.log("点击屏幕中间确认("+cx+","+cy+")");
        click(cx, cy);
        sleep(600);
        return true;
      }
    }
  }

  console.log("⚠️ 未在限定步数内达到目标阈值" + (cur!==null ? (", 最后价格: " + cur) : ""));
  return false;
}

function main(){
  console.log("=== 向左滑动选择规格，目标价格 < 0.8 ===");
  var ok = swipeLeftUntilPriceBelow(0.8, 20);
  console.log(ok ? "✅ 已选择到目标价格以下的规格" : "⚠️ 未能在限定滑动次数内达到目标价格");
  console.log("=== 任务结束 ===");
}

main(); 