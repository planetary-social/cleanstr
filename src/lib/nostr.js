import NDK, { NDKEvent, NDKPrivateKeySigner } from '@nostr-dev-kit/ndk';
import { validateEvent, verifySignature } from 'nostr-tools';
import OPENAI_CATEGORIES from './openAICategories.js';
import { WebSocket } from 'ws';

if (!process.env.NOSTR_PRIVATE_KEY) {
  throw new Error('NOSTR_PRIVATE_KEY environment variable is required');
}

// Hack to be able to have a global WebSocket object in Google Cloud Functions
global.WebSocket = WebSocket;

const RELAYS = [
  'wss://relay.nos.social',
  'wss://relay.damus.io',
  'wss://relay.nostr.band',
  'wss://relayable.org',
  'wss://nostr.wine',
];

const signer = new NDKPrivateKeySigner(process.env.NOSTR_PRIVATE_KEY);
const userPromise = signer.user();

// Keep this initialization in the global module scope so it can be reused
// across function invocations
const ndk = new NDK({ signer, explicitRelayUrls: RELAYS });

const connectedPromise = ndk.connect();

export const REPORT_KIND = 1984;

export default class Nostr {
  // Creates a NIP-32 event flagging a Nostr event.
  // See: https://github.com/nostr-protocol/nips/blob/master/32.md
  static async publishModeration(moderatedNostrEvent, moderation) {
    // Ensure we are already connected and it was done once in the module scope
    // during cold start
    await connectedPromise;
    const user = await userPromise;

    let moderationEvent;
    moderationEvent = await Nostr.createReportEvent(
      moderatedNostrEvent,
      moderation
    );

    await Nostr.publishNostrEvent(moderationEvent);

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

  static getVerifiedEvent(data) {
    const eventJSON = data ? Buffer.from(data, 'base64').toString() : '{}';
    const event = JSON.parse(eventJSON);

    if (!validateEvent(event)) {
      console.error('Invalid Nostr Event');
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
    moderationNostrEvent.tags.push(['e', moderatedNostrEvent.id, reportType]);
    moderationNostrEvent.tags.push(['L', 'MOD']);

    for (const [category, isFlagged] of Object.entries(moderation.categories)) {
      if (isFlagged) {
        moderationNostrEvent.tags.push([
          'l',
          OPENAI_CATEGORIES[category].nip69,
          'MOD',
          JSON.stringify({
            confidence: moderation.category_scores[category],
          }),
        ]);
      }
    }
  }

  static async getReportedNostrEvent(reportNostrEvent) {
    const reportedNostrEventId = reportNostrEvent.tagValue('e');
    const reportedNostrEvent = await ndk.fetchEvent({
      ids: [reportedNostrEventId],
    });
    return reportedNostrEvent;
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
    return Object.entries(moderation.categories)
      .reduce((content, [category, isFlagged]) => {
        if (isFlagged) {
          content += OPENAI_CATEGORIES[category].description + '\n\n';
        }
        return content;
      }, '')
      .trim();
  }
}
