#!/bin/bash

set -e

psql postgres://postgres:example@localhost:5432 -c 'drop database if exists totoz_test;'
psql postgres://postgres:example@localhost:5432 -c 'create database totoz_test;'

psql postgres://postgres:example@localhost:5432/totoz_test -c 'create extension pg_trgm;'
psql postgres://postgres:example@localhost:5432/totoz_test -c "drop role if exists totoz; create role totoz with login password 'example'; grant all on database totoz_test to totoz; grant all on schema public to totoz;"

psql postgres://totoz:example@localhost:5432/totoz_test -f db.sql