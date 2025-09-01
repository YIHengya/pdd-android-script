const logger = require('../../utils/logger.js');

module.exports = {
    /**
     * 重置收藏会话
     */
    resetSession: function() {
        this.clearClickedPositions();
        console.log("收藏会话已重置");
    },

    /**
     * 检查位置是否已经点击过
     * @param {Object} position 位置信息 {centerX, centerY, text}
     * @returns {boolean} 是否已点击过
     */
    isPositionClicked: function(position) {
        var threshold = 50; // 位置阈值，像素

        for (var i = 0; i < this.clickedPositions.length; i++) {
            var clickedPos = this.clickedPositions[i];
            var distance = Math.sqrt(
                Math.pow(position.centerX - clickedPos.centerX, 2) +
                Math.pow(position.centerY - clickedPos.centerY, 2)
            );

            if (distance < threshold) {
                return true;
            }
        }
        return false;
    },

    /**
     * 添加已点击位置记录
     * @param {Object} position 位置信息 {centerX, centerY, text}
     */
    addClickedPosition: function(position) {
        this.clickedPositions.push({
            centerX: position.centerX,
            centerY: position.centerY,
            text: position.text,
            timestamp: Date.now()
        });

        // 限制记录数量，避免内存占用过多
        if (this.clickedPositions.length > 100) {
            this.clickedPositions.shift(); // 移除最早的记录
        }

        console.log("已记录点击位置: " + position.text + " (" + position.centerX + "," + position.centerY + ")");
    },

    /**
     * 清除位置记录
     */
    clearClickedPositions: function() {
        this.clickedPositions = [];
        this.currentScrollPosition = 0;
        console.log("已清除所有位置记录");
    }
}; 