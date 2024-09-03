<template>

    <b-card class="text-center border-0">
  
      <h4 class="mb-4">Minting Transaction</h4>
  
      <b-form @submit.prevent="sendMintTransaction">
  
        <b-form-group class="mb-4">
  
          <div class="form-label-left">
            <b-form-label for="public-key-input">Mint to</b-form-label>
          </div>
  
          <!-- input field for the public key to mint to -->
          <b-form-input
            id="public-key-input"
            name="public-key"
            v-model="$v.form.mintingPublicKey.$model"
            :state="validateState('mintingPublicKey')"
            label="Minting to"
            aria-describedby="address-help"
            type="text"
            placeholder="Enter public key"
            required
          ></b-form-input>
  
          <!-- describes the feedback area in the form if an invalid amount is entered -->
          <b-form-invalid-feedback id="public-key-feedback" aria-describedby="address-help">
            Address must be of the form e.g. usd1....xyz
          </b-form-invalid-feedback>
  
        </b-form-group>
  
        <!-- field for the denomination of utxos to mint -->
        <div class="form-row mb-4">
          
          <b-form-group class="col-md-6">
  
            <div class="form-label-left">
              <b-form-label for="denomination-input">Value of UTXO</b-form-label>
            </div>
  
            <!-- input field for the denomination of the token to mint -->
            <b-form-input
              id="denomination-input"
              name="denomination"
              v-model="$v.form.mintingValue.$model"
              :state="validateState('mintingValue')"
              label="Value of UTXO"
              aria-describedby="number-format-help"
              placeholder="Enter denomination"
              required
            ></b-form-input>
  
            <!-- describes the feedback that the form displays when a number is not in the correct format -->
            <b-form-invalid-feedback id="denomination-input-feedback" aria-describedby="number-format-help">
              Denomination must be in form 0.00
            </b-form-invalid-feedback>
  
          </b-form-group>
  
          <!-- input field for the number of utxos to mint -->
          <b-form-group class="col-md-6">
  
            <div class="form-label-left">
              <b-form-label for="amount-input">Number of UTXOs to Mint</b-form-label>
            </div>
  
            <!-- form input area for specifying the amount of utxos to mint -->
            <b-form-input
              id="amount-input"
              name="amount-to-mint"
              v-model="$v.form.mintingAmount.$model"
              :state="validateState('mintingAmount')"
              label="Amount of UTXO"
              aria-describedby="amount-format-help"
              type="number"
              placeholder="Enter amount to mint"
              required
            ></b-form-input>
  
            <!-- describes the feedback that the form displays when an amount is not in the correct format -->
            <b-form-invalid-feedback id="number-input-feedback" aria-describedby="amount-format-help">
              Amount must be a positive integer
            </b-form-invalid-feedback>
  
          </b-form-group>
          
        </div>
  
        <!-- button for sending the mint transaction -->
        <b-button class="send-button mb-4" type="submit" variant="primary">Send Mint Transaction</b-button>
  
      </b-form>
  
      <!-- display a message if the form send was successful or not -->
      <div v-if="message" class="alert" :class="messageType">
        {{ message }}
      </div>
  
    </b-card>
  
  </template>
  
  <script>
  
  // import the necessary packages for validating the field inputs
  import { validationMixin } from "vuelidate";
  import { required, minLength } from "vuelidate/lib/validators";
  
  // create a custom validator for checking the number format
  const numberFormatValidator = (amount) => {
    const regex = /^\d+(\.\d{1,2})?$/;
    return regex.test(amount);
  }
  
  // create a custom validator for checking the amount to mint
  const amountFormatValidator = (amount) => {
    const numericAmount = Number(amount);
    return Number.isInteger(numericAmount) && numericAmount > 0
  }
  
  export default {
  
    // define a name for the vue component 
    name: 'Admin',
    mixins: [validationMixin],
  
    // define the reactive properties and local state of the component
    data() {
    return {
      form: {
        mintingPublicKey: '',
        mintingValue: '',
        mintingAmount: ''
      },
      message: '',
      messageType: 'alert-info'
    };
  },
  
  // declare the validation rules
  validations: {
      form: {
        mintingPublicKey: {
          required,
          minLength: minLength(63)
        },
        mintingValue: {
          required,
          numberFormatValidator
        },
        mintingAmount: {
          required,
          amountFormatValidator
        }
      }
    },
  
    // declare the methods for the admin component
    methods: {
  
      // validate the state of one of the form input fields based on its name
      validateState(name) {
          const { $dirty, $error } = this.$v.form[name];
          return $dirty ? !$error : null;
        },
  
      sendMintTransaction() {
        this.$v.$touch(); // mark all fields as touched
        if (this.$v.$invalid) {
          this.message = 'Please fix the errors before submitting.';
          this.messageType = 'alert-danger';
          return;
        }
  
        // handle successful submission
        this.message = 'Minting transaction sent.';
        this.messageType = 'alert-success';
  
        // TODO: implement sending the minting transaction logic here
  
      }
    }
  };
  
  </script>
  
  <style scoped>
  
  .alert {
    margin-top: 10px;
    padding: 10px;
    border-radius: 5px;
  }
  
  .alert-info {
    background-color: #d9edf7;
    color: #31708f;
  }
  
  .alert-success {
    background-color: #dff0d8;
    color: #3c763d;
  }
  
  .send-button {
    background-color: hsl(185, 57%, 50%);
    border: hsl(185, 57%, 50%);
  }
  
  .send-button:hover {
    background-color: hsl(185, 50%, 56%);
    border: hsl(185, 50%, 56%);
  }
  
  .send-button:focus,
  .send-button:active {
    background-color: hsl(185, 57%, 50%) !important;
    border-color: hsl(185, 57%, 50%) !important;
    box-shadow: none;
  }
  
  .form-row {
    display: flex;
    flex-wrap: wrap;
  }
  
  .form-row .col-md-6 {
    flex: 1;
    padding: 0 10px;
  }
  
  .mb-4 {
    margin-bottom: 1.5rem;
  }
  
  .form-label-left {
    text-align: left;
    margin-bottom: 0.5rem;
  }
  
  .b-form-label {
    margin-bottom: 0.5rem;
  }
  
  </style>