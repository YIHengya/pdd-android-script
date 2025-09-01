// === 🚀 拼多多收藏商品选择脚本（店铺识别 + 去重增强版） ===

// 全局集合
var processedSignatures = new Set();
var selectedSignatures  = new Set();
var lastBottomSignature = null;

// 设备信息
function getDeviceInfo() {
    return {
        width: device.width,
        height: device.height,
        density: context.getResources().getDisplayMetrics().density
    };
}

// 判定店铺名
function isStoreNameText(text){
    if(!text) return false;
    text = text.trim();
    if(text.length < 2 || text.length > 15) return false;
    if(/[¥￥]/.test(text)) return false;
    if(/[;；/]/.test(text)) return false;
    if(/×\d+/.test(text)) return false;
    if(/\d{3,}/.test(text)) return false;
    if(/立减|券后|原拼单价|再选一款|已减|限量|历史低价|好评|评价|拼单|抢光|低价|过|回头客/.test(text)) return false;
    if(/店|旗舰|店铺|专营|专用|电器|工厂|品质|用品|家居|食品|服饰/.test(text)) return true;
    if(/[店铺]$/.test(text)) return true;
    return false;
}

// 在 child 中找店铺
function detectStoreNameInChild(child){
    try{
        var tvs = child.find(className("android.widget.TextView"));
        for(var i=0;i<tvs.length;i++){
            var tv = tvs[i];
            var txt = tv.text();
            if(!txt) continue;
            if(isStoreNameText(txt)){
                var b = tv.bounds();
                var width = b.width();
                var height = b.height();
                if(b.left < 450 && width < device.width * 0.8 && height < 150){
                    return txt.trim();
                }
            }
        }
    }catch(e){}
    return null;
}

// 提取商品信息
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

            if (productInfo.标题 === "未找到" &&
                text.length > 15 && text.length < 100 &&
                !/[¥￥$]/.test(text) &&
                !/×\d+/.test(text) &&
                !/立减|券后|原拼单价|再选一款/.test(text)) {
                productInfo.标题 = text;
                continue;
            }
            if (productInfo.店铺 === "未找到" && isStoreNameText(text)) {
                productInfo.店铺 = text;
                continue;
            }
            if (productInfo.价格 === "未找到" &&
                (/[¥￥]/.test(text) || /券后.*[¥￥]/.test(text))) {
                productInfo.价格 = text;
                continue;
            }
            if (productInfo.规格 === "未找到" && /×\d+/.test(text)) {
                productInfo.规格 = text;
                continue;
            }
        }
    } catch (e) {
        console.log("提取商品信息时出错: " + e.message);
    }
    return productInfo;
}

// 生成签名
function buildSignature(info){
    if(!info) return null;
    var store = (info.店铺 || "").trim();
    var title = (info.标题 || "").trim();
    if(!title) return null;
    var spec  = (info.规格 || "").trim();
    return store + "||" + title + "||" + spec;
}

// 获取可视商品
function getProductItemsFromUI() {
    console.log("=== 开始获取商品信息 ===");
    var resultList = [];
    try {
        sleep(300);
        var recyclerView = id("com.xunmeng.pinduoduo:id/pdd")
            .className("android.support.v7.widget.RecyclerView")
            .findOne(1500);
        if(!recyclerView){
            console.log("❌ 未找到商品列表RecyclerView");
            return [];
        }
        var childCount = recyclerView.childCount();
        var currentStoreName = null;

        for (var i = 0; i < childCount; i++){
            var child = recyclerView.child(i);
            if(!child) continue;

            var detectedStore = detectStoreNameInChild(child);
            if(detectedStore){
                currentStoreName = detectedStore;
                console.log("🏷️ 店铺: " + currentStoreName);
                continue;
            }

            var frames = child.find(className("android.widget.FrameLayout"));
            for(var j=0;j<frames.length;j++){
                var frame = frames[j];
                var b = frame.bounds();
                var h = b.height();
                var w = b.width();
                if(h < 260 || w < device.width * 0.6) continue;

                var selectBtn = null;
                try{
                    if (typeof descMatches === "function") {
                        selectBtn = frame.findOne(descMatches(/勾选按钮/));
                    }
                }catch(e){}
                if(!selectBtn){
                    try{
                        if (typeof descContains === "function") {
                            selectBtn = frame.findOne(descContains("勾选按钮"));
                        }
                    }catch(e){}
                }
                if(!selectBtn) continue;

                var info = extractProductInfo(frame, currentStoreName);
                var sig = buildSignature(info);
                if(!sig){
                    console.log("⚠️ 跳过一条没有标题的商品");
                    continue;
                }
                var btnDesc = (selectBtn.desc && selectBtn.desc()) || "";
                var alreadySelected = /已选中/.test(btnDesc);

                resultList.push({
                    序号: resultList.length + 1,
                    容器位置: b,
                    选择按钮: selectBtn.bounds(),
                    选择按钮中心: {
                        x: selectBtn.bounds().centerX(),
                        y: selectBtn.bounds().centerY()
                    },
                    商品信息: info,
                    签名: sig,
                    已选中: alreadySelected
                });
            }
        }
        console.log("采集到商品(可能含重复): " + resultList.length);
        return resultList;
    } catch(e){
        console.log("❌ getProductItemsFromUI 出错: " + e.message);
        return [];
    }
}

