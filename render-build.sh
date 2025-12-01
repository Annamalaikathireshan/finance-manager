#!/usr/bin/env bash
# Install dependencies
npm install
cd server && npm install
cd ..

# Build Angular app
npm run build

# Move build artifacts to server/client/dist
# Angular builds to dist/finance-manager by default.
# Our server expects client/dist/finance-manager.
mkdir -p server/client/dist
cp -r dist server/client/
