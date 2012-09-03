#!/bin/bash

NODE_PATH=$NODE_PATH:node_modules/whiskey/lib-cov \
./node_modules/.bin/whiskey --failfast \
--tests "tests/test_sendreceive.js" #--coverage
