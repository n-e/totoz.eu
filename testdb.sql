begin;

insert into users(name,password)
values('test','$S$DP8ET2wcafoqZfQQ4ihUT58rgdsn5tohsm7wnX8bHgkb1pN1lu2l'); -- password: a
insert into totoz(name,created,changed,nsfw,user_name)
values ('abc',now(),now(),false,'test'),
('Cde',now()- interval '1 month',now()- interval '1 month',true,'test');

insert into tags(name, totoz_name) values
('plop','abc'),
('plip','abc');
commit;