const mock = require('../../utils/mock')
const review = require('../../utils/review')

Page({
  data: {
    order: null,
    goods: null,
    rating: 5,
    content: '',
    images: [],
    submitting: false
  },

  onLoad(options) {
    this.orderId = Number(options.orderId)
    this.goodsId = Number(options.goodsId)
    const order = mock.getOrderById(this.orderId)
    const goods = mock.getGoodsById(this.goodsId)
    this.setData({ order, goods })
    if (goods) {
      wx.setNavigationBarTitle({ title: '评价商品' })
    }
  },

  onRate(e) {
    this.setData({ rating: Number(e.currentTarget.dataset.rate) })
  },

  onContent(e) {
    this.setData({ content: e.detail.value })
  },

  // 晒图：最多 3 张（优先 chooseMedia，低版本回退 chooseImage）
  onChooseImage() {
    const remain = 3 - this.data.images.length
    if (remain <= 0) return
    const done = imgs => this.setData({ images: this.data.images.concat(imgs) })
    if (wx.chooseMedia) {
      wx.chooseMedia({
        count: remain,
        mediaType: ['image'],
        sizeType: ['compressed'],
        success: res => done(res.tempFiles.map(f => f.tempFilePath))
      })
    } else {
      wx.chooseImage({
        count: remain,
        sizeType: ['compressed'],
        success: res => done(res.tempFilePaths)
      })
    }
  },

  onRemoveImage(e) {
    const idx = Number(e.currentTarget.dataset.idx)
    const images = this.data.images.slice()
    images.splice(idx, 1)
    this.setData({ images })
  },

  onPreviewImage(e) {
    wx.previewImage({
      current: this.data.images[Number(e.currentTarget.dataset.idx)],
      urls: this.data.images
    })
  },

  onSubmit() {
    if (this.data.submitting) return
    const content = (this.data.content || '').trim()
    if (!content) {
      wx.showToast({ title: '请填写评价内容', icon: 'none' })
      return
    }
    this.setData({ submitting: true })
    review.addReview({
      goodsId: this.goodsId,
      orderId: this.orderId,
      rating: this.data.rating,
      content,
      images: this.data.images
    })
    wx.showToast({ title: '评价成功', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 600)
  }
})
