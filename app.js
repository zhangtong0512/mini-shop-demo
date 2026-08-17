const cart = require('./utils/cart')
const mock = require('./utils/mock')
const address = require('./utils/address')

App({
  onLaunch() {
    // 初始化本地数据：购物车 + 收货地址 + 示例订单
    cart.init()
    address.ensureSeed()
    mock.ensureSeedOrders()
  }
})
