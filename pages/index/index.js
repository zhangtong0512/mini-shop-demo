const mock = require('../../utils/mock')

Page({
  data: {
    banners: [],
    categories: [],
    activeCategory: 'all',
    allGoods: [],
    goodsList: [],
    bannerCurrent: 0
  },

  onLoad() {
    const allGoods = mock.getGoodsList()
    this.setData({
      banners: mock.getBanners(),
      categories: mock.getCategories(),
      allGoods,
      goodsList: allGoods
    })
  },

  // 点击搜索条跳转独立搜索页
  onSearchTap() {
    wx.navigateTo({ url: '/pages/search/search' })
  },

  // Banner 轮播切换时同步自定义指示点
  onBannerChange(e) {
    this.setData({ bannerCurrent: e.detail.current })
  },

  onCategoryTap(e) {
    this.setData({ activeCategory: e.currentTarget.dataset.id })
    this.filterGoods()
  },

  filterGoods() {
    const { allGoods, activeCategory } = this.data
    this.setData({
      goodsList: activeCategory === 'all' ? allGoods : allGoods.filter(g => g.category === activeCategory)
    })
  },

  onTapGoods(e) {
    wx.navigateTo({ url: '/pages/detail/detail?id=' + e.detail.id })
  }
})
