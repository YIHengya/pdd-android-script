// 搜索模式模块
// 功能：在拼多多首页或搜索页将关键词输入到搜索框，并点击“搜索”按钮提交

const NavigationHelper = require('../utils/navigation.js');
const { PDD_CONFIG } = require('../config/app-config.js');
const { safeClick, isInApp, GlobalStopManager } = require('../utils/common.js');
const logger = require('../utils/logger.js');
const { waitTimeManager } = require('../utils/wait-time-manager.js');
const HomeNavigation = require('../utils/navigation/home-navigation.js');

function SearchMode(){
  this.config = PDD_CONFIG;
  this.navigationHelper = new NavigationHelper();
  this.homeNavigation = new HomeNavigation();
}

SearchMode.prototype.execute = function(window, keyword){
  keyword = (keyword && String(keyword).trim()) || '手机壳';
  logger.addLog(window, '=== 搜索模式启动 ===');
  logger.addLog(window, '关键词: ' + keyword);

  try{
    if(GlobalStopManager.isStopRequested()) return false;

    // 确保在拼多多
    if(!isInApp(this.config.packageNames)){
      logger.addLog(window, '当前不在拼多多，尝试启动应用...');
      if(!this.navigationHelper.launchApp(window)){
        logger.addLog(window, '❌ 启动拼多多失败');
        return false;
      }
      waitTimeManager.wait('pageStable');
    }

    // 先回到主页，提高搜索成功率
    try{
      if(this.homeNavigation && this.homeNavigation.goToHomePage(window)){
        logger.addLog(window, '✅ 已回到主页，准备进行搜索');
        waitTimeManager.wait('pageStable');
      }else{
        logger.addLog(window, '⚠️ 回到主页失败，直接尝试搜索');
      }
    }catch(e){
      logger.addLog(window, '⚠️ 返回主页过程中出错: ' + e.message + '，继续尝试搜索');
    }

    // 若已经在搜索结果列表页，直接返回
    if(this.isOnProductListPage()){
      logger.addLog(window, '✅ 已在商品列表页，跳过搜索');
      return true;
    }

    // 聚焦搜索框
    if(!this.focusSearchBar()){
      logger.addLog(window, '⚠️ 未能准确聚焦搜索框，继续尝试输入');
    }

    // 输入并提交
    this.inputKeywordAndSearch(keyword);
    logger.addLog(window, '✅ 搜索动作完成');
    return true;
  }catch(e){
    logger.addLog(window, '❌ 搜索模式执行出错: ' + e.message);
    return false;
  }
};

SearchMode.prototype.isOnProductListPage = function(){
  try{
    // 排除底部导航“首页”在底栏可见
    var homeTab = text('首页').findOne(200);
    if(homeTab){
      var hb = homeTab.bounds && homeTab.bounds();
      if(hb && hb.bottom > device.height * 0.85){
        return false;
      }
    }
  }catch(e){}

  // 顶部返回按钮
  var hasBack = false;
  try{
    var back = desc('返回').findOne(300);
    if(back){
      var bb = back.bounds && back.bounds();
      if(bb && bb.top < device.height * 0.2) hasBack = true;
    }
  }catch(e){}

  // 顶部筛选 tabs（综合/销量/筛选），限定上半屏
  var hasTabs = false;
  try{
    var tabZh = id(this.config.packageNames[0] + ':id/title').text('综合').findOne(300);
    var tabXl = id(this.config.packageNames[0] + ':id/title').text('销量').findOne(300);
    var tabSh = id(this.config.packageNames[0] + ':id/title').text('筛选').findOne(300);
    if(tabZh && (tabXl || tabSh)){
      var b1 = tabZh.bounds && tabZh.bounds();
      var b2 = (tabXl && tabXl.bounds && tabXl.bounds()) || (tabSh && tabSh.bounds && tabSh.bounds());
      if(b1 && b2 && b1.top < device.height * 0.4 && b2.top < device.height * 0.4){
        hasTabs = true;
      }
    }
  }catch(e){}

  return hasBack && hasTabs;
};

SearchMode.prototype.focusSearchBar = function(){
  // 优先通过“搜索”描述
  var byDesc = null;
  try{ byDesc = descMatches(/搜索/).findOne(800); }catch(e){}
  if(byDesc){ if(safeClick(byDesc)) return true; }

  // 通过“拍照搜索”邻域
  var camera = null;
  try{ camera = descContains('拍照搜索').findOne(600); }catch(e){}
  if(camera){
    try{
      var parent = camera.parent && camera.parent();
      if(parent && parent.parent){
        var bar = parent.parent();
        if(bar && safeClick(bar)) return true;
      }
    }catch(e){}
  }

  // 顶部可点击 FrameLayout
  try{
    var topBar = className('android.widget.FrameLayout').clickable(true).findOne(600);
    if(topBar && topBar.bounds && topBar.bounds().top < device.height * 0.2){
      if(safeClick(topBar)) return true;
    }
  }catch(e){}

  // 兜底：点击顶部中间
  try{
    var cx = Math.floor(device.width * 0.5);
    var cy = Math.floor(device.height * 0.09);
    click(cx, cy);
    return true;
  }catch(e){}

  return false;
};

SearchMode.prototype.clickSearchButton = function(){
  // 方式1：TextView 文本为“搜索”且可点击
  var btn = null;
  try{ btn = text('搜索').className('android.widget.TextView').clickable(true).findOne(600); }catch(e){}
  if(btn && safeClick(btn)) return true;

  // 方式2：通过 id + 文本定位
  try{ btn = id(this.config.packageNames[0] + ':id/pdd').text('搜索').className('android.widget.TextView').findOne(600); }catch(e){}
  if(btn && safeClick(btn)) return true;

  // 方式3：顶部区域最靠右的“搜索”文本
  try{
    var candidates = text('搜索').className('android.widget.TextView').find();
    var best = null, bestRight = -1;
    for(var i=0;i<candidates.length;i++){
      var n = candidates[i];
      var b = n && n.bounds && n.bounds();
      if(!b) continue;
      if(b.top < device.height * 0.25 && b.right > bestRight){ bestRight = b.right; best = n; }
    }
    if(best && safeClick(best)) return true;
  }catch(e){}

  // 方式4：兜底右上角
  try{
    var x = Math.floor(device.width * 0.94);
    var y = Math.floor(device.height * 0.075);
    click(x, y);
    return true;
  }catch(e){}

  return false;
};

SearchMode.prototype.inputKeywordAndSearch = function(keyword){
  waitTimeManager.wait(300);

  var edit = null;
  try{ edit = className('android.widget.EditText').findOne(1200); }catch(e){}

  if(edit){
    try{ edit.click(); }catch(e){}
    waitTimeManager.wait(200);
    try{
      if(edit.setText){
        edit.setText('');
        waitTimeManager.wait(120);
        edit.setText(keyword);
      }else{
        setText(keyword);
      }
    }catch(e){
      try{ setText(keyword); }catch(_){ }
    }
  }else{
    try{ setText(keyword); }catch(e){ try{ input(keyword); }catch(_){ } }
  }

  waitTimeManager.wait(300);
  if(!this.clickSearchButton()){
    try{ KeyCode('ENTER'); }catch(e){ try{ press(66); }catch(_){ } }
  }
  waitTimeManager.wait('pageStable');
};

module.exports = SearchMode; 