#!/bin/sh
ls -lah
node_modules/db-migrate/bin/db-migrate --env local --config server/database.json up
echo "MIGRATIONS ARE DONE"

nodemon /app/server/main.js