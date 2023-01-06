# opencbdc-ui

This repository contains an example web-browser-based wallet for a hypothetical [CBDC](https://en.wikipedia.org/wiki/Central_bank_digital_currency).
In particular, it demonstrates how you might leave key-custody with the user, but enable a service or intermediary to support storing all other information necessary for spending funds (namely, the UTXOs).
This separation might allow for easy migration between intermediaries, allows users to remain in-control of the funds at all times (by maintaining sole control of the keys), and could enable interesting intermediated use-cases.

In its current form, this wallet does not support importing UTXOs or sending mint transactions, so while it can be configured to directly connect to an instance of [opencbdc-tx](https://github.com/mit-dci/opencbdc-tx.git), it cannot currently send transactions which will be accepted and processed.
(See [Issue #2](https://github.com/mit-dci/opencbdc-ui/issues/2) for more information.)
It is purely a demonstration and proof-of-concept; much more functionality could be added (and likely should/would be for a production-grade system), and none of the functionality demonstrated necessarily needs to work as it does now.

## Getting Started

Install [`node`](https://nodejs.org/en/).
**N.B.:** You should install the latest `v16` version; you may run into errors trying to use more recent versions.
A `.nvmrc` is provided in the repository if you use [`nvm`](https://github.com/nvm-sh/nvm)

* Clone the code
  ```console
  $ git clone "https://github.com/mit-dci/opencbdc-ui.git"
  ```
* Install the necessary dependencies
  ```console
  $ npm install
  ```
* Browserify the backing [javascript module](https://github.com/mit-dci/opencbdc-js.git)
  ```console
  $ npm run preprocess
  ```
* Run the development server (compiles and hot-reloads)
  ```console
  $ npm run serve
  ```
* Build with minification
  ```console
  $ npm run build
  ```
* Run the linter before you commit any changes
  ```console
  $ npm run lint
  ```
* Install the dependencies for the REST server
  ```console
  $ cd server
  $ npm install
  ```
* Run the REST server
  ```console
  $ node server/main.js
  ```

## Contributing

Patches are welcome!
Please see [the OpenCBDC contribution guide](https://github.com/mit-dci/opencbdc-tx/blob/trunk/docs/contributing.md) for more information!

## Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).

## Runing in Docker

* `docker-compose up --build`
*  Mint an initial mock output by running a curl request in the terminal
   ```console
   $ curl -X POST http://localhost:3000/api/v1/mintTx 
   ```
* To send money back and forth between two different wallets, open up two wallets in two different tabs at http://localhost:8080
* Fund each wallet, then you can send money between them (copy and paste the address from one to the other)

## Running outside docker

### Setup postgresql (to store UTXOs)

1. Install and run postgresql.
1. Run `psql postgres`, and setup the needed user and database:
   ```pgsql
   CREATE USER wallet_admin WITH SUPERUSER CREATEROLE CREATEDB;
   CREATE DATABASE wallet_dev;
   exit
   ```
1. Reopen the postgresql repl using the newly created user and database:
   ```console
   $ psql -d wallet_dev -U wallet_admin
   ```
1. Run `psql postgres`, and setup the `outputs` table:
   ```pgsql
   CREATE TABLE IF NOT EXISTS outputs (
     output_id            TEXT       UNIQUE NOT NULL,
     created_txid         TEXT       NOT NULL,
     created_timestamp    TIMESTAMP  NOT NULL DEFAULT now(),
     owner_pubkey         TEXT       NOT NULL,
     amount               INT        NOT NULL,
     index                INT        NOT NULL,
     witness_commitment   TEXT       NOT NULL,
     spend_txid           TEXT
   );
   ```
1. Double-check the table was created as-expected:
   ```pgsql
   \dt+
   ```
   You should see the newly-created table called `outputs`.
1. Exit the `psql` repl:
   ```pgsql
   exit
   ```

Now, you have a proper user, database, and outputs table configured.

### Startup the wallet

* Uncomment [`src/components/Dashboard.vue:62`](https://github.com/mit-dci/opencbdc-ui/blob/trunk/src/components/Dashboard.vue#L62) and comment-out the following line.
* Install the dependencies, run the preprocessor, and run the development server:
  ```console
  $ npm install
  $ npm run preprocess
  $ npm run serve
  ```
* Install the dependencies for the REST server, and run it:
  ```console
  $ cd server
  $ npm install
  $ cd ..
  $ node server/main.js
  ```

You now have a functional, local wallet and backend!

* Mint an initial mock output by running a curl request in the terminal:
   ```console
   $ curl -X POST http://localhost:3000/api/v1/mintTx 
   ```
* To send money back and forth between two different wallets, open up two wallets in two different tabs at http://localhost:8080
* Fund each wallet, then you can send money between them (copy and paste the address from one to the other)
