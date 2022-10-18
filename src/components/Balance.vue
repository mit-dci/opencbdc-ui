<template>
  <div class="balance-card">
    <div class="first-half">
        ${{ balance.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") }}
    </div>

    <div v-show="fundEnabled" class="second-half">
      <button v-on:click="clickedFund()" class="btn"> Fund </button>
    </div> 
  </div>
</template>

<script>


export default {
  name: 'Balance',
  props: {
    initBalance: Number,
    pubHex: String
  },
  data: function() {
    return {
      pubkey: this.pubHex,
      showCreateWalletView: true,
      fundEnabled: true,
      balance: this.initBalance
    }
  },
  methods: {
    clickedFund: function() {
      this.fundEnabled = false;
      this.$emit('fundWallet', ['fund']);
    }
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

.balance-card {
    display: flex;
    flex: 1;
    flex-direction: row;
    align-items: center;
    font-family: 'Nunito', sans-serif;
    font-size: 36px;
    border-radius: 10px;
    flex-wrap: wrap;
}

.first-half {
    display: flex;
    flex-wrap: wrap;
    flex: 1;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    width: 100%;
    background-color: white;
    padding-right: 10px;
    padding-left: 10px;
    border-radius: 5px;
}

.btn {
  background-color: blue;
  border: none;
  color: white;
  border-radius: 5px;
  width: 60px;
  height: 20px;
}

.second-half {
  display: flex;
  background-color: white;
  height: 100%;
  flex: 1;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  padding-right: 5px;
}
</style>
