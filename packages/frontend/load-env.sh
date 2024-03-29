#!/bin/bash
# This script is necessary because we need to be able to inject API_URL after build time, and Next does not provide and easy way to do that.
# This should work find both with npm run dev, locally and with docker

# Loads .env
if [ -f .env ]; then
  set -o allexport
  source .env 
  set +o allexport
fi


if [ -z "$API_URL" ]; then
  echo "Error: API_URL not set. Please set the API_URL environment variables."
  exit 1
fi

LC_ALL=C  find .next -type f -exec perl -pi -e "s|xyzPLACEHOLDERxyz|${API_URL}|g" {} +