'use strict';

import functions from '@google-cloud/functions-framework';
import openAIClientPool from './src/lib/openAIClientPool.js';
import RateLimiting from './src/lib/rateLimiting.js';
import Nostr, { REPORT_KIND } from './src/lib/nostr.js';
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
        let eventToModerate = event;
        let skipMessage = `Nostr Event ${event.id} passed moderation. Skipping`;

        if (event.kind === REPORT_KIND) {
          eventToModerate = await Nostr.getReportedNostrEvent(event);
          if (!eventToModerate) {
            return console.log(
              `Couldn't find event reported by report ${event.id}`
            );
          }
          skipMessage = `Nostr Event ${eventToModerate.id} reported by ${event.id} passed moderation. Skipping`;
        }

        const moderation = await openAIClientPool.getModeration(
          eventToModerate
        );

        if (!moderation) {
          return console.log(skipMessage);
        }

        await Nostr.publishModeration(eventToModerate, moderation);
      }
    );
  });
});
