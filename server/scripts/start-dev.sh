#!/bin/sh
while ! nc -z $DB_HOST 5432; do
    echo "Waiting for db...";
    sleep 1;
done;

node_modules/db-migrate/bin/db-migrate --env local --config database.json up
echo "MIGRATIONS ARE DONE"

nodemon /app/server/main.js
