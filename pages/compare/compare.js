const compare = require('../../utils/compare')
const mock = require('../../utils/mock')

Page({
  data: {
    compareGoods: [],
    dimensions: [],
    analysis: null,
    showAnalysis: false
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  loadData() {
    const compareGoods = compare.getCompareGoods(mock)
    const dimensions = compare.getCompareDimensions()
    
    this.setData({ compareGoods, dimensions })
    
    if (compareGoods.length >= 2) {
      const result = compare.analyzeCompare(compareGoods)
      if (result.ok) {
        this.setData({ analysis: result.analysis })
      }
    } else {
      this.setData({ analysis: null })
    }
  },

  onRemoveGoods(e) {
    const goodsId = e.currentTarget.dataset.id
    compare.removeFromCompare(goodsId)
    this.loadData()
    wx.showToast({ title: '已移除', icon: 'none' })
  },

  onClearAll() {
    wx.showModal({
      title: '提示',
      content: '确定清空对比列表？',
      success: (res) => {
        if (res.confirm) {
          compare.clearCompare()
          this.loadData()
          wx.showToast({ title: '已清空', icon: 'none' })
        }
      }
    })
  },

  onAddGoods() {
    wx.showToast({ title: '请从商品详情页添加', icon: 'none' })
  },

  onToggleAnalysis() {
    this.setData({ showAnalysis: !this.data.showAnalysis })
  },

  onGoodsTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/detail/detail?id=' + id })
  },

  onShareAppMessage() {
    const { compareGoods } = this.data
    const ids = compareGoods.map(g => g.id).join(',')
    return {
      title: '商品对比：' + compareGoods.length + '件商品',
      path: `/pages/compare/compare?ids=${ids}`
    }
  }
})
