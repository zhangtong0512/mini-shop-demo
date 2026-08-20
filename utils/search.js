/**
 * 搜索历史本地存储
 * 保存在 storage key `searchHistory` 中，最多保留 10 条，最近搜索在前
 */
const HISTORY_KEY = 'searchHistory'
const MAX = 10

function getHistory() {
  return wx.getStorageSync(HISTORY_KEY) || []
}

// 新增一条历史：去重（大小写不敏感）、置顶、截断到上限
function addHistory(kw) {
  const key = (kw || '').trim()
  if (!key) return
  let list = getHistory().filter(h => h.toLowerCase() !== key.toLowerCase())
  list.unshift(key)
  list = list.slice(0, MAX)
  wx.setStorageSync(HISTORY_KEY, list)
}

function clearHistory() {
  wx.setStorageSync(HISTORY_KEY, [])
}

module.exports = {
  getHistory,
  addHistory,
  clearHistory
}
