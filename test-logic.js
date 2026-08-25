/**
 * 精选商城逻辑测试（零依赖，Node 自带 test runner）
 * 运行：node --test test-logic.js
 *
 * utils 模块不在加载时触碰 wx，可先注入内存 store 的 global.wx 再 require；
 * 各 util 共享一个内存 store，故每个测试前重置；goodsList 库存为模块级内存，
 * 跨测试累积，断言一律用“差值”而非绝对值。
 */
'use strict'
const { test } = require('node:test')
const assert = require('node:assert')

const store = {}
global.wx = {
  getStorageSync: k => (k in store ? store[k] : ''),
  setStorageSync: (k, v) => { store[k] = v },
  removeStorageSync: k => { delete store[k] },
  clearStorageSync: () => { for (const k in store) delete store[k] },
  setTabBarBadge() {}, removeTabBarBadge() {},
  showToast() {}, showModal() {}, showLoading() {}, hideLoading() {},
  setNavigationBarTitle() {}, scanCode() {}, previewImage() {}, setClipboardData() {}
}
function resetStore() {
  for (const k in store) delete store[k]
}

const mock = require('./utils/mock')
const cart = require('./utils/cart')
const points = require('./utils/points')
const coupon = require('./utils/coupon')

test.beforeEach(() => {
  resetStore()
  mock.ensureSeedOrders()
  coupon.ensureSeed()
  points.ensureSeed()
})

// 便捷：生成单商品订单 items 片段（有规格商品自动带首个 SKU）
function itemsOf(gid) {
  const g = mock.getGoodsById(gid)
  const skuKey = (g.skus && g.skus.length) ? g.skus[0].key : ''
  return [{
    id: g.id, title: g.title, emoji: g.emoji, image: g.image,
    price: mock.getSkuPrice(g, skuKey), count: 1, skuKey
  }]
}
function createSimpleOrder() {
  const g = mock.getGoodsById(1006)
  return mock.createOrder({
    items: itemsOf(1006),
    goodsAmount: g.price,
    freight: 0,
    totalPrice: g.price,
    totalCount: 1
  })
}

// ---------- 订单基线（既有行为回归） ----------
test('订单基线：创建→支付→发货→确认收货', () => {
  const order = createSimpleOrder()
  assert.strictEqual(order.status, 1)
  assert.ok(order.payDeadline > Date.now())
  mock.payOrder(order.id)
  assert.strictEqual(mock.getOrderById(order.id).status, 2)
  mock.shipOrder(order.id)
  assert.strictEqual(mock.getOrderById(order.id).status, 3)
  mock.confirmOrder(order.id)
  assert.strictEqual(mock.getOrderById(order.id).status, 4)
  assert.ok(mock.getOrderById(order.id).finishTime)
})

// ---------- 限时秒杀 ----------
test('秒杀：getFlashSale 形状与价格', () => {
  const flash = mock.getFlashSale()
  assert.ok(flash.endsAt > Date.now())
  assert.ok(flash.list.length >= 4)
  for (const g of flash.list) {
    assert.ok(g.flashPrice < g.price, g.id + ' 秒杀价应低于原价')
    assert.ok(g.flashSold > 0 && g.flashStock > 0)
    assert.strictEqual(g.flashEndsAt, flash.endsAt)
  }
})

test('秒杀：getEffectivePrice 生效与过期回落', () => {
  const g = mock.getGoodsById(1002)
  assert.ok(mock.isFlashActive(g))
  assert.strictEqual(mock.getEffectivePrice(g), g.flashPrice)
  // 到期后（now > endsAt）回落原价
  assert.ok(!mock.isFlashActive(g, g.flashEndsAt + 1))
  assert.strictEqual(mock.getEffectivePrice(g, g.flashEndsAt + 1), g.price)
  // 非秒杀商品不受影响
  const normal = mock.getGoodsById(1006)
  assert.strictEqual(mock.getEffectivePrice(normal), normal.price)
  assert.strictEqual(mock.isFlashActive(normal), false)
})

test('购物车：闪购价固化', () => {
  const g = mock.getGoodsById(1002)
  cart.addToCart(Object.assign({}, g, { price: mock.getEffectivePrice(g) }), 2)
  const item = cart.getCart()[0]
  assert.strictEqual(item.price, g.flashPrice)
  assert.strictEqual(item.count, 2)
})

