#!/bin/bash
# This script is necessary because we need to be able to inject API_URL after build time, and Next does not provide and easy way to do that.
# This should work find both with npm run dev, locally and with docker

# Loads .env
if [ -f .env ]; then
  set -o allexport
  source .env 
  set +o allexport
fi


if [ -z "$API_URL" ] || [ -z "$APP_URL" ]; then
  echo "Error: API_URL or APP_URL is not set. Please set the API_URL and APP_URL environment variables."
  exit 1
fi

echo "window.API_URL = '${API_URL}'; window.APP_URL = '${APP_URL}';" > public/config.js

