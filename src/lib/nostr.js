import NDK, { NDKEvent, NDKPrivateKeySigner } from '@nostr-dev-kit/ndk';
import { validateEvent, verifySignature } from 'nostr-tools';
import { WebSocket } from 'ws';

if (!process.env.NOSTR_PRIVATE_KEY) {
  throw new Error('NOSTR_PRIVATE_KEY environment variable is required');
}

// Hack to be able to have a global WebSocket object in Google Cloud Functions
global.WebSocket = WebSocket;

// TODO: Should we get relays from the pubsub message or extend it through a query of kind 10002 events?
const RELAYS = [
  'wss://relay.damus.io',
  'wss://eden.nostr.land',
  'wss://nos.lol',
  'wss://relay.snort.social',
  'wss://relay.s3x.social',
  'wss://relay.protest.net',
  'wss://rss.nos.social',
];

const signer = new NDKPrivateKeySigner(process.env.NOSTR_PRIVATE_KEY);
const userPromise = signer.user();

// Keep this initialization in the global module scope so it can be reused
// across function invocations
const ndk = new NDK({
  signer,
  explicitRelayUrls: RELAYS,
});

const connectedPromise = ndk.connect();

const MODERATION_CATEGORIES = {
  hate: 'Content that expresses, incites, or promotes hate based on race, gender, ethnicity, religion, nationality, sexual orientation, disability status, or caste. Hateful content aimed at non-protected groups (e.g., chess players) is harrassment.',
  'hate/threatening':
    'Hateful content that also includes violence or serious harm towards the targeted group based on race, gender, ethnicity, religion, nationality, sexual orientation, disability status, or caste.',
  harassment:
    'Content that expresses, incites, or promotes harassing language towards any target.',
  'harassment/threatening':
    'Harassment content that also includes violence or serious harm towards any target.',
  'self-harm':
    'Content that promotes, encourages, or depicts acts of self-harm, such as suicide, cutting, and eating disorders.',
  'self-harm/intent':
    'Content where the speaker expresses that they are engaging or intend to engage in acts of self-harm, such as suicide, cutting, and eating disorders.',
  'self-harm/instructions':
    'Content that encourages performing acts of self-harm, such as suicide, cutting, and eating disorders, or that gives instructions or advice on how to commit such acts.',
  sexual:
    'Content meant to arouse sexual excitement, such as the description of sexual activity, or that promotes sexual services (excluding sex education and wellness).',
  'sexual/minors':
    'Sexual content that includes an individual who is under 18 years old.',
  violence: 'Content that depicts death, violence, or physical injury.',
  'violence/graphic':
    'Content that depicts death, violence, or physical injury in graphic detail.',
};

export default class Nostr {
  // Creates a NIP-32 event flagging a Nostr event.
  // See: https://github.com/nostr-protocol/nips/blob/master/32.md
  static async publishModeration(moderatedNostrEvent, moderation) {
    // Ensure we are already connected and it was done once in the module scope
    // during cold start
    await connectedPromise;
    const user = await userPromise;

    const moderationEvent = new NDKEvent(ndk);

    moderationEvent.kind = 1985;

    this.setTags(moderationEvent, moderatedNostrEvent, moderation);
    moderationEvent.content = this.createContentText(moderation);

    await moderationEvent.sign(ndk.signer);
    await moderationEvent.publish();

    console.log(
      `Published moderation event ${moderationEvent.id} on ${user.npub}`
    );

    return moderationEvent;
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

    return event;
  }

  static setTags(moderationEvent, moderatedNostrEvent, moderation) {
    moderationEvent.tags.push([
      'e',
      moderatedNostrEvent.id,
      'wss://relay.damus.io',
    ]);
    moderationEvent.tags.push(['L', 'com.openai.ontology']);

    for (const [category, isFlagged] of Object.entries(moderation.categories)) {
      if (isFlagged) {
        moderationEvent.tags.push([
          'l',
          category,
          'com.openai.ontology',
          JSON.stringify({
            confidence: moderation.category_scores[category],
          }),
        ]);
      }
    }
  }

  static createContentText(moderation) {
    return Object.entries(moderation.categories)
      .reduce((content, [category, isFlagged]) => {
        if (isFlagged) {
          content += MODERATION_CATEGORIES[category] + '\n\n';
        }
        return content;
      }, '')
      .trim();
  }
}
