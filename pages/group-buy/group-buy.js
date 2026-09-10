const mock = require('../../utils/mock')
const groupBuy = require('../../utils/group-buy')
const user = require('../../utils/user')

Page({
  data: {
    groupGoods: [],
    activeGroups: [],
    myGroups: [],
    loading: false
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  loadData() {
    // 先把过期未成团的团判定为失败，避免列表里一直挂着已过期的团
    groupBuy.checkGroupStatus()

    const groupGoods = groupBuy.getGroupGoods(mock)
    const activeGroups = groupBuy.getActiveGroups().map(g => Object.assign({}, g, {
      remainText: groupBuy.formatRemainTime(groupBuy.getGroupRemainTime(g))
    }))
    const myGroups = user.isLoggedIn() ? groupBuy.getMyGroupsDetail(mock) : []
    this.setData({ groupGoods, activeGroups, myGroups })
  },

  onGroupGoodsTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/detail/detail?id=' + id + '&mode=group' })
  },

  // 发起拼团：下单支付成功后才开团
  onStartGroupTap(e) {
    const id = e.currentTarget.dataset.id
    if (!user.isLoggedIn()) {
      wx.showModal({
        title: '请先登录',
        content: '登录后才能发起拼团',
        confirmText: '去登录',
        success: r => {
          if (r.confirm) wx.navigateTo({ url: '/pages/user-info/user-info' })
        }
      })
      return
    }
    if (!groupBuy.canCreateGroup(Number(id), user.getUserId())) {
      wx.showToast({ title: '该商品已达拼团次数上限', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/pages/group-order/group-order?goodsId=' + id + '&isGroup=false' })
  },

  onGroupTap(e) {
    const groupId = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/group-detail/group-detail?id=' + groupId })
  },

  // 我的拼团：有关联订单直接进订单详情，否则进拼团详情
  onMyGroupTap(e) {
    const { groupid, orderno } = e.currentTarget.dataset
    const order = orderno ? mock.getOrders().find(o => o.orderNo === orderno) : null
    if (order) {
      wx.navigateTo({ url: '/pages/order-detail/order-detail?id=' + order.id })
    } else {
      wx.navigateTo({ url: '/pages/group-detail/group-detail?id=' + groupid })
    }
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
