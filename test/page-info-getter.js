// 修复版本 - 获取UI信息
function dumpAllWidgets() {
    console.log("=== 开始获取UI信息 ===");
    
    // 获取根节点
    var root = className("android.widget.FrameLayout").findOne(1000);
    if (!root) {
        console.log("未找到根节点");
        return;
    }
    
    // 递归遍历所有子控件
    function traverseNode(node, level) {
        if (!level) level = 0;
        
        var indent = "";
        for (var i = 0; i < level; i++) {
            indent += "  ";
        }
        
        var bounds = node.bounds();
        var className = node.className() || "unknown";
        var text = node.text() || "";
        var desc = node.desc() || "";
        var id = node.id() || "";
        
        console.log(indent + "<" + className + 
            " bounds=\"[" + bounds.left + "," + bounds.top + "][" + bounds.right + "," + bounds.bottom + "]\"" +
            " text=\"" + text + "\"" +
            " desc=\"" + desc + "\"" +
            " id=\"" + id + "\"" +
            " clickable=\"" + node.clickable() + "\"" +
            " scrollable=\"" + node.scrollable() + "\"" +
            " />");
        
        // 遍历子节点
        for (var i = 0; i < node.childCount(); i++) {
            var child = node.child(i);
            if (child) {
                traverseNode(child, level + 1);
            }
        }
    }
    
    traverseNode(root);
    console.log("=== UI信息获取完成 ===");
  }
  
  // 执行
  dumpAllWidgets();