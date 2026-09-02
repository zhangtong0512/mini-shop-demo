const mock = require('../../utils/mock')
const cart = require('../../utils/cart')
const favorite = require('../../utils/favorite')
const review = require('../../utils/review')
const groupBuy = require('../../utils/group-buy')
const user = require('../../utils/user')

Page({
  data: {
    goods: null,
    count: 1,
    galleryCurrent: 0,
    isFav: false,
    reviewCount: 0,
    reviewAvg: 0,
    reviewStars: '',
    reviewPreview: [],
    hasSpec: false,
    skuKey: '',
    skuPrice: 0,
    skuStock: 0,
    skuText: '',
    countMax: 1,
    isGroupMode: false,
    groupPrice: 0,
    groupConfig: null,
    canCreateGroup: true,
    joinableGroups: []
  },

  onLoad(options) {
    const goods = mock.getGoodsById(options.id)
    const rating = review.getGoodsRating(options.id)
    const round = Math.round(rating.avg)
    const hasSpec = !!(goods && goods.specs && goods.specs.length)
    const isFlash = mock.isFlashActive(goods)
    
    // 拼团模式
    const isGroupMode = options.mode === 'group'
    const groupConfig = groupBuy.getGroupGoodsConfig().find(c => c.goodsId === Number(options.id))
    
    // 默认选中首个 SKU（有规格商品）
    let skuKey = ''
    let skuPrice = goods ? goods.price : 0
    let skuStock = goods ? goods.stock : 0
    if (hasSpec && goods) {
      skuKey = goods.skus[0].key
      skuPrice = mock.getSkuPrice(goods, skuKey)
      skuStock = mock.getSkuStock(goods, skuKey)
    }
    
    // 获取可参与的拼团
    const userInfo = user.getUserInfo()
    const userId = userInfo ? userInfo.id : ''
    const joinableGroups = groupConfig ? groupBuy.getJoinableGroups(Number(options.id), userId) : []
    const canCreateGroup = groupConfig ? groupBuy.canCreateGroup(Number(options.id), userId) : false
    
    this.setData({
      goods,
      isFlash,
      flashRemain: isFlash ? mock.flashRemainText(goods.flashEndsAt) : '',
      isFav: favorite.isFavorite(options.id),
      reviewCount: rating.count,
      reviewAvg: rating.avg,
      reviewStars: '★★★★★'.slice(0, round) + '☆☆☆☆☆'.slice(0, 5 - round),
      reviewPreview: review.getReviewsByGoods(options.id).slice(0, 2),
      hasSpec,
      skuKey,
      skuPrice,
      skuStock,
      skuText: mock.specText(goods, skuKey),
      countMax: skuStock || 1,
      isGroupMode,
      groupPrice: groupConfig ? groupConfig.groupPrice : 0,
      groupConfig,
      canCreateGroup,
      joinableGroups
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
    if (this.data.countMax > 0 && this.data.count < this.data.countMax) {
      this.setData({ count: this.data.count + 1 })
    }
  },

  async onAddCart() {
    if (!this.data.goods) return
    // 闪购价由 utils/cart.js 在加购时按 isFlashActive 固化，无需在此注入
    if (this.data.hasSpec) {
      const res = await this._openSkuSheet('cart')
      if (res) this._doAddCart(res.skuKey, res.count)
      return
    }
    this._doAddCart('', this.data.count)
  },

  // 打开规格选择弹层，返回 Promise<{skuKey, count} | null>
  _openSkuSheet(mode) {
    return this.selectComponent('#skuSheet').show(this.data.goods, { mode })
  },

  _doAddCart(skuKey, count) {
    const r = cart.addToCart(this.data.goods, count, skuKey)
    if (r.ok) {
      wx.showToast({ title: '已加入购物车', icon: 'success' })
    } else {
      wx.showToast({ title: r.msg, icon: 'none' })
    }
  },

  // 点击「规格」行：选择规格并应用到当前页面展示
  onSpecTap() {
    this.selectComponent('#skuSheet').show(this.data.goods, { mode: 'select' }).then(res => {
      if (res) {
        const g = this.data.goods
        const stock = mock.getSkuStock(g, res.skuKey) || 1
        this.setData({
          skuKey: res.skuKey,
          skuPrice: mock.getSkuPrice(g, res.skuKey),
          skuStock: mock.getSkuStock(g, res.skuKey),
          skuText: mock.specText(g, res.skuKey),
          countMax: stock,
          count: Math.min(this.data.count, stock)
        })
      }
    })
  },

  // 点击详情大图预览（左右滑动查看全部）
  onPreview(e) {
    const src = e.currentTarget.dataset.src
    const goods = this.data.goods
    const urls = (goods && goods.detailImages) || []
    wx.previewImage({ current: src, urls })
  },

  async onBuyNow() {
    if (!this.data.goods) return
    if (this.data.hasSpec) {
      const res = await this._openSkuSheet('buy')
      if (res) this._doBuyNow(res.skuKey, res.count)
      return
    }
    if (this.data.count > this.data.goods.stock) {
      wx.showToast({ title: '库存不足', icon: 'none' })
      return
    }
    // 立即购买：不经过购物车，直达确认订单页
    this._doBuyNow('', this.data.count)
  },

  _doBuyNow(skuKey, count) {
    const params = 'from=buynow&id=' + this.data.goods.id + '&count=' + count +
      (skuKey ? '&sku=' + encodeURIComponent(skuKey) : '')
    wx.navigateTo({ url: '/pages/checkout/checkout?' + params })
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

  onCreateGroup() {
    const userInfo = user.getUserInfo()
    if (!userInfo) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        success: res => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/user-info/user-info' })
          }
        }
      })
      return
    }

    if (!this.data.canCreateGroup) {
      wx.showToast({ title: '已达拼团次数上限', icon: 'none' })
      return
    }

    const result = groupBuy.createGroup(
      this.data.goods.id,
      userInfo.id,
      userInfo.nickname,
      userInfo.avatar
    )

    if (result.ok) {
      wx.showToast({ title: '拼团已创建', icon: 'success' })
      setTimeout(() => {
        wx.navigateTo({ url: '/pages/group-detail/group-detail?id=' + result.group.id })
      }, 1500)
    } else {
      wx.showToast({ title: result.msg, icon: 'none' })
    }
  },

  onJoinableGroupTap(e) {
    const groupId = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/group-detail/group-detail?id=' + groupId })
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
