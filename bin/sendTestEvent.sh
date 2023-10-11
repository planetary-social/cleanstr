#!/usr/bin/env bash

event_content="$1"

if [ -z "$2" ]; then
  nostr_secret_key="$NOSTR_SECRET_KEY"
else
  nostr_secret_key="$2"
fi



JSON_PAYLOAD=$(nak event -c "$event_content" --sec "$nostr_secret_key" | jq -c .)
echo "JSON Payload is: $JSON_PAYLOAD"

BASE64_PAYLOAD=$(echo -n "$JSON_PAYLOAD" | base64 | tr -d '\n')

curl -m 70 -X POST 'https://us-central1-pub-verse-app.cloudfunctions.net/nodejs-moderator-function' \
-H "Authorization: bearer $(gcloud auth print-identity-token)" \
-H 'Content-Type: application/json' \
-H 'ce-id: 1234567890' \
-H 'ce-specversion: 1.0' \
-H 'ce-type: google.cloud.pubsub.topic.v1.messagePublished' \
-H 'ce-time: 2020-08-08T00:11:44.895529672Z' \
-H 'ce-source: //pubsub.googleapis.com/projects/pub-verse-app/topics/nostr-events' \
-d '{  "message": {"data": "'"$BASE64_PAYLOAD"'"}}'

