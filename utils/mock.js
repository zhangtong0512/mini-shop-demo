/**
 * 商城 demo 的 mock 数据与订单存储逻辑
 * 无后端依赖，数据存于本地 storage
 *
 * 订单字段：
 *   id / orderNo / createTime / status(1待付款 2待发货 3待收货 4已完成 5已取消)
 *   items / goodsAmount / freight / totalPrice / totalCount
 *   address(下单时地址快照) / remark
 *   payDeadline(待付款超时时间戳) / stockDeducted(是否已扣库存)
 *   payTime / shipTime / finishTime / cancelTime
 */

const config = require('./config')

const PAY_TIMEOUT_MS = config.PAY_TIMEOUT_MINUTES * 60 * 1000

const ORDER_STATUS = {
  1: '待付款',
  2: '待发货',
  3: '待收货',
  4: '已完成',
  5: '已取消'
}

const categories = [
  { id: 'all', name: '全部' },
  { id: 'digital', name: '手机数码' },
  { id: 'apparel', name: '服饰鞋包' },
  { id: 'appliance', name: '家用电器' },
  { id: 'beauty', name: '美妆个护' },
  { id: 'food', name: '食品生鲜' },
  { id: 'sports', name: '运动户外' }
]

const goodsList = [
  { id: 1001, category: 'digital', emoji: '📱', title: '星野 X10 智能手机 12GB+256GB 曜石黑', desc: '6.7 英寸 2K 直屏 · 5000mAh 大电池 · 5000 万像素三摄', price: 3999, originalPrice: 4599, sales: 12800, stock: 860, tags: ['手机', '数码'] },
  { id: 1002, category: 'digital', emoji: '🎧', title: '幻影无线蓝牙耳机 Pro 主动降噪', desc: '深度降噪 · 40 小时长续航 · 入耳检测', price: 499, originalPrice: 699, sales: 35600, stock: 2400, tags: ['耳机', '数码'] },
  { id: 1003, category: 'sports', emoji: '👟', title: '城市轻跑鞋 透气网面 轻量缓震', desc: '透气飞织鞋面 · 缓震中底 · 通勤跑步两相宜', price: 329, originalPrice: 429, sales: 8200, stock: 1500, tags: ['跑鞋', '运动'] },
  { id: 1004, category: 'apparel', emoji: '🧥', title: '简约连帽卫衣 宽松慵懒风', desc: '280g 加绒面料 · 落肩设计 · 多色可选', price: 189, originalPrice: 269, sales: 15200, stock: 3000, tags: ['卫衣', '服饰'] },
  { id: 1005, category: 'appliance', emoji: '🌀', title: '空气循环扇 落地式 3 档风速', desc: '上下 90° 摇头 · 远距送风 · 低噪电机', price: 259, originalPrice: 329, sales: 4600, stock: 980, tags: ['电扇', '家电'] },
  { id: 1006, category: 'beauty', emoji: '🧼', title: '氨基酸温和洁面乳 100g', desc: '温和不紧绷 · 泡沫细腻 · 敏感肌适用', price: 89, originalPrice: 129, sales: 52300, stock: 5200, tags: ['洁面', '美妆'] },
  { id: 1007, category: 'food', emoji: '🥜', title: '每日坚果混合装 30 包', desc: '6 种坚果果干 · 独立小包 · 锁鲜装', price: 128, originalPrice: 158, sales: 30100, stock: 4200, tags: ['坚果', '零食'] },
  { id: 1008, category: 'apparel', emoji: '🎒', title: '双肩电脑背包 15.6 英寸 防泼水', desc: '独立电脑仓 · 多隔层收纳 · 商务休闲通用', price: 159, originalPrice: 219, sales: 9800, stock: 1700, tags: ['背包', '箱包'] },
  { id: 1009, category: 'digital', emoji: '⌚', title: '智能手环 6 代 血氧心率监测', desc: '1.62 英寸彩屏 · 14 天续航 · 50 米防水', price: 249, originalPrice: 349, sales: 68800, stock: 9000, tags: ['手环', '数码'] },
  { id: 1010, category: 'appliance', emoji: '🥤', title: '便携榨汁杯 充电式 一键启动', desc: 'USB 充电 · 400ml 容量 · 食品级材质', price: 99, originalPrice: 149, sales: 22500, stock: 3600, tags: ['榨汁杯', '家电'] },
  { id: 1011, category: 'beauty', emoji: '🧴', title: '玻尿酸补水面膜 5 片装', desc: '三重玻尿酸 · 服帖膜布 · 深层补水', price: 79, originalPrice: 119, sales: 43100, stock: 6100, tags: ['面膜', '美妆'] },
  { id: 1012, category: 'sports', emoji: '🧘', title: '加厚防滑瑜伽垫 183×61cm', desc: 'TPE 材质 · 双面防滑 · 附绑带收纳', price: 69, originalPrice: 99, sales: 17600, stock: 2800, tags: ['瑜伽垫', '运动'] }
]

