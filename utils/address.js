/**
 * 收货地址本地存储与操作
 * 地址保存在 storage key `addressList` 中，支持新增 / 编辑 / 删除 / 设默认
 */
const ADDRESS_KEY = 'addressList'

function getAddresses() {
  return wx.getStorageSync(ADDRESS_KEY) || []
}

function saveAddresses(list) {
  wx.setStorageSync(ADDRESS_KEY, list)
}

// 首次启动预置一条默认地址，保证结算页有地址可用
function ensureSeed() {
  if (getAddresses().length) return
  saveAddresses([
    {
      id: Date.now(),
      name: '张三',
      phone: '13812348888',
      region: ['上海市', '上海市', '浦东新区'],
      regionText: '上海市 上海市 浦东新区',
      detail: '世纪大道 100 号 8 层',
      isDefault: true
    }
  ])
}

// 新增地址：第一条自动设为默认；设为默认时取消其它默认
function addAddress(addr) {
  const list = getAddresses()
  if (!list.length) addr.isDefault = true
  if (addr.isDefault) {
    list.forEach(a => {
      a.isDefault = false
    })
  }
  addr.id = Date.now()
  list.push(addr)
  saveAddresses(list)
  return addr
}

function updateAddress(addr) {
  const list = getAddresses().map(a => {
    return a.id === addr.id ? addr : a
  })
  if (addr.isDefault) {
    list.forEach(a => {
      if (a.id !== addr.id) a.isDefault = false
    })
  }
  saveAddresses(list)
}

function removeAddress(id) {
  let list = getAddresses().filter(a => a.id !== id)
  // 删掉默认地址后，自动把第一条设为默认
  if (list.length && !list.some(a => a.isDefault)) {
    list[0].isDefault = true
  }
  saveAddresses(list)
}

function setDefault(id) {
  saveAddresses(
    getAddresses().map(a => {
      return Object.assign({}, a, { isDefault: a.id === id })
    })
  )
}

function getDefaultAddress() {
  const list = getAddresses()
  return list.find(a => a.isDefault) || list[0] || null
}

module.exports = {
  getAddresses,
  saveAddresses,
  ensureSeed,
  addAddress,
  updateAddress,
  removeAddress,
  setDefault,
  getDefaultAddress
}
