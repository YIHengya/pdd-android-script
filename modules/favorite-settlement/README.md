# favorite-settlement 模块拆分

该目录包含收藏结算模块的子功能，主入口仍由 `modules/favorite-settlement.js` 提供 `FavoriteSettlement` 类。这里将逻辑按职责拆分，便于复用与维护：

- preclear.js：预处理“已选”并回到顶部
- product.js：设备信息与商品识别/解析
- popup.js：规格弹窗检测关闭
- selection.js：自动下滑并勾选商品
- filter.js：进入“已选”并按价格阈值删除

其它脚本可按需直接引用某个子功能，或通过 `FavoriteSettlement` 统一使用。 