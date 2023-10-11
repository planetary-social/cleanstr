import OpenAI from 'openai';

export class OpenAIClientPool {
  constructor(keys) {
    if (!keys.length) throw new Error('Keys array cannot be empty');
    this.clients = keys.map((key) => new OpenAI({ apiKey: key }));
  }

  async getModeration(event) {
    const client = this.getClient(event.id);
    const response = await client.moderations.create({ input: event.content });
    const moderation = response.results[0];

    console.log(
      `Moderation for event ${event.id} with content "${
        event.content.slice(0, 20) + '...'
      }": ${JSON.stringify(moderation)}`
    );

    if (moderation.flagged) {
      return moderation;
    }
  }

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
