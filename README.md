## Build

    npm install && npm run build && npm start

## Development

    npm install
    npm run watch

## Import totoz metadata

1) Get a totoz metadata json file (ask me)
2) Import it: ``scripts/bulk_import.sh [totoz file]| redis-cli``
3) Do the initial indexing: ``npm run reindex``

To avoid broken images on a dev box without the image collection set the NOIMAGES environment variable to 1

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