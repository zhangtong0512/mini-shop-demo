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

module.exports = {
  getUserInfo,
  saveUserInfo,
  isLoggedIn,
  logout
}
