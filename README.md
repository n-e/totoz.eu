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
    - ``\copy tags(totoz_name,name) from 'tags.csv' with (format 'csv');``
4) Do the same for images :
    - Get missing images: ``IFS='\n' cat missing-2018-07-06|while read i;do curl -s `echo "http://nsfw.totoz.eu/$i.gif"|sed 's/ /%20/g'` > "missing-2018-07-06-f/$i.gif" ;done``
    - check with file they're good
    - ``IFS='\n' find . -name "*.gif"|while read i;do (basename -s .gif -- "$i";echo ',\x'; xxd -p -- "$i")|tr -d '\n';echo ''; done``
    -
        ``
        create temporary table im(name varchar(512),image bytea);
        \copy im(name,image) from 'totoz/im.csv' with (format 'csv');
        update totoz set image = im.image from im where lower(totoz.name) = lower(im.name);
        ``
5) Do the same for the users:
    - ``insert into users(name,password,email,created,accessed) select name,pass,mail,to_timestamp(created),to_timestamp(access) from users_import;``

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

- ``ssh beta.totoz.eu 'git pull && npm i && npm run build && sudo systemctl restart totoz'``