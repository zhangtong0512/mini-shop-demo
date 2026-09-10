const notification = require('../../utils/notification')

Page({
  data: {
    notifications: [], // 当前 tab 下的列表（渲染用）
    unreadCount: 0,
    activeTab: 'all',
    tabs: [
      { key: 'all', name: '全部' },
      { key: 'order', name: '订单' },
      { key: 'group', name: '拼团' },
      { key: 'distribution', name: '分销' },
      { key: 'system', name: '系统' },
      { key: 'promotion', name: '促销' }
    ]
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  loadData() {
    const all = notification.getNotifications()
    const unreadCount = notification.getUnreadCount()
    const activeTab = this.data.activeTab
    this.setData({
      unreadCount,
      allList: all,
      notifications: activeTab === 'all' ? all : all.filter(n => n.type === activeTab)
    })
  },

  // 切 tab 要重新筛列表（原来只改了 activeTab，列表始终是全部，标签形同虚设）
  onTabTap(e) {
    const activeTab = e.currentTarget.dataset.tab
    const all = this.data.allList || notification.getNotifications()
    this.setData({
      activeTab,
      notifications: activeTab === 'all' ? all : all.filter(n => n.type === activeTab)
    })
  },

  onNotificationTap(e) {
    const id = e.currentTarget.dataset.id
    notification.markAsRead(id)
    const item = this.data.notifications.find(n => n.id === id)
    this.loadData()
    if (!item) return

    // 订单类通知带 orderId，直接进订单详情
    if (item.orderId) {
      wx.navigateTo({ url: '/pages/order-detail/order-detail?id=' + item.orderId })
      return
    }
    // 拼团类通知带 groupId，进拼团详情
    if (item.groupId) {
      wx.navigateTo({ url: '/pages/group-detail/group-detail?id=' + item.groupId })
      return
    }
    wx.showModal({
      title: item.title,
      content: item.content,
      showCancel: false
    })
  },

  onMarkAllRead() {
    notification.markAllRead()
    this.loadData()
    wx.showToast({ title: '已全部标记已读', icon: 'success' })
  },

  onClearAll() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有通知吗？',
      success: res => {
        if (res.confirm) {
          notification.clearAll()
          this.loadData()
          wx.showToast({ title: '已清空', icon: 'success' })
        }
      }
    })
  },

  onDeleteTap(e) {
    const id = e.currentTarget.dataset.id
    notification.deleteNotification(id)
    this.loadData()
  }
})
