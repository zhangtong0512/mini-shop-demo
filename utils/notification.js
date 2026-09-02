/**
 * 消息通知系统（本地存储，单对象 notificationData）
 *
 * 类型：order（订单）/ system（系统）/ promotion（促销）/ group（拼团）/ distribution（分销）
 * 功能：添加通知、获取列表、标记已读、未读计数、删除
 */
const NOTIFICATION_KEY = 'notificationData'

const DEFAULT = {
  notifications: [],
  unreadCount: 0,
  settings: {
    orderNotify: true,
    systemNotify: true,
    promotionNotify: true
  }
}

// 通知类型配置
const TYPE_CONFIG = {
  order: { icon: '📦', color: '#4CAF50' },
  system: { icon: '📢', color: '#2196F3' },
  promotion: { icon: '🎉', color: '#FF9800' },
  group: { icon: '👥', color: '#9C27B0' },
  distribution: { icon: '💰', color: '#FF5722' }
}

function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

function nowStr() {
  const d = new Date()
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' +
    pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds())
}

function getNotificationData() {
  return Object.assign({}, DEFAULT, wx.getStorageSync(NOTIFICATION_KEY) || {})
}

function saveNotificationData(data) {
  wx.setStorageSync(NOTIFICATION_KEY, data)
}

// 首次启动预置通知数据
function ensureSeed() {
  if (wx.getStorageSync(NOTIFICATION_KEY)) return
  const data = {
    notifications: [
      {
        id: Date.now() - 100000,
        type: 'system',
        title: '欢迎使用精选商城',
        content: '感谢您的使用，祝您购物愉快！',
        isRead: false,
        createTime: nowStr(),
        icon: '📢'
      },
      {
        id: Date.now() - 200000,
        type: 'promotion',
        title: '新人专享优惠',
        content: '恭喜获得新人专享券，立即查看→',
        isRead: false,
        createTime: nowStr(),
        icon: '🎉'
      }
    ],
    unreadCount: 2,
    settings: {
      orderNotify: true,
      systemNotify: true,
      promotionNotify: true
    }
  }
  saveNotificationData(data)
}

// 添加通知
function addNotification(type, title, content, extra = {}) {
  const data = getNotificationData()
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.system
  const notification = {
    id: Date.now(),
    type,
    title,
    content,
    isRead: false,
    createTime: nowStr(),
    icon: config.icon,
    ...extra
  }
  data.notifications.unshift(notification)
  data.unreadCount++
  saveNotificationData(data)
  return notification
}

// 获取通知列表（可按类型筛选）
function getNotifications(type = null) {
  const data = getNotificationData()
  if (type) {
    return data.notifications.filter(n => n.type === type)
  }
  return data.notifications
}

// 获取未读数
function getUnreadCount() {
  const data = getNotificationData()
  return data.unreadCount
}

// 标记单条已读
function markAsRead(id) {
  const data = getNotificationData()
  const notification = data.notifications.find(n => n.id === id)
  if (notification && !notification.isRead) {
    notification.isRead = true
    data.unreadCount = Math.max(0, data.unreadCount - 1)
    saveNotificationData(data)
  }
}

// 全部已读
function markAllRead() {
  const data = getNotificationData()
  data.notifications.forEach(n => { n.isRead = true })
  data.unreadCount = 0
  saveNotificationData(data)
}

// 删除通知
function deleteNotification(id) {
  const data = getNotificationData()
  const index = data.notifications.findIndex(n => n.id === id)
  if (index > -1) {
    const notification = data.notifications[index]
    if (!notification.isRead) {
      data.unreadCount = Math.max(0, data.unreadCount - 1)
    }
    data.notifications.splice(index, 1)
    saveNotificationData(data)
  }
}

// 清空所有通知
function clearAll() {
  const data = getNotificationData()
  data.notifications = []
  data.unreadCount = 0
  saveNotificationData(data)
}

// 获取设置
function getSettings() {
  return getNotificationData().settings
}

// 更新设置
function updateSettings(settings) {
  const data = getNotificationData()
  data.settings = Object.assign({}, data.settings, settings)
  saveNotificationData(data)
}

// 添加订单通知（便捷方法）
function addOrderNotification(title, content, orderId) {
  return addNotification('order', title, content, { orderId })
}

// 添加系统通知（便捷方法）
function addSystemNotification(title, content) {
  return addNotification('system', title, content)
}

// 添加促销通知（便捷方法）
function addPromotionNotification(title, content) {
  return addNotification('promotion', title, content)
}

module.exports = {
  getNotificationData,
  saveNotificationData,
  ensureSeed,
  addNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllRead,
  deleteNotification,
  clearAll,
  getSettings,
  updateSettings,
  addOrderNotification,
  addSystemNotification,
  addPromotionNotification,
  TYPE_CONFIG
}
