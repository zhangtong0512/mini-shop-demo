const live = require('../../utils/live')
const mock = require('../../utils/mock')

Page({
  data: {
    room: null,
    goods: [],
    isLiving: false,
    viewerText: '0',
    likeText: '0',
    duration: '',
    showGoods: false
  },

  onLoad(options) {
    this.roomId = Number(options.id)
    this.loadData()
  },

  onShow() {
    this.loadData()
    this.startSimulation()
  },

  onHide() {
    this.stopSimulation()
  },

  onUnload() {
    this.stopSimulation()
  },

  loadData() {
    const room = live.getLiveRoomById(this.roomId)
    if (!room) {
      wx.showToast({ title: '直播间不存在', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }

    const goods = live.getLiveGoods(this.roomId, mock)
    const isLiving = room.status === 1
    const viewerText = live.formatNumber(room.viewerCount)
    const likeText = live.formatNumber(room.likeCount)
    const duration = live.getLiveDuration(room.startTime, room.endTime)

    this.setData({ room, goods, isLiving, viewerText, likeText, duration })
    wx.setNavigationBarTitle({ title: room.title })
  },

  startSimulation() {
    if (!this.data.isLiving) return
    this._timer = setInterval(() => {
      const room = live.getLiveRoomById(this.roomId)
      if (room && room.status === 1) {
        // 模拟观看人数波动
        const change = Math.floor(Math.random() * 20) - 10
        const newCount = Math.max(0, room.viewerCount + change)
        live.updateViewerCount(this.roomId, newCount)
        this.setData({ viewerText: live.formatNumber(newCount) })
      }
    }, 3000)
  },

  stopSimulation() {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
  },

  onToggleGoods() {
    this.setData({ showGoods: !this.data.showGoods })
  },

  onGoodsTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/detail/detail?id=' + id })
  },

  onLikeTap() {
    const room = live.getLiveRoomById(this.roomId)
    if (room) {
      const newCount = room.likeCount + 1
      live.updateLikeCount(this.roomId, newCount)
      this.setData({ likeText: live.formatNumber(newCount) })
    }
  },

  onShareAppMessage() {
    const { room } = this.data
    return {
      title: room ? room.title : '精彩直播',
      path: `/pages/live-detail/live-detail?id=${this.roomId}`
    }
  }
})
