/**
 * 设置项本地存储
 * 设置保存在 storage key `settingsList` 中（单个对象，非数组）
 */
const SETTINGS_KEY = 'settingsList'

const DEFAULTS = { notify: true }

function getSettings() {
  return Object.assign({}, DEFAULTS, wx.getStorageSync(SETTINGS_KEY) || {})
}

function saveSettings(s) {
  wx.setStorageSync(SETTINGS_KEY, s)
}

function setNotify(value) {
  const s = getSettings()
  s.notify = !!value
  saveSettings(s)
}

module.exports = {
  getSettings,
  saveSettings,
  setNotify
}
