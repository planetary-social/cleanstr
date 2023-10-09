import { getFunction } from '@google-cloud/functions-framework/testing';
import { Datastore } from '@google-cloud/datastore';
import { assertDataStoreEmulatorIsRunning, resetDataStore } from './utils.js';

import assert from 'assert';
import sinon from 'sinon';
import lib from '../src/lib.js';
import { NDKEvent } from '@nostr-dev-kit/ndk';
import OpenAI from 'openai';
import '../index.js';

const datastore = new Datastore();
const nostrEvent = {
  id: '4376c65d2f232afbe9b882a35baa4f6fe8667c4e684749af565f981833ed6a65',
  pubkey: '6e468422dfb74a5738702a8823b9b28168abab8655faacb6853cd0ee15deee93',
  created_at: 1673347337,
  kind: 1,
  content:
    'Walled gardens became prisons, and nostr is the first step towards tearing down the prison walls.',
  tags: [
    ['e', '3da979448d9ba263864c4d6f14984c423a3838364ec255f03c7904b1ae77f206'],
    ['p', 'bf2376e17ba4ec269d10fcc996a4746b451152be9031fa48e74553dde5526bce'],
  ],
  sig: '908a15e46fb4d8675bab026fc230a0e3542bfade63da02d542fb78b2a8513fcd0092619a2c8c1221e581946e0191f2af505dfdf8657a414dbca329186f009262',
};

const flaggedNostrEvent = {
  id: 'd6548d08b8bc5dff67004ca072d717d95537ee66c2321f4adc40f0149de93188',
  pubkey: 'e9f36e738e6c073068f07b1851b406fe573549507ddc3c2c007b908ee23bbd52',
  created_at: 1696433268,
  kind: 1,
  content: 'I want to kill you John Doe and fuck your corpse!',
  tags: [],
  sig: '9e158221df2d0e09bbdced2910d9d06a1a2838d3281e761f019bb4ca227afdf263a0464e74252f002ca7cd5f0cff6bf84531362a778868786b8a4f9e6a7250b0',
};

describe('Function', () => {
  before(async function () {
    await assertDataStoreEmulatorIsRunning();
  });

  beforeEach(async function () {
    await resetDataStore();

    sinon.spy(console, 'error');
    sinon.spy(console, 'log');
    sinon.stub(NDKEvent.prototype, 'publish').returns(Promise.resolve());
  });

  afterEach(function () {
    sinon.restore();
  });

  it('should do nothing for a valid event that is not flagged', async () => {
    sinon.stub(lib, 'publishModeration');
    const cloudEvent = { data: { message: {} } };
    cloudEvent.data.message = {
      data: Buffer.from(JSON.stringify(nostrEvent)).toString('base64'),
    };

    const nostrEventsPubSub = getFunction('nostrEventsPubSub');
    await nostrEventsPubSub(cloudEvent);

    assert.ok(lib.publishModeration.notCalled);
    lib.publishModeration.restore();
  });

  it('should publish a moderation event for a valid event that is flagged', async () => {
    const cloudEvent = { data: { message: {} } };
    cloudEvent.data.message = {
      data: Buffer.from(JSON.stringify(flaggedNostrEvent)).toString('base64'),
    };
    const waitMillisStub = sinon.stub(lib, 'waitMillis');
    const nostrEventsPubSub = getFunction('nostrEventsPubSub');

    await nostrEventsPubSub(cloudEvent);

    assert.ok(NDKEvent.prototype.publish.called);
    sinon.assert.notCalled(waitMillisStub);
  });

  it('should detect and invalid event', async () => {
    const cloudEvent = { data: { message: {} } };
    const nEvent = { ...nostrEvent };
    delete nEvent.kind;
    cloudEvent.data.message = {
      data: Buffer.from(JSON.stringify(nEvent)).toString('base64'),
    };

    const nostrEventsPubSub = getFunction('nostrEventsPubSub');
    await nostrEventsPubSub(cloudEvent);

    assert.ok(console.error.calledWith('Invalid Nostr Event'));
    assert.ok(NDKEvent.prototype.publish.notCalled);
  });

  it('should detect and invalid signature', async () => {
    const cloudEvent = { data: { message: {} } };
    const nEvent = { ...nostrEvent };
    nEvent.id =
      '1111c65d2f232afbe9b882a35baa4f6fe8667c4e684749af565f981833ed6a65';
    cloudEvent.data.message = {
      data: Buffer.from(JSON.stringify(nEvent)).toString('base64'),
    };

    const nostrEventsPubSub = getFunction('nostrEventsPubSub');
    await nostrEventsPubSub(cloudEvent);

    assert.ok(console.error.calledWith('Invalid Nostr Event Signature'));
    assert.ok(NDKEvent.prototype.publish.notCalled);
  });

  it('should add jitter pause after a rate limit error', async () => {
    const cloudEvent = { data: { message: {} } };
    const nEvent = { ...nostrEvent };
    cloudEvent.data.message = {
      data: Buffer.from(JSON.stringify(nEvent)).toString('base64'),
    };

    const nostrEventsPubSub = getFunction('nostrEventsPubSub');
    const createModerationStub = sinon
      .stub(OpenAI.Moderations.prototype, 'create')
      .rejects({
        response: {
          status: 429,
        },
      });
    const waitMillisStub = sinon.stub(lib, 'waitMillis');

    // Ensure the rate limit error is still thrown after being handled so that
    // we still trigger the pubsub topic subscription retry policy
    await assert.rejects(nostrEventsPubSub(cloudEvent), (error) => {
      return (
        (error.response && error.response.status === 429) ||
        new assert.AssertionError({ message: 'Expected a 429 status code' })
      );
    });

    assert.ok(NDKEvent.prototype.publish.notCalled);

    sinon.assert.calledWithMatch(
      waitMillisStub,
      sinon.match(
        (number) => typeof number === 'number' && number > 0,
        'positive number'
      )
    );
  });
});