// 选择商品（仅未选）
function selectProducts(products, selectAll){
    console.log("\n=== 🎯 开始选择商品（去重跳过） ===");
    var clickCount = 0;
    for(var i=0;i<products.length;i++){
        var p = products[i];
        var sig = p.签名;
        if(!sig) continue;
        if(selectedSignatures.has(sig) || p.已选中){
            selectedSignatures.add(sig);
            continue;
        }
        var titlePreview = p.商品信息.标题;
        if(titlePreview.length > 20) titlePreview = titlePreview.substring(0,20)+"...";
        console.log("点击: " + titlePreview + " | 店铺: " + p.商品信息.店铺);
        click(p.选择按钮中心.x, p.选择按钮中心.y);
        sleep(500);
        selectedSignatures.add(sig);
        clickCount++;
        if(!selectAll && clickCount >= 3){
            console.log("⚠️ 非全选模式达到上限 3");
            break;
        }
        sleep(250);
    }
    console.log("✅ 本轮新点击: " + clickCount);
    return clickCount;
}

// 滚动
function performSmartScroll(deviceInfo){
    var startY = Math.floor(deviceInfo.height * 0.78);
    var endY   = Math.floor(deviceInfo.height * 0.28);
    var x      = Math.floor(deviceInfo.width * 0.5);
    console.log("👇 滑动: ("+x+","+startY+") -> ("+x+","+endY+")");
    swipe(x, startY, x, endY, 600);
}

// 自动滚动选择
function autoScrollAndSelectAll(){
    console.log("\n=== 🔄 开始自动滑动选择（增强去重） ===");
    var deviceInfo = getDeviceInfo();
    var noNewCount = 0;
    var maxNoNewScrolls = 3;
    var scrollCount = 0;
    var emptyPageCount = 0;

    while(noNewCount < maxNoNewScrolls){
        console.log("\n🔄 第 " + (scrollCount+1) + " 次处理");
        var list = getProductItemsFromUI();
        if(list.length === 0){
            emptyPageCount++;
            console.log("⚠️ 空页 emptyPageCount=" + emptyPageCount);
            if(emptyPageCount >= 2) {
                console.log("⚠️ 连续空页，结束");
                break;
            }
        }else{
            emptyPageCount = 0;
        }

        var fresh = [];
        for(var i=0;i<list.length;i++){
            var sig = list[i].签名;
            if(!sig) continue;
            if(!processedSignatures.has(sig)){
                fresh.push(list[i]);
            }
        }
        console.log("本次采集: " + list.length + "  新增未处理: " + fresh.length);

        for(var k=0;k<fresh.length;k++){
            processedSignatures.add(fresh[k].签名);
        }
        selectProducts(fresh, true);

        var currentBottomSignature = list.length > 0 ? list[list.length-1].签名 : null;

        if(fresh.length === 0){
            if(currentBottomSignature && currentBottomSignature === lastBottomSignature){
                console.log("⚠️ 底部签名未变化");
            }
            noNewCount++;
        } else {
            noNewCount = 0;
        }

        lastBottomSignature = currentBottomSignature;
        scrollCount++;

        if(noNewCount >= maxNoNewScrolls){
            console.log("🔚 连续 " + noNewCount + " 次无新增，结束");
            break;
        }
        performSmartScroll(deviceInfo);
        sleep(1200);
    }

    console.log("\n=== 🏁 自动完成 ===");
    console.log("总滚动次数: " + scrollCount);
    console.log("唯一商品数(签名): " + processedSignatures.size);
    console.log("已选中数: " + selectedSignatures.size);
}

// 主程序
function main(){
    console.log("=== 🚀 拼多多收藏商品选择脚本启动 ===");
    if(!device.width || !device.height){
        console.log("❌ 设备信息获取失败，检查无障碍或权限");
        return;
    }
    console.log("屏幕: " + device.width + "x" + device.height);
    console.log("期望页面标题: 全部收藏");
    sleep(1500);

    console.log("\n=== 📋 初次扫描 ===");
    var first = getProductItemsFromUI();
    // 先标记+点击
    var initFresh = [];
    for(var i=0;i<first.length;i++){
        var sig = first[i].签名;
        if(sig && !processedSignatures.has(sig)){
            processedSignatures.add(sig);
            initFresh.push(first[i]);
        }
    }
    selectProducts(initFresh, true);

    console.log("\n⏳ 1.5秒后开始自动滚动...");
    sleep(1500);
    autoScrollAndSelectAll();
    console.log("✅ 任务结束");
}

// 启动
main();
