#!/bin/bash
# Bulk import totozes from a json file
# Usage: bulk_import.sh | redis-cli

<"$1" jq -r '.totozes[]|
    ["HMSET", "totoz:meta:"+.name,
        "username",.username,
        "created",.created,
        "changed",.changed,
        "nsfw",.nsfw
    ],
    (["SADD", "totoz:tags:"+.name,
        .tags[]
    ]| select(length>=3)),
    ["ZADD", "totozes", "0", .name]
    |map("\""+gsub("\"";"\\\"")+"\"")|join(" ")'