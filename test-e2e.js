/**
 * 端到端串联验证（零依赖，与 test-logic.js 互补）
 * 运行：node test-e2e.js
 *
 * test-logic.js 逐个断言单个函数的行为；本文件按**页面真实调用顺序**把整条链路串起来跑一遍，
 * 用来兜住「每个环节都对、但组合起来接不上」这类断点问题（例如分销页面全部孤立、
 * 拼团不进订单、通知只读不写）。失败时进程退出码为 1。
 */
'use strict'

const store = {}
global.wx = {
  getStorageSync: k => (k in store ? store[k] : ''),
  setStorageSync: (k, v) => { store[k] = v },
  removeStorageSync: k => { delete store[k] },
  clearStorageSync: () => { for (const k in store) delete store[k] },
  setTabBarBadge() {}, removeTabBarBadge() {}, showToast() {}, showModal() {},
  showLoading() {}, hideLoading() {}, setNavigationBarTitle() {}, scanCode() {},
  previewImage() {}, setClipboardData() {}
}

const mock = require('./utils/mock')
const user = require('./utils/user')
const cart = require('./utils/cart')
const address = require('./utils/address')
const coupon = require('./utils/coupon')
const points = require('./utils/points')
const member = require('./utils/member')
const review = require('./utils/review')
const afterSale = require('./utils/after-sale')
const notification = require('./utils/notification')
const storeM = require('./utils/store')
const groupBuy = require('./utils/group-buy')
const live = require('./utils/live')
const ar = require('./utils/ar')
const distribution = require('./utils/distribution')
const compare = require('./utils/compare')

// 与 app.js onLaunch 一致的初始化
cart.init()
address.ensureSeed()
mock.ensureSeedOrders()
coupon.ensureSeed()
review.ensureSeed()
points.ensureSeed()
afterSale.ensureSeed()
member.ensureSeed()
notification.ensureSeed()
storeM.ensureSeed()
groupBuy.ensureSeed()
live.ensureSeed()
ar.ensureSeed()
distribution.ensureSeed()
compare.ensureSeed()

let failed = 0
function ok(label, cond, extra) {
  if (cond) {
    console.log('✓ ' + label + (extra ? ' — ' + extra : ''))
  } else {
    failed++
    console.log('✗ ' + label + (extra ? ' — ' + extra : ''))
  }
}

function itemsOf(gid) {
  const g = mock.getGoodsById(gid)
  const skuKey = (g.skus && g.skus.length) ? g.skus[0].key : ''
  return [{
    id: g.id, title: g.title, emoji: g.emoji, image: g.image,
    price: mock.getSkuPrice(g, skuKey), count: 1, skuKey
  }]
}

// ---------- 流程一：分销申请 → 审核 → 分享 → 好友下单 → 佣金 → 提现 ----------
console.log('\n【流程一】分销：申请 → 审核 → 分享 → 好友下单 → 佣金 → 提现打款')
user.saveUserInfo({ id: 'wx_user_a', nickname: '分销达人', avatar: '' })
const myId = user.getUserId()
ok('取到真实登录 id', myId === 'wx_user_a', myId)

const applied = distribution.applyAgent(myId, '分销达人', '13800001111')
ok('提交申请', applied.ok && distribution.getMyDistribution(myId).status === 'pending')

const audited = distribution.auditAgent(applied.apply.id, 1)
ok('审核通过成为分销员', audited.ok && distribution.getMyDistribution(myId).status === 'agent')
const agentId = audited.agent.agentId

const link = distribution.getShareLink(1002, agentId)
ok('生成带 agentId 的推广链接', link.indexOf(agentId) > -1, link)

// 好友从分享链接进入 → 下单 → 支付
distribution.setPendingAgent(agentId)
const orderG = mock.createOrder({
  items: itemsOf(1002),
  goodsAmount: 499,
  totalPrice: 499,
  totalCount: 1,
  agentId: distribution.getPendingAgent()
})
ok('好友下单带上推广位', orderG.agentId === agentId)

mock.payOrder(orderG.id)
const agentAfter = distribution.getAgentById(agentId)
ok('支付后佣金自动入账', agentAfter.availableCommission === 59.88, '可提现 ¥' + agentAfter.availableCommission)
ok('发出佣金通知', notification.getNotifications('distribution').some(n => n.title === '佣金已入账'))

distribution.applyWithdraw(agentId, 20, '工商银行', '6222')
const wrec = distribution.getWithdrawRecords(agentId).find(r => r.status === 0)
ok('提现申请进入处理中（金额转冻结）', !!wrec && distribution.getAgentById(agentId).frozenCommission === 20)

distribution.auditWithdraw(wrec.id, 1)
const finalAgent = distribution.getAgentById(agentId)
ok('模拟打款后已到账', finalAgent.withdrawnCommission === 20 && finalAgent.frozenCommission === 0)

// ---------- 流程二：拼团发起 → 参团 → 成团 ----------
console.log('\n【流程二】拼团：发起下单支付 → 开团 → 好友参团 → 成团')
const gOrder = mock.createOrder({
  items: itemsOf(1002),
  goodsAmount: 1599,
  totalPrice: 1599,
  totalCount: 1,
  isGroupBuy: true,
  groupPrice: 1599
})
gOrder.items[0].price = 1599
mock.payOrder(gOrder.id)

