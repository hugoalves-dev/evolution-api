import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ConfirmChannel } from 'amqplib/callback_api';

import { ensureTopology } from '../src/api/integrations/event/rabbitmq/ensure-topology';

test('waits for exchange, durable queue and binding confirmations in order', async () => {
  const steps: string[] = [];
  const callbacks: Array<(error: Error | null) => void> = [];
  const channel = {
    assertExchange(_name: string, _type: string, options: any, cb: (error: Error | null) => void) {
      assert.equal(options.durable, true);
      steps.push('exchange'); callbacks.push(cb);
    },
    assertQueue(_name: string, options: any, cb: (error: Error | null) => void) {
      assert.equal(options.durable, true);
      steps.push('queue'); callbacks.push(cb);
    },
    bindQueue(_queue: string, _exchange: string, route: string, _options: any, cb: (error: Error | null) => void) {
      assert.equal(route, 'messages.upsert');
      steps.push('binding'); callbacks.push(cb);
    },
  } as unknown as ConfirmChannel;
  const result = ensureTopology(channel, 'events', 'queue', 'messages.upsert');
  assert.deepEqual(steps, ['exchange']);
  callbacks[0](null); await Promise.resolve();
  assert.deepEqual(steps, ['exchange', 'queue']);
  callbacks[1](null); await Promise.resolve();
  assert.deepEqual(steps, ['exchange', 'queue', 'binding']);
  callbacks[2](null); await result;
});

test('does not publish through a failed binding', async () => {
  const channel = {
    assertExchange(_n: string, _t: string, _o: any, cb: (error: Error | null) => void) { cb(null); },
    assertQueue(_n: string, _o: any, cb: (error: Error | null) => void) { cb(null); },
    bindQueue(_q: string, _e: string, _r: string, _o: any, cb: (error: Error | null) => void) {
      cb(new Error('binding denied'));
    },
  } as unknown as ConfirmChannel;
  await assert.rejects(ensureTopology(channel, 'events', 'queue', 'messages.upsert'), /binding denied/);
});
