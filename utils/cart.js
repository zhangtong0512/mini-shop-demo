/**
 * 购物车本地存储与操作
 * 购物车保存在 storage 中，购物车 tab（index=1）会同步角标数量
 * SKU 化：同商品不同规格视为两条，复合键 = id + '_' + skuKey
 */
const mock = require('./mock')

const CART_KEY = 'cartList'

function itemKey(id, skuKey) {
  return id + '_' + (skuKey || '')
}

// 归一化购物车条目：旧数据（无 skuKey）自动绑定首个 SKU 并回填价格/规格，注入复合 key
function normalize(item) {
  const g = mock.getGoodsById(item.id)
  const isOld = !item.skuKey
  let skuKey = item.skuKey || ''
  if (isOld && g && g.skus && g.skus.length) {
    skuKey = g.skus[0].key
  }
  // 价格：闪购价加购时固化，不被重算覆盖；仅「有规格的旧数据」才回填 SKU 价格
  let price = item.price
  if (mock.isFlashActive(g)) {
    price = mock.getEffectivePrice(g)
  } else if (isOld && g && g.skus && g.skus.length) {
    price = mock.getSkuPrice(g, skuKey)
  }
  return Object.assign({}, item, {
    skuKey,
    key: itemKey(item.id, skuKey),
    spec: isOld ? mock.specText(g, skuKey) : item.spec,
    price
  })
}

function getCart() {
  return (wx.getStorageSync(CART_KEY) || []).map(normalize)
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

// 加购：返回 { ok: true } 或 { ok: false, msg }（校验 SKU 库存）
function addToCart(goods, count, skuKey) {
  const num = count || 1
  const g = goods || {}
  // 传入的可能是订单/购物车快照（无 specs/skus），回查真实商品做库存与规格
  const real = (g.skus || g.specs) ? g : (mock.getGoodsById(g.id) || g)
  let key = skuKey || ''
  // 有规格但未传 skuKey 时绑定首个 SKU（旧调用兼容）
  if (!key && real.skus && real.skus.length) key = real.skus[0].key
  const sku = mock.getSku(real, key)
  // 闪购商品按秒杀价固化进购物车（覆盖规格/普通价）
  const price = mock.isFlashActive(real) ? mock.getEffectivePrice(real) : (sku ? sku.price : real.price)
  const stock = sku ? sku.stock : real.stock

  const list = getCart()
  const found = list.find(item => item.key === itemKey(g.id, key))
  const baseCount = found ? found.count : 0
  if (stock != null && num + baseCount > stock) {
    return { ok: false, msg: '「' + real.title + '」库存不足（仅剩 ' + stock + ' 件）' }
  }

  if (found) {
    found.count += num
  } else {
    list.push({
      id: g.id,
      title: g.title,
      emoji: g.emoji,
      image: g.image,
      price,
      count: num,
      selected: true,
      skuKey: key,
      spec: g.spec || mock.specText(real, key)
    })
  }
  saveCart(list)
  return { ok: true }
}

function changeCount(key, delta) {
  const list = getCart()
  const item = list.find(i => i.key === key)
  if (!item) return
  let next = item.count + delta
  if (next < 1) next = 1
  // 加数时按 SKU 库存截断，避免超卖
  if (delta > 0) {
    const g = mock.getGoodsById(item.id)
    const stock = mock.getSkuStock(g, item.skuKey)
    if (next > stock) next = stock
  }
  item.count = next
  saveCart(list)
}

function toggleSelect(key) {
  const list = getCart()
  const item = list.find(i => i.key === key)
  if (item) {
    item.selected = !item.selected
    saveCart(list)
  }
}

function toggleSelectAll(selected) {
  saveCart(getCart().map(i => Object.assign({}, i, { selected })))
}

function removeItem(key) {
  saveCart(getCart().filter(i => i.key !== key))
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
