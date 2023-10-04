'use strict';

import OpenAI from 'openai';
import { validateEvent, verifySignature } from 'nostr-tools';
import lib from './src/lib.js';

import functions from '@google-cloud/functions-framework';

// Assumes OPENAI_API_KEY has been set in the environment
const openai = new OpenAI();

functions.cloudEvent('nostrEventsPubSub', async (cloudEvent) => {
  try {
    const data = cloudEvent.data.message.data;

    const eventJSON = data ? Buffer.from(data, 'base64').toString() : '{}';
    const event = JSON.parse(eventJSON);

    if (!validateEvent(event)) {
      console.error('Invalid Nostr Event');
      return;
    }

    if (!verifySignature(event)) {
      console.error('Invalid Nostr Event Signature');
      return;
    }

    const response = await openai.moderations.create({ input: event.content });
    const moderation = response.results[0];

    if (!moderation.flagged) {
      console.log(`Nostr Event ${event.id} Passed Moderation. Skipping`);
      return;
    }

    await lib.publishModerationResult(event, moderation);

    console.log(
      `Nostr Event ${event.id} was flagged. Published moderation Nostr event`
    );
  } catch (err) {
    // For the moment log every error to the console and let the function finish
    console.error(err);
  }
});
