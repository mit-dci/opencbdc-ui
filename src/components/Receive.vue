<template>
    <b-card class="text-center border-0">
     <div class="address-msg">
        <h4> Address </h4>
        <p> 
            {{ address.slice(0,10)+'...'+address.slice(50) }}
        </p>
     </div>    
      <button v-bind:class="{'copied-btn': copied, 'uncopied-btn': !copied}" v-on:click="copyText(address)"> {{ copyButtonText }} </button>
      
      <br />
      <br />

       <h4> QR Code </h4>
        <qrcode-vue :value="address" :size="100" level="H"> 

        </qrcode-vue>
    </b-card>
</template>

<script>

import QrcodeVue from 'qrcode.vue';
import useClipboard from 'vue-clipboard3';

export default {
  components: { QrcodeVue },
  name: 'Receive',
  props: {
      address: String
  },
  setup() {
    
  },
  data: function() {
    return {
      copied: false,
      addressToCopy: this.address
    }
  },
  methods: {
   copyText: async function(address) {
      const { toClipboard } = useClipboard();
      try {
        console.log(address)
        await toClipboard(address);
        this.copied = true;
        setTimeout(() => {
          this.copied = false;
        }, 1000);
      } catch (e) {
       // this.copied = false;
        console.error(e)
      }
   }
  }, 
  computed: {
    copyButtonText: function() {
      return this.copied ? "Copied" : "Copy"
    }
  },
  // lifecycle hooks
  created: function() {
      // this.copied = false;
  },
  mounted: function() {
    this.copied = false;
  },
  updated: function() {

  },
  unmounted: function() {
    this.copied = false;
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Nunito&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Roboto&display=swap');

.col-container {
    display: flex;
    flex-direction: column;
    flex: 1
}

.center {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        flex-wrap: wrap;
        /* padding: 10px; */
    }

.address-msg {
    display: flex;
    flex: 1;
    flex-direction: column;
    font-family: "Roboto", sans-serif;
}

.qr-container {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin-top: 10px;
    padding: 20px;
    border-radius: 5px;
    background-color: white;
    border: 2px solid grey;
}

p {
    display: inline;
    font-size: 20px;
}

.uncopied-btn {
  font-family: 'Roboto', sans-serif;
  border-radius: 5px;
  border: none;
  background-color: rgb(0,195,235);
  color: white;
  cursor: pointer;
  padding: 10px;
  width: 125px;
}

.uncopied-btn:hover {
  opacity: 0.8;
}

.copied-btn {
  font-family: 'Roboto', sans-serif;
  border-radius: 5px;
  border: none;
  background-color: forestgreen;
  color: white;
  cursor: pointer;
  padding: 10px;
  width: 125px;
}

</style>