const created = groupBuy.createGroup(1002, 'wx_user_b', '团长', '')
groupBuy.attachOrder(created.group.id, gOrder.orderNo)
ok('支付后开团并回写订单号', created.ok && groupBuy.getGroupById(created.group.id).orderNo === gOrder.orderNo)
ok('拼团订单落库', mock.getOrderById(gOrder.id).isGroupBuy === true)

const joinOrder = mock.createOrder({
  items: itemsOf(1002),
  goodsAmount: 1599,
  totalPrice: 1599,
  totalCount: 1,
  isGroupBuy: true,
  groupBuyId: created.group.id,
  groupPrice: 1599
})
mock.payOrder(joinOrder.id)

const joined = groupBuy.joinGroup(created.group.id, 'wx_user_c', '好友', '')
ok('参团后满员成团', joined.ok && joined.success === true && groupBuy.getGroupById(created.group.id).status === 1)
ok('发出拼团成功通知', notification.getNotifications('group').some(n => n.title === '拼团成功'))
ok('我的拼团含该团', groupBuy.getMyGroupsDetail(mock).some(m => m.groupId === created.group.id))
ok('可凭订单号反查拼团', groupBuy.getGroupByOrderNo(gOrder.orderNo).id === created.group.id)

const exp = groupBuy.createGroup(1002, 'wx_user_d', '过期', '')
const gd = groupBuy.getGroupBuyData()
gd.groups.find(g => g.id === exp.group.id).expireTime = new Date(Date.now() - 1000).toISOString()
groupBuy.saveGroupBuyData(gd)
ok('过期未成团判失败', groupBuy.checkGroupStatus(exp.group.id).length === 1 && groupBuy.getGroupById(exp.group.id).status === 2)

// ---------- 流程三：门店自提 ----------
console.log('\n【流程三】门店自提：选门店 → 免运费 → 扣门店仓 → 提货码')
const pickup = storeM.getStoreById(1)
storeM.setCurrentStore(pickup)
storeM.setDeliveryMode('selfPickup')
ok('配送方式为自提', storeM.getDeliveryMode() === 'selfPickup')

const totalBefore = mock.getGoodsById(1002).stock
const storeBefore = storeM.getStoreStock(1, 1002)
const sOrder = mock.createOrder({
  items: itemsOf(1002),
  goodsAmount: 499,
  freight: 0,
  totalPrice: 499,
  totalCount: 1,
  deliveryMode: 'selfPickup',
  storeId: 1,
  storeName: pickup.name,
  address: pickup
})
ok('自提订单免运费并记录门店', sOrder.freight === 0 && sOrder.storeId === 1 && sOrder.storeName === pickup.name)

mock.payOrder(sOrder.id)
ok('扣门店分仓库存', storeM.getStoreStock(1, 1002) === storeBefore - 1, storeBefore + ' → ' + storeM.getStoreStock(1, 1002))
ok('总仓库存不变', mock.getGoodsById(1002).stock === totalBefore)

mock.shipOrder(sOrder.id)
const shipped = mock.getOrderById(sOrder.id)
ok('自提发货生成提货码', !!shipped.pickupCode, '提货码 ' + shipped.pickupCode)
ok('发出可提货通知', notification.getNotifications('order').some(n => n.title === '备货完成，可提货'))

// ---------- 流程四：通知事件化与开关门控 ----------
console.log('\n【流程四】通知事件化 + 开关门控')
const titles = notification.getNotifications('order').map(n => n.title)
ok('覆盖下单与支付', ['订单提交成功', '支付成功'].every(t => titles.indexOf(t) > -1))
ok('自提发货走「可提货」文案', titles.indexOf('备货完成，可提货') > -1)

const ex = mock.createOrder({ items: itemsOf(1006), goodsAmount: 89, totalPrice: 89, totalCount: 1 })
mock.payOrder(ex.id)
mock.shipOrder(ex.id)
mock.confirmOrder(ex.id)
const t3 = notification.getNotifications('order').map(n => n.title)
ok('快递订单走「已发货」+ 完成通知', t3.indexOf('您的订单已发货') > -1 && t3.indexOf('订单已完成') > -1)

const fd = mock.createOrder({ items: itemsOf(1006), goodsAmount: 89, totalPrice: 89, totalCount: 1 })
mock.payOrder(fd.id)
mock.applyRefund(fd.id, '测试')
mock.agreeRefund(fd.id)
const t4 = notification.getNotifications('order').map(n => n.title)
ok('覆盖退款申请与退款成功', t4.indexOf('退款申请已提交') > -1 && t4.indexOf('退款成功') > -1)

const before = notification.getNotifications().length
notification.updateSettings({ orderNotify: false })
const q = mock.createOrder({ items: itemsOf(1006), goodsAmount: 89, totalPrice: 89, totalCount: 1 })
mock.payOrder(q.id)
ok('关闭订单通知后不再写入', notification.getNotifications().length === before)

console.log(failed === 0 ? '\n全部流程通过 ✓' : '\n有 ' + failed + ' 项失败 ✗')
process.exit(failed === 0 ? 0 : 1)
