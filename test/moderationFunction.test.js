import assert from 'assert';
import sinon from 'sinon';
import { getFunction } from '@google-cloud/functions-framework/testing';

import RateLimiting from '../src/lib/rateLimiting.js';
import OpenAI from 'openai';
import Nostr from '../src/lib/nostr.js';
import { Datastore } from '@google-cloud/datastore';

import '../index.js';

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

describe('Moderation Cloud Function', () => {
  beforeEach(async function () {
    sinon.spy(console, 'error');
    sinon.spy(console, 'log');
    sinon.stub(Nostr, 'publishNostrEvent').returns(Promise.resolve());
    sinon.stub(Datastore.prototype, 'get').resolves([]);
    sinon.stub(Datastore.prototype, 'save').resolves();
  });

  afterEach(function () {
    sinon.restore();
  });

  it('should do nothing for a valid event that is not flagged', async () => {
    sinon.stub(Nostr, 'publishModeration');
    const cloudEvent = { data: { message: {} } };
    cloudEvent.data.message = {
      data: Buffer.from(JSON.stringify(nostrEvent)).toString('base64'),
    };

    const nostrEventsPubSub = getFunction('nostrEventsPubSub');
    await nostrEventsPubSub(cloudEvent);

    assert.ok(Nostr.publishModeration.notCalled);
    Nostr.publishModeration.restore();
  });

  it('should publish a moderation event for a valid event that is flagged', async () => {
    const cloudEvent = { data: { message: {} } };
    cloudEvent.data.message = {
      data: Buffer.from(JSON.stringify(flaggedNostrEvent)).toString('base64'),
    };
    const waitMillisStub = sinon.stub(RateLimiting, 'waitMillis');
    const nostrEventsPubSub = getFunction('nostrEventsPubSub');

    await nostrEventsPubSub(cloudEvent);

    assert.ok(Nostr.publishNostrEvent.called);
    sinon.assert.calledWithMatch(Nostr.publishNostrEvent, {
      kind: 1984,
      tags: [
        ['e', sinon.match.string, 'profanity'],
        ['L', 'com.openai.ontology'],
        ['l', 'harassment', 'com.openai.ontology', sinon.match.string],
        [
          'l',
          'harassment/threatening',
          'com.openai.ontology',
          sinon.match.string,
        ],
        ['l', 'violence', 'com.openai.ontology', sinon.match.string],
      ],
    });
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
    assert.ok(Nostr.publishNostrEvent.notCalled);
  });

  xit('should detect and invalid signature', async () => {
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
    assert.ok(Nostr.publishNostrEvent.notCalled);
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
    const waitMillisStub = sinon.stub(RateLimiting, 'waitMillis');

    // Ensure the rate limit error is still thrown after being handled so that
    // we still trigger the pubsub topic subscription retry policy
    await assert.rejects(nostrEventsPubSub(cloudEvent), (error) => {
      return (
        (error.response && error.response.status === 429) ||
        new assert.AssertionError({ message: 'Expected a 429 status code' })
      );
    });

    assert.ok(Nostr.publishNostrEvent.notCalled);

    sinon.assert.calledWithMatch(
      waitMillisStub,
      sinon.match(
        (number) => typeof number === 'number' && number > 0,
        'positive number'
      )
    );
  });
});
