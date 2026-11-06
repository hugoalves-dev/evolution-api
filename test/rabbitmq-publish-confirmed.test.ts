import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ConfirmChannel } from 'amqplib/callback_api';

import { publishConfirmed } from '../src/api/integrations/event/rabbitmq/publish-confirmed';

type Ack = (error?: Error | null) => void;

function channelWithCallback(published: { options?: object; ack?: Ack }, backpressure = true) {
  return {
    publish(_exchange: string, _key: string, _content: Buffer, options: object, callback: Ack) {
      published.options = options;
      published.ack = callback;
      return backpressure;
    },
  } as unknown as ConfirmChannel;
}

test('resolves only after broker ACK and marks message persistent', async () => {
  const captured: { options?: object; ack?: Ack } = {};
  const result = publishConfirmed(channelWithCallback(captured), 'exchange', 'key', Buffer.from('test'));
  assert.deepEqual(captured.options, { persistent: true });

  let settled = false;
  void result.then(() => { settled = true; });
  await Promise.resolve();
  assert.equal(settled, false);

  captured.ack?.(null);
  await result;
  assert.equal(settled, true);
});

test('broker NACK rejects publication', async () => {
  const captured: { ack?: Ack } = {};
  const result = publishConfirmed(channelWithCallback(captured), 'exchange', 'key', Buffer.from('test'));
  captured.ack?.(new Error('broker nack'));
  await assert.rejects(result, /broker nack/);
});

test('false publish return means backpressure, not a publish failure', async () => {
  const captured: { ack?: Ack } = {};
  const result = publishConfirmed(channelWithCallback(captured, false), 'exchange', 'key', Buffer.from('test'));
  captured.ack?.(null);
  await result;
});

test('synchronous closed-channel failure rejects', async () => {
  const broken = {
    publish() { throw new Error('channel closed'); },
  } as unknown as ConfirmChannel;
  await assert.rejects(
    publishConfirmed(broken, 'exchange', 'key', Buffer.from('test')),
    /channel closed/,
  );
});
