<template>
  <div v-if="txns.length == 0" class="no-txs">
    <p> No Transactions. Please Fund Account. </p>
  </div> 
  <div id="scrollspy-example" v-else>
    <table id="firstTable">
      <tbody>
        <tr v-bind:key="row.id" v-for="row in txns">
          <div class='tx-row'>
            <div class="tx-direction">
              <div class="arrow-class" v-if="row.to_pubkey !== pubkey">
                <img class="arrow-class" src="../assets/send_tx_arrow.png" />
                </div> 
                <div class="arrow-class" v-if="row.to_pubkey === pubkey">
                  <img class="arrow-class" src="../assets/receive_tx_arrow.png" />
                </div> 
                <div v-if="row.to_pubkey === pubkey" class="tx-action">
              {{ 'Received' }}
            </div>

            <div v-else-if="row.from_pubkey == pubkey" class="tx-action">
              {{ 'Sent' }}
            </div>
            </div> 
            
            <div class="tx-amount-date">
              <div class="amount">
                {{ '$'+ row.amount / 100 }}
              </div>
              <div class="date">
                {{ new Date(row.created_timestamp).toLocaleDateString('en-US') }}
              </div>
            </div>
          </div>
        </tr>
      </tbody>
    </table>
   </div>
</template>

<script>

export default {
  name: 'TransactionList',
  props: {
    pubkey: String,
    txns: Array
  },
  data: function() {
    // e.g. {date: "2018-06-30", txid: '2c0440e112fd4d...', action: 'Received', amount: "10000"}
    return {

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

.table-container {
    display: flex;
    flex: 1;
    flex-direction: 1;
}


#firstTable {
    width: 100%;
    font-family: "Roboto", sans-serif;
    background-color: white;
    font-size: 20px;
}

p {
  font-family: "Roboto", sans-serif;
}

.underline {
    border-bottom: 0.5px solid grey;
}

ul {
    text-decoration: none;
}

.no-txs {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
}

.tx-row {
  display: flex;
  padding: 2px;
  flex: 1;
  flex-direction: row;
  flex-wrap: wrap;
  background-color: white;
  width: 100%;
  border-bottom: 0.25px solid silver;
}

.tx-direction {
  display: flex;
  flex: 1;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  padding: 3px;
}

.tx-action {
  display: flex;
  flex: 1;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
}

.tx-amount-date {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  align-items: flex-end;
}

.amount {
  font-weight: 200;
}

.date {
  font-size: 12px;
}

.tx-amount {
  display: flex;
  flex: 1;
  justify-content: center;
  align-items: center;
}
.arrow-class {
  width: 50px;
  height: 50px;
}

li {
    display: inline;
    font-family: 'Nunito', sans-serif;
    font-size: 20px
}

</style>
