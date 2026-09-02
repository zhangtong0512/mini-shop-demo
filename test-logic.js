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
const member = require('./utils/member')
const notification = require('./utils/notification')
const storeModule = require('./utils/store')
const groupBuy = require('./utils/group-buy')
const live = require('./utils/live')
const ar = require('./utils/ar')

test.beforeEach(() => {
  resetStore()
  mock.ensureSeedOrders()
  coupon.ensureSeed()
  points.ensureSeed()
  member.ensureSeed()
  notification.ensureSeed()
  storeModule.ensureSeed()
  groupBuy.ensureSeed()
  live.ensureSeed()
  ar.ensureSeed()
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

// ---------- 会员等级 ----------
test('会员：初始等级为普通会员', () => {
  const info = member.getMemberInfo()
  assert.strictEqual(info.level, 1)
  assert.strictEqual(info.levelName, '普通会员')
  assert.strictEqual(info.discount, 1)
  assert.strictEqual(info.growth, 100)
})

test('会员：成长值增加与升级', () => {
  // 初始100成长值，再加400达到500升级银卡
  const result = member.addGrowth(400, '测试增加')
  assert.strictEqual(result.upgraded, true)
  assert.strictEqual(result.newLevel, 2)
  const info = member.getMemberInfo()
  assert.strictEqual(info.levelName, '银卡会员')
  assert.strictEqual(info.discount, 0.98)
})

test('会员：消费金额增加成长值', () => {
  const before = member.getMemberInfo().growth
  member.addConsumption(100)
  const after = member.getMemberInfo().growth
  assert.strictEqual(after, before + 100)
  assert.strictEqual(member.getMemberInfo().totalConsumed, 100)
})

test('会员：折扣价计算', () => {
  // 普通会员无折扣
  assert.strictEqual(member.calcMemberPrice(100), 100)
  // 升级到银卡(0.98折)
  member.addGrowth(400, '升级')
  assert.strictEqual(member.calcMemberPrice(100), 98)
  assert.strictEqual(member.calcMemberPrice(199), 195.02) // 199 * 0.98 = 195.02
})

test('会员：等级配置正确', () => {
  const levels = member.getAllLevels()
  assert.strictEqual(levels.length, 4)
  assert.strictEqual(levels[0].level, 1)
  assert.strictEqual(levels[3].level, 4)
  assert.strictEqual(levels[3].discount, 0.92)
})

test('会员：成长值进度计算', () => {
  // 初始100成长值，普通会员(0)到银卡(500)的进度
  const progress = member.getGrowthProgress()
  assert.strictEqual(progress, 20) // 100/500 = 20%
})

// ---------- 消息通知 ----------
test('通知：初始预置2条通知', () => {
  const notifications = notification.getNotifications()
  assert.strictEqual(notifications.length, 2)
  assert.strictEqual(notification.getUnreadCount(), 2)
})

test('通知：添加通知', () => {
  notification.addNotification('order', '订单发货', '您的订单已发货', { orderId: 10001 })
  const notifications = notification.getNotifications()
  assert.strictEqual(notifications.length, 3)
  assert.strictEqual(notifications[0].type, 'order')
  assert.strictEqual(notifications[0].title, '订单发货')
  assert.strictEqual(notification.getUnreadCount(), 3)
})

test('通知：标记已读', () => {
  const notifications = notification.getNotifications()
  const id = notifications[0].id
  notification.markAsRead(id)
  assert.strictEqual(notification.getUnreadCount(), 1)
  const updated = notification.getNotifications().find(n => n.id === id)
  assert.strictEqual(updated.isRead, true)
})

test('通知：全部已读', () => {
  notification.markAllRead()
  assert.strictEqual(notification.getUnreadCount(), 0)
  const notifications = notification.getNotifications()
  assert.ok(notifications.every(n => n.isRead))
})

test('通知：删除通知', () => {
  const notifications = notification.getNotifications()
  const id = notifications[0].id
  notification.deleteNotification(id)
  const remaining = notification.getNotifications()
  assert.strictEqual(remaining.length, 1)
  assert.strictEqual(remaining[0].id !== id, true)
})

test('通知：清空所有', () => {
  notification.clearAll()
  assert.strictEqual(notification.getNotifications().length, 0)
  assert.strictEqual(notification.getUnreadCount(), 0)
})

test('通知：按类型筛选', () => {
  notification.addNotification('system', '系统消息', '测试')
  const systemNotifs = notification.getNotifications('system')
  assert.ok(systemNotifs.every(n => n.type === 'system'))
  const orderNotifs = notification.getNotifications('order')
  assert.ok(orderNotifs.every(n => n.type === 'order'))
})

test('通知：设置管理', () => {
  const settings = notification.getSettings()
  assert.strictEqual(settings.orderNotify, true)
  notification.updateSettings({ orderNotify: false })
  const updated = notification.getSettings()
  assert.strictEqual(updated.orderNotify, false)
})

// ---------- 多门店系统 ----------
test('门店：初始预置5个门店', () => {
  const stores = storeModule.getStores()
  assert.strictEqual(stores.length, 5)
})

test('门店：获取门店详情', () => {
  const store = storeModule.getStoreById(1)
  assert.ok(store)
  assert.strictEqual(store.name, '精选商城·上海旗舰店')
  assert.strictEqual(store.status, 1)
})

test('门店：设置和获取当前门店', () => {
  const store = storeModule.getStoreById(1)
  storeModule.setCurrentStore(store)
  const current = storeModule.getCurrentStore()
  assert.strictEqual(current.id, 1)
})

test('门店：清除当前门店', () => {
  const store = storeModule.getStoreById(1)
  storeModule.setCurrentStore(store)
  storeModule.clearCurrentStore()
  assert.strictEqual(storeModule.getCurrentStore(), null)
})

test('门店：距离计算', () => {
  const distance = storeModule.calculateDistance(31.2304, 121.4737, 39.9042, 116.4074)
  assert.ok(distance > 0)
  assert.ok(distance < 2000) // 上海到北京约1000km
})

test('门店：格式化距离', () => {
  assert.strictEqual(storeModule.formatDistance(0.5), '500m')
  assert.strictEqual(storeModule.formatDistance(1.5), '1.5km')
  assert.strictEqual(storeModule.formatDistance(null), '未知')
})

test('门店：搜索门店', () => {
  const results = storeModule.searchStores('上海')
  assert.strictEqual(results.length, 1)
  assert.strictEqual(results[0].name, '精选商城·上海旗舰店')
  
  const allResults = storeModule.searchStores('精选')
  assert.strictEqual(allResults.length, 5)
})

test('门店：配送方式管理', () => {
  storeModule.setDeliveryMode('selfPickup')
  assert.strictEqual(storeModule.getDeliveryMode(), 'selfPickup')
  
  storeModule.setDeliveryMode('express')
  assert.strictEqual(storeModule.getDeliveryMode(), 'express')
})

test('门店：获取营业中的门店', () => {
  const openStores = storeModule.getOpenStores()
  assert.ok(openStores.length > 0)
  assert.ok(openStores.every(s => s.status === 1))
})

// ---------- 拼团功能 ----------
test('拼团：初始预置1个进行中的拼团', () => {
  const groups = groupBuy.getActiveGroups()
  assert.strictEqual(groups.length, 1)
  assert.strictEqual(groups[0].status, 0)
})

test('拼团：获取拼团商品配置', () => {
  const config = groupBuy.getGroupGoodsConfig()
  assert.strictEqual(config.length, 4)
  assert.ok(config[0].groupPrice < config[0].originalPrice)
})

test('拼团：获取拼团商品信息', () => {
  const goods = groupBuy.getGroupGoods(mock)
  assert.ok(goods.length > 0)
  assert.ok(goods[0].groupPrice)
  assert.ok(goods[0].groupSize)
})

test('拼团：发起拼团', () => {
  const result = groupBuy.createGroup(1002, 'user_test', '测试用户', '')
  assert.strictEqual(result.ok, true)
  assert.strictEqual(result.group.goodsId, 1002)
  assert.strictEqual(result.group.currentCount, 1)
  assert.strictEqual(result.group.status, 0)
})

test('拼团：参与拼团', () => {
  const groups = groupBuy.getActiveGroups()
  const groupId = groups[0].id
  const result = groupBuy.joinGroup(groupId, 'user_joiner', '参团用户', '')
  assert.strictEqual(result.ok, true)
  assert.strictEqual(result.group.currentCount, 2)
  assert.strictEqual(result.group.status, 1) // 成团
})

test('拼团：重复参团失败', () => {
  const groups = groupBuy.getActiveGroups()
  const groupId = groups[0].id
  const userId = groups[0].ownerId
  const result = groupBuy.joinGroup(groupId, userId, '团长', '')
  assert.strictEqual(result.ok, false)
  assert.strictEqual(result.msg, '您已参与该拼团')
})

test('拼团：检查用户拼团次数', () => {
  groupBuy.createGroup(1002, 'user_test', '测试用户', '')
  const count = groupBuy.getUserGroupCount(1002, 'user_test')
  assert.strictEqual(count, 1)
})

test('拼团：检查是否可以发起新拼团', () => {
  // 初始可以发起
  assert.strictEqual(groupBuy.canCreateGroup(1002, 'user_new'), true)
  
  // 发起后，达到限制（limitPerUser=2）
  groupBuy.createGroup(1002, 'user_new', '用户1', '')
  groupBuy.createGroup(1002, 'user_new', '用户2', '')
  assert.strictEqual(groupBuy.canCreateGroup(1002, 'user_new'), false)
})

test('拼团：获取可参与的拼团', () => {
  const groups = groupBuy.getJoinableGroups(1001, 'user_new')
  assert.ok(groups.length > 0)
  assert.ok(groups[0].status === 0)
  assert.ok(!groups[0].members.some(m => m.userId === 'user_new'))
})

test('拼团：格式化剩余时间', () => {
  const ms = 3661000 // 1小时1分1秒
  const text = groupBuy.formatRemainTime(ms)
  assert.strictEqual(text, '01:01:01')
  
  const expired = groupBuy.formatRemainTime(0)
  assert.strictEqual(expired, '已结束')
})

test('拼团：拼团详情获取', () => {
  const groups = groupBuy.getActiveGroups()
  const group = groupBuy.getGroupById(groups[0].id)
  assert.ok(group)
  assert.strictEqual(group.id, groups[0].id)
})

// ========== 直播功能 ==========

test('直播：初始化种子数据', () => {
  live.ensureSeed()
  const rooms = live.getLiveRooms()
  assert.ok(rooms.length > 0)
})

test('直播：获取所有直播间', () => {
  const rooms = live.getLiveRooms()
  assert.ok(Array.isArray(rooms))
  assert.ok(rooms.length >= 3)
})

test('直播：按状态筛选直播间', () => {
  const living = live.getLiveRooms(1)
  assert.ok(Array.isArray(living))
  living.forEach(r => assert.strictEqual(r.status, 1))
  
  const upcoming = live.getLiveRooms(0)
  upcoming.forEach(r => assert.strictEqual(r.status, 0))
})

test('直播：获取直播间详情', () => {
  const rooms = live.getLiveRooms()
  const room = live.getLiveRoomById(rooms[0].roomId)
  assert.ok(room)
  assert.strictEqual(room.roomId, rooms[0].roomId)
})

test('直播：获取不存在的直播间', () => {
  const room = live.getLiveRoomById(9999)
  assert.strictEqual(room, null)
})

test('直播：获取直播间商品', () => {
  const rooms = live.getLiveRooms()
  const goods = live.getLiveGoods(rooms[0].roomId, mock)
  assert.ok(Array.isArray(goods))
  assert.ok(goods.length > 0)
})

test('直播：更新观看人数', () => {
  const rooms = live.getLiveRooms()
  const roomId = rooms[0].roomId
  const originalCount = rooms[0].viewerCount
  live.updateViewerCount(roomId, 9999)
  const updated = live.getLiveRoomById(roomId)
  assert.strictEqual(updated.viewerCount, 9999)
})

test('直播：更新点赞数', () => {
  const rooms = live.getLiveRooms()
  const roomId = rooms[0].roomId
  live.updateLikeCount(roomId, 88888)
  const updated = live.getLiveRoomById(roomId)
  assert.strictEqual(updated.likeCount, 88888)
})

test('直播：检查是否直播中', () => {
  const rooms = live.getLiveRooms(1)
  if (rooms.length > 0) {
    assert.strictEqual(live.isLiveRoomLive(rooms[0].roomId), true)
  }
  assert.strictEqual(live.isLiveRoomLive(9999), false)
})

test('直播：状态文本', () => {
  assert.strictEqual(live.getLiveStatusText(0), '即将开始')
  assert.strictEqual(live.getLiveStatusText(1), '直播中')
  assert.strictEqual(live.getLiveStatusText(2), '已结束')
  assert.strictEqual(live.getLiveStatusText(9), '未知')
})

test('直播：状态样式类', () => {
  assert.strictEqual(live.getLiveStatusClass(0), 'upcoming')
  assert.strictEqual(live.getLiveStatusClass(1), 'living')
  assert.strictEqual(live.getLiveStatusClass(2), 'ended')
})

test('直播：格式化数字', () => {
  assert.strictEqual(live.formatNumber(999), '999')
  assert.strictEqual(live.formatNumber(1500), '1.5k')
  assert.strictEqual(live.formatNumber(25000), '2.5万')
})

test('直播：计算直播时长', () => {
  const start = new Date(Date.now() - 3600000).toISOString() // 1小时前
  const end = new Date().toISOString()
  const duration = live.getLiveDuration(start, end)
  assert.ok(duration.includes('小时'))
})

// ========== AR试穿/试用功能 ==========

test('AR：初始化种子数据', () => {
  ar.ensureSeed()
  const data = ar.getArData()
  assert.ok(data.arGoods.length > 0)
})

test('AR：获取AR商品配置列表', () => {
  const config = ar.getArGoodsConfig()
  assert.ok(Array.isArray(config))
  assert.ok(config.length >= 3)
})

test('AR：获取AR商品配置（按商品ID）', () => {
  const config = ar.getArConfigByGoodsId(1004)
  assert.ok(config)
  assert.strictEqual(config.goodsId, 1004)
  assert.strictEqual(config.type, 'wear')
})

test('AR：获取不存在的AR配置', () => {
  const config = ar.getArConfigByGoodsId(9999)
  assert.strictEqual(config, null)
})

test('AR：检查商品是否支持AR', () => {
  assert.strictEqual(ar.isArSupported(1004), true)
  assert.strictEqual(ar.isArSupported(9999), false)
})

test('AR：获取AR商品详情', () => {
  const detail = ar.getArGoodsDetail(1004, mock)
  assert.ok(detail)
  assert.ok(detail.goods)
  assert.strictEqual(detail.goodsId, 1004)
})

test('AR：添加收藏', () => {
  ar.addFavorite(1004)
  assert.strictEqual(ar.isFavorite(1004), true)
})

test('AR：移除收藏', () => {
  ar.addFavorite(1004)
  ar.removeFavorite(1004)
  assert.strictEqual(ar.isFavorite(1004), false)
})

test('AR：添加浏览历史', () => {
  ar.addHistory(1004)
  ar.addHistory(1005)
  const history = ar.getHistory()
  assert.ok(history.includes(1004))
  assert.ok(history.includes(1005))
})

test('AR：浏览历史去重', () => {
  ar.addHistory(1004)
  ar.addHistory(1004)
  const history = ar.getHistory()
  const count = history.filter(id => id === 1004).length
  assert.strictEqual(count, 1)
})

test('AR：清空浏览历史', () => {
  ar.addHistory(1004)
  ar.clearHistory()
  const history = ar.getHistory()
  assert.strictEqual(history.length, 0)
})

test('AR：AR_GOODS_CONFIG导出', () => {
  assert.ok(Array.isArray(ar.AR_GOODS_CONFIG))
  assert.ok(ar.AR_GOODS_CONFIG.length >= 3)
})
