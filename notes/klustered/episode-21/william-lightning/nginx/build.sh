#!/bin/sh
curl -o insideout-anger.gif https://c.tenor.com/betdspk32EoAAAAC/insideout-anger.gif
docker build -t ghcr.io/rawkode/klustered:v2 .
docker save --output ../klustered.tar ghcr.io/rawkode/klustered:v2
rm insideout-anger.gif