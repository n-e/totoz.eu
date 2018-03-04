# Redis Database Schema

## Totozes

### Normalized Data

    totoz:meta:<lowercase totoz name> HMAP
        name:<totoz name as-is>  May contain any utf-8 character for historical reasons
                                 See the relevant source for restrictions on new totozes
        username:<usename as-is>
        created:<ISO DateTime>
        changed:<ISO DateTime>
        nsfw:<0|1>
        ALL VALUES ARE MANDATORY
    
    totoz:tags:<lowercase totoz name> SET
        <tag name as-is>

### Calculated Data

    totozes:alpha ZSET
        <score:0> <lowercase totoz name>
    
    totozes:index:2gram:<AA> SET    Index by totoz name
        <lowercase totoz name>      TODO : add tags and user to index