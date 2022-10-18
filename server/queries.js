const opencbdc = require('@mit-dci/opencbdc');
const Output = opencbdc.Output;
const Transaction = opencbdc.Transaction;
const Input = opencbdc.Input;
const Networking = opencbdc.Comms;
// const Utils = opencbdc.Utils; See comments below
const reserveConfig = require('./serverConfig.json');
const config = require('./config');
const format = require('pg-format');

const Pool = require('pg').Pool

const pool = new Pool({
  user: config.postgres.user,
  host: config.postgres.host,
  database: config.postgres.database,
  password: config.postgres.password,
  port: config.postgres.port
});

const { v4: uuidv4 } = require('uuid');
const sha256 = function a(b){function c(a,b){return a>>>b|a<<32-b}for(var d,e,f=Math.pow,g=f(2,32),h="length",i="",j=[],k=8*b[h],l=a.h=a.h||[],m=a.k=a.k||[],n=m[h],o={},p=2;64>n;p++)if(!o[p]){for(d=0;313>d;d+=p)o[d]=p;l[n]=f(p,.5)*g|0,m[n++]=f(p,1/3)*g|0}for(b+="\x80";b[h]%64-56;)b+="\x00";for(d=0;d<b[h];d++){if(e=b.charCodeAt(d),e>>8)return;j[d>>2]|=e<<(3-d)%4*8}for(j[j[h]]=k/g|0,j[j[h]]=k,e=0;e<j[h];){var q=j.slice(e,e+=16),r=l;for(l=l.slice(0,8),d=0;64>d;d++){var s=q[d-15],t=q[d-2],u=l[0],v=l[4],w=l[7]+(c(v,6)^c(v,11)^c(v,25))+(v&l[5]^~v&l[6])+m[d]+(q[d]=16>d?q[d]:q[d-16]+(c(s,7)^c(s,18)^s>>>3)+q[d-7]+(c(t,17)^c(t,19)^t>>>10)|0),x=(c(u,2)^c(u,13)^c(u,22))+(u&l[1]^u&l[2]^l[1]&l[2]);l=[w+x|0].concat(l),l[4]=l[4]+w|0}for(d=0;8>d;d++)l[d]=l[d]+r[d]|0}for(d=0;8>d;d++)for(e=3;e+1;e--){var y=l[d]>>8*e&255;i+=(16>y?0:"")+y.toString(16)}
return i};

const constructTx = (inputs, recipientPubkey, value, secretKey, senderPubkey) => {

    if(!(Number.isInteger(value) && value > 0)) {
        throw new Error('Value must be positive integer');
    }
                
    const sendAmount = value;
    const outputValue = value;

    const inputsSpent = [];
    const outputsCreated = [];
    const txInputs = [];
    const txOutputs = [];

    const outputToRecipientAddress = new Output(sha256('00' + recipientPubkey), value);

    outputsCreated.push({value: outputValue, witnessCommitment: outputToRecipientAddress.witnessProgramCommitment, recipientPubkey: recipientPubkey, index: 0 })

    txOutputs.push(outputToRecipientAddress);

    const inputsToSearch = inputs;

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
    
    // determine if there is change to send back to sender wallet's pubkey
    if (cumulativeInputBalance > sendAmount && inputsSpent.length > 0) {
        const changeOutputAmount = cumulativeInputBalance - (outputValue);
        const out = new Output(sha256('00' + senderPubkey), changeOutputAmount);
        txOutputs.push(out);
        // same recipient and sender indicates change or sent to self
        outputsCreated.push({value: changeOutputAmount, witnessCommitment: out.witnessProgramCommitment, recipientPubkey: senderPubkey, index: 1 }); // same 
    }

    if(txInputs == []) {
        return;
    }

    // Broadcast Tx to sentinel, write Tx to DB, mark old inputs as spent ,write outputs to outputs Table in one atomic transaction
    const tx = new Transaction(txInputs, txOutputs);
    
    const txid = tx.getTxid();
    tx.sign(secretKey);
    const signedTx = tx.toHex();

 
    return { signedTx, inputsSpent, txid, outputsCreated };
};

const constructOutputEntryQuery = (outputsCreated, txid) => {
    const outsToInsert= [];
            
            for(let i = 0; i < outputsCreated.length; i++) {
               let tempOut = [];
               let output_id = uuidv4();
               let o = outputsCreated[i];
               tempOut = [output_id, txid, o.recipientPubkey, o.value, o.index, o.witnessCommitment]
               outsToInsert.push(tempOut);
            }

    const insertMultipleOutputQuery = format(`INSERT 
    INTO outputs (
        output_id, 
        created_txid, 
        owner_pubkey, 
        amount, index, 
        witness_commitment
        ) 
    VALUES %L`, outsToInsert);

    return insertMultipleOutputQuery;
};

