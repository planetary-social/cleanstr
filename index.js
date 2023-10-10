'use strict';

import functions from '@google-cloud/functions-framework';
import openAIClientPool from './src/lib/openAIClientPool.js';
import RateLimiting from './src/lib/rateLimiting.js';
import Nostr from './src/lib/nostr.js';
import DuplicationHandling from './src/lib/duplicationHandling.js';

functions.cloudEvent('nostrEventsPubSub', async (cloudEvent) => {
  const event = Nostr.getVerifiedEvent(cloudEvent.data.message.data);

  if (!event) {
    return;
  }

  await DuplicationHandling.processIfNotDuplicate(event, async (event) => {
    await RateLimiting.jitterOnThrow(async function () {
      const moderation = await openAIClientPool.getModeration(event);

      if (!moderation) {
        console.log(`Nostr Event ${event.id} passed moderation. Skipping`);
        return;
      }

      await Nostr.publishModeration(event, moderation);
    });
  });
});
