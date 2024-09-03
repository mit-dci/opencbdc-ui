
<template>
     
  <div>
   <div v-show="showCreateWalletView">
      <CreateWallet />
   </div> 

   <div class="center fade-in" v-show="!showCreateWalletView">
       <div class="balance-card">
        <div class="first-half">
            ${{ (balance / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") }}
        </div>

        <div v-show="fundEnabled && balance === 0" class="second-half">
            <button type="light" variant="info" v-on:click="clickedFundWallet()" class="btn"> Fund </button>
        </div> 
    </div>

    <b-card class="container-fluid" style="padding: 3px; min-width: 18rem; max-width: 40rem; min-height: 30rem">
        <b-tabs justified v-b-scrollspy:scrollspy-example card align="center">
            <b-tab active>
                <template #title>
                    Send <b-icon class="no-icon" font-scale="1" icon="arrow-up-circle" ></b-icon>
                </template>
                <Send />
            </b-tab>
            <b-tab>
                <template #title>
                    Receive <b-icon class="no-icon" font-scale="1" icon="arrow-down-circle" ></b-icon>
                </template>
                <Receive :address="addressToCopy"  />
            </b-tab>
            <b-tab @click.stop="scrollIntoView($event)" v-on:click="retrieveTxs()">
                <template #title>
                    History <b-icon class="no-icon" font-scale="1" icon="clock-history" ></b-icon>
                </template>
                <Transaction-list :pubkey="pubkey" :txns="txs" />
            </b-tab>
            <b-tab>
                <template #title>
                    Admin <b-icon class="no-icon" font-scale="1" icon="bank" ></b-icon>
                </template>
                <Admin />
            </b-tab>
        </b-tabs>
  </b-card>
</div> 
    
   </div>
</template>

<script>

import CreateWallet from './CreateWallet.vue';
import Receive from './Receive.vue';
import Send from './Send.vue';
import TransactionList from './TransactionList.vue';
import Admin from './Admin.vue';
const Pubkey = window.cbdc.Publickey;
const Input = window.cbdc.Input;
const Output = window.cbdc.Output;
const Transaction = window.cbdc.Transaction;
const Address = window.cbdc.Address;

import axios from 'axios';
import { EventBus } from '@/event-bus.js';
const axiosCaller = axios.create({
        //baseURL: 'http://localhost:3000/api/v1', // uncomment this line (and comment out the next line) to run outside docker
        baseURL: process.env.VUE_APP_API_BASE_URL,
        timeout: 1000,
        headers: {'X-Custom-Header': 'foobar'}
});

export default {
  components: { Send, CreateWallet, Receive, TransactionList, Admin },
  name: 'Dashboard',
  props: {

  },
  data: function() {
    return {
        selectedTab: 'Send',
        baseUrl: process.env.BASE_URL,
        port: process.env.PORT,
        showCreateWalletView: true,
        showSendComponent: true,
        showReceiveComponent: false,
        showTransactionListComponent: false,
        fundEnabled: true,
        secretKeys: [],
        balance: 0.00,
        address: '',
        pubkey: '',
        txs: [],
        inputsToSearch: [],
        addressToCopy: ''
    }
  },
  methods: {
      confirmTx: function(senderInfo) {
          const sendAmount = senderInfo[1];
          const outputValue = Math.round(sendAmount * 100);
          const recipientAddress = senderInfo[0];
          const inputsSpent = [];
          const outputsCreated = [];
          const txInputs = [];
          const txOutputs = [];

          const recipientPubkey = Address.decodeFromAddressString(recipientAddress).pubkeyHex;
          const output = new Output(this.sha256('00'+ recipientPubkey), outputValue);

          txOutputs.push(output);
          outputsCreated.push({ value: outputValue, index: 0, witnessCommitment: output.witnessProgramCommitment, recipientPubkey: recipientPubkey, senderpubkey: this.pubkey });
          axiosCaller.get('/outputs/'+this.pubkey, {}).then((res) => {
            const inputsToSearch = res.data;
          // Algorithm for crafting inputs and outputs for tx
          // 1. sum up the inputs individual values and add each to a queue until the cumulative sum those utxos is equal to or greater than sendAmount (add to inputsSendQueue)
          // 2. If the cumulative sum is less than the sendAmount and all inputs are exhausted the user has insufficient funds, a tx can not be made
          // 3. If cumulative sum is greater than, then a new is needed to send change back to sender (cumulativeSum - sendAmount) 

          let cumulativeInputBalance = 0;
          for (let i=0; i < inputsToSearch.length; i++) {
              let inp = inputsToSearch[i];
              let inpValue = (inp.amount);

              if(inpValue + cumulativeInputBalance == (outputValue)) {
                  cumulativeInputBalance += inpValue;
                  inputsSpent.push(inp);
                  break;
              } else if(inpValue + cumulativeInputBalance < (outputValue)) {
                  cumulativeInputBalance += inpValue;
                  inputsSpent.push(inp);
                  continue;
              } else {
                  // enough inputs to cover for tx
                  cumulativeInputBalance += inpValue;
                  inputsSpent.push(inp);
                  break;
              }
           }

          for (let j=0; j < inputsSpent.length; j++) {
              let inp = inputsSpent[j];
              txInputs.push(new Input(inp.created_txid, inp.index, inp.witness_commitment, inp.amount));
          }

          // determine if there is change to send back to wallet's pubkey
          if (cumulativeInputBalance > sendAmount && inputsSpent.length > 0) {
              const changeOutputAmount = cumulativeInputBalance - (outputValue);
              const out = new Output(this.sha256('00' + this.pubkey), changeOutputAmount);
              txOutputs.push(out);
              // same recipient and sender indicates change or sent to self
              outputsCreated.push({value: changeOutputAmount, index: 1, witnessCommitment: out.witnessProgramCommitment, recipientPubkey: this.pubkey, senderpubkey: this.pubkey }); // change to self
          }

            if(txInputs == []) {
                return;
            }

            const tx = new Transaction(txInputs, txOutputs);
            let secKey = localStorage.getItem('secKey');
            const txid = tx.getTxid();
            tx.sign(secKey);
            const signedTx = tx.toHex();

            axiosCaller.post('/sendTx/', { inputsSpent, outputsCreated, recipientpubkey: recipientPubkey, senderpubkey: this.pubkey, value: outputValue, signedTx, txid }).then((res) => {
              axiosCaller.get('/balance/'+this.pubkey, {pubkey: this.pubkey}).then((res) => {
                const unspent = res.data;
                let bal = 0;
                for(let i = 0; i < unspent.length; i++) {
                    bal += (unspent[i].amount);
                } 
                this.balance = bal;
            });
            return res;
          });
       });
      },
      logChange: function(data) {
          localStorage.setItem('completedSetup', true);
          this.secretKeys = data;
          let secKey = this.secretKeys[0];
          let publicKey = new Pubkey(secKey);
          this.pubkey = publicKey.publicKey;
          this.addressToCopy = new Address('00', publicKey.publicKey).address;
          this.address = new Address('00', publicKey.publicKey);
          localStorage.setItem("pubkey", this.pubkey);
          localStorage.setItem("secKey", secKey);
          axiosCaller.get('/balance/'+this.pubkey, { pubkey: this.pubkey }).then((res) => {
                const unspent = res.data;
                let bal = 0;
                for(let i = 0; i < unspent.length; i++) {
                    bal += (unspent[i].amount);
                } 
                this.balance = bal;
          });
          this.showCreateWalletView = false;
      },
        formTx: function() {
     
        },
       retrieveTxs: function() {
            axiosCaller.get('/txs/'+this.pubkey).then((res) => {
                if(res.data === undefined) {
                    this.txs = [];
                } else {
                    const txData = res.data;
                    this.txs = txData;
                }
            axiosCaller.get('/balance/'+this.pubkey, {pubkey: this.pubkey}).then((res) => {
                const unspent = res.data;
                let bal = 0;
                for(let i = 0; i < unspent.length; i++) {
                    bal += (unspent[i].amount);
                } 
                this.balance = bal;
          });
         });
        },
      
      clickedFundWallet: function() {
        this.fundEnabled = false;
        axiosCaller.post('/fundAddress/', { recipientPubkey: this.pubkey, value: 20000 }).then((res) => {
            const info = res.data;
            console.log(info);
            axiosCaller.get('/balance/'+this.pubkey, {pubkey: this.pubkey}).then((res) => {
                const unspent = res.data;
                let bal = 0;
                for(let i = 0; i < unspent.length; i++) {
                    bal += (unspent[i].amount);
                } 
                this.balance = bal;

             axiosCaller.get('/txs/'+this.pubkey).then((res) => {
                if(res.data === undefined) {
                    this.txs = [];
                } else {
                    const txData = res.data;
                    this.txs = txData;
                }
            });
          });
        });
      },
      sha256: function a(b){function c(a,b){return a>>>b|a<<32-b}for(var d,e,f=Math.pow,g=f(2,32),h="length",i="",j=[],k=8*b[h],l=a.h=a.h||[],m=a.k=a.k||[],n=m[h],o={},p=2;64>n;p++)if(!o[p]){for(d=0;313>d;d+=p)o[d]=p;l[n]=f(p,.5)*g|0,m[n++]=f(p,1/3)*g|0}for(b+="\x80";b[h]%64-56;)b+="\x00";for(d=0;d<b[h];d++){if(e=b.charCodeAt(d),e>>8)return;j[d>>2]|=e<<(3-d)%4*8}for(j[j[h]]=k/g|0,j[j[h]]=k,e=0;e<j[h];){var q=j.slice(e,e+=16),r=l;for(l=l.slice(0,8),d=0;64>d;d++){var s=q[d-15],t=q[d-2],u=l[0],v=l[4],w=l[7]+(c(v,6)^c(v,11)^c(v,25))+(v&l[5]^~v&l[6])+m[d]+(q[d]=16>d?q[d]:q[d-16]+(c(s,7)^c(s,18)^s>>>3)+q[d-7]+(c(t,17)^c(t,19)^t>>>10)|0),x=(c(u,2)^c(u,13)^c(u,22))+(u&l[1]^u&l[2]^l[1]&l[2]);l=[w+x|0].concat(l),l[4]=l[4]+w|0}for(d=0;8>d;d++)l[d]=l[d]+r[d]|0}for(d=0;8>d;d++)for(e=3;e+1;e--){var y=l[d]>>8*e&255;i+=(16>y?0:"")+y.toString(16)}
    return i},
      clickedTab: function(tab) {
          this.selectedTab = tab;
          if (tab == 'Send') {
              this.showSendComponent = true;
              this.showReceiveComponent = false;
              this.showTransactionListComponent = false;
          }
          else if (tab == 'Receive') {
              this.showSendComponent = false;
              this.showReceiveComponent = true;
              this.showTransactionListComponent = false;
          } 
          else if(tab == 'Transactions') {
              this.showSendComponent = false;
              this.showReceiveComponent = false;
              this.showTransactionListComponent = true;
              this.retrieveTxs();
          }
      },
      onActivate(target) {
        console.log('Received Event: scrollspy::activate for target ', target);
      },
      scrollInView($event) {
        let el;
        let href = $event.target.getAttribute('href')
        if (href) {
          el = document.querySelector(href);
          if (el) {
            el.scrollIntoView({
              behavior: 'smooth'
            });
          }
        }
      }
  }, 
  computed: {
  },
  // lifecycle hooks
  created: function() {
    this.$root.$on('scrollspy::activate', this.onActivate);
    EventBus.$on('unlockWallet', this.logChange);
    EventBus.$on('sendTx', this.confirmTx);
  },
  mounted: function() {
  },
  updated: function() {

  },
  copy: function() {

  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Nunito&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Roboto&display=swap');

     @media only screen and (max-width: 400px) {
        .no-icon {
          display: none;
        }
    }


    .dashboard-container {
        display: flex;
        flex: 1;
        justify-content: center;
        flex-wrap: wrap;
        padding: 20px;
        border-radius: 20px;
    }

    #scrollspy-example {
        /* position: relative; */
        height: 300px;
        overflow-y: scroll;
    }


    .dashboard-tab {
        display: flex;
        flex: 1;
        justify-content: center;
        align-items: center;
        flex-direction: row;
        flex-wrap: wrap;
    }

    .center {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        flex-wrap: wrap;
    }

    .fade-in {
        opacity: 1;
        animation-name: fadeInOpacity;
        animation-iteration-count: 1;
        animation-timing-function: ease-in;
        animation-duration: 0.5s;
    }

@keyframes fadeInOpacity {
	0% {
		opacity: 0;
	}
	100% {
		opacity: 1;
	}
}

    .dashboard-nav {
        display: flex;
        flex: 1;
        justify-content: center;
        align-items: center;
        flex-direction: row;
        flex-wrap: wrap;
        width: 100%;
        margin-top: 30px;
    }

    .row-container {
        width: 100%;
    }

    .deselected {
      background-color: white;
      color: rgb(96, 96, 96);
      font-family: 'Roboto', sans-serif;
      font-size: 24px;
      padding: 5px;
      background-color: whitesmoke;
      cursor: pointer;
    }

    .deselected:hover {
        border-bottom: 1px solid hsl(185, 57%, 50%);
    }

    .selected {
      border-top-left-radius: 5px;
      border-top-right-radius: 5px;
      background-color: white;
      font-family: 'Roboto', sans-serif;
      padding: 5px;
      font-size: 24px;
      cursor: pointer;
    }

    .nav-icon {
        width: 50px;
        height: 50px;
    }


    .selected:hover {
        border-top-left-radius: 5px;
        border-top-right-radius: 5px;
        background-color: white;
    }

    ul {
        list-style-type: none;
    }

    .balance-card {
        display: flex;
        flex: 1;
        flex-direction: row;
        align-items: center;
        font-family: 'Roboto', sans-serif;
        font-size: 40px;
        font-weight: 600;
        border-radius: 10px;
        flex-wrap: wrap;
}

.custom-control:focus {
    outline: none !important;
}

.first-half {
    display: flex;
    flex-wrap: wrap;
    flex: 1;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    width: 100%;
    padding-right: 10px;
    padding-left: 10px;
    border-radius: 5px;
}

.btn {
  background-color: rgb(0,195,235);;
  border: none;
  color: white;
  border-radius: 5px;
  width: 60px;
  height: 40px;
}

.second-half {
  display: flex;
  height: 100%;
  flex: 1;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  padding: 5px;
}

.second-half:hover {
    opacity: 0.8
}

</style>
