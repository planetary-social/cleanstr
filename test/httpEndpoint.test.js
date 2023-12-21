import supertest from 'supertest';
import sinon from 'sinon';
import Nostr from '../src/lib/nostr.js';
import OpenAI from 'openai';
import { Datastore } from '@google-cloud/datastore';
import * as functionsFramework from '@google-cloud/functions-framework/testing';
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

describe('HTTP Endpoint', function () {
  this.timeout(5000);

  beforeEach(async function () {
    sinon.stub(OpenAI.Moderations.prototype, 'create').resolves({
      results: [
        {
          flagged: true,
          categories: {
            sexual: true,
            hate: false,
            harassment: false,
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
            sexual: 0.8905100985430181,
            hate: 0.000,
            harassment: 0.000,
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
    sinon.stub(Nostr, 'publishNostrEvent').returns(Promise.resolve());
    sinon.stub(Datastore.prototype, 'get').resolves([]);
    sinon.stub(Datastore.prototype, 'save').resolves();

  });

  afterEach(function () {
    sinon.restore();
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
