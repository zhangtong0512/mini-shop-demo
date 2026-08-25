const favorite = require('../../utils/favorite')
const mock = require('../../utils/mock')

Page({
  data: {
    list: [],
    sortMode: 'default'
  },

  onShow() {
    // onShow 刷新：从详情页取消收藏返回后保持同步
    this.refresh()
  },

  refresh() {
    this.setData({ list: mock.sortGoods(favorite.getFavoriteGoods(), this.data.sortMode) })
  },

  onSortchange(e) {
    this.setData({ sortMode: e.detail.mode })
    this.refresh()
  },

  onTapGoods(e) {
    wx.navigateTo({ url: '/pages/detail/detail?id=' + e.detail.id })
  },

  onRemoveGoods(e) {
    favorite.toggleFavorite(e.detail.id)
    this.refresh()
  },

  onGoShopping() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
