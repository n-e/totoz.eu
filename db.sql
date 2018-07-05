BEGIN;

-- as superuser:
-- CREATE EXTENSION pg_trgm;

CREATE TABLE users (
    name varchar(100) primary key,
    password varchar(1024), -- null for hfr and others
    email varchar(512),
    created timestamptz default now()
);
CREATE UNIQUE INDEX name_uniqueci_idx on user(lower(name));

CREATE TABLE totoz (
    name varchar(512) primary key,
    created timestamptz not null,
    changed timestamptz not null,
    nsfw boolean not null,
    user_name varchar(100) references users(name),
    image bytea
);
CREATE UNIQUE INDEX name_uniqueci_idx on totoz(lower(name));
CREATE INDEX trgrm_idx on totoz using gin (name gin_trgm_ops);
CREATE INDEX created_idx on totoz (created);

CREATE TABLE tags (
    name varchar(100) not null,
    totoz_name varchar(512) not null references totoz(name),
    primary key (name,totoz_name)
);
CREATE INDEX trgrm_idx on tags using gin (name gin_trgm_ops);

CREATE VIEW totozv as
    select totoz.*,array_agg(tags.name) tags
    from totoz left join tags
    on tags.totoz_name = totoz.name
    group by totoz.name;

COMMIT;