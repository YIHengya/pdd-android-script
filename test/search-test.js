// === 拼多多 搜索测试：在搜索框输入“手机壳”并点击搜索按钮 ===

var PDD_PKG_ID = "com.xunmeng.pinduoduo";

function safeClick(element){
  if(!element) return false;
  try{
    if(element.clickable && element.clickable()){
      element.click();
      return true;
    }
    var p = element.parent && element.parent();
    if(p && p.clickable && p.clickable()){
      p.click();
      return true;
    }
    var b = element.bounds && element.bounds();
    if(b){
      click(b.centerX(), b.centerY());
      return true;
    }
  }catch(e){
    console.log("safeClick 出错: " + e.message);
  }
  return false;
}

// 新增：检测是否已经在商品列表页（更严格，避免主页误判）
function isOnProductListPage(){
  try{
    // 主页通常有底部导航“首页/个人中心”等，若检测到底部导航则直接判定非列表页
    var homeTab = text("首页").findOne(200);
    if(homeTab){
      var hb = homeTab.bounds && homeTab.bounds();
      if(hb && hb.bottom > device.height * 0.85){
        return false;
      }
    }
  }catch(e){}

  // 搜索结果列表页顶部通常包含返回按钮
  var hasBack = false;
  try{
    var back = desc("返回").findOne(300);
    if(back){
      var bb = back.bounds && back.bounds();
      if(bb && bb.top < device.height * 0.2) hasBack = true;
    }
  }catch(e){}

  // 顶部筛选 tab：综合 / 销量 / 价格 / 品牌 / 筛选
  // 使用 id:title + 文本 来提高准确性，并要求位于上半屏
  var hasTabs = false;
  try{
    var tabZh = id(PDD_PKG_ID + ":id/title").text("综合").findOne(300);
    var tabXl = id(PDD_PKG_ID + ":id/title").text("销量").findOne(300);
    var tabSh = id(PDD_PKG_ID + ":id/title").text("筛选").findOne(300);
    if(tabZh && (tabXl || tabSh)){
      var b1 = tabZh.bounds && tabZh.bounds();
      var b2 = (tabXl && tabXl.bounds && tabXl.bounds()) || (tabSh && tabSh.bounds && tabSh.bounds());
      if(b1 && b2 && b1.top < device.height * 0.4 && b2.top < device.height * 0.4){
        hasTabs = true;
      }
    }
  }catch(e){}

  return hasBack && hasTabs;
}

function focusSearchBar(){
  // 优先通过“搜索”描述
  var byDesc = null;
  try{
    byDesc = descMatches(/搜索/).findOne(800);
  }catch(e){}
  if(byDesc){
    if(safeClick(byDesc)) return true;
  }

  // 尝试通过“拍照搜索”旁边的区域
  var camera = null;
  try{
    camera = descContains("拍照搜索").findOne(600);
  }catch(e){}
  if(camera){
    try{
      var parent = camera.parent && camera.parent();
      if(parent && parent.parent){
        var bar = parent.parent();
        if(bar && safeClick(bar)) return true;
      }
    }catch(e){}
  }

  // 顶部可点击的 FrameLayout（常见为搜索容器）
  try{
    var topBar = className("android.widget.FrameLayout").clickable(true).findOne(600);
    if(topBar && topBar.bounds && topBar.bounds().top < device.height * 0.2){
      if(safeClick(topBar)) return true;
    }
  }catch(e){}

  // 兜底：点击屏幕顶部中间区域
  try{
    var cx = Math.floor(device.width * 0.5);
    var cy = Math.floor(device.height * 0.09);
    click(cx, cy);
    return true;
  }catch(e){}

  return false;
}

function inputKeywordAndSearch(keyword){
  keyword = keyword || "手机壳";
  sleep(500);

  // 查找可输入的 EditText
  var edit = null;
  try{
    edit = className("android.widget.EditText").findOne(1200);
  }catch(e){}

  if(edit){
    try{ edit.click(); }catch(e){}
    sleep(200);
    try{
      if(edit.setText){
        edit.setText("");
        sleep(120);
        edit.setText(keyword);
      }else{
        setText(keyword);
      }
    }catch(e){
      try{ setText(keyword); }catch(_){ }
    }
  }else{
    // 找不到输入框时，直接使用输入法输入（前提是已聚焦）
    try{ setText(keyword); }catch(e){ try{ input(keyword); }catch(_){ } }
  }

  sleep(300);
  // 优先点击右侧“搜索”按钮
  var clicked = clickSearchButton();
  if(!clicked){
    console.log("⚠️ 未找到搜索按钮，尝试回车");
    try{ KeyCode("ENTER"); }catch(e){ try{ press(66); }catch(_){ } }
  }
  sleep(800);
}

function clickSearchButton(){
  // 方式1：TextView 文本为“搜索”且可点击
  var btn = null;
  try{
    btn = text("搜索").className("android.widget.TextView").clickable(true).findOne(600);
  }catch(e){}
  if(btn){
    if(safeClick(btn)) return true;
  }

  // 方式2：通过 id + 文本定位
  try{
    btn = id(PDD_PKG_ID + ":id/pdd").text("搜索").className("android.widget.TextView").findOne(600);
  }catch(e){}
  if(btn){
    if(safeClick(btn)) return true;
  }

  // 方式3：筛选顶部区域内最靠右的“搜索”文本按钮
  try{
    var candidates = text("搜索").className("android.widget.TextView").find();
    var best = null;
    var bestRight = -1;
    for(var i=0;i<candidates.length;i++){
      var n = candidates[i];
      var b = n && n.bounds && n.bounds();
      if(!b) continue;
      if(b.top < device.height * 0.25){
        if(b.right > bestRight){
          bestRight = b.right;
          best = n;
        }
      }
    }
    if(best){
      if(safeClick(best)) return true;
    }
  }catch(e){}

  // 方式4：兜底，在右上角区域点击一次
  try{
    var x = Math.floor(device.width * 0.94);
    var y = Math.floor(device.height * 0.075);
    click(x, y);
    return true;
  }catch(e){}

  return false;
}

function main(){
  console.log("=== 在拼多多搜索框输入‘手机壳’并点击搜索按钮 ===");
  if(currentPackage() !== PDD_PKG_ID){
    console.log("⚠️ 当前不在拼多多包内: " + currentPackage());
  }
  // 若已在商品列表页，则跳过搜索
  if(isOnProductListPage()){
    console.log("✅ 已在商品列表页，跳过搜索");
    return;
  }
  var ok = focusSearchBar();
  if(!ok){
    console.log("❌ 未能聚焦搜索框，尝试继续输入");
  }
  inputKeywordAndSearch("手机壳");
  console.log("✅ 操作完成");
}

main();
