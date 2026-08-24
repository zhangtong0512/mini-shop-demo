const cart = require('./utils/cart')
const mock = require('./utils/mock')
const address = require('./utils/address')
const coupon = require('./utils/coupon')
const review = require('./utils/review')
const points = require('./utils/points')

App({
  // 跨页面传递的临时状态（如「我的 → 订单中心」指定 tab，switchTab 无法带参）
  globalData: {
    orderTab: null
  },

  onLaunch() {
    // 初始化本地数据：购物车 + 收货地址 + 示例订单 + 示例优惠券 + 示例评价 + 积分
    cart.init()
    address.ensureSeed()
    mock.ensureSeedOrders()
    coupon.ensureSeed()
    review.ensureSeed()
    points.ensureSeed()
  }
})