// ---------- 积分 / 签到 ----------
test('积分：签到每天一次 + 余额/账本', () => {
  assert.strictEqual(points.getBalance(), 200)
  const r1 = points.checkIn()
  assert.strictEqual(r1.ok, true)
  assert.strictEqual(points.getBalance(), 205)
  assert.strictEqual(points.isCheckedToday(), true)
  const r2 = points.checkIn()
  assert.strictEqual(r2.ok, false)
  assert.strictEqual(points.getBalance(), 205) // 当天不重复加分
  const p = points.getPoints()
  assert.strictEqual(p.totalDays, 1)
  assert.strictEqual(p.records.length, 1)
  assert.strictEqual(p.ledger.length, 2) // 新用户奖励 + 签到
})

test('积分：扣减/不足/账本记录', () => {
  assert.strictEqual(points.deductPoints(50, '测试扣减'), true)
  assert.strictEqual(points.getBalance(), 150)
  assert.strictEqual(points.deductPoints(9999, '超额'), false)
  assert.strictEqual(points.getBalance(), 150)
  const ledger = points.getPoints().ledger[0]
  assert.strictEqual(ledger.points, -50)
  assert.strictEqual(ledger.desc, '测试扣减')
})

test('积分：calcPointsDiscount 边界', () => {
  // 999 积分买 250 元：可用 999，抵扣 floor(999/100)=9 元
  assert.deepStrictEqual(points.calcPointsDiscount(250, 999), { usablePoints: 999, pointsAmount: 9, canUse: true })
  // 20000 积分买 250 元：可用封顶 min(20000, 25000)=20000 → 200 元
  assert.deepStrictEqual(points.calcPointsDiscount(250, 20000), { usablePoints: 20000, pointsAmount: 200, canUse: true })
  // 余额 50：不可用
  assert.deepStrictEqual(points.calcPointsDiscount(250, 50), { usablePoints: 50, pointsAmount: 0, canUse: false })
  // 恰好 100 积分 → 抵扣 1 元
  assert.deepStrictEqual(points.calcPointsDiscount(1, 100), { usablePoints: 100, pointsAmount: 1, canUse: true })
})

test('积分：优惠券 + 积分叠加不超商品金额', () => {
  // 结算页按「商品金额 − 优惠券」作为抵扣上限，模拟叠加场景
  const full = points.calcPointsDiscount(100, 20000) // 无券：上限 ¥100
  const afterCoupon = points.calcPointsDiscount(100 - 50, 20000) // 用 50 元券后剩余 ¥50
  assert.strictEqual(full.pointsAmount, 100)
  assert.strictEqual(afterCoupon.pointsAmount, 50) // 叠加不超商品金额
})

test('积分：下单占用，取消/超时退回', () => {
  const order = mock.createOrder({
    items: itemsOf(1001),
    goodsAmount: 3999,
    totalPrice: 3999,
    totalCount: 1,
    pointsUsed: 150,
    pointsAmount: 1
  })
  assert.strictEqual(points.getBalance(), 50) // 200 - 150
  mock.cancelOrder(order.id)
  assert.strictEqual(points.getBalance(), 200) // 取消退回
  assert.strictEqual(mock.getOrderById(order.id).status, 5)
  // 余额不足时下单自动取消积分抵扣
  const g = mock.getGoodsById(1001)
  const order2 = mock.createOrder({
    items: itemsOf(1001),
    goodsAmount: 3999,
    totalPrice: 3999,
    totalCount: 1,
    pointsUsed: 999999,
    pointsAmount: 9999
  })
  assert.strictEqual(order2.pointsUsed, 0)
  assert.strictEqual(order2.pointsAmount, 0)
})

// ---------- 退款状态机 ----------
test('退款：待发货申请→退款中→同意→已退款（库存只恢复一次）', () => {
  const order = createSimpleOrder()
  const before = mock.getGoodsById(1006).stock
  mock.payOrder(order.id)
  assert.strictEqual(mock.getGoodsById(1006).stock, before - 1) // 支付扣库存

  assert.strictEqual(mock.applyRefund(order.id, '不想要了'), true)
  const o1 = mock.getOrderById(order.id)
  assert.strictEqual(o1.status, 6)
  assert.strictEqual(o1.refundReason, '不想要了')
  assert.strictEqual(o1.refundFrom, 2)
  assert.strictEqual(o1.stockDeducted, false)
  assert.strictEqual(mock.getGoodsById(1006).stock, before) // 已回补

  // 退款中不可重复申请
  assert.strictEqual(mock.applyRefund(order.id), false)
  assert.strictEqual(mock.getGoodsById(1006).stock, before) // 不重复回补

  assert.strictEqual(mock.agreeRefund(order.id), true)
  const o2 = mock.getOrderById(order.id)
  assert.strictEqual(o2.status, 7)
  assert.ok(o2.refundTime)

  // 已退款不可再操作
  assert.strictEqual(mock.agreeRefund(order.id), false)
  assert.strictEqual(mock.cancelRefund(order.id), false)
})

