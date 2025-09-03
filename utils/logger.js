// 日志管理模块
// 负责统一的日志记录和显示

/**
 * 添加日志到悬浮窗
 * @param {Object} window 悬浮窗对象（可以为null）
 * @param {string} message 日志消息
 */
function addLog(window, message) {
  var timestamp = new Date().toLocaleTimeString();
  var logMessage = "[" + timestamp + "] " + message;

  // 如果window存在且有logText属性，则更新悬浮窗日志
  if (window && window.logText) {
    ui.run(function() {
      try {
        var currentLog = window.logText.getText();
        var newLog = currentLog + "\n" + logMessage;

        // 限制日志长度，避免内存溢出
        var lines = newLog.split('\n');
        if (lines.length > 20) {
          lines = lines.slice(-20);
          newLog = lines.join('\n');
        }

        window.logText.setText(newLog);
      } catch (e) {
        console.error("更新悬浮窗日志失败: " + e.message);
      }
    });
  }

  // 如果主界面的日志区域存在，也同步输出到主界面
  try {
    if (typeof ui !== 'undefined' && ui.logText) {
      ui.run(function() {
        try {
          var currentText = ui.logText.getText();
          var merged = currentText + "\n" + logMessage;
          // 控制长度，保留最后1000字符
          if (merged.length > 1000) {
            merged = "...\n" + merged.substring(merged.length - 900);
          }
          ui.logText.setText(merged);
        } catch (e) {}
      });
    }
  } catch (e) {}

  // 始终输出到控制台
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
