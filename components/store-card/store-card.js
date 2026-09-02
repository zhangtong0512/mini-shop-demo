Component({
  properties: {
    store: {
      type: Object,
      value: {}
    },
    showDistance: {
      type: Boolean,
      value: true
    }
  },

  data: {},

  methods: {
    onTap() {
      const { store } = this.properties
      this.triggerEvent('tap', { store })
    }
  }
})
