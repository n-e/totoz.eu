## Build

    npm install && npm run build && npm start

## Development

    npm install
    npm run watch

## Official server

[https://beta.totoz.eu](https://beta.totoz.eu)

### node.js

- /home/totoz/app/ : application
- see official_server/totoz.service

### nginx

- reverse proxy for the app
- see official_server/totoz.eu

## redis

### certbot

- obvious settings
- redirect from http to https

### Misc. Commands

- ``rsync -az . beta.totoz.eu:/home/totoz/app && ssh beta.totoz.eu 'sudo systemctl restart totoz'``