FROM public.ecr.aws/docker/library/node:14.17.0-alpine

# Install git
RUN apk add git

ARG VUE_APP_API_BASE_URL='http://localhost:3000/api/v1/'
# ARG SNTL_HOST='localhost'
# ARG SNTL_PORT=5555 

# Install bash
RUN apk add bash

# install simple http server for serving static content
RUN npm install -g http-server

# make the 'app' folder the current working directory
WORKDIR /app

# copy both 'package.json' and 'package-lock.json' (if available)
COPY package*.json ./

# install project dependencies
RUN npm install

# copy project files and folders to the current working directory (i.e. 'app' folder)
COPY . .

# install cbdc module and it's dependecies, then browersify within root of app

RUN npm install 

WORKDIR /app

RUN npm run preprocess

# build app for production with minification
RUN npm run build

# EXPOSE 8080
# CMD [ "http-server", "dist" ]

CMD node_modules/db-migrate/bin/db-migrate -m server/migrations --env local --config server/database.json up && node server/main.js
