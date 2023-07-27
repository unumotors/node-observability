#!/bin/sh -e

# This generate the type definitions for all files
npx -p typescript tsc index.js lib/*.js --declaration --allowJs --emitDeclarationOnly --outFile index.d.ts --module node16 --esModuleInterop --skipLibCheck
# # Rename the library (we put "observability" instead of "@unu/observability")
sed -i 's/declare module "index" {/declare module "@unu\/observability" {/' index.d.ts
# Remove all ".js" endings to fix the pathing. the generator adds these for some reason
# This is not relevant for this service yet, but will be when moving to ESM.
# Leaving it here so we do not have issues then. It does nothing currently.
sed -i 's/\.js//g' index.d.ts
