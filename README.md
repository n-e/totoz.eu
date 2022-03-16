## Build & run locally

```
docker compose up -d
npm install && npm run build && PGHOST=localhost PGDATABASE=totoz_test PGUSER=totoz PGPASSWORD=example npm start
```

## Create the totoz database

1. create the database :
   - `createdb totoz`
   - `psql < db.sql`
1. Get a totoz metadata json file (migration/\*.json)
1. Convert it to csv: `jq -r '.totozes[]|[.name,.username,.created,.changed,.nsfw]|@csv' totoz.json`
1. Import it: `\copy totoz(name,user_name,created,changed,nsfw) from 'ttz.csv' with (format 'csv');`
1. Do the same for tags:
   - `jq -r '.totozes[]|.name as $n|.tags[]|[$n,.]|@csv' totoz.json`
   - `\copy tags(totoz_name,name) from 'tags.csv' with (format 'csv');`
1. Do the same for images :
   - Get missing images: `` IFS='\n' cat missing-2018-07-06|while read i;do curl -s `echo "http://nsfw.totoz.eu/$i.gif"|sed 's/ /%20/g'` > "missing-2018-07-06-f/$i.gif" ;done ``
   - check with file they're good
   - `IFS='\n' find . -name "*.gif"|while read i;do (basename -s .gif -- "$i";echo ',\x'; xxd -p -- "$i")|tr -d '\n';echo ''; done`
   - `create temporary table im(name varchar(512),image bytea); \copy im(name,image) from 'totoz/im.csv' with (format 'csv'); update totoz set image = im.image from im where lower(totoz.name) = lower(im.name);`
1. Do the same for the users:
   - `insert into users(name,password,email,created,accessed) select name,pass,mail,to_timestamp(created),to_timestamp(access) from users_import;`

## Update the hfr totozes:

    node build/hfr-importer.js

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

- `ssh beta.totoz.eu 'cd ~totoz/app && git pull && yarn && yarn build && sudo systemctl restart totoz'`
