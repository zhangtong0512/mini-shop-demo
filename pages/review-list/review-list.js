const mock = require('../../utils/mock')
const review = require('../../utils/review')

Page({
  data: {
    goods: null,
    list: [],
    count: 0,
    avg: 0,
    stars: ''
  },

  onLoad(options) {
    const goods = mock.getGoodsById(options.id)
    const rating = review.getGoodsRating(options.id)
    const round = Math.round(rating.avg)
    this.setData({
      goods,
      list: review.getReviewsByGoods(options.id),
      count: rating.count,
      avg: rating.avg,
      stars: '★★★★★'.slice(0, round) + '☆☆☆☆☆'.slice(0, 5 - round)
    })
    if (goods) {
      wx.setNavigationBarTitle({ title: goods.title })
    }
  }
})
