import supertest from 'supertest';
import * as functionsFramework from '@google-cloud/functions-framework/testing';
import { assertDataStoreEmulatorIsRunning, resetDataStore } from './utils.js';
import '../index.js';

const flaggedNostrEvent = {
  id: 'd6548d08b8bc5dff67004ca072d717d95537ee66c2321f4adc40f0149de93188',
  pubkey: 'e9f36e738e6c073068f07b1851b406fe573549507ddc3c2c007b908ee23bbd52',
  created_at: 1696433268,
  kind: 1,
  content: 'I want to kill you John Doe and fuck your corpse!',
  tags: [],
  sig: '9e158221df2d0e09bbdced2910d9d06a1a2838d3281e761f019bb4ca227afdf263a0464e74252f002ca7cd5f0cff6bf84531362a778868786b8a4f9e6a7250b0',
};

describe('Endpoint', function () {
  this.timeout(5000);

  before(async function () {
    await assertDataStoreEmulatorIsRunning();
  });

  beforeEach(async function () {
    await resetDataStore();
  });

  it('should process a CloudEvent containing a valid nostr Event', async () => {
    const cloudEventData = { data: { message: {} } };

    cloudEventData.data.message = {
      data: Buffer.from(JSON.stringify({ ...flaggedNostrEvent })).toString(
        'base64'
      ),
    };

    const server = functionsFramework.getTestServer('nostrEventsPubSub');
    await supertest(server)
      .post('/')
      .send(cloudEventData)
      .set('Content-Type', 'application/json')
      .expect(204);
  });
});
