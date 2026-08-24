const mock = require('../../utils/mock')

Page({
  data: {
    endsAt: 0,
    list: [],
    remainText: ''
  },

  onLoad() {
    const flash = mock.getFlashSale()
    this.setData({ endsAt: flash.endsAt, list: flash.list })
  },

  onShow() {
    // 进入/返回时启动倒计时（onHide/onUnload 停止，避免泄漏）
    if (!this._timer) {
      this.tick()
      this._timer = setInterval(() => this.tick(), 1000)
    }
  },

  onHide() {
    this.stopTimer()
  },

  onUnload() {
    this.stopTimer()
  },

  stopTimer() {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
  },

  tick() {
    this.setData({ remainText: mock.flashRemainText(this.data.endsAt) })
  },

  onTapGoods(e) {
    wx.navigateTo({ url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id })
  },

  onShareAppMessage() {
    return { title: '限时秒杀 · 超值好物', path: '/pages/flash/flash' }
  },

  onShareTimeline() {
    return { title: '限时秒杀 · 超值好物' }
  }
})
