const settings = require('../../utils/settings')
const search = require('../../utils/search')
const cart = require('../../utils/cart')
const address = require('../../utils/address')
const mock = require('../../utils/mock')
const coupon = require('../../utils/coupon')
const review = require('../../utils/review')
const points = require('../../utils/points')
const afterSale = require('../../utils/after-sale')
const member = require('../../utils/member')
const notification = require('../../utils/notification')
const store = require('../../utils/store')
const groupBuy = require('../../utils/group-buy')
const live = require('../../utils/live')
const ar = require('../../utils/ar')
const distribution = require('../../utils/distribution')
const compare = require('../../utils/compare')

Page({
  data: {
    notify: true
  },

  onLoad() {
    this.setData({ notify: settings.getSettings().notify })
  },

  // 通知开关同时写两处：settings 保留用户偏好，notification 决定哪些通知真的会写进来
  onNotifyChange(e) {
    const on = e.detail.value
    settings.setNotify(on)
    notification.updateSettings({
      orderNotify: on,
      systemNotify: on,
      promotionNotify: on
    })
    wx.showToast({ title: on ? '已开启通知' : '已关闭通知', icon: 'none' })
  },

  onClearSearch() {
    wx.showModal({
      title: '清除搜索历史',
      content: '确定清空搜索历史记录吗？',
      success: res => {
        if (res.confirm) {
          search.clearHistory()
          wx.showToast({ title: '已清除', icon: 'none' })
        }
      }
    })
  },

  // 清空全部本地数据并重新预置示例，恢复初始演示状态
  onResetDemo() {
    wx.showModal({
      title: '重置演示数据',
      content: '将清空购物车、订单、地址、收藏、评价、优惠券、积分等全部本地数据并恢复初始示例，确定继续？',
      success: res => {
        if (res.confirm) {
          wx.clearStorageSync()
          // 与 app.js onLaunch 的初始化保持一致，新增模块（会员/通知/门店/拼团/直播/AR/分销/对比）都要补种
          cart.init()
          address.ensureSeed()
          mock.ensureSeedOrders()
          coupon.ensureSeed()
          review.ensureSeed()
          points.ensureSeed()
          afterSale.ensureSeed()
          member.ensureSeed()
          notification.ensureSeed()
          store.ensureSeed()
          groupBuy.ensureSeed()
          live.ensureSeed()
          ar.ensureSeed()
          distribution.ensureSeed()
          compare.ensureSeed()
          this.setData({ notify: settings.getSettings().notify })
          wx.showToast({ title: '已重置', icon: 'success' })
        }
      }
    })
  },

  onAbout() {
    wx.showModal({
      title: '关于',
      content: '精选商城 · 微信小程序 Demo\n版本 v1.0.0\n纯前端 + 本地存储实现，无后端依赖。',
      showCancel: false,
      confirmText: '知道了'
    })
  }
})
