#!/bin/sh
# This script is necessary because we need to be able to inject API_URL after build time, and Next does not provide and easy way to do that.
# This should work find both with npm run dev, locally and with docker

# TODO: maybe replace by node code for windows compatibility?

# Loads .env
if [ -f .env ]; then
  set -o allexport
  source .env 
  set +o allexport
fi


if [ -z "$API_URL" ]; then
  echo "Error: API_URL is not set. Please set the API_URL environment variable."
  exit 1
fi

echo "window.API_URL = 'PLACEHOLDER'" > public/config.js

sed -i.bak "s|PLACEHOLDER|${API_URL}|g" "public/config.js"
rm public/config.js.bak # created because of incompatibility with macos and linux sed (https://stackoverflow.com/questions/5694228/sed-in-place-flag-that-works-both-on-mac-bsd-and-linux)

