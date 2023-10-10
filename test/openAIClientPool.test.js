import { expect } from 'chai';
import { OpenAIClientPool } from '../src/lib/openAIClientPool.js';

describe('OpenAIClientPool', () => {
  it('should distribute clients evenly', () => {
    const keys = ['key1', 'key2', 'key3'];
    const clientPool = new OpenAIClientPool(keys);
    const clientCounts = { key1: 0, key2: 0, key3: 0 };

    const ids = [
      'd6548d08b8bc5dff67004ca072d717d95537ee66c2321f4adc40f0149de93181',
      'd6548d08b8bc5dff67004ca072d717d95537ee66c2321f4adc40f0149de93182',
      'd6548d08b8bc5dff67004ca072d717d95537ee66c2321f4adc40f0149de93183',
      'd6548d08b8bc5dff67004ca072d717d95537ee66c2321f4adc40f0149de93184',
      'd6548d08b8bc5dff67004ca072d717d95537ee66c2321f4adc40f0149de93185',
      'd6548d08b8bc5dff67004ca072d717d95537ee66c2321f4adc40f0149de93186',
    ];

    ids.forEach((id) => {
      const client = clientPool.getClient(id);
      const key = client.apiKey;
      clientCounts[key]++;
    });

    expect(clientCounts.key1).to.be.closeTo(clientCounts.key2, 2);
    expect(clientCounts.key2).to.be.closeTo(clientCounts.key3, 2);
  });

  it('should map an id to the same client deterministically', () => {
    const keys = ['key1', 'key2', 'key3'];
    const clientPool = new OpenAIClientPool(keys);
    const id =
      'd6548d08b8bc5dff67004ca072d717d95537ee66c2321f4adc40f0149de93188';
    const client1 = clientPool.getClient(id);
    const client2 = clientPool.getClient(id);
    expect(client1.apiKey).to.equal(client2.apiKey);
  });

  it('should throw an error for empty keys array', () => {
    expect(() => new OpenAIClientPool([])).to.throw(
      Error,
      'Keys array cannot be empty'
    );
  });

  it('should handle invalid hex string ID gracefully', () => {
    const keys = ['key1', 'key2', 'key3'];
    const clientPool = new OpenAIClientPool(keys);
    const client = clientPool.getClient('invalid-hex-string');
    expect(client).to.be.null;
  });
});