const buildOutput = (o) => {
    return o.created_txid + parseInt(o.index) + o.witness_commitment + parseInt(o.amount);
};

const constructReconcileOutputsQuery = (outputsToUpdate) => {
    const insertMultipleOutputQuery = format(`UPDATE outputs 
    AS t 
    SET spend_txid = c.spend_txid 
    FROM (VALUES %L) 
    AS c(output_id, spend_txid) 
    WHERE c.output_id = t.output_id;`, outputsToUpdate);
    return insertMultipleOutputQuery;
};


const constructUpdateSpentQuery = (inputsSpent, txid) => {
    // If tx had multiple recipients, would need to maintain an order of spentByPubkey so the output is credited to the right recipient
    const updateSpentTxs = `UPDATE outputs SET spend_txid='${txid}' WHERE output_id IN `;
    const output_ids_spent = [];

    let output_ids_spent_string = '(';
    for(let i = 0; i < inputsSpent.length; i++) {
        let outputid = inputsSpent[i].output_id;
        if (i == (inputsSpent.length - 1)) {
            output_ids_spent_string += `'${outputid}'` + `);`
        } 
        else {
            output_ids_spent_string += `'${outputid}'` + ','
        }
        output_ids_spent.push(inputsSpent[i].outputid);
    }


    const updateSpentQuery = updateSpentTxs + output_ids_spent_string;

    return updateSpentQuery;
};

const getTransactions = (request, response) => {
    const pubkey = request.params.pubkey;

    pool.query(`WITH txs AS (
        SELECT o.created_txid, o.created_timestamp, prv.owner_pubkey from_pubkey, o.amount, o.owner_pubkey to_pubkey
        FROM outputs o
          LEFT JOIN outputs prv ON prv.spend_txid = o.created_txid
        WHERE o.owner_pubkey = $1
          AND prv.owner_pubkey != $1
        UNION ALL
        SELECT o.spend_txid, nxt.created_timestamp, o.owner_pubkey from_pubkey, nxt.amount, nxt.owner_pubkey to_pubkey
        FROM outputs o
          LEFT JOIN outputs nxt ON o.spend_txid = nxt.created_txid
        WHERE o.spend_txid IS NOT NULL
          AND o.owner_pubkey != nxt.owner_pubkey
          AND o.owner_pubkey = $1
        )
      SELECT *
      FROM txs
      ORDER BY created_timestamp ASC;`, [pubkey], (error, results) => {
        if (error) {
            throw error;
        }
        response.status(200).json(results.rows);
    });
};

const getAllOutputsForPublickey = (request, response) => {
    const pubkey = request.params.pubkey;
    pool.query(`SELECT * FROM outputs WHERE owner_pubkey=$1`, [pubkey] ,(error, results) => {
      if (error) {
        throw error
      }
      response.status(200).json(results.rows)
    });
};


const getOutputsForPublickey = (request, response) => {
    const pubkey = request.params.pubkey;
    const message = request.body.message;
    const signature = request.body.signature;
    // TODO: only allow execution of request if properly sign by cryptographic key pair
    // if(!Utils.verify(pubkey, message, signature)) {
    //     response.status(401).json({message: "Invalid signature for message, pubkey pair", error}); 
    // }

    pool.query(`SELECT * FROM outputs WHERE owner_pubkey=$1 and spend_txid IS NULL;`, [pubkey] ,(error, results) => {
      if (error) {
        throw error
      }
      response.status(200).json(results.rows)
    });
};

