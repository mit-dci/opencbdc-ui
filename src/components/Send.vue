<template>
    <b-card class="border-0">
      <b-form @submit.stop.prevent="onSubmit" @reset="resetForm" v-if="show">
          <b-form-group
              id="input-group-1"
              label-for="input-1"
              label="Sending To"
            >
              <b-input-group  size="sm" class="mb-2">
                <b-form-input
                  id="input-1"
                  name="input-2"
                  v-model="$v.form.recipientAddress.$model"
                  :state="validateState('recipientAddress')"
                  label="Sending To"
                  aria-describedby="address-help" 
                  type="text"
                  placeholder="Recipient Address"
                  required
                ></b-form-input>
                <b-input-group-append is-text>
                  <b-button v-on:click="scan()" size="sm" variant="none">
                    <b-icon font-scale="1.5" icon="upc-scan" ></b-icon>
                  </b-button>
                </b-input-group-append>
                <b-form-invalid-feedback id="input-1" aria-describedby="address-help">
                  Address must be of the form e.g. usd1....xyz
                </b-form-invalid-feedback>
              </b-input-group>
            </b-form-group>

            <b-form-group id="input-group-2" label="Amount" label-for="input-2">
            <b-input-group size="lg" class="mb-2">
                <b-form-input
                  class="input-group-append"
                id="input-2"
                name="input-2"
                aria-describedby="number-format-help"
                v-model="$v.form.sendAmount.$model"
                :state="validateState('sendAmount')"
                placeholder="$0.00"
                required
              >
              </b-form-input>
              <b-input-group-append>
                <b-button class="nav-text" variant="info" text-variant="white" size="lg" type="submit"> Send </b-button>
              </b-input-group-append>
               <b-form-invalid-feedback id="input-2" aria-describedby="number-format-help">
                  Amount must be in form 0.00
                </b-form-invalid-feedback>
            </b-input-group>
          </b-form-group>
        </b-form>
     <b-alert :show="dismissCountDown"  @dismissed="dismissCountDown=0" @dismiss-count-down="countDownChanged"> 
         Transaction sent sucessfully!
     </b-alert>

     <b-card class="border-0 text-center container-fluid">
            <div class="qr-code-reader modal" v-show="showQrCodeReader">
            <div style="display: flex; flex-wrap: wrap; flex-direction: row; justify-content: flex-start; align-items: center">
              <div style="display: flex; flex-wrap: wrap; flex-direction: row; justify-content: center">  
                  <button class="close-btn" v-on:click="closeScanner()"> &#10006; </button>
              </div>
              
          </div>
              <qrcode-stream class="qr-background" :camera="camera" @decode="onDecode" @init="onInit"> 
              </qrcode-stream>
            </div>
        </b-card>
    </b-card>
</template>

<script>

import { QrcodeStream } from 'vue-qrcode-reader';
import { EventBus } from '@/event-bus.js';
import { validationMixin } from "vuelidate";
import { required, minLength } from "vuelidate/lib/validators";

const numberFormatValidator = (amount) => {
  const regex = /\d+\.\d\d(?!\d)/;
  return regex.test(amount);
}

