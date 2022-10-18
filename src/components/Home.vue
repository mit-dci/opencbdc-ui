<template>
  <div>
     <b-navbar toggleable="lg" type="light" text-variant="light" variant="info">
       <b-navbar-nav>
        <b-nav-item href="">Wallet</b-nav-item>
       </b-navbar-nav>
     </b-navbar>
    <div v-show="showDashboard">
      <Dashboard />
    </div>
  </div>
</template>

<script>
import Dashboard from './Dashboard.vue'


export default {
  components: { Dashboard },
  name: 'Home',
  props: {
    msg: String
  },
  data: function() {
    return {
      showCreateWalletView: false,
      showDashboard: true
    }
  },
  methods: {

  }, 
  computed: {

  },
  // lifecycle hooks
  created: function() {
  },
  mounted: function() {

  },
  updated: function() {

  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

@import url('https://fonts.googleapis.com/css2?family=Nunito&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Roboto&display=swap');

.all-view-container {
  display: block;
  flex: 1;
  font-family: "Roboto", sans-serif;
  flex-direction: column;
  background-color: rgb(141, 115, 115);
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
  margin-left: auto;
  margin-right: auto;
}

.create-wallet-container {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  margin-top: 100px;
  justify-content: center;
  width: 300px;
}

.nav-bar-container{
  display: flex;
  flex-direction: row;
  align-items: center;
  background-color:cornflowerblue;
  color: white;
  background: hsl(209, 61%, 16%);
  height: 50px;
  width: 100%;
  justify-content: flex-start;
  font-family: 'Roboto', sans-serif;
  margin: 0px;
  position: fixed;
  top: 0;
  right: 0;
}

.footer {
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  background-color: white;
  width: 100%;
  position: fixed;
  bottom: 0;
  right: 0;
  height: 50px;
  padding: 2px;
}

h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}

.title {
  padding: 15px;
  /* margin: 10px */
}
</style>
