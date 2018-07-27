BEGIN;

-- as superuser:
-- CREATE EXTENSION pg_trgm;

CREATE TABLE users (
    name varchar(100) primary key,
    password varchar(1024), -- null for hfr and others
    email varchar(512),
    created timestamptz not null default now(),
    accessed timestamptz -- last login
);
CREATE UNIQUE INDEX user_name_uniqueci_idx on users(lower(name));

CREATE TABLE totoz (
    name varchar(512) primary key,
    created timestamptz not null,
    changed timestamptz not null,
    nsfw boolean not null,
    user_name varchar(100) references users(name),
    image bytea
);
CREATE UNIQUE INDEX totoz_name_uniqueci_idx on totoz(lower(name));
CREATE INDEX totoz_name_trgrm_idx on totoz using gin (name gin_trgm_ops);
CREATE INDEX created_idx on totoz (created);

CREATE TABLE tags (
    name varchar(100) not null,
    totoz_name varchar(512) not null references totoz(name),
    primary key (name,totoz_name)
);
CREATE INDEX tags_name_trgrm_idx on tags using gin (name gin_trgm_ops);
CREATE INDEX tags_totoz_name_idx on tags(totoz_name);
-- if null: the owner of the tag is the totoz owner. only him
-- can delete it.
-- if not null : tag user and the totoz user can delete it.
alter table tags add column user_name varchar(100) references users(name);

CREATE VIEW totozv as
    select totoz.*,array_agg(tags.name) tags
    from totoz left join tags
    on tags.totoz_name = totoz.name
    group by totoz.name;

-- from node_modules/connect-pg-simple/table.sql
CREATE TABLE "session" (
  "sid" varchar NOT NULL COLLATE "default",
	"sess" json NOT NULL,
	"expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);
ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;

COMMIT;


-- all the totoz metadata relevant for search in one string
CREATE MATERIALIZED VIEW totozmeta as
select
    totoz.name as name,
    totoz.name || ' ' ||
    totoz.user_name || ' ' ||
    string_agg(coalesce(tags.name, ''),' ') as meta
from totoz
left join tags on totoz.name = tags.totoz_name
group by totoz.name
with data;


GRANT select,insert,update,delete on all tables in schema public  to totoz;