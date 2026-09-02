Component({
  properties: {
    level: {
      type: Number,
      value: 1
    },
    showName: {
      type: Boolean,
      value: true
    },
    size: {
      type: String,
      value: 'normal' // normal, small, large
    }
  },

  data: {
    levelConfig: null
  },

  observers: {
    'level': function(level) {
      const levels = [
        { level: 1, name: '普通会员', icon: '👤', color: '#999999' },
        { level: 2, name: '银卡会员', icon: '🥈', color: '#C0C0C0' },
        { level: 3, name: '金卡会员', icon: '🥇', color: '#FFD700' },
        { level: 4, name: '钻石会员', icon: '💎', color: '#00BFFF' }
      ]
      const config = levels.find(l => l.level === level) || levels[0]
      this.setData({ levelConfig: config })
    }
  }
})
