/**
 * 售后记录本地存储与操作
 * 记录以「订单 + 商品(SKU)」为维度，storage key `afterSaleList`
 * 状态：pending 申请中 / refunded 已退款 / rejected 已拒绝
 * 依赖 mock（getOrderById / setOrderStatus / restoreStock），单向引用避免循环依赖
 */
const mock = require('./mock')

const AFTER_SALE_KEY = 'afterSaleList'

function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

function fmt(d) {
  return (
    d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
    ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds())
  )
}

function getList() {
  return wx.getStorageSync(AFTER_SALE_KEY) || []
}

function saveList(list) {
  wx.setStorageSync(AFTER_SALE_KEY, list)
}

function getByOrder(orderId) {
  return getList().filter(r => r.orderId === Number(orderId))
}

// 该订单某商品(SKU)是否已有未拒绝的售后记录
function hasActive(orderId, goodsId, skuKey) {
  return getByOrder(orderId).some(r =>
    r.goodsId === Number(goodsId) &&
    (r.skuKey || '') === (skuKey || '') &&
    r.status !== 'rejected'
  )
}

// 待处理（申请中）售后数量
function getPendingCount() {
  return getList().filter(r => r.status === 'pending').length
}

// 提交售后申请：新增记录 + 订单置为「售后中」
function applyRefund(order, goodsItem, info) {
  const orderId = order.id
  if (hasActive(orderId, goodsItem.id, goodsItem.skuKey)) {
    return { ok: false, msg: '该商品已申请过售后' }
  }
  const record = {
    id: Date.now(),
    orderId: Number(orderId),
    orderNo: order.orderNo,
    goodsId: Number(goodsItem.id),
    goodsTitle: goodsItem.title,
    emoji: goodsItem.emoji,
    spec: goodsItem.spec || '',
    skuKey: goodsItem.skuKey || '',
    count: goodsItem.count,
    amount: (goodsItem.price || 0) * goodsItem.count,
    type: info.type || 'refund',
    reason: info.reason || '',
    remark: info.remark || '',
    status: 'pending',
    applyTime: fmt(new Date()),
    handleTime: ''
  }
  saveList([record].concat(getList()))
  mock.setOrderStatus(orderId, 6)
  return { ok: true, record }
}

// 卖家处理：approve 同意（回补库存）/ reject 拒绝，处理后重算订单状态
function handleRefund(recordId, action) {
  const list = getList()
  const record = list.find(r => r.id === recordId)
  if (!record || record.status !== 'pending') {
    return { ok: false, msg: '记录不存在或已处理' }
  }
  if (action === 'approve') {
    record.status = 'refunded'
    const order = mock.getOrderById(record.orderId)
    // 已扣库存的订单退款时回补该商品库存
    if (order && order.stockDeducted) {
      mock.restoreStock([{ id: record.goodsId, skuKey: record.skuKey, count: record.count }])
    }
  } else {
    record.status = 'rejected'
  }
  record.handleTime = fmt(new Date())
  saveList(list)
  recomputeOrder(record.orderId)
  return { ok: true }
}

// 重算订单状态：任一 pending → 6 售后中；全部条目已退款 → 7 已退款；否则回退原状态
function recomputeOrder(orderId) {
  const order = mock.getOrderById(orderId)
  if (!order || !order.items || !order.items.length) return
  const records = getByOrder(orderId)
  if (records.some(r => r.status === 'pending')) {
    mock.setOrderStatus(orderId, 6)
    return
  }
  const allRefunded = order.items.every(it =>
    records.some(r =>
      r.goodsId === it.id &&
      (r.skuKey || '') === (it.skuKey || '') &&
      r.status === 'refunded'
    )
  )
  mock.setOrderStatus(orderId, allRefunded ? 7 : (order.preAfterSaleStatus || 4))
}

// 首次启动初始化空列表（保持 util 惯例）
function ensureSeed() {
  if (wx.getStorageSync(AFTER_SALE_KEY) !== '') return
  wx.setStorageSync(AFTER_SALE_KEY, [])
}

module.exports = {
  getList,
  getByOrder,
  hasActive,
  getPendingCount,
  applyRefund,
  handleRefund,
  recomputeOrder,
  ensureSeed
}
