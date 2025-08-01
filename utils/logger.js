// 日志管理模块
// 负责统一的日志记录和显示

/**
 * 添加日志到悬浮窗
 * @param {Object} window 悬浮窗对象
 * @param {string} message 日志消息
 */
function addLog(window, message) {
    var timestamp = new Date().toLocaleTimeString();
    var logMessage = "[" + timestamp + "] " + message;
    
    ui.run(function() {
        var currentLog = window.logText.getText();
        var newLog = currentLog + "\n" + logMessage;
        
        // 限制日志长度，避免内存溢出
        var lines = newLog.split('\n');
        if (lines.length > 20) {
            lines = lines.slice(-20);
            newLog = lines.join('\n');
        }
        
        window.logText.setText(newLog);
    });
    
    console.log(logMessage);
}

/**
 * 记录信息日志
 * @param {string} message 日志消息
 */
function info(message) {
    var timestamp = new Date().toLocaleTimeString();
    var logMessage = "[" + timestamp + "] [INFO] " + message;
    console.log(logMessage);
}

/**
 * 记录错误日志
 * @param {string} message 日志消息
 */
function error(message) {
    var timestamp = new Date().toLocaleTimeString();
    var logMessage = "[" + timestamp + "] [ERROR] " + message;
    console.error(logMessage);
}

/**
 * 记录警告日志
 * @param {string} message 日志消息
 */
function warn(message) {
    var timestamp = new Date().toLocaleTimeString();
    var logMessage = "[" + timestamp + "] [WARN] " + message;
    console.warn(logMessage);
}

/**
 * 记录调试日志
 * @param {string} message 日志消息
 */
function debug(message) {
    var timestamp = new Date().toLocaleTimeString();
    var logMessage = "[" + timestamp + "] [DEBUG] " + message;
    console.log(logMessage);
}

module.exports = {
    addLog,
    info,
    error,
    warn,
    debug
};