const syncOutputs = (request, response) => {
    const pubkey = request.params.pubkey;

    axios.get(config.bankUrls.bankB + '/outputs/'+pubkey+'/all', {}).then((result) => {

        const outputsFromBankB = result.data;
        const outputsFromBankBMap = new Map();

        pool.query(`SELECT * 
        FROM outputs 
        WHERE owner_pubkey=$1;`, [pubkey], (error, results) => {
            if (error) {
              throw error
            }

            const outputsFromBankA = results.rows;
            const outputsFromBankAMap = new Map();

            for(let out=0; out < outputsFromBankA.length; out++) {
                // The outputs is the txid, index, witness_commitment, value, spend_txid (flag)
                const output = outputsFromBankA[out];
                const oStr = buildOutput(output);
                const o = {
                    output_id: output.output_id, 
                    created_txid: output.created_txid, 
                    index: output.index, 
                    witness_commitment: output.witness_commitment, 
                    amount: output.amount,  
                    spend_txid: output.spend_txid, 
                    owner_pubkey: output.owner_pubkey, 
                    spent: (output.spend_txid !== null), 
                    oStr
                };
                outputsFromBankAMap.set(oStr, o);
            }

            const outputsToAddA = []; // Outputs that are in B but not In A
            for(let out=0; out < outputsFromBankB.length; out++) {
                // The outputs is the txid, index, witness_commitment, value, spend_txid (flag)
                const output = outputsFromBankB[out];
                const oStr = buildOutput(o);
                const o = { 
                    output_id: output.output_id, 
                    created_txid: output.created_txid, 
                    index: output.index, 
                    witness_commitment: output.witness_commitment, 
                    amount: output.amount, 
                    spend_txid: output.spend_txid, 
                    owner_pubkey: output.owner_pubkey, 
                    spent: (output.spend_txid !== null), 
                    oStr 
                };
                outputsFromBankBMap.set(oStr, o);
            }         
            
            // Add outputs in B to Bank A, that were not there before
            outputsFromBankBMap.forEach((value, key) => {
                if (!outputsFromBankAMap.has(key)) {
                    outputsToAddA.push(value);
                }
            });

            // Reconciling UHS ids that were present in both but have differing spent flags
            const uhsIdsToUpdate = [];
            outputsFromBankAMap.forEach((value, key) => {
                if (outputsFromBankBMap.has(key)) {
                    if (value.spent == false && value.spent != outputsFromBankBMap.get(key).spent) {
                        value.spend_txid = outputsFromBankBMap.get(key).spend_txid;
                        uhsIdsToUpdate.push([value.output_id, value.spend_txid]);
                    }
                }
                else
                    console.log('bank b doesn\'t have', key, value);
            });

            const reconcileQuery = constructReconcileOutputsQuery(uhsIdsToUpdate);

            const constructOutputEntryQuery = (outputsCreated) => {
                const outsToInsert= [];
                        
                for(let i = 0; i < outputsCreated.length; i++) {
                    let output_id = uuidv4();
                    let o = outputsCreated[i];
                    const tempOut = [output_id, o.created_txid, o.owner_pubkey, o.amount, o.index, o.witness_commitment, o.spend_txid]
                    outsToInsert.push(tempOut);
                }
            
                const insertMultipleOutputQuery = format(`INSERT INTO 
                outputs (output_id, created_txid, owner_pubkey, amount, index, witness_commitment, spend_txid) 
                VALUES %L`, outsToInsert);
                return insertMultipleOutputQuery;
            };

            const insertMissingOutputsQuery = constructOutputEntryQuery(outputsToAddA);

            pool.connect((err, client, done) => {
                if (err) {
                    throw err;
                }
                const shouldAbort = err => {
                    if (err) {
                        console.error('Error in transaction', err.stack)
                        client.query("ROLLBACK", err => {
                            if (err) {
                                console.error('Error rolling back client', err.stack);
                            }
                            // release the client back to the pool
                            done();
                        })
                    }
                    return !!err;
                };
                client.query("BEGIN", (err, results) => {
                    if (shouldAbort(err)) return;
                    if(!uhsIdsToUpdate.length == 0 && !outputsToAddA.length == 0) {
                        client.query(reconcileQuery, (err, results) => {
                            if (shouldAbort(err)) return;     
                            client.query(insertMissingOutputsQuery, (err, results) => {
                                client.query('COMMIT', (err, res) => {
                                    if (err) {
                                        console.error('Error commiting transaction', err.stack);
                                    }
                                    response.status(200).json({message: "Synced missing outputs and updated output records"});
                                    done()
                                });
                            });
                        });
                    } else if(!uhsIdsToUpdate.length == 0 && outputsToAddA.length == 0) {
                        client.query(reconcileQuery, (err, results) => {
                            if (shouldAbort(err)) return;     
                            client.query('COMMIT', (err, res) => {
                                    if (err) {
                                        console.error('Error commiting transaction', err.stack);
                                    }
                                    response.status(200).json({message: "Updated output records"});
                                    done()
                                });
                            });
                    } else if(!outputsToAddA.length == 0 && uhsIdsToUpdate.length == 0) {
                        client.query(insertMissingOutputsQuery, (err, results) => {
                            if (shouldAbort(err)) return;     
                            client.query('COMMIT', (err, res) => {
                                    if (err) {
                                        console.error('Error commiting transaction', err.stack);
                                    }
                                    
                                    response.status(200).json({message: "Synced missing outputs"});
                                    done()
                                });
                            });
                    }
                    else {
                        response.status(200).json({message: "No outputs to sync"});
                    }
                });
            });
          }); 
    });
};


const getBalance = (request, response) => {
    const pubkey = request.params.pubkey;

    pool.query(`SELECT * FROM outputs WHERE owner_pubkey=$1 AND spend_txid IS NULL;`, [pubkey], (error, results) => {
        if (error) {
          throw error
        }
        // sum up amounts, return balance
        response.status(200).json(results.rows);
      }); 
}

