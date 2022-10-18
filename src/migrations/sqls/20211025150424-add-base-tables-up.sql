
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