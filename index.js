'use strict';

const functions = require('@google-cloud/functions-framework');

functions.cloudEvent('nostrEventsPubSub', (cloudEvent) => {
  const data = cloudEvent.data.message.data;

  const eventJSON = data ? Buffer.from(data, 'base64').toString() : '{}';
  const event = JSON.parse(eventJSON);

  console.log(`Nostr Event Id: ${event.id}`);
  console.log(`Nostr Event Content: ${event.content}`);
});
