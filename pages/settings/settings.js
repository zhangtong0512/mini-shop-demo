const settings = require('../../utils/settings')
const search = require('../../utils/search')
const cart = require('../../utils/cart')
const address = require('../../utils/address')
const mock = require('../../utils/mock')
const coupon = require('../../utils/coupon')
const review = require('../../utils/review')
const points = require('../../utils/points')
const afterSale = require('../../utils/after-sale')

Page({
  data: {
    notify: true
  },

  onLoad() {
    this.setData({ notify: settings.getSettings().notify })
  },

  onNotifyChange(e) {
    settings.setNotify(e.detail.value)
    wx.showToast({ title: e.detail.value ? '已开启通知' : '已关闭通知', icon: 'none' })
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
          cart.init()
          address.ensureSeed()
          mock.ensureSeedOrders()
          coupon.ensureSeed()
          review.ensureSeed()
          points.ensureSeed()
          afterSale.ensureSeed()
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
