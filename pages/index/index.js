const mock = require('../../utils/mock')

Page({
  data: {
    banners: [],
    categories: [],
    activeCategory: 'all',
    keyword: '',
    allGoods: [],
    goodsList: []
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

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value })
    this.filterGoods()
  },

  onSearch() {
    this.filterGoods()
  },

  onCategoryTap(e) {
    this.setData({ activeCategory: e.currentTarget.dataset.id })
    this.filterGoods()
  },

  filterGoods() {
    const { allGoods, activeCategory, keyword } = this.data
    let list = allGoods
    if (activeCategory !== 'all') {
      list = list.filter(g => g.category === activeCategory)
    }
    const kw = keyword.trim()
    if (kw) {
      list = list.filter(g =>
        g.title.indexOf(kw) > -1 || (g.tags || []).some(t => t.indexOf(kw) > -1)
      )
    }
    this.setData({ goodsList: list })
  },

  onTapGoods(e) {
    wx.navigateTo({ url: '/pages/detail/detail?id=' + e.detail.id })
  }
})
