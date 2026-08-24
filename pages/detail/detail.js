const mock = require('../../utils/mock')
const cart = require('../../utils/cart')
const favorite = require('../../utils/favorite')
const review = require('../../utils/review')

Page({
  data: {
    goods: null,
    count: 1,
    galleryCurrent: 0,
    isFav: false,
    reviewCount: 0,
    reviewAvg: 0,
    reviewStars: '',
    reviewPreview: []
  },

  onLoad(options) {
    const goods = mock.getGoodsById(options.id)
    const rating = review.getGoodsRating(options.id)
    const round = Math.round(rating.avg)
    const isFlash = mock.isFlashActive(goods)
    this.setData({
      goods,
      isFlash,
      flashRemain: isFlash ? mock.flashRemainText(goods.flashEndsAt) : '',
      isFav: favorite.isFavorite(options.id),
      reviewCount: rating.count,
      reviewAvg: rating.avg,
      reviewStars: '★★★★★'.slice(0, round) + '☆☆☆☆☆'.slice(0, 5 - round),
      reviewPreview: review.getReviewsByGoods(options.id).slice(0, 2)
    })
    if (goods) {
      wx.setNavigationBarTitle({ title: goods.title })
    }
    this.syncFlashTimer()
  },

  onHide() {
    this.clearFlashTimer()
  },

  onUnload() {
    this.clearFlashTimer()
  },

  // 闪购倒计时：秒杀生效时每秒刷新剩余时间
  syncFlashTimer() {
    this.clearFlashTimer()
    if (this.data.isFlash) {
      this._flashTimer = setInterval(() => {
        this.setData({ flashRemain: mock.flashRemainText(this.data.goods.flashEndsAt) })
      }, 1000)
    }
  },

  clearFlashTimer() {
    if (this._flashTimer) {
      clearInterval(this._flashTimer)
      this._flashTimer = null
    }
  },

  // 查看全部评价
  onReviewTap() {
    if (!this.data.goods) return
    wx.navigateTo({ url: '/pages/review-list/review-list?id=' + this.data.goods.id })
  },

  // 顶部轮播切换时同步页码角标
  onGalleryChange(e) {
    this.setData({ galleryCurrent: e.detail.current })
  },

  // 点击轮播图预览（从当前图开始，可左右滑动）
  onGalleryTap(e) {
    const src = e.currentTarget.dataset.src
    const urls = (this.data.goods && this.data.goods.galleryImages) || []
    wx.previewImage({ current: src, urls })
  },

  onMinus() {
    if (this.data.count > 1) {
      this.setData({ count: this.data.count - 1 })
    }
  },

  onPlus() {
    if (this.data.count < 99) {
      this.setData({ count: this.data.count + 1 })
    }
  },

  onAddCart() {
    if (!this.data.goods) return
    // 闪购商品按秒杀价入购物车（价格在加入时固化）
    const goods = Object.assign({}, this.data.goods, { price: mock.getEffectivePrice(this.data.goods) })
    cart.addToCart(goods, this.data.count)
    wx.showToast({ title: '已加入购物车', icon: 'success' })
  },

  // 点击详情大图预览（左右滑动查看全部）
  onPreview(e) {
    const src = e.currentTarget.dataset.src
    const goods = this.data.goods
    const urls = (goods && goods.detailImages) || []
    wx.previewImage({ current: src, urls })
  },

  onBuyNow() {
    if (!this.data.goods) return
    const count = this.data.count
    if (count > this.data.goods.stock) {
      wx.showToast({ title: '库存不足', icon: 'none' })
      return
    }
    // 立即购买：不经过购物车，直达确认订单页
    wx.navigateTo({
      url: '/pages/checkout/checkout?from=buynow&id=' + this.data.goods.id + '&count=' + count
    })
  },

  onGoHome() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  onGoCart() {
    wx.switchTab({ url: '/pages/cart/cart' })
  },

  onToggleFav() {
    if (!this.data.goods) return
    const now = favorite.toggleFavorite(this.data.goods.id)
    this.setData({ isFav: now })
    wx.showToast({ title: now ? '已收藏' : '已取消收藏', icon: 'none' })
  },

  onShareAppMessage() {
    const goods = this.data.goods
    return {
      title: goods ? goods.title : '精选商城',
      path: '/pages/detail/detail?id=' + (goods ? goods.id : '')
    }
  },

  // 分享到朋友圈（小程序支持仅分享当前页，query 由页面路径携带）
  onShareTimeline() {
    const goods = this.data.goods
    return {
      title: goods ? goods.title : '精选商城'
    }
  }
})
