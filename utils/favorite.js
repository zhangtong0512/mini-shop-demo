/**
 * 商品收藏本地存储
 * 收藏保存在 storage key `favoriteList` 中，只存商品 id 数组
 * 渲染时通过 mock.getGoodsById 实时解析，避免商品数据过期
 */
const FAV_KEY = 'favoriteList'
const mock = require('./mock')

function getFavIds() {
  return wx.getStorageSync(FAV_KEY) || []
}

function saveFavIds(ids) {
  wx.setStorageSync(FAV_KEY, ids)
}

function isFavorite(id) {
  return getFavIds().indexOf(Number(id)) > -1
}

// 切换收藏状态，返回切换后的状态（true = 已收藏）
function toggleFavorite(id) {
  const ids = getFavIds()
  const n = Number(id)
  const idx = ids.indexOf(n)
  if (idx > -1) {
    ids.splice(idx, 1)
  } else {
    ids.push(n)
  }
  saveFavIds(ids)
  return idx === -1
}

// 解析 id 为完整商品对象；顺手清理已失效（商品不存在）的 id
function getFavoriteGoods() {
  const ids = getFavIds()
  const list = ids.map(id => mock.getGoodsById(id)).filter(Boolean)
  if (list.length !== ids.length) {
    saveFavIds(list.map(g => g.id))
  }
  return list
}

function getCount() {
  return getFavIds().length
}

module.exports = {
  getFavIds,
  saveFavIds,
  isFavorite,
  toggleFavorite,
  getFavoriteGoods,
  getCount
}
