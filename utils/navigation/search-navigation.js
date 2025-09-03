const { PDD_CONFIG } = require('../../config/app-config.js');
const { safeClick } = require('../common.js');
const { waitTimeManager } = require('../wait-time-manager.js');

function SearchNavigation(){
    this.config = PDD_CONFIG;
}

SearchNavigation.prototype.isOnProductListPage = function(){
    try{
        var homeTab = text('首页').findOne(200);
        if(homeTab){
            var hb = homeTab.bounds && homeTab.bounds();
            if(hb && hb.bottom > device.height * 0.85){
                return false;
            }
        }
    }catch(e){}

    var hasBack = false;
    try{
        var back = desc('返回').findOne(300);
        if(back){
            var bb = back.bounds && back.bounds();
            if(bb && bb.top < device.height * 0.2) hasBack = true;
        }
    }catch(e){}

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

SearchNavigation.prototype.focusSearchBar = function(){
    var byDesc = null;
    try{ byDesc = descMatches(/搜索/).findOne(800); }catch(e){}
    if(byDesc){ if(safeClick(byDesc)) return true; }

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

    try{
        var topBar = className('android.widget.FrameLayout').clickable(true).findOne(600);
        if(topBar && topBar.bounds && topBar.bounds().top < device.height * 0.2){
            if(safeClick(topBar)) return true;
        }
    }catch(e){}

    try{
        var cx = Math.floor(device.width * 0.5);
        var cy = Math.floor(device.height * 0.09);
        click(cx, cy);
        return true;
    }catch(e){}

    return false;
};

SearchNavigation.prototype.clickSearchButton = function(){
    var btn = null;
    try{ btn = text('搜索').className('android.widget.TextView').clickable(true).findOne(600); }catch(e){}
    if(btn && safeClick(btn)) return true;

    try{ btn = id(this.config.packageNames[0] + ':id/pdd').text('搜索').className('android.widget.TextView').findOne(600); }catch(e){}
    if(btn && safeClick(btn)) return true;

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

    try{
        var x = Math.floor(device.width * 0.94);
        var y = Math.floor(device.height * 0.075);
        click(x, y);
        return true;
    }catch(e){}

    return false;
};

SearchNavigation.prototype.inputKeywordAndSearch = function(keyword){
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

module.exports = SearchNavigation; 