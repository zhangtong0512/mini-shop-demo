const groupBuy = require('../../utils/group-buy')

Component({
  properties: {
    goods: {
      type: Object,
      value: {}
    }
  },

  data: {
    remainTime: '',
    groupCount: 0
  },

  lifetimes: {
    attached() {
      this.updateData()
    }
  },

  pageLifetimes: {
    show() {
      this.updateData()
    }
  },

  methods: {
    updateData() {
      const { goods } = this.properties
      if (!goods) return
      
      this.setData({
        groupCount: goods.groupCount || 0
      })
    },

    onTap() {
      const { goods } = this.properties
      this.triggerEvent('tap', { goods })
    },

    onGroupTap() {
      const { goods } = this.properties
      this.triggerEvent('group', { goods })
    }
  }
})
