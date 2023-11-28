#!/usr/bin/env bash

event_content="$1"

type="$2"

if [ -z "$3" ]; then
  nostr_private_key="$NOSTR_PRIVATE_KEY"
else
  nostr_private_key="$3"
fi

if [ -z "$nostr_private_key" ]; then
  echo "Missing Nostr Secret Key. Please set the NOSTR_PRIVATE_KEY environment variable or pass it as the second argument to this script."
  exit 1
fi

if [[ "$type" == "report" ]]; then
  JSON_PAYLOAD=$(nak event -c "$event_content" --sec "$nostr_private_key" -envelope | jq -c .)
  echo "Reported event JSON Payload is: $JSON_PAYLOAD\n"
  sleep 1
  echo $JSON_PAYLOAD | nostcat wss://relay.damus.io

  EVENT_ID=$(echo "$JSON_PAYLOAD" | jq '.[1].id'| sed 's/"//g')
  JSON_PAYLOAD=$(nak event -c 'Hateful!'  --kind 1984 --sec "$nostr_private_key" -t e="$EVENT_ID;profanity" -t L=MOD -t l='hate;MOD;{"confidence":0.7413473725318909}'| jq -c .)
else
  JSON_PAYLOAD=$(nak event -c "$event_content" --sec "$nostr_private_key" | jq -c .)
fi
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

