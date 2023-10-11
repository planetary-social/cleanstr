import { Datastore } from '@google-cloud/datastore';
const datastore = new Datastore();

// If an event is already processed, we don't want to process it again. We use a Datastore entity to keep track of which events have already been processed.
export default class DuplicationHandling {
  static async processIfNotDuplicate(event, processingFunction) {
    const isEventAlreadyProcessed = await this.isEventAlreadyProcessed(event);

    if (isEventAlreadyProcessed) {
      console.log(`Event ${event.id} already processed. Skipping`);
      return;
    }

    await processingFunction(event);
    await this.markEventAsProcessed(event);
  }

  static async isEventAlreadyProcessed(event) {
    const key = datastore.key(['moderatedNostrEvents', event?.id]);
    const [entity] = await datastore.get(key);
    return !!entity;
  }

  static async markEventAsProcessed(event) {
    const key = datastore.key(['moderatedNostrEvents', event?.id]);
    const data = {
      key: key,
      data: { seen: true },
    };
    await datastore.save(data);
  }
}
