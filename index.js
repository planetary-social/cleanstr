'use strict';

import functions from '@google-cloud/functions-framework';
import openAIClientPool from './src/lib/openAIClientPool.js';
import RateLimiting from './src/lib/rateLimiting.js';
import Nostr from './src/lib/nostr.js';
import DuplicationHandling from './src/lib/duplicationHandling.js';

functions.cloudEvent('nostrEventsPubSub', async (cloudEvent) => {
  const nostrEvent = Nostr.getVerifiedEvent(cloudEvent.data.message.data);

  if (!nostrEvent) {
    return;
  }

  await RateLimiting.handleRateLimit(async function () {
    await DuplicationHandling.processIfNotDuplicate(
      nostrEvent,
      async (event) => {
        const moderation = await openAIClientPool.getModeration(event);

        if (!moderation) {
          console.log(`Nostr Event ${event.id} passed moderation. Skipping`);
          return;
        }

        await Nostr.publishModeration(event, moderation);
      }
    );
  });
});
