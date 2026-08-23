/**
 * 优惠券本地存储与操作
 * 用户持有的券保存在 storage key `couponList`；领券中心的可领模板内置在本模块
 *
 * 券字段：
 *   id / tid(模板id) / title / amount(抵扣金额) / minAmount(满多少可用，0=无门槛)
 *   desc / status(0未使用 1已使用 2已过期) / receiveTime / expireTime
 * 抵扣规则：抵扣金额 = min(amount, 商品金额)，不能超过商品金额
 */
const COUPON_KEY = 'couponList'

// 领券中心可领取的券模板
const templates = [
  { tid: 't1', title: '新人专享券', amount: 5, minAmount: 0, desc: '无门槛，全场通用', expireDays: 30 },
  { tid: 't2', title: '满99减10', amount: 10, minAmount: 99, desc: '满 99 元可用', expireDays: 30 },
  { tid: 't3', title: '满299减40', amount: 40, minAmount: 299, desc: '满 299 元可用', expireDays: 30 }
]

const STATUS_TEXT = { 0: '未使用', 1: '已使用', 2: '已过期' }

function getCoupons() {
  const list = wx.getStorageSync(COUPON_KEY) || []
  // 顺带把过期的未使用券标记为已过期
  const now = Date.now()
  let changed = false
  list.forEach(c => {
    if (c.status === 0 && c.expireTime && now > c.expireTime) {
      c.status = 2
      changed = true
    }
  })
  if (changed) wx.setStorageSync(COUPON_KEY, list)
  return list
}

function saveCoupons(list) {
  wx.setStorageSync(COUPON_KEY, list)
}

function getCouponById(id) {
  return getCoupons().find(c => c.id === Number(id)) || null
}

function getTemplates() {
  return templates
}

// 是否已领取过该模板（有任意一张即视为已领）
function hasClaimed(tid) {
  return getCoupons().some(c => c.tid === tid)
}

// 领取：为模板生成一张新券；重复领取返回 null
function receiveCoupon(tid) {
  const tpl = templates.find(t => t.tid === tid)
  if (!tpl || hasClaimed(tid)) return null
  const now = Date.now()
  const coupon = {
    id: now,
    tid: tpl.tid,
    title: tpl.title,
    amount: tpl.amount,
    minAmount: tpl.minAmount,
    desc: tpl.desc,
    status: 0,
    receiveTime: now,
    expireTime: now + tpl.expireDays * 24 * 60 * 60 * 1000
  }
  const list = getCoupons()
  list.unshift(coupon)
  saveCoupons(list)
  return coupon
}

// 当前可用于某金额订单的券：未使用、未过期、满足满减门槛
function getUsableCoupons(goodsAmount) {
  const now = Date.now()
  return getCoupons().filter(c => {
    return c.status === 0 && c.expireTime > now && c.minAmount <= goodsAmount
  })
}

// 下单时标记为已使用（幂等）
function useCoupon(id) {
  saveCoupons(
    getCoupons().map(c => {
      return c.id === Number(id) && c.status === 0 ? Object.assign({}, c, { status: 1 }) : c
    })
  )
}

// 取消待付款订单时回退为未使用（幂等）
function restoreCoupon(id) {
  saveCoupons(
    getCoupons().map(c => {
      return c.id === Number(id) && c.status === 1 ? Object.assign({}, c, { status: 0 }) : c
    })
  )
}

function statusText(status) {
  return STATUS_TEXT[status] || ''
}

// 首次启动预置：2 张可用券 + 1 张已过期券，方便演示各状态
function ensureSeed() {
  if (wx.getStorageSync(COUPON_KEY)) return
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  saveCoupons([
    { id: 1, tid: 't2', title: '满99减10', amount: 10, minAmount: 99, desc: '满 99 元可用', status: 0, receiveTime: now - 2 * day, expireTime: now + 28 * day },
    { id: 2, tid: 't1', title: '新人专享券', amount: 5, minAmount: 0, desc: '无门槛，全场通用', status: 0, receiveTime: now - 5 * day, expireTime: now + 25 * day },
    { id: 3, tid: 'seed-expired', title: '满299减40', amount: 40, minAmount: 299, desc: '满 299 元可用', status: 2, receiveTime: now - 40 * day, expireTime: now - 10 * day }
  ])
}

module.exports = {
  getCoupons,
  getCouponById,
  getTemplates,
  hasClaimed,
  receiveCoupon,
  getUsableCoupons,
  useCoupon,
  restoreCoupon,
  statusText,
  ensureSeed
}
