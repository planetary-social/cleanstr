"use strict";

import functions from "@google-cloud/functions-framework";
import openAIClientPool from "./src/lib/openAIClientPool.js";
import RateLimiting from "./src/lib/rateLimiting.js";
import Nostr, { REPORT_KIND } from "./src/lib/nostr.js";
import Slack from "./src/lib/slack.js";
import DuplicationHandling from "./src/lib/duplicationHandling.js";

functions.cloudEvent("nostrEventsPubSub", async (cloudEvent) => {
  //The nostr event can either directly be the object or be encapsulated within
  //a nostrEvent key, if present. A nostrEvent key indicates a user-initiated
  //manual report request originating from the reportinator server. These events
  //require Slack-based verification, except when they get auto-flagged."
  const [nostrEventJson, userReportRequest] = getJSONFromCloudEvent(cloudEvent);
  const nostrEvent = Nostr.getVerifiedEvent(nostrEventJson);

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
          if (!userReportRequest) {
            console.log(skipMessage);
            return;
          }

          await Slack.postManualVerification(nostrEventJson, userReportRequest);
          console.log(
            `Event ${eventToModerate.id} reported by ${userReportRequest.pubkey} not flagged. Sending to Slack`
          );
          return;
        }

        await Nostr.publishModeration(eventToModerate, moderation);
      }
    );
  });
});

function getJSONFromCloudEvent(cloudEvent) {
  const data = cloudEvent.data.message.data;
  const jsonString = data ? Buffer.from(data, "base64").toString() : "{}";
  const json = JSON.parse(jsonString);

  if (json?.userReportRequest) {
    return [json?.nostrEvent, json.userReportRequest];
  }

  return [json, null];
}
