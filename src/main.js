import Vue from 'vue'
import App from './App.vue'
import ToggleButton from 'vue-js-toggle-button'
// import "../public/styles.css";

Vue.use(ToggleButton)
Vue.config.productionTip = false

new Vue({
  render: h => h(App),
}).$mount('#app')