export default {
  components: {QrcodeStream},
    name: 'Send',
    props: {
    msg: String
  },
  mixins: [validationMixin],
  data: function() {
    return {
      senderKey: '',
      recipientAddress: '',
      error: '',
      camera: 'off',
      showQrCodeReader: false,
      showDismissibleAlert: false,
      showScanConfirmation: false,
      show: true,
      form: {
        recipientAddress: '',
        sendAmount: ''
      }, 
      dismissSecs: 2,
      dismissCountDown: 0
    }
  },
  validations: {
    form: {
      recipientAddress: {
        required,
        minLength: minLength(63)
      },
      sendAmount: {
        required,
        numberFormatValidator
      }
    },
  },
    methods: {
      validateState(name) {
        const { $dirty, $error } = this.$v.form[name];
        return $dirty ? !$error : null;
      },
      countDownChanged(dismissCountDown) {
        this.dismissCountDown = dismissCountDown
      },
      resetForm: function() {
        this.form.recipientAddress = '';
        this.form.sendAmount = '';
        this.showDismissibleAlert = false;
      },
      onSubmit: function(event) {
        event.preventDefault();
        EventBus.$emit('sendTx', [this.form.recipientAddress, this.form.sendAmount]);
        this.showDismissibleAlert = true;
        this.dismissCountDown = this.dismissSecs;
        setTimeout(1500, () => {
           this.resetForm();
        });
      },
      broadcastTx: function() {
        this.$emit('sendTx', [this.recipientAddress, this.sendAmount]);
      },
      closeScanner: function() {
          this.showQrCodeReader = false;
          this.camera = 'off';
      },
      scan: function() {
          this.showQrCodeReader = true;
          this.camera = 'auto';
      },
      timeout: function(ms) {
          return new Promise(resolve => {
              window.setTimeout(resolve, ms)
          })
      },
      unpause() {
          this.camera = 'auto';
      },
      pause() {
          this.camera = 'off'
      },
      async onDecode(result) {
          this.form.recipientAddress = result;
          this.pause();
          await this.timeout(500);
          this.unpause();
          this.showQrCodeReader = false;
          this.camera='off';
      },
      async onInit(promise) {
        try {
            await promise;
        } catch (error) {
            if (error.name === 'NotAllowedError') {
            this.error = "ERROR: you need to grant camera access permission"
            } else if (error.name === 'NotFoundError') {
            this.error = "ERROR: no camera on this device"
            } else if (error.name === 'NotSupportedError') {
            this.error = "ERROR: secure context required (HTTPS, localhost)"
            } else if (error.name === 'NotReadableError') {
            this.error = "ERROR: is the camera already in use?"
            } else if (error.name === 'OverconstrainedError') {
            this.error = "ERROR: installed cameras are not suitable"
            } else if (error.name === 'StreamApiNotSupportedError') {
            this.error = "ERROR: Stream API is not supported in this browser"
            } else if (error.name === 'InsecureContextError') {
            this.error = 'ERROR: Camera access is only permitted in secure context. Use HTTPS or localhost rather than HTTP.';
            } else {
            this.error = `ERROR: Camera error (${error.name})`;
            }
        } finally {
            this.showScanConfirmation = this.camera === "off";
        }
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
@import url('https://fonts.googleapis.com/css2?family=Roboto&display=swap');

.container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.send-container {
    display: flex;
    flex: 1;
    flex-direction: column;
    flex-wrap: wrap;
    align-items: flex-start;
    width: 100%;
}

input.custom-control-input:focus {

    outline:none !important;
    outline-width: 0 !important;
    box-shadow: none;
    -moz-box-shadow: none;
    -webkit-box-shadow: none;
}

#label-font {
  font-family: "Roboto", sans-serif;
  font-size: 16px;
}

.nav-text {
  color: white;
}

.row {
  display: flex;
  flex-direction: row;
  border-radius: 10px;
  align-items: stretch;
  border: 0.5px solid grey;
  margin-top: 5px;
  margin-bottom: 5px;
  width: 100%;
  height: 100%;
}

#send-btn {
    margin-top: 10px;

}

#send-btn:hover {
    margin-top: 10px;
    opacity: 0.8;
}

.form-field {
  font-family: 'Roboto', sans-serif;
  border-radius: 5px;
  font-size: 16px;
  height: 40px;
  width: inherit;
  border: 0.5px solid grey;
}

.qr-code-reader {
    color: white;
    font-family: 'Roboto', sans-serif;
}

.scan-img {
  width: 50px;
  height: 50px;
  cursor: pointer;
  border-radius: 5px;
}

.scan-confirmation {
  position: absolute;
  width: 100px;
  height: 100px;
  background-color: rgba(255, 255, 255, .8);
  justify-content: center;
  align-items: center;
}

.center {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    width: 300px;
    height: 300px;
}

.qr-background {
    z-index: 200;
}

.modal {
    z-index: 99;
    display: flex;
    flex: 1;
    justify-content: center;
    flex-direction: column;
    position: absolute;
    background-color: black;
    height: auto;
    width: auto;
    border-radius: 10px;
}

.qr-overlay-container {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
}

.qr-border {
    width: 250px;
    height: 250px;
    border: 2px solid white;
    border-radius: 5px;
}

.form-field-btn {
  font-family: 'Roboto', sans-serif;
  border-radius: 5px;
  border: none;
  background-color: hsl(185, 57%, 50%);;
  color: white;
  cursor: pointer;
  padding: 10px;
}

.close-btn {
  font-family: 'Roboto', sans-serif;
  border-radius: 5px;
  border: none;
  background-color: hsl(185, 57%, 50%);
  color: white;
  cursor: pointer;
}

</style>
