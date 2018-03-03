# Redis Database Schema

## Totozes

### Normalized Data

    totoz:info:<lowercase totoz name> HMAP
        name:<totoz name as-is>  May contain any utf-8 character for historical reasons
                                 See the relevant source for restrictions on new totozes
        username:<usename as-is>
        created:<ISO DateTime>
        changed:<ISO DateTime>
        nsfw:<0|1>
    
    totoz:tags:<lowercase totoz name> SET
        <tag name as-is>

### Calculated Data

    totozes:alpha ZSET
        <score:0> <lowercase totoz name>
    
    totozes:2gram:<AA> SET
        <lowercase totoz name>