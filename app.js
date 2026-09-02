const cart = require('./utils/cart')
const mock = require('./utils/mock')
const address = require('./utils/address')
const coupon = require('./utils/coupon')
const review = require('./utils/review')
const points = require('./utils/points')
const afterSale = require('./utils/after-sale')
const member = require('./utils/member')
const notification = require('./utils/notification')
const store = require('./utils/store')
const groupBuy = require('./utils/group-buy')
const live = require('./utils/live')
const ar = require('./utils/ar')

App({
  // 跨页面传递的临时状态（如「我的 → 订单中心」指定 tab，switchTab 无法带参）
  globalData: {
    orderTab: null
  },

  onLaunch() {
    // 初始化本地数据
    cart.init()
    address.ensureSeed()
    mock.ensureSeedOrders()
    coupon.ensureSeed()
    review.ensureSeed()
    points.ensureSeed()
    afterSale.ensureSeed()
    member.ensureSeed()
    notification.ensureSeed()
    store.ensureSeed()
    groupBuy.ensureSeed()
    live.ensureSeed()
    ar.ensureSeed()
  }
})
