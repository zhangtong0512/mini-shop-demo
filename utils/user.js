/**
 * 用户登录信息本地存储
 * 用户信息保存在 storage key `userInfo` 中（单个对象，非数组）
 * 初始不预置数据 —— 保持未登录态，登录流程可演示
 */
const USER_KEY = 'userInfo'

function getUserInfo() {
  // 注意：user 是单个对象，缺失 key 返回 ''，必须 || null（不能 || []）
  return wx.getStorageSync(USER_KEY) || null
}

function saveUserInfo(user) {
  wx.setStorageSync(USER_KEY, user)
}

function isLoggedIn() {
  return !!getUserInfo()
}

function logout() {
  wx.removeStorageSync(USER_KEY)
}

// 当前用户 id（未登录返回 ''）。分销、拼团等需要归属到具体用户的功能统一走这里，
// 避免各页面各自硬编码 'user_001' 之类的假 id 导致数据串不起来。
function getUserId() {
  const u = getUserInfo()
  return (u && u.id) ? u.id : ''
}

// 当前用户昵称（未登录返回默认昵称），用于拼团成员、评价等展示
function getDisplayName() {
  const u = getUserInfo()
  return (u && u.nickname) ? u.nickname : '微信用户'
}

// 当前用户头像（未登录返回空串）
function getAvatar() {
  const u = getUserInfo()
  return (u && u.avatar) ? u.avatar : ''
}

module.exports = {
  getUserInfo,
  saveUserInfo,
  isLoggedIn,
  logout,
  getUserId,
  getDisplayName,
  getAvatar
}
