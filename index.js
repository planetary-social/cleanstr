"use strict";

import functions from "@google-cloud/functions-framework";
import openAIClientPool from "./src/lib/openAIClientPool.js";
import RateLimiting from "./src/lib/rateLimiting.js";
import Nostr, { REPORT_KIND } from "./src/lib/nostr.js";
import Slack from "./src/lib/slack.js";
import DuplicationHandling from "./src/lib/duplicationHandling.js";
import ReportRequest from "./src/lib/reportRequest.js";

functions.cloudEvent("nostrEventsPubSub", async (cloudEvent) => {
  //The nostr event can either directly be the object or be encapsulated within
  //a reportedEvent key, if present. A reportedEvent key indicates a
  //user-initiated manual report request originating from the reportinator
  //server. These events require Slack-based verification, except when they get
  //auto-flagged. They also include a test and a pubkey of the reporter user.
  const reportRequest = ReportRequest.fromCloudEvent(cloudEvent);
  const nostrEvent = Nostr.getVerifiedEvent(reportRequest.reportedEvent);

  if (!nostrEvent) {
    return;
  }

  await RateLimiting.handleRateLimit(async function () {
    await DuplicationHandling.processIfNotDuplicate(
      reportRequest.canBeManualVerified(),
      nostrEvent,
      async (event, onlySlack) => {
        if (onlySlack) {
          await Slack.postManualVerification(reportRequest);
          return;
        }

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
          if (!reportRequest.canBeManualVerified()) {
            console.log(skipMessage);
            return;
          }

          await Slack.postManualVerification(reportRequest);
          return;
        }

        await Nostr.publishModeration(eventToModerate, moderation);
      }
    );
  });
});
