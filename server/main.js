const db = require('./queries');

const express = require('express');
const cors = require('cors');
const _ = require('lodash');
const http = require('http');
const PORT = process.env.PORT || 3000;
const app = express();

app.use(express.urlencoded({extended: false}));
app.use(express.json());
app.use(cors());


app.set(PORT);

app.get('/', function(req, res) {
    res.json({
        status: '200',
        message: "Serving endpoint"
    });
});

app.get('/api/v1/outputs/:pubkey', db.getOutputsForPublickey);
app.get('/api/v1/outputs/:pubkey/all', db.getAllOutputsForPublickey);
app.get('/api/v1/txs/:pubkey', db.getTransactions);
app.get('/api/v1/balance/:pubkey', db.getBalance);
app.post('/api/v1/fundAddress/', db.fundAddress);
app.post('/api/v1/sendTx/', db.sendTx);
app.post('/api/v1/mintTx', db.mintTx);
app.post('/api/v1/outputs/sync/', db.syncOutputs);

/**
 * Event listener for HTTP server "error" event.
 */
 function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string'
    ? `Pipe ${port}`
    : `Port ${port}`;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.log(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.log(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */
 function onListening() {
  const addr = server.address();
  const bind = typeof addr === 'string'
    ? `pipe ${addr}`
    : `port ${addr.port}`;
  console.log(`Listening on ${bind}`);
}

let server = http.createServer(app);
server.listen(PORT);
server.on('listening', onListening);
server.on('error', onError);
