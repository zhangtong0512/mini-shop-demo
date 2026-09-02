const mock = require('../../utils/mock')
const groupBuy = require('../../utils/group-buy')

Page({
  data: {
    groupGoods: [],
    activeGroups: [],
    loading: false
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  loadData() {
    const groupGoods = groupBuy.getGroupGoods(mock)
    const activeGroups = groupBuy.getActiveGroups()
    this.setData({ groupGoods, activeGroups })
  },

  onGroupGoodsTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/detail/detail?id=' + id + '&mode=group' })
  },

  onGroupTap(e) {
    const groupId = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/group-detail/group-detail?id=' + groupId })
  },

  onShareAppMessage() {
    return {
      title: '精选商城 · 拼团专区',
      path: '/pages/group-buy/group-buy'
    }
  },

  onShareTimeline() {
    return {
      title: '精选商城 · 拼团专区'
    }
  }
})
