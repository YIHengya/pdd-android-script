// 搜索模式模块
// 功能：在拼多多首页或搜索页将关键词输入到搜索框，并点击“搜索”按钮提交

const NavigationHelper = require('../utils/navigation.js');
const { PDD_CONFIG } = require('../config/app-config.js');
const { safeClick, isInApp, GlobalStopManager } = require('../utils/common.js');
const logger = require('../utils/logger.js');
const { waitTimeManager } = require('../utils/wait-time-manager.js');
const HomeNavigation = require('../utils/navigation/home-navigation.js');
const SearchNavigation = require('../utils/navigation/search-navigation.js');
const ApiClient = require('../utils/api-client.js');
const ProductInfoExtractor = require('../utils/product-info.js');
const ForbiddenKeywordsChecker = require('../utils/forbidden-keywords-checker.js');
const Search = require('./product-favorite/search.js');
const Detail = require('./product-favorite/detail.js');
const Specification = require('./product-favorite/specification.js');
const Favorite = require('./product-favorite/favorite.js');

function SearchMode(){
  this.config = PDD_CONFIG;
  this.navigationHelper = new NavigationHelper();
  this.homeNavigation = new HomeNavigation();
  this.searchNavigation = new SearchNavigation();
  this.apiClient = new ApiClient();
  this.productInfoExtractor = new ProductInfoExtractor();
  this.keywordsChecker = new ForbiddenKeywordsChecker();
  this.favoriteButtons = [
    '收藏',
    '加入收藏',
    '收藏商品',
    '♡',
    '❤',
    '🤍',
    '♥'
  ];
  this.clickedPositions = [];
  this.currentScrollPosition = 0;
}

SearchMode.prototype.execute = function(window, keyword, options){
  keyword = (keyword && String(keyword).trim()) || '手机壳';
  options = options || {};
  var priceRange = options.priceRange || this.config.defaultPriceRange;
  var favoriteQuantity = options.favoriteQuantity || 10;
  var userName = options.userName || '用户';
  // 让规格选择使用阈值逻辑
  this.currentPriceRange = priceRange;

  logger.addLog(window, '=== 搜索模式启动 ===');
  logger.addLog(window, '关键词: ' + keyword);
  logger.addLog(window, '价格区间: ' + priceRange.min + '-' + priceRange.max + ' 元, 收藏数量: ' + favoriteQuantity);

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

    // 若已经在搜索结果列表页，跳过输入
    if(this.searchNavigation.isOnProductListPage()){
      logger.addLog(window, '✅ 已在商品列表页，跳过搜索');
    } else {
      // 聚焦搜索框
      if(!this.searchNavigation.focusSearchBar()){
        logger.addLog(window, '⚠️ 未能准确聚焦搜索框，继续尝试输入');
      }
      // 输入并提交
      this.searchNavigation.inputKeywordAndSearch(keyword);
      logger.addLog(window, '✅ 搜索动作完成');
    }

    // 开始列表页下滑寻找并收藏
    if(!this.navigationHelper.isAtProductListPage()){
      logger.addLog(window, '⚠️ 未能确认在商品列表页，将直接尝试列表识别与滚动');
    }

    this.resetSession();

    var successCount = 0;
    for(var i=0;i<favoriteQuantity;i++){
      if(GlobalStopManager.isStopRequested()){
        logger.addLog(window, '🛑 检测到停止信号，终止收藏流程');
        break;
      }

      logger.addLog(window, '=== 开始收藏第 ' + (i+1) + ' 件商品 ===');

      // 确保在列表页，不在则返回并重新搜索
      if(!this.navigationHelper.isAtProductListPage()){
        logger.addLog(window, '不在列表页，尝试返回列表...');
        if(!this.backToProductListPage(window)){
          logger.addLog(window, '返回失败，回主页并重新搜索');
          this.homeNavigation.goToHomePage(window);
          waitTimeManager.wait('pageStable');
          if(!this.searchNavigation.focusSearchBar()){
            logger.addLog(window, '⚠️ 重新聚焦搜索框失败');
          }
          this.searchNavigation.inputKeywordAndSearch(keyword);
          waitTimeManager.wait('pageStable');
        }
      }

      var forceScroll = i > 0;
      var foundProduct = this.findProducts(window, priceRange, forceScroll);
      if(!foundProduct){
        logger.addLog(window, '未找到符合条件的商品，跳过');
        continue;
      }

      logger.addLog(window, "找到商品信息 - 文本: '" + foundProduct.text + "', 价格: " + foundProduct.price + ' 元');

      // 提取商品信息并权限检查
      var productInfo = this.productInfoExtractor.extractProductInfo(window, userName, foundProduct.price);
      if(!productInfo){
        logger.addLog(window, '无法获取商品信息，返回列表继续寻找');
        this.backToProductListPage(window);
        continue;
      }
      var checkResult = this.apiClient.checkOrderPermissionWithRetry(window, productInfo);
      if(!checkResult.canOrder){
        logger.addLog(window, '不能收藏此商品: ' + checkResult.message);
        this.backToProductListPage(window);
        continue;
      }

      // 收藏前兜底：如有规格弹窗残留，先关闭
      try{
        if(this.checkSpecificationPageVisible(window)){
          logger.addLog(window, '检测到规格弹窗残留，先关闭再收藏');
          this.closeSpecificationPage(window);
          waitTimeManager.wait('medium');
        }
      }catch(_){ }

      // 新增：先判断是否已收藏
      try{
        if(this.isProductAlreadyFavorited(window)){
          logger.addLog(window, '🔖 该商品已在收藏中，跳过本商品');
          if(!this.backToProductListPage(window)){
            logger.addLog(window, '⚠️ 无法返回列表页，回主页并重新搜索');
            this.homeNavigation.goToHomePage(window);
            waitTimeManager.wait('pageStable');
            if(!this.searchNavigation.focusSearchBar()){
              logger.addLog(window, '⚠️ 重新聚焦搜索框失败');
            }
            this.searchNavigation.inputKeywordAndSearch(keyword);
            waitTimeManager.wait('pageStable');
          }
          continue;
        }
      }catch(_){}

      // 收藏
      var favoriteSuccess = this.favoriteProduct(window);
      // 收藏后兜底：再次尝试关闭可能残留的规格弹窗/遮罩
      try{
        if(this.checkSpecificationPageVisible(window)){
          logger.addLog(window, '收藏后仍检测到规格界面，执行关闭');
          this.closeSpecificationPage(window);
        }
      }catch(_){ }
      if(favoriteSuccess){
        successCount++;
        logger.addLog(window, '✅ 第 ' + (i+1) + ' 件商品收藏成功');
      }else{
        logger.addLog(window, '❌ 第 ' + (i+1) + ' 件商品收藏失败');
      }

      // 返回列表，准备下一件
      if(!this.backToProductListPage(window)){
        logger.addLog(window, '⚠️ 无法返回列表页，回主页并重新搜索');
        this.homeNavigation.goToHomePage(window);
        waitTimeManager.wait('pageStable');
        if(!this.searchNavigation.focusSearchBar()){
          logger.addLog(window, '⚠️ 重新聚焦搜索框失败');
        }
        this.searchNavigation.inputKeywordAndSearch(keyword);
        waitTimeManager.wait('pageStable');
      }
      waitTimeManager.wait('pageStable');
    }

    logger.addLog(window, '=== 收藏流程完成 ===');
    logger.addLog(window, '成功收藏: ' + successCount + '/' + favoriteQuantity + ' 件商品');
    return successCount > 0;

  }catch(e){
    logger.addLog(window, '❌ 搜索模式执行出错: ' + e.message);
    return false;
  }
};

