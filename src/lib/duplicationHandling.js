import { Datastore } from "@google-cloud/datastore";
import Nostr from "./nostr.js";

const datastore = new Datastore();

// If an event is already processed, we don't want to process it again. We use a Datastore entity to keep track of which events have already been processed.
export default class DuplicationHandling {
  static async processIfNotDuplicate(
    wantsManualVerification,
    event,
    processingFunction
  ) {
    const isEventAlreadyProcessed = await this.isEventAlreadyProcessed(event);

    let onlySlack = false;
    if (isEventAlreadyProcessed) {
      if (!wantsManualVerification) {
        console.log(`Event ${event.id} already processed. Skipping`);
        return;
      }

      if (await Nostr.isAlreadyFlagged(event.id)) {
        console.log(`Event ${event.id} already flagged. Skipping`);
        return;
      }
      console.log(
        `Event ${event.id} already seen but not flagged. Processing.`
      );

      // Event was already seen and not flagged but now the user requests manual verification
      onlySlack = true;
    }

    await processingFunction(event, onlySlack);
    await this.markEventAsProcessed(event);
  }

  static async isEventAlreadyProcessed(event) {
    const key = datastore.key(["moderatedNostrEvents", event?.id]);
    const [entity] = await datastore.get(key);
    return !!entity;
  }

  static async markEventAsProcessed(event) {
    const key = datastore.key(["moderatedNostrEvents", event?.id]);
    const data = {
      key: key,
      data: { seen: true },
    };
    await datastore.save(data);
  }
}
