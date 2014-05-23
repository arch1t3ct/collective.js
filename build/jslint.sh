#!/bin/bash
# Checks code against jslint rules.

# Current directory.
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Jslint command options and files. Add new if exist.
$DIR/../node_modules/.bin/jslint --plusplus true --vars true --unparam false --node true --indent 4 --maxlen 100 \
$DIR/../index.js \
$DIR/../test/index.js \

exit;