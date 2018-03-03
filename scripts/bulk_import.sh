#!/bin/bash
# Bulk import totozes from a json file
# Usage: bulk_import.sh | redis-cli

<"$1" jq -r '.totozes[]|
    ["HMSET", "totoz:meta:"+(.name|ascii_downcase),
        "name",.name,
        "username",.username,
        "created",.created,
        "changed",.changed,
        "nsfw",.nsfw
    ],
    (["SADD", "totoz:tags:"+(.name|ascii_downcase),
        .tags[]
    ]| select(length>=3)),
    ["ZADD", "totozes:alpha", "0", (.name|ascii_downcase)]
    |map("\""+gsub("\"";"\\\"")+"\"")|join(" ")'