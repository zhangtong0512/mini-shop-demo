const mock = require('../../utils/mock')

Page({
  data: {
    banners: [],
    categories: [],
    activeCategory: 'all',
    allGoods: [],
    goodsList: [],
    bannerCurrent: 0,
    flashList: [],
    sortMode: 'default',
    priceMin: 0,
    priceMax: Infinity
  },

  onLoad() {
    const allGoods = mock.getGoodsList()
    this.setData({
      banners: mock.getBanners(),
      categories: mock.getCategories(),
      allGoods,
      goodsList: allGoods,
      flashList: mock.getFlashGoods()
    })
  },

  // 点击搜索条跳转独立搜索页
  onSearchTap() {
    wx.navigateTo({ url: '/pages/search/search' })
  },

  // 扫一扫：调用微信扫码能力（真机打开相机，开发者工具里可模拟扫码）
  onScanTap() {
    wx.scanCode({
      scanType: ['qrCode', 'barCode'],
      success: res => {
        const result = (res.result || '').trim()
        if (!result) {
          wx.showToast({ title: '未识别到内容', icon: 'none' })
          return
        }
        this.handleScanResult(result)
      },
      fail: err => {
        // 用户取消扫码时不提示
        if (err && err.errMsg && err.errMsg.indexOf('cancel') > -1) return
        wx.showToast({ title: '扫码失败，请重试', icon: 'none' })
      }
    })
  },

  // 处理扫码结果：商品码 → 跳详情；链接 → 复制；其它 → 弹窗展示
  handleScanResult(result) {
    // 商品码格式：goods:1001 / goods：1001 / 1001
    const m = result.match(/^goods[:：]?\s*(\d+)$/i)
    const gid = m ? m[1] : (/^\d+$/.test(result) ? result : '')
    if (gid) {
      const g = mock.getGoodsById(gid)
      if (g) {
        wx.navigateTo({ url: '/pages/detail/detail?id=' + g.id })
        return
      }
      wx.showToast({ title: '未找到对应商品', icon: 'none' })
      return
    }

    // http/https 链接：复制到剪贴板
    const isLink = /^https?:\/\//i.test(result)
    wx.showModal({
      title: '扫码结果',
      content: result,
      confirmText: isLink ? '复制链接' : '复制',
      cancelText: '关闭',
      success: r => {
        if (r.confirm) {
          wx.setClipboardData({
            data: result,
            success: () => wx.showToast({ title: isLink ? '链接已复制' : '已复制', icon: 'success' })
          })
        }
      }
    })
  },

  // Banner 轮播切换时同步自定义指示点
  onBannerChange(e) {
    this.setData({ bannerCurrent: e.detail.current })
  },

  // Banner 点击：商品 → 详情；分类 → 切换分类；其它 → 提示
  onBannerTap(e) {
    const b = e.currentTarget.dataset.banner || {}
    if (b.linkType === 'goods' && b.target) {
      wx.navigateTo({ url: '/pages/detail/detail?id=' + b.target })
    } else if (b.linkType === 'category' && b.target) {
      this.setData({ activeCategory: b.target })
      this.applyFilters()
      wx.pageScrollTo({ scrollTop: 320, duration: 300 })
    } else {
      wx.showToast({ title: b.title || '敬请期待', icon: 'none' })
    }
  },

  // 点击秒杀商品
  onTapFlash(e) {
    wx.navigateTo({ url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id })
  },

  onCategoryTap(e) {
    this.setData({ activeCategory: e.currentTarget.dataset.id })
    this.applyFilters()
  },

  // 分类 → 价格区间 → 排序 正交叠加
  applyFilters() {
    const { allGoods, activeCategory, sortMode, priceMin, priceMax } = this.data
    let list = allGoods
    if (activeCategory !== 'all') {
      list = list.filter(g => g.category === activeCategory)
    }
    list = mock.filterByPrice(list, priceMin, priceMax)
    list = mock.sortGoods(list, sortMode)
    this.setData({ goodsList: list })
  },

  onSortchange(e) {
    this.setData({ sortMode: e.detail.mode })
    this.applyFilters()
  },

  onPricechange(e) {
    this.setData({ priceMin: e.detail.min, priceMax: e.detail.max })
    this.applyFilters()
  },

  onTapGoods(e) {
    wx.navigateTo({ url: '/pages/detail/detail?id=' + e.detail.id })
  },

  onShareAppMessage() {
    return {
      title: '精选商城 · 微信小程序 Demo',
      path: '/pages/index/index'
    }
  }
})
