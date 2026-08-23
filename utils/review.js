/**
 * 商品评价本地存储
 * 评价保存在 storage key `reviewList`；首次启动为每个商品预置示例评价
 *
 * 评价字段：
 *   id / goodsId / orderId(0=示例评价) / nickname / avatar
 *   rating(1-5) / content / images(数组，本地临时路径) / createTime
 */
const REVIEW_KEY = 'reviewList'
const mock = require('./mock')
const user = require('./user')

const seedNicknames = ['爱吃糖的猫', '橙子味气泡水', '数码控小李', '山野间的风', '购物狂魔小七', '晚风与你']
const seedContents = [
  '质量很不错，包装严实，物流也快，已经推荐给朋友了。',
  '和描述一致，做工精细，用起来很满意，会回购。',
  '性价比很高，在这个价位算很不错的了，五星好评。',
  '总体还行，就是快递稍微慢了点，东西本身没毛病。',
  '买之前还有点犹豫，收到后真香，完全超出预期。',
  '客服态度很好，发货也快，值得信赖。'
]

function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

function fmt(d) {
  return (
    d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
    ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds())
  )
}

function getReviews() {
  return wx.getStorageSync(REVIEW_KEY) || []
}

function saveReviews(list) {
  wx.setStorageSync(REVIEW_KEY, list)
}

// 某商品的全部评价，按时间倒序
function getReviewsByGoods(goodsId) {
  const gid = Number(goodsId)
  return getReviews()
    .filter(r => r.goodsId === gid)
    .sort((a, b) => b.createTime.localeCompare(a.createTime))
}

// 商品评价汇总：{ count, avg(保留 1 位小数) }
function getGoodsRating(goodsId) {
  const list = getReviewsByGoods(goodsId)
  if (!list.length) return { count: 0, avg: 0 }
  const sum = list.reduce((s, r) => s + r.rating, 0)
  return { count: list.length, avg: Math.round((sum / list.length) * 10) / 10 }
}

// 该订单的某商品是否已评价
function hasReviewed(orderId, goodsId) {
  return getReviews().some(r => r.orderId === Number(orderId) && r.goodsId === Number(goodsId))
}

// 新增评价：带上当前登录用户信息（未登录则匿名「微信用户」）
function addReview({ goodsId, orderId = 0, rating, content, images = [] }) {
  const u = user.getUserInfo() || {}
  const review = {
    id: Date.now(),
    goodsId: Number(goodsId),
    orderId: Number(orderId) || 0,
    nickname: u.nickname || '微信用户',
    avatar: u.avatar || '',
    rating: Math.min(5, Math.max(1, Number(rating) || 5)),
    content: (content || '').trim(),
    images,
    createTime: fmt(new Date())
  }
  saveReviews([review].concat(getReviews()))
  return review
}

// 首次启动为每个商品预置 3 条示例评价，让详情页有内容可看
function ensureSeed() {
  if (getReviews().length) return
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  const list = []
  mock.getGoodsList().forEach((g, gi) => {
    for (let i = 0; i < 3; i++) {
      const idx = (gi * 3 + i) % seedNicknames.length
      list.push({
        id: now + gi * 10 + i,
        goodsId: g.id,
        orderId: 0,
        nickname: seedNicknames[(idx + i) % seedNicknames.length],
        avatar: '',
        rating: [5, 4, 5][i],
        content: seedContents[(idx + i) % seedContents.length],
        images: i === 0 ? [g.galleryImages[2]] : [],
        createTime: fmt(new Date(now - (3 + i * 2) * day))
      })
    }
  })
  saveReviews(list)
}

module.exports = {
  getReviews,
  getReviewsByGoods,
  getGoodsRating,
  hasReviewed,
  addReview,
  ensureSeed
}
