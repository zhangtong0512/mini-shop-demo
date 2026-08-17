/**
 * 购物车本地存储与操作
 * 购物车保存在 storage 中，购物车 tab（index=1）会同步角标数量
 */
const CART_KEY = 'cartList'

function getCart() {
  return wx.getStorageSync(CART_KEY) || []
}

function saveCart(list) {
  wx.setStorageSync(CART_KEY, list)
  updateBadge()
}

function init() {
  if (!wx.getStorageSync(CART_KEY)) {
    wx.setStorageSync(CART_KEY, [])
  }
  updateBadge()
}

// 购物车 tab 角标数量（上限 99）
function updateBadge() {
  const total = getCart().reduce((sum, item) => sum + item.count, 0)
  try {
    if (total > 0) {
      wx.setTabBarBadge({ index: 1, text: String(total > 99 ? 99 : total) })
    } else {
      wx.removeTabBarBadge({ index: 1 })
    }
  } catch (e) {
    // tabBar 未就绪时忽略
  }
}

function addToCart(goods, count) {
  const num = count || 1
  const list = getCart()
  const found = list.find(item => item.id === goods.id)
  if (found) {
    found.count += num
  } else {
    list.push({
      id: goods.id,
      title: goods.title,
      emoji: goods.emoji,
      image: goods.image,
      price: goods.price,
      count: num,
      selected: true
    })
  }
  saveCart(list)
}

function changeCount(id, delta) {
  const list = getCart()
  const item = list.find(i => i.id === id)
  if (!item) return
  item.count = item.count + delta
  if (item.count < 1) item.count = 1
  saveCart(list)
}

function toggleSelect(id) {
  const list = getCart()
  const item = list.find(i => i.id === id)
  if (item) {
    item.selected = !item.selected
    saveCart(list)
  }
}

function toggleSelectAll(selected) {
  saveCart(getCart().map(i => Object.assign({}, i, { selected })))
}

function removeItem(id) {
  saveCart(getCart().filter(i => i.id !== id))
}

function removeSelected() {
  saveCart(getCart().filter(i => !i.selected))
}

function getSelectedItems() {
  return getCart().filter(i => i.selected)
}

function getSummary() {
  const selected = getCart().filter(i => i.selected)
  const totalCount = selected.reduce((s, i) => s + i.count, 0)
  const totalPrice = selected.reduce((s, i) => s + i.price * i.count, 0)
  return { totalCount, totalPrice }
}

module.exports = {
  getCart,
  saveCart,
  init,
  updateBadge,
  addToCart,
  changeCount,
  toggleSelect,
  toggleSelectAll,
  removeItem,
  removeSelected,
  getSelectedItems,
  getSummary
}
