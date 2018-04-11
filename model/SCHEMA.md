# Redis Database Schema

## Totozes

### Normalized Data

    totoz:meta:<totoz_id=lowercase totoz name> HMAP
        name:<totoz name as-is>  May contain any utf-8 character for historical reasons
                                 See the relevant source for restrictions on new totozes
        username:<usename as-is>
        created:<ISO DateTime>
        changed:<ISO DateTime>
        nsfw:<0|1>
        ALL VALUES ARE MANDATORY
    
    totoz:tags:<totoz_id=lowercase totoz name> SET
        <tag name as-is>    TODO: what characters may tags contain?

### Calculated Data

    totozes:alpha ZSET
        <score:0> <lowercase totoz name>
    
    totozes:index:3gram:<AAA|'12'> SET    Index by totoz name and tags
        <lowercase totoz name>
    
    totozes:index:byuser:<totoz_id=lowercase user name> SET  TODO check user names are really case unique
                                                        Note: the username may be empty
        <lowercase totoz name>