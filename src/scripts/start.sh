#!/bin/sh
ls -lah
node_modules/db-migrate/bin/db-migrate up
echo "MIGRATIONS ARE DONE"
npm run start