const notification = require('../../utils/notification')

Page({
  data: {
    notifications: [],
    unreadCount: 0,
    activeTab: 'all',
    tabs: [
      { key: 'all', name: '全部' },
      { key: 'order', name: '订单' },
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
    const notifications = notification.getNotifications()
    const unreadCount = notification.getUnreadCount()
    this.setData({ notifications, unreadCount })
  },

  onTabTap(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab })
  },

  getFilteredNotifications() {
    const { notifications, activeTab } = this.data
    if (activeTab === 'all') return notifications
    return notifications.filter(n => n.type === activeTab)
  },

  onNotificationTap(e) {
    const id = e.currentTarget.dataset.id
    notification.markAsRead(id)
    this.loadData()

    const item = this.data.notifications.find(n => n.id === id)
    if (item) {
      if (item.type === 'order' && item.orderId) {
        wx.navigateTo({ url: '/pages/order-detail/order-detail?id=' + item.orderId })
      } else {
        wx.showModal({
          title: item.title,
          content: item.content,
          showCancel: false
        })
      }
    }
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
