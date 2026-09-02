const live = require('../../utils/live')
const mock = require('../../utils/mock')

Page({
  data: {
    liveRooms: [],
    activeTab: 'all',
    tabs: [
      { key: 'all', name: '全部' },
      { key: '1', name: '直播中' },
      { key: '0', name: '预告' },
      { key: '2', name: '回放' }
    ]
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  loadData() {
    const liveRooms = live.getLiveRooms().map(room => ({
      ...room,
      statusText: live.getLiveStatusText(room.status),
      statusClass: live.getLiveStatusClass(room.status),
      viewerText: live.formatNumber(room.viewerCount),
      likeText: live.formatNumber(room.likeCount)
    }))
    this.setData({ liveRooms })
  },

  onTabTap(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab })
  },

  getFilteredRooms() {
    const { liveRooms, activeTab } = this.data
    if (activeTab === 'all') return liveRooms
    return liveRooms.filter(r => r.status === Number(activeTab))
  },

  onLiveRoomTap(e) {
    const roomId = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/live-detail/live-detail?id=' + roomId })
  },

  onShareAppMessage() {
    return {
      title: '精选商城 · 直播中心',
      path: '/pages/live/live'
    }
  },

  onShareTimeline() {
    return {
      title: '精选商城 · 直播中心'
    }
  }
})
