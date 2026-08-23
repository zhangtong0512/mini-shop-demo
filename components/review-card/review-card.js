Component({
  properties: {
    review: {
      type: Object,
      value: {}
    }
  },

  data: {
    stars: '',
    avatarText: ''
  },

  observers: {
    review(r) {
      if (!r) return
      const n = Math.round(Number(r.rating) || 0)
      this.setData({
        stars: '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n),
        avatarText: (r.nickname || '微')[0] || '微'
      })
    }
  },

  methods: {
    // 点击晒图预览
    onPreview(e) {
      const src = e.currentTarget.dataset.src
      const urls = (this.data.review && this.data.review.images) || []
      wx.previewImage({ current: src, urls })
    }
  }
})