const banners = [
  'https://picsum.photos/seed/shop-banner-1/750/300',
  'https://picsum.photos/seed/shop-banner-2/750/300',
  'https://picsum.photos/seed/shop-banner-3/750/300'
]

// 商品图文详情的详细介绍文案（按商品 id）
const goodsDetailText = {
  1001: [
    '星野 X10 采用 6.7 英寸 2K 超视网膜直屏，支持 120Hz 高刷，峰值亮度 1400nit，户外阳光下依然清晰。',
    '搭载 5000 万像素三摄系统，支持 OIS 光学防抖与夜景模式；5000mAh 大电池 + 66W 快充，告别续航焦虑。',
    '机身采用航空级铝合金中框与 AG 磨砂玻璃背板，握持舒适防指纹；出厂预装全新系统，支持 3 年系统更新。'
  ],
  1002: [
    '幻影 Pro 采用自研 11mm 动圈单元 + 深度主动降噪（-42dB），通勤地铁也能沉浸在自己的世界。',
    '单次续航 8 小时，配合充电仓总续航 40 小时；支持双设备连接、入耳检测，摘下即暂停。',
    '支持无线充电与快充，充电 10 分钟听歌 2 小时；附赠 3 种尺寸耳塞，久戴不胀耳。'
  ],
  1003: [
    '城市轻跑鞋采用一体飞织鞋面，透气网眼结构，夏季跑步不闷脚。',
    '中底搭载缓震科技，回弹率提升 30%，前掌弯折灵活，适合日常通勤与 5-10 公里慢跑。',
    '橡胶大底防滑耐磨，后跟内置稳定片，落地更稳；整鞋仅重约 240g，轻若无物。'
  ],
  1004: [
    '280g 加绒面料，里层细腻抓绒，秋冬上身即暖；落肩宽松版型，慵懒休闲风。',
    '领口罗纹收口不易变形，袖口弹力贴合；多色可选，男女同款，搭配牛仔裤或工装裤都好看。',
    '机洗不易起球掉色，水洗标清晰；支持 7 天无理由退换，尺码不合适随时换。'
  ],
  1005: [
    '三档风速 + 自然风模式，配合 90° 上下摇头与 80° 左右摆头，客厅卧室全屋送风。',
    '低噪直流电机，睡眠档噪音低至 25dB，不影响休息；附带遥控器，躺床上也能调风。',
    '落地式设计，高度可调；免工具拆洗网罩，收纳方便，四季可用。'
  ],
  1006: [
    '氨基酸表活配方，pH 值接近肌肤弱酸性，温和清洁不紧绷，敏感肌也能放心用。',
    '细腻绵密泡沫，轻松带走毛孔污垢与多余油脂，洗完水润不假滑。',
    '100g 大容量，早晚各一次可用约 2 个月；无酒精无香精，孕妇可用。'
  ],
  1007: [
    '每日坚果混合装含 6 种坚果果干：核桃、巴旦木、腰果、榛子、蔓越莓、蓝莓，科学配比。',
    '独立小包锁鲜装，每包 25g，常温锁鲜不返潮，上班、健身、追剧随手一包。',
    '低温轻烘工艺，保留坚果原香；不添加防腐剂，儿童、老人均可适量食用。'
  ],
  1008: [
    '15.6 英寸独立电脑仓，加厚缓震隔层，通勤出差保护设备安全。',
    '防泼水面料 + 隐藏式防盗口袋，多隔层收纳设计，证件、充电宝、水杯各有其位。',
    '人体工学肩带与透气背板，久背不累；可折叠收纳，出差行李箱轻松携带。'
  ],
  1009: [
    '1.62 英寸 AMOLED 高清彩屏，屏占比高，表盘市场海量免费表盘随心换。',
    '支持心率、血氧、睡眠监测与 100+ 运动模式，14 天超长续航，磁吸快充。',
    '50 米防水，游泳可佩戴；支持消息提醒、来电拒接、遥控拍照等实用功能。'
  ],
  1010: [
    '400ml 容量，食品级 Tritan 杯身，无双酚 A，果汁随打随喝。',
    '6 叶精钢刀头 + 高转速电机，30 秒出汁，冰沙、奶昔、果蔬汁都轻松搞定。',
    'USB-C 充电，充满可打约 10 杯；杯身防滑硅胶套，办公室、健身房、户外都适用。'
  ],
  1011: [
    '三重玻尿酸精华，大小分子协同补水，敷完肌肤水润透亮。',
    '天丝膜布轻薄服帖，承载 25ml 精华液，敷 15 分钟不拔干。',
    '无酒精无色素，敏感肌可用；每盒 5 片，建议每周 2-3 次，坚持使用效果更佳。'
  ],
  1012: [
    'TPE 环保材质，加厚 8mm，缓冲支撑好，膝盖不硌，练习更安心。',
    '双面防滑纹理，干湿都防滑，大体位也不移位；183×61cm 标准尺寸，附绑带方便收纳。',
    '无异味，可水洗擦拭，附赠收纳绑带；适合瑜伽、普拉提、健身垫上训练。'
  ]
}