// 复用 product-favorite 子模块方法
SearchMode.prototype.resetSession = function(){
  this.clickedPositions = [];
  this.currentScrollPosition = 0;
};
SearchMode.prototype.clearClickedPositions = function(){
  this.clickedPositions = [];
};
SearchMode.prototype.addClickedPosition = function(position){
  if(!this.clickedPositions) this.clickedPositions = [];
  this.clickedPositions.push(position);
};
SearchMode.prototype.isPositionClicked = function(position){
  if(!this.clickedPositions) return false;
  for(var i=0;i<this.clickedPositions.length;i++){
    var p = this.clickedPositions[i];
    if(Math.abs(p.centerX - position.centerX) < 5 && Math.abs(p.centerY - position.centerY) < 5){
      return true;
    }
  }
  return false;
};

SearchMode.prototype.findProducts = function(window, priceRange, forceScroll){
  return Search.findProducts.call(this, window, priceRange, forceScroll);
};
SearchMode.prototype.isSearchBoxOrNonProductArea = function(element, text){
  return Search.isSearchBoxOrNonProductArea.call(this, element, text);
};
SearchMode.prototype.findClickableProductArea = function(window, priceElement){
  return Search.findClickableProductArea.call(this, window, priceElement);
};
SearchMode.prototype.findImageAreaNearPrice = function(window, priceBounds){
  return Search.findImageAreaNearPrice.call(this, window, priceBounds);
};
SearchMode.prototype.clickProduct = function(window, element){
  return Search.clickProduct.call(this, window, element);
};

SearchMode.prototype.verifyProductDetailPage = function(window){
  return Detail.verifyProductDetailPage.call(this, window);
};

SearchMode.prototype.triggerSpecificationSelection = function(window){
  return Specification.triggerSpecificationSelection.call(this, window);
};
SearchMode.prototype.checkSpecificationPageVisible = function(window){
  return Specification.checkSpecificationPageVisible.call(this, window);
};
SearchMode.prototype.closeSpecificationPage = function(window){
  return Specification.closeSpecificationPage.call(this, window);
};

SearchMode.prototype.favoriteProduct = function(window){
  return Favorite.favoriteProduct.call(this, window);
};
SearchMode.prototype.verifyFavoriteSuccess = function(window){
  return Favorite.verifyFavoriteSuccess.call(this, window);
};
SearchMode.prototype.isProductAlreadyFavorited = function(window){
  return Favorite.isProductAlreadyFavorited.call(this, window);
};

SearchMode.prototype.backToProductListPage = function(window){
  try{
    for(var i=0;i<this.config.maxRetries;i++){
      if(this.navigationHelper.isAtProductListPage()){
        return true;
      }
      back();
      waitTimeManager.wait('back');
      if(this.navigationHelper.isAtProductListPage()){
        return true;
      }
    }
  }catch(e){
    logger.addLog(window, '返回列表页时出错: ' + e.message);
  }
  return false;
};

module.exports = SearchMode; 