test('退款：待收货→申请→撤销→回待收货', () => {
  const order = createSimpleOrder()
  const before = mock.getGoodsById(1006).stock
  mock.payOrder(order.id)
  mock.shipOrder(order.id)
  assert.strictEqual(mock.getOrderById(order.id).status, 3)

  assert.strictEqual(mock.applyRefund(order.id), true)
  assert.strictEqual(mock.getGoodsById(1006).stock, before)
  assert.strictEqual(mock.cancelRefund(order.id), true)
  const o2 = mock.getOrderById(order.id)
  assert.strictEqual(o2.status, 3)
  assert.strictEqual(o2.refundReason, '')
  assert.strictEqual(o2.refundFrom, 0)
  assert.strictEqual(mock.getGoodsById(1006).stock, before) // 撤销后不重新扣库存（文档约定）
})

test('退款：同意退款退回下单抵扣的积分', () => {
  const order = mock.createOrder({
    items: itemsOf(1001),
    goodsAmount: 3999,
    totalPrice: 3999,
    totalCount: 1,
    pointsUsed: 150,
    pointsAmount: 1
  })
  mock.payOrder(order.id)
  mock.applyRefund(order.id)
  assert.strictEqual(points.getBalance(), 50)
  mock.agreeRefund(order.id)
  assert.strictEqual(points.getBalance(), 200)
})

test('退款：非法转移全部拒绝', () => {
  const order = createSimpleOrder()
  // 待付款不能申请退款
  assert.strictEqual(mock.applyRefund(order.id), false)
  assert.strictEqual(mock.agreeRefund(order.id), false)
  // 已完成不能申请退款
  mock.payOrder(order.id)
  mock.shipOrder(order.id)
  mock.confirmOrder(order.id)
  assert.strictEqual(mock.applyRefund(order.id), false)
  // 待发货可申请，退款中可撤销/同意
  const o2 = createSimpleOrder()
  mock.payOrder(o2.id)
  assert.strictEqual(mock.applyRefund(o2.id), true)
  assert.strictEqual(mock.rejectRefund(o2.id), true)
  assert.strictEqual(mock.getOrderById(o2.id).status, 2) // 驳回回待发货
})

// ---------- 订单筛选 ----------
test('filterOrders：状态tab/关键词/退款tab/组合', () => {
  const orders = mock.getOrders() // 种子：10001 待发货(星野), 10002 已完成(循环扇)
  assert.strictEqual(mock.filterOrders(orders, 'all').length, 2)
  assert.strictEqual(mock.filterOrders(orders, 2).length, 1)
  assert.strictEqual(mock.filterOrders(orders, '2').length, 1) // 字符串数字也兼容
  // 订单号匹配（大小写不敏感）
  assert.strictEqual(mock.filterOrders(orders, 'all', 'D2026081510240001').length, 1)
  assert.strictEqual(mock.filterOrders(orders, 'all', 'd2026081510240001').length, 1)
  // 商品名匹配
  assert.strictEqual(mock.filterOrders(orders, 'all', '星野').length, 1)
  assert.strictEqual(mock.filterOrders(orders, 'all', '循环扇').length, 1)
  // 关键词 + 状态 AND
  assert.strictEqual(mock.filterOrders(orders, 4, '星野').length, 0)
  assert.strictEqual(mock.filterOrders(orders, 4, '循环扇').length, 1)
  // 退款tab：无退款单为空
  assert.strictEqual(mock.filterOrders(orders, 'refund').length, 0)
})

// ---------- 物流跟踪 ----------
test('物流：确定性 + 状态4含签收、状态3不含', () => {
  // 种子已完成订单（status 4，含 shipTime）→ 含签收
  const a = mock.getLogistics(10002)
  const b = mock.getLogistics(10002)
  assert.deepStrictEqual(a, b) // 确定性
  assert.ok(a.some(t => t.desc.indexOf('签收') > -1))
  assert.ok(a.length >= 5)

  // 新订单走支付→发货（status 3）→ 不含签收
  const order = createSimpleOrder()
  mock.payOrder(order.id)
  mock.shipOrder(order.id)
  const logs = mock.getLogistics(order.id)
  assert.ok(logs.length > 0)
  assert.ok(!logs.some(t => t.desc.indexOf('签收') > -1))
})

test('物流：不存在订单返回空', () => {
  assert.deepStrictEqual(mock.getLogistics(999999), [])
})
