Component({
  properties: {
    room: {
      type: Object,
      value: {}
    },
    size: {
      type: String,
      value: 'normal' // normal, small, mini
    }
  },

  data: {},

  methods: {
    onTap() {
      const { room } = this.properties
      this.triggerEvent('tap', { room })
    }
  }
})
