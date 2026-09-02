const cart = require('../../utils/cart')
const mock = require('../../utils/mock')
const user = require('../../utils/user')
const favorite = require('../../utils/favorite')
const coupon = require('../../utils/coupon')
const points = require('../../utils/points')
const member = require('../../utils/member')
const notification = require('../../utils/notification')

Page({
  data: {
    user: null,
    isLoggedIn: false,
    avatarError: false,
    avatarText: '😀',
    orderCounts: [0, 0, 0, 0],
    favCount: 0,
    couponCount: 0,
    cartCount: 0,
    pointsBalance: 0,
    memberInfo: null,
    unreadCount: 0
  },

  onShow() {
    // 登录态 + 各状态订单数量 + 头部统计 + 购物车角标
    const u = user.getUserInfo()
    const orders = mock.getOrders()
    const now = Date.now()
    const memberInfo = member.getMemberInfo()
    const unreadCount = notification.getUnreadCount()
    this.setData({
      isLoggedIn: !!u,
      user: u,
      avatarError: false,
      // 无头像时用昵称首字 / 默认表情兜底
      avatarText: u && u.nickname ? u.nickname[0] : '😀',
      orderCounts: [1, 2, 3, 4].map(s => orders.filter(o => o.status === s).length),
      favCount: favorite.getCount(),
      // 可用券：未使用且未过期
      couponCount: coupon.getCoupons().filter(c => c.status === 0 && c.expireTime > now).length,
      cartCount: cart.getCart().reduce((sum, i) => sum + i.count, 0),
      pointsBalance: points.getBalance(),
      memberInfo,
      unreadCount
    })
    cart.updateBadge()
  },

  onOrderTap(e) {
    const tab = e.currentTarget.dataset.tab
    // 订单是 tabBar 页，必须用 switchTab（无法带参），先存全局再跳转
    getApp().globalData.orderTab = Number(tab)
    wx.switchTab({ url: '/pages/order/order' })
  },

  // 头部「全部订单」
  onAllOrderTap() {
    getApp().globalData.orderTab = 'all'
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

  onCheckinTap() {
    wx.navigateTo({ url: '/pages/checkin/checkin' })
  },

  onMemberTap() {
    wx.navigateTo({ url: '/pages/member/member' })
  },

  onNotificationTap() {
    wx.navigateTo({ url: '/pages/notification/notification' })
  },

  onHelpTap() {
    wx.navigateTo({ url: '/pages/help/help' })
  },

  onSettingsTap() {
    wx.navigateTo({ url: '/pages/settings/settings' })
  },

  onCartTap() {
    wx.switchTab({ url: '/pages/cart/cart' })
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