const fundAddress = (request, response) => {
    
    const recipientPubkey = request.body.recipientPubkey;
    const value = request.body.value;
    const reserveSeckey = reserveConfig.reserveMintSecretkey;
    const reservePubkey = reserveConfig.reserveMintPubkey;

    pool.connect((err, client, done) => {
        const shouldAbort = err => {
            if (err) {
                console.error('Error in transaction', err.stack)
                client.query("ROLLBACK", err => {
                    if (err) {
                        console.error('Error rolling back client', err.stack);
                    }
                    // release the client back to the pool
                    done();
                })
            }
            return !!err;
        }

        client.query('BEGIN', err => {
            if(shouldAbort(err)) return

            const unspentOutputsQuery = `SELECT * FROM outputs WHERE owner_pubkey='${reservePubkey}' AND spend_txid IS NULL;`
            
            client.query(unspentOutputsQuery, [], (err, results) => {

                if (err) {
                    throw err;
                }

                const outputs = results.rows;

                if(!outputs) {
                    response.status(500).send("Error: Could not fund address, no unspent outputs to spend");
                }

                const txInfo = constructTx(outputs, recipientPubkey, value, reserveSeckey, reservePubkey);
                const insertMultipleOutputQuery = constructOutputEntryQuery(txInfo.outputsCreated, txInfo.txid);
                
                try {
                    // Note: can set paramaters to port to 5555 and host to '127.0.0.1' if trying to connect to sentinel
                    const data = Networking.broadcastTx(config.sentinel.port, config.sentinel.host, txInfo.signedTx);
                    console.log("Data from sentinel: ", data);
                } catch(error) {
                    console.log("Error in sending tx: ", error);
                    shouldAbort(error);
                }
            
                const updateSpentQuery = constructUpdateSpentQuery(txInfo.inputsSpent, txInfo.txid);
            
                client.query(updateSpentQuery, (err, results) => {
                        if (shouldAbort(err)) return;
                        client.query(insertMultipleOutputQuery, (err, results) => {
                            if (shouldAbort(err)) return;
                            client.query('COMMIT', (err, res) => {
                                if (err) {
                                    console.error('Error commiting transaction', err.stack);
                                }
                                response.status(200).send("Message: OK");
                                done()
                            });
                        });
                    });
                });
            });   
        });  
};

const sendTx = (request, response) => {
    const signedTx = request.body.signedTx;
    const txid = request.body.txid;
    const inputsSpent = request.body.inputsSpent;
    const outputsCreated = request.body.outputsCreated;

    pool.connect((err, client, done) => {

        const shouldAbort = err => {
            if (err) {
                console.error('Error in transaction', err.stack)
                client.query("ROLLBACK", err => {
                    if (err) {
                        console.error('Error rolling back client', err.stack);
                    }
                    // release the client back to the pool
                    done();
                })
            }
            return !!err;
        }

        client.query('BEGIN', (err) => {
            if (shouldAbort(err)) return;

            try {
                const data = Networking.broadcastTx(config.sentinel.port, config.sentinel.host, signedTx);
                console.log("Data from sentinel: ", data);
            } catch(error) {
                console.log("Error in sending Tx: ", error);
                shouldAbort(err);
            }

            const finalUpdateSpentQuery = constructUpdateSpentQuery(inputsSpent, txid);

            client.query(finalUpdateSpentQuery, (err, results) => {
                if (shouldAbort(err)) return;    
                    const insertMultipleOutputQuery =  constructOutputEntryQuery(outputsCreated, txid);

                    client.query(insertMultipleOutputQuery, (err, results) => {
                        if (shouldAbort(err)) return;
                        client.query('COMMIT',(err, results) => {
                            if (err) {
                                console.error('Error commiting transaction', err.stack);
                            }
                            response.status(200).json(results);
                            done();
                    });
                });
            });
        });
    });
};


const mintTx = (request, response) => {
    const outputId = uuidv4();
    const createdByTxid = '0bbbf51721dec0100f1bcb9299aa29ee11675e44e88839822f78e8c9d91c340f';
    const witnessCommitment = sha256('00' + '3ad8f015f9212f8262248af4cf4cc39907d0215fdde14507f8bc09ad5836bbe9');
    const totalValue = 100000000;
    const index = 0;
    const createdByPubkey = '3ad8f015f9212f8262248af4cf4cc39907d0215fdde14507f8bc09ad5836bbe9';

    pool.query('INSERT INTO outputs (output_id, created_txid, owner_pubkey, amount, index, witness_commitment) VALUES ($1, $2, $3, $4, $5, $6)', [outputId, createdByTxid, createdByPubkey, totalValue, index, witnessCommitment], (error, results) => {
        if (error) {
            console.error(error);
            throw error;
        }
        response.status(200).json(results);
    });            
}

module.exports = {
    getTransactions,
    getAllOutputsForPublickey,
    syncOutputs,
    getOutputsForPublickey,
    mintTx,
    fundAddress,
    getBalance,
    sendTx
};
