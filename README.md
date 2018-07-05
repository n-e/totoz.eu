## Build

    npm install && npm run build && npm start

## Development

    npm install
    npm run watch

## Create the totoz database

1) create the database :
    - ``createdb totoz``
    - ``psql < db.sql``
1) Get a totoz metadata json file (migration/*.json)
2) Convert it to csv: ``jq -r '.totozes[]|[.name,.username,.created,.changed,.nsfw]|@csv' totoz.json``
2) Import it: ``\copy totoz(name,user_name,created,changed,nsfw)  from 'ttz.csv' with (format 'csv');``
3) Do the same for tags:
    - ``jq -r '.totozes[]|.name as $n|.tags[]|[$n,.]|@csv' totoz.json``
    - ``\copy tags(totoz_name,name) from 'ttz.csv' with (format 'csv');``

## Official server

[https://beta.totoz.eu](https://beta.totoz.eu)

### node.js

- /home/totoz/app/ : application
- see official_server/totoz.service

### nginx

- reverse proxy for the app
- see official_server/totoz.eu

## postgresql

### certbot

- obvious settings
- redirect from http to https

### Misc. Commands

- ``rsync -az . beta.totoz.eu:/home/totoz/app && ssh beta.totoz.eu 'sudo systemctl restart totoz'``