// 为每个商品补充图片与图文详情：
//   galleryImages  顶部轮播主图（4 张）
//   detailImages   图文详情大图
//   detail         详细介绍段落
goodsList.forEach(g => {
  g.galleryImages = [1, 2, 3, 4].map(i => {
    return 'https://picsum.photos/seed/shop-gallery-' + g.id + '-' + i + '/750/750'
  })
  g.detailImages = [1, 2, 3, 4].map(i => {
    return 'https://picsum.photos/seed/shop-detail-' + g.id + '-' + i + '/750/1000'
  })
  g.detail = goodsDetailText[g.id] || [
    g.desc,
    '精选优质材料，做工精细，每一处细节都经过严格质检。',
    '支持 7 天无理由退换，48 小时内发货，售后无忧。'
  ]
})

const ORDER_KEY = 'orderList'

function getCategories() {
  return categories
}

function getGoodsList() {
  return goodsList
}

function getBanners() {
  return banners
}

function getGoodsById(id) {
  return goodsList.find(g => g.id === Number(id)) || null
}

function toOrderItem(goods, count) {
  return {
    id: goods.id,
    title: goods.title,
    emoji: goods.emoji,
    image: goods.image,
    price: goods.price,
    count
  }
}

function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

function formatTime(date) {
  return (
    date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
    ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds())
  )
}

function getOrders() {
  return wx.getStorageSync(ORDER_KEY) || []
}

function getOrderById(id) {
  return getOrders().find(o => o.id === Number(id)) || null
}

// 首次启动时预置两条示例订单，让订单页不至于空
function ensureSeedOrders() {
  if (getOrders().length) return
  const g1 = goodsList[0]
  const g2 = goodsList[4]
  const seedAddress = {
    name: '张三',
    phone: '13812348888',
    region: ['上海市', '上海市', '浦东新区'],
    regionText: '上海市 上海市 浦东新区',
    detail: '世纪大道 100 号 8 层'
  }
  const seed = [
    {
      id: 10001,
      orderNo: 'D2026081510240001',
      createTime: '2026-08-15 10:24:00',
      status: 2,
      items: [toOrderItem(g1, 2)],
      goodsAmount: g1.price * 2,
      freight: 0,
      totalPrice: g1.price * 2,
      totalCount: 2,
      address: seedAddress,
      remark: '',
      stockDeducted: true,
      payTime: '2026-08-15 10:25:00'
    },
    {
      id: 10002,
      orderNo: 'D2026081216050002',
      createTime: '2026-08-12 16:05:00',
      status: 4,
      items: [toOrderItem(g2, 1)],
      goodsAmount: g2.price,
      freight: 0,
      totalPrice: g2.price,
      totalCount: 1,
      address: seedAddress,
      remark: '',
      stockDeducted: true,
      payTime: '2026-08-12 16:06:00',
      shipTime: '2026-08-12 18:30:00',
      finishTime: '2026-08-15 09:12:00'
    }
  ]
  wx.setStorageSync(ORDER_KEY, seed)
}

// ---------- 库存 ----------

// 下单前校验库存：{ ok: true } 或 { ok: false, msg }
function checkStock(items) {
  for (const it of items) {
    const g = getGoodsById(it.id)
    if (!g) {
      return { ok: false, msg: '「' + it.title + '」已下架，请重新选购' }
    }
    if (it.count > g.stock) {
      return { ok: false, msg: '「' + it.title + '」库存不足（仅剩 ' + g.stock + ' 件）' }
    }
  }
  return { ok: true }
}

// 支付成功后扣减库存（重复扣减由 stockDeducted 防止）
function deductStock(items) {
  for (const it of items) {
    const g = getGoodsById(it.id)
    if (g) g.stock = Math.max(0, g.stock - it.count)
  }
}

function restoreStock(items) {
  for (const it of items) {
    const g = getGoodsById(it.id)
    if (g) g.stock += it.count
  }
}

// ---------- 订单操作 ----------

// 创建订单（先校验库存），返回订单或 null
function createOrder(info) {
  const items = info.items || []
  if (!items.length) return null
  const stockRes = checkStock(items)
  if (!stockRes.ok) return null

  const list = getOrders()
  const now = formatTime(new Date())
  const order = {
    id: Date.now(),
    orderNo: 'D' + now.replace(/[-: ]/g, ''),
    createTime: now,
    status: 1,
    items,
    goodsAmount: info.goodsAmount || 0,
    freight: info.freight || 0,
    totalPrice: info.totalPrice || 0,
    totalCount: info.totalCount || 0,
    address: info.address || null,
    remark: info.remark || '',
    payDeadline: Date.now() + PAY_TIMEOUT_MS,
    stockDeducted: false
  }
  list.unshift(order)
  wx.setStorageSync(ORDER_KEY, list)
  return order
}

function payOrder(id) {
  const list = getOrders().map(o => {
    if (o.id === id && o.status === 1) {
      const next = Object.assign({}, o, {
        status: 2,
        payTime: formatTime(new Date()),
        payDeadline: 0,
        stockDeducted: true
      })
      deductStock(o.items)
      return next
    }
    return o
  })
  wx.setStorageSync(ORDER_KEY, list)
}

function cancelOrder(id) {
  const list = getOrders().map(o => {
    if (o.id === id && o.status === 1) {
      if (o.stockDeducted) restoreStock(o.items)
      return Object.assign({}, o, { status: 5, cancelTime: formatTime(new Date()) })
    }
    return o
  })
  wx.setStorageSync(ORDER_KEY, list)
}

// 模拟发货（demo：待发货 → 待收货）
function shipOrder(id) {
  const list = getOrders().map(o => {
    if (o.id === id && o.status === 2) {
      return Object.assign({}, o, { status: 3, shipTime: formatTime(new Date()) })
    }
    return o
  })
  wx.setStorageSync(ORDER_KEY, list)
}

function confirmOrder(id) {
  const list = getOrders().map(o => {
    if (o.id === id && o.status === 3) {
      return Object.assign({}, o, { status: 4, finishTime: formatTime(new Date()) })
    }
    return o
  })
  wx.setStorageSync(ORDER_KEY, list)
}

function deleteOrder(id) {
  wx.setStorageSync(
    ORDER_KEY,
    getOrders().filter(o => o.id !== id)
  )
}

// 待付款订单超时自动取消（返回本次取消的数量）
function cancelExpiredOrders() {
  const now = Date.now()
  let changed = false
  let count = 0
  const list = getOrders().map(o => {
    if (o.status === 1 && o.payDeadline && now > o.payDeadline) {
      if (o.stockDeducted) restoreStock(o.items)
      changed = true
      count++
      return Object.assign({}, o, {
        status: 5,
        cancelTime: formatTime(new Date()),
        expired: true
      })
    }
    return o
  })
  if (changed) wx.setStorageSync(ORDER_KEY, list)
  return count
}

// 待付款剩余毫秒数
function getRemainMs(order) {
  if (!order || order.status !== 1 || !order.payDeadline) return 0
  return Math.max(0, order.payDeadline - Date.now())
}

// 待付款剩余时间文案（如 29:59 / 01:02:03），非待付款返回空串
function remainText(order) {
  const ms = getRemainMs(order)
  if (ms <= 0) return ''
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return (h > 0 ? h + ':' + pad(m) : m) + ':' + pad(s)
}

function statusText(status) {
  return ORDER_STATUS[status] || '未知状态'
}

module.exports = {
  getCategories,
  getGoodsList,
  getBanners,
  getGoodsById,
  getOrders,
  getOrderById,
  ensureSeedOrders,
  checkStock,
  createOrder,
  payOrder,
  cancelOrder,
  shipOrder,
  confirmOrder,
  deleteOrder,
  cancelExpiredOrders,
  getRemainMs,
  remainText,
  statusText
}
