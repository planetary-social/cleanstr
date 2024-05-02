import NDK, { NDKEvent, NDKPrivateKeySigner } from "@nostr-dev-kit/ndk";
import { validateEvent, verifySignature } from "nostr-tools";
import OPENAI_CATEGORIES from "./openAICategories.js";
import { WebSocket } from "ws";

if (!process.env.NOSTR_PRIVATE_KEY) {
  throw new Error("NOSTR_PRIVATE_KEY environment variable is required");
}

// Hack to be able to have a global WebSocket object in Google Cloud Functions
global.WebSocket = WebSocket;

const RELAYS = [
  "wss://relay.nos.social",
  "wss://relay.damus.io",
  "wss://relay.nostr.band",
  "wss://relayable.org",
  "wss://nostr.wine",
];

const signer = new NDKPrivateKeySigner(process.env.NOSTR_PRIVATE_KEY);
const userPromise = signer.user();

// Keep this initialization in the global module scope so it can be reused
// across function invocations
const ndk = new NDK({ signer, explicitRelayUrls: RELAYS });

const connectedPromise = ndk.connect();

export const REPORT_KIND = 1984;

export default class Nostr {
  static async updateNjump(reportRequest, hexpubkey, fieldToUpdate) {
    await connectedPromise;
    const user = ndk.getUser({ hexpubkey });
    const profile = await user.fetchProfile();
    if (profile?.nip05) {
      const njump = `https://njump.me/${profile.nip05}`;
      reportRequest[fieldToUpdate] = njump;
    }
  }

  static async maybeFetchNip05(reportRequest) {
    await this.updateNjump(
      reportRequest,
      reportRequest.reporterPubkey,
      "njump"
    );
    await this.updateNjump(
      reportRequest,
      reportRequest.reportedEvent.pubkey,
      "reportedUserNjump"
    );
  }

  // Creates a NIP-32 event flagging a Nostr event.
  // See: https://github.com/nostr-protocol/nips/blob/master/32.md
  static async publishModeration(moderatedNostrEvent, moderation) {
    // Ensure we are already connected and it was done once in the module scope
    // during cold start
    await connectedPromise;
    const user = await userPromise;

    let moderationEvent;
    moderationEvent = await this.createReportEvent(
      moderatedNostrEvent,
      moderation
    );

    await this.publishNostrEvent(moderationEvent);

    console.log(
      `Published moderation event ${moderationEvent.id} for event ${moderatedNostrEvent.id}`
    );

    return moderationEvent;
  }

  static async createReportEvent(moderatedNostrEvent, moderation) {
    const reportEvent = new NDKEvent(ndk);

    reportEvent.kind = REPORT_KIND;

    this.setTags(reportEvent, moderatedNostrEvent, moderation);
    reportEvent.content = this.createContentText(moderation);

    await reportEvent.sign(ndk.signer);
    return reportEvent;
  }

  static async publishNostrEvent(event) {
    await event.publish();
  }

  static getVerifiedEvent(event) {
    if (!validateEvent(event)) {
      console.error("Invalid Nostr Event");
      return;
    }

    // TODO: We comment signature verification for now because high CPU usage in
    // our Google Cloud Function.  See:
    // https://planetary-app.slack.com/archives/CP4D5FQ87/p1696947806634059
    //
    // if (!verifySignature(event)) {
    //   console.error('Invalid Nostr Event Signature');
    //   return;
    // }

    return new NDKEvent(ndk, event);
  }

  static async setTags(moderationNostrEvent, moderatedNostrEvent, moderation) {
    const reportType = this.inferReportType(moderation);
    moderationNostrEvent.tags.push([
      "p",
      moderatedNostrEvent.pubkey,
      reportType,
    ]);
    moderationNostrEvent.tags.push(["e", moderatedNostrEvent.id, reportType]);
    moderationNostrEvent.tags.push(["L", "MOD"]);

    for (const [category, isFlagged] of Object.entries(moderation.categories)) {
      if (isFlagged) {
        moderationNostrEvent.tags.push([
          "l",
          `MOD>${OPENAI_CATEGORIES[category].nip69}`,
          "MOD",
          JSON.stringify({
            confidence: moderation.category_scores[category],
          }),
        ]);
      }
    }
  }

  static async getReportedNostrEvent(reportNostrEvent) {
    const reportedNostrEventId = reportNostrEvent.tagValue("e");
    return await this.getEvent(reportedNostrEventId);
  }

  static async getEvent(id) {
    await connectedPromise;
    const event = await ndk.fetchEvent({
      ids: [id],
    });

    return event;
  }

  static async isAlreadyFlagged(id) {
    await connectedPromise;
    const user = await userPromise;
    const event = await ndk.fetchEvent({
      "#e": [id],
      kinds: [REPORT_KIND],
      authors: [user.pubkey],
    });

    return !!event;
  }

  static inferReportType(moderation) {
    const highestScoreCategory = this.getHighestScoreCategory(moderation);
    return OPENAI_CATEGORIES[highestScoreCategory].nip56_report_type;
  }

  static getHighestScoreCategory(moderation) {
    const categories = moderation.categories;
    const categoryScores = moderation.category_scores;

    let highestCategory = null;
    let highestScore = -Infinity;

    for (const [category, flagged] of Object.entries(categories)) {
      if (flagged && categoryScores[category] > highestScore) {
        highestScore = categoryScores[category];
        highestCategory = category;
      }
    }

    return highestCategory;
  }

  static createContentText(moderation) {
    const reportType = this.inferReportType(moderation);
    const content = `This content has been reported for ${reportType} using NIP-69 vocabulary https://github.com/nostr-protocol/nips/pull/457`;
    return content;
  }
}
