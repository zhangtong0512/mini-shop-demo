const ar = require('../../utils/ar')
const mock = require('../../utils/mock')

Page({
  data: {
    goodsId: 0,
    arConfig: null,
    goods: null,
    cameraReady: false,
    screenshot: false,
    showPoster: true,
    isFavorited: false
  },

  onLoad(options) {
    this.goodsId = Number(options.id)
    this.loadData()
  },

  loadData() {
    const arConfig = ar.getArConfigByGoodsId(this.goodsId)
    const goods = mock.getGoodsById(this.goodsId)
    const isFavorited = ar.isFavorite(this.goodsId)
    
    this.setData({ arConfig, goods, isFavorited })
    
    if (arConfig) {
      ar.addHistory(this.goodsId)
      wx.setNavigationBarTitle({ title: 'AR预览 - ' + (goods ? goods.title : '') })
    }
    
    this.initCamera()
  },

  async initCamera() {
    // 检查AR支持
    const capability = await ar.checkArCapability()
    if (!capability.supported) {
      wx.showModal({
        title: '提示',
        content: capability.message,
        showCancel: false
      })
    }
    
    // 请求摄像头权限
    const permission = await ar.requestCameraPermission()
    if (!permission.authorized) {
      wx.showModal({
        title: '权限提示',
        content: '需要摄像头权限才能使用AR功能',
        confirmText: '去设置',
        success: (res) => {
          if (res.confirm) {
            wx.openSetting()
          }
        }
      })
    }
  },

  onCameraReady() {
    this.setData({ cameraReady: true })
  },

  onCameraError(e) {
    console.error('摄像头错误', e)
    wx.showToast({ title: '摄像头启动失败', icon: 'none' })
  },

  onCapture() {
    this.setData({ screenshot: true })
    setTimeout(() => {
      this.setData({ screenshot: false })
    }, 200)
  },

  onSaveImage() {
    // 模拟保存截图
    wx.showModal({
      title: '保存成功',
      content: 'AR预览图片已保存到相册',
      showCancel: false
    })
  },

  onToggleFavorite() {
    const isFavorited = !this.data.isFavorited
    if (isFavorited) {
      ar.addFavorite(this.goodsId)
    } else {
      ar.removeFavorite(this.goodsId)
    }
    this.setData({ isFavorited })
    wx.showToast({ title: isFavorited ? '已收藏' : '已取消收藏', icon: 'none' })
  },

  onTogglePoster() {
    this.setData({ showPoster: !this.data.showPoster })
  },

  onBuyNow() {
    if (!this.data.goods) return
    wx.navigateTo({
      url: '/pages/checkout/checkout?from=buynow&id=' + this.data.goods.id + '&count=1'
    })
  },

  onShareAppMessage() {
    const { goods } = this.data
    return {
      title: goods ? 'AR预览 ' + goods.title : 'AR预览',
      path: `/pages/ar-preview/ar-preview?id=${this.goodsId}`
    }
  }
})
