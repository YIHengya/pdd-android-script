// 权限管理模块
// 负责检查和请求必要的权限

/**
 * 检查所有必要的权限
 * @returns {boolean} 是否所有权限都已获得
 */
function checkPermissions() {
    // 检查无障碍服务
    if (!auto.service) {
        toast("请先开启无障碍服务");
        auto.waitFor();
    }

    // 检查悬浮窗权限
    if (!floaty.checkPermission()) {
        toast("请授予悬浮窗权限");
        floaty.requestPermission();
        exit();
    }
    
    return true;
}

/**
 * 检查无障碍服务权限
 * @returns {boolean} 是否已开启无障碍服务
 */
function checkAccessibilityService() {
    return auto.service !== null;
}

/**
 * 检查悬浮窗权限
 * @returns {boolean} 是否已获得悬浮窗权限
 */
function checkFloatyPermission() {
    return floaty.checkPermission();
}

/**
 * 请求悬浮窗权限
 */
function requestFloatyPermission() {
    floaty.requestPermission();
}

module.exports = {
    checkPermissions,
    checkAccessibilityService,
    checkFloatyPermission,
    requestFloatyPermission
};
