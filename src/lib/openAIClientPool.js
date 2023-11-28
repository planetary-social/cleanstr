import OpenAI from 'openai';

const MODERATED_EVENT_KINDS = [
  1, // Kind 1: Short Text Note (free-form text notes)
  30023, // Kind 30023: Long-form Content (articles or blog posts in Markdown)
  30078, // Kind 30078: Application-specific Data (could contain free-form text data for apps)
  30402, // Kind 30402: Classified Listings (descriptions for classified listings)
  30403, // Kind 30403: Draft Classified Listings (descriptions for draft/inactive listings)
  9802, // Kind 9802: Highlights (highlighted text portions)
  // TODO: Delegations https://github.com/nostr-protocol/nips/blob/master/26.md
];

export class OpenAIClientPool {
  // Creates one openAI client per key and then round robins between them for
  // each request in a predictable event.id based way
  constructor(keys) {
    if (!keys.length) throw new Error('Keys array cannot be empty');
    this.clients = keys.map((key) => new OpenAI({ apiKey: key }));
  }

  // Returns a moderation object if the event content is flagged.
  async getModeration(event) {
    if (
      event.content.trim() === '' ||
      !MODERATED_EVENT_KINDS.includes(event.kind)
    ) {
      return;
    }

    const client = this.getClient(event.id);
    const response = await client.moderations.create({ input: event.content });
    const moderation = response.results[0];

    console.log(
      `Moderation for event ${event.id} with content "${
        event.content.slice(0, 20) + '...'
      }": ${JSON.stringify(moderation)}`
    );

    const scores = Object.values(moderation.category_scores);
    const maxScore = Math.max(...scores);

    if (moderation.flagged && maxScore >= 0.9) {
      return moderation;
    }
  }

  // Will select an openAI client from the pool based on the event.id.
  getClient(id) {
    let intValue;
    try {
      intValue = BigInt(`0x${id}`);
    } catch (error) {
      return null;
    }
    const clientIndex = intValue % BigInt(this.clients.length);
    return this.clients[Number(clientIndex)];
  }
}

// Keep this initialization in the global module scope so we instantiate client
// only during cold start across function invocations
const pool = new OpenAIClientPool([process.env.OPENAI_API_CSV]);
export default pool;
