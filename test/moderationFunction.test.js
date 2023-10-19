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

const reportNostrEvent = {
  id: '080035e9e745ee5f58d1f0d1704a8c77d2008335e3f21f395b4b8f73af8845ba',
  pubkey: 'e9f36e738e6c073068f07b1851b406fe573549507ddc3c2c007b908ee23bbd52',
  created_at: 1697540521,
  kind: 1984,
  content: 'Hateful!',
  tags: [
    [
      'e',
      'd6548d08b8bc5dff67004ca072d717d95537ee66c2321f4adc40f0149de93188',
      'profanity',
    ],
    ['L', 'MOD'],
    ['l', 'hate', 'MOD', '{"confidence":0.7413473725318909}'],
    ['l', 'harassment', 'MOD', '{"confidence":0.9882562756538391}'],
  ],
  sig: 'df77b254f086ba6065ee2ff828601c84836bf6df13a59e0dc49e01b828e3da08cd184c18c26e85736f17ff39241eef894ceae25de1402b2c5ff5432ec656908d',
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
    const cloudEvent = {
      data: {
        message: {
          data: Buffer.from(JSON.stringify(nostrEvent)).toString('base64'),
        },
      },
    };

    const nostrEventsPubSub = getFunction('nostrEventsPubSub');
    await nostrEventsPubSub(cloudEvent);

    assert.ok(Nostr.publishModeration.notCalled);
    Nostr.publishModeration.restore();
  });

  it('should publish a report event for a valid event that is flagged', async () => {
    const cloudEvent = {
      data: {
        message: {
          data: Buffer.from(JSON.stringify(flaggedNostrEvent)).toString(
            'base64'
          ),
        },
      },
    };

    const waitMillisStub = sinon.stub(RateLimiting, 'waitMillis');

    sinon.stub(OpenAI.Moderations.prototype, 'create').resolves({
      results: [
        {
          flagged: true,
          categories: {
            sexual: false,
            hate: true,
            harassment: true,
            'self-harm': false,
            'sexual/minors': false,
            'hate/threatening': false,
            'violence/graphic': false,
            'self-harm/intent': false,
            'self-harm/instructions': false,
            'harassment/threatening': false,
            violence: false,
          },
          category_scores: {
            sexual: 0.0008905100985430181,
            hate: 0.7413473725318909,
            harassment: 0.9882562756538391,
            'self-harm': 0.000020246614440111443,
            'sexual/minors': 0.000046280372771434486,
            'hate/threatening': 0.000006213878805283457,
            'violence/graphic': 0.000014815827853453811,
            'self-harm/intent': 0.00004021823042421602,
            'self-harm/instructions': 0.000009193716323352419,
            'harassment/threatening': 0.0007776615675538778,
            violence: 0.00004086320041096769,
          },
        },
      ],
    });

    const nostrEventsPubSub = getFunction('nostrEventsPubSub');
    await nostrEventsPubSub(cloudEvent);

    assert.ok(Nostr.publishNostrEvent.called);
    sinon.assert.calledWithMatch(Nostr.publishNostrEvent, {
      kind: 1984,
      tags: [
        ['e', flaggedNostrEvent.id, 'illegal'],
        ['L', 'MOD'],
        ['l', 'IH', 'MOD', sinon.match.string],
        ['l', 'IL-har', 'MOD', sinon.match.string],
      ],
    });
    sinon.assert.notCalled(waitMillisStub);
  });

  it('should publish a labeling event for a valid report event that is flagged', async () => {
    const cloudEvent = {
      data: {
        message: {
          data: Buffer.from(JSON.stringify(reportNostrEvent)).toString(
            'base64'
          ),
        },
      },
    };

    const waitMillisStub = sinon.stub(RateLimiting, 'waitMillis');

    sinon.stub(OpenAI.Moderations.prototype, 'create').resolves({
      results: [
        {
          flagged: true,
          categories: {
            sexual: false,
            hate: true,
            harassment: true,
            'self-harm': false,
            'sexual/minors': false,
            'hate/threatening': false,
            'violence/graphic': false,
            'self-harm/intent': false,
            'self-harm/instructions': false,
            'harassment/threatening': false,
            violence: false,
          },
          category_scores: {
            sexual: 0.0008905100985430181,
            hate: 0.7413473725318909,
            harassment: 0.9882562756538391,
            'self-harm': 0.000020246614440111443,
            'sexual/minors': 0.000046280372771434486,
            'hate/threatening': 0.000006213878805283457,
            'violence/graphic': 0.000014815827853453811,
            'self-harm/intent': 0.00004021823042421602,
            'self-harm/instructions': 0.000009193716323352419,
            'harassment/threatening': 0.0007776615675538778,
            violence: 0.00004086320041096769,
          },
        },
      ],
    });

    const nostrEventsPubSub = getFunction('nostrEventsPubSub');
    await nostrEventsPubSub(cloudEvent);

    assert.ok(Nostr.publishNostrEvent.called);
    sinon.assert.calledWithMatch(Nostr.publishNostrEvent, {
      kind: 1985,
      tags: [
        ['e', flaggedNostrEvent.id, sinon.match('wss://')],
        ['L', 'MOD'],
        ['l', 'IH', 'MOD', sinon.match.string],
        ['l', 'IL-har', 'MOD', sinon.match.string],
      ],
    });
    sinon.assert.notCalled(waitMillisStub);
  });

  it('should detect and invalid event', async () => {
    const invalidNostrEvent = { ...nostrEvent };
    delete invalidNostrEvent.kind;
    const cloudEvent = {
      data: {
        message: {
          data: Buffer.from(JSON.stringify(invalidNostrEvent)).toString(
            'base64'
          ),
        },
      },
    };

    const nostrEventsPubSub = getFunction('nostrEventsPubSub');
    await nostrEventsPubSub(cloudEvent);

    assert.ok(console.error.calledWith('Invalid Nostr Event'));
    assert.ok(Nostr.publishNostrEvent.notCalled);
  });

  xit('should detect and invalid signature', async () => {
    const nEvent = { ...nostrEvent };
    nEvent.id =
      '1111c65d2f232afbe9b882a35baa4f6fe8667c4e684749af565f981833ed6a65';
    const cloudEvent = {
      data: {
        message: {
          data: Buffer.from(JSON.stringify(nEvent)).toString('base64'),
        },
      },
    };

    const nostrEventsPubSub = getFunction('nostrEventsPubSub');
    await nostrEventsPubSub(cloudEvent);

    assert.ok(console.error.calledWith('Invalid Nostr Event Signature'));
    assert.ok(Nostr.publishNostrEvent.notCalled);
  });

  it('should add jitter pause after a rate limit error', async () => {
    const nEvent = { ...nostrEvent };
    const cloudEvent = {
      data: {
        message: {
          data: Buffer.from(JSON.stringify(nEvent)).toString('base64'),
        },
      },
    };

    const nostrEventsPubSub = getFunction('nostrEventsPubSub');
    sinon.stub(OpenAI.Moderations.prototype, 'create').rejects({
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
