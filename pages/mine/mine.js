const cart = require('../../utils/cart')
const mock = require('../../utils/mock')
const user = require('../../utils/user')

Page({
  data: {
    user: null,
    isLoggedIn: false,
    avatarError: false,
    avatarText: '😀',
    orderCounts: [0, 0, 0, 0]
  },

  onShow() {
    // 登录态 + 各状态订单数量 + 购物车角标兜底
    const u = user.getUserInfo()
    this.setData({
      isLoggedIn: !!u,
      user: u,
      avatarError: false,
      // 无头像时用昵称首字 / 默认表情兜底
      avatarText: u && u.nickname ? u.nickname[0] : '😀'
    })
    const orders = mock.getOrders()
    this.setData({
      orderCounts: [1, 2, 3, 4].map(s => orders.filter(o => o.status === s).length)
    })
    cart.updateBadge()
  },

  onOrderTap(e) {
    const tab = e.currentTarget.dataset.tab
    // 订单是 tabBar 页，必须用 switchTab（无法带参），先存全局再跳转
    getApp().globalData.orderTab = Number(tab)
    wx.switchTab({ url: '/pages/order/order' })
  },

  onAddressTap() {
    wx.navigateTo({ url: '/pages/address/address' })
  },

  // 点击头像区：未登录去登录，已登录去编辑资料
  onProfileTap() {
    wx.navigateTo({ url: '/pages/user-info/user-info' })
  },

  onCouponTap() {
    wx.navigateTo({ url: '/pages/coupon/coupon' })
  },

  onFavoriteTap() {
    wx.navigateTo({ url: '/pages/favorite/favorite' })
  },

  onHelpTap() {
    wx.navigateTo({ url: '/pages/help/help' })
  },

  onSettingsTap() {
    wx.navigateTo({ url: '/pages/settings/settings' })
  },

  // 头像临时路径失效时兜底为昵称首字
  onAvatarError() {
    this.setData({ avatarError: true })
  },

  onShareAppMessage() {
    return {
      title: '精选商城 · 微信小程序 Demo',
      path: '/pages/index/index'
    }
  }
})
