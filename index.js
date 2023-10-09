'use strict';

import functions from '@google-cloud/functions-framework';
import OpenAI from 'openai';
import { validateEvent, verifySignature } from 'nostr-tools';
// We use lib instead of explicit functions so that we can stub them in our tests
import lib from './src/lib.js';

const FUNCTION_TIMEOUT_MS = 60000;
const RATE_LIMIT_ERROR_CODE = 429;

// Assumes OPENAI_API_KEY has been set in the environment
// Keep this initialization in the global module scope so it can be reused
// across function invocations
// TODO: Pool of api keys/clients
const openai = new OpenAI();

functions.cloudEvent('nostrEventsPubSub', async (cloudEvent) => {
  const event = getVerifiedEvent(cloudEvent.data.message.data);

  if (!event) {
    return;
  }

  await lib.processIfNotDuplicate(event, async (event) => {
    const startTime = Date.now();

    try {
      const moderation = await getModeration(event);

      if (!moderation) {
        console.log(`Nostr Event ${event.id} passed moderation. Skipping`);
        return;
      }

      await lib.publishModeration(event, moderation);
    } catch (error) {
      if (error?.response?.status === RATE_LIMIT_ERROR_CODE) {
        console.error('Rate limit error. Adding random pause');
        await randomPause(startTime);
        throw error;
      }
    }
  });
});

function getVerifiedEvent(data) {
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

  return event;
}

async function getModeration(event) {
  const response = await openai.moderations.create({ input: event.content });
  const moderation = response.results[0];

  if (moderation.flagged) {
    return moderation;
  }
}

// Random pause within the window of half of the remaining available time before
// hitting timeout.
// https://platform.openai.com/docs/guides/rate-limits/error-mitigation
async function randomPause(startTime) {
  const elapsedMs = Date.now() - startTime;
  const remainingMs = FUNCTION_TIMEOUT_MS - elapsedMs;
  const halfOfRemainingTime = remainingMs / 2;
  const jitterTimeoutMs = Math.random() * halfOfRemainingTime;

  await lib.waitMillis(jitterTimeoutMs);
}
