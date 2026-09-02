const compare = require('../../utils/compare')

Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    }
  },

  data: {
    compareCount: 0,
    maxCount: 4
  },

  lifetimes: {
    attached() {
      this.updateCount()
    }
  },

  pageLifetimes: {
    show() {
      this.updateCount()
    }
  },

  methods: {
    updateCount() {
      const count = compare.getCompareCount()
      this.setData({ compareCount: count })
    },

    onCompareTap() {
      if (this.data.compareCount < 2) {
        wx.showToast({ title: '请至少选择2个商品', icon: 'none' })
        return
      }
      wx.navigateTo({ url: '/pages/compare/compare' })
    },

    onClearTap() {
      wx.showModal({
        title: '提示',
        content: '确定清空对比列表？',
        success: (res) => {
          if (res.confirm) {
            compare.clearCompare()
            this.updateCount()
          }
        }
      })
    }
  }
})
