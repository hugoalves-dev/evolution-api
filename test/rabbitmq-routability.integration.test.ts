import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as amqp from 'amqplib/callback_api';

import { publishConfirmed } from '../src/api/integrations/event/rabbitmq/publish-confirmed';

const url = process.env.TEST_RABBITMQ_URL;

test('real broker confirms routed messages and returns unroutable ones', { skip: !url }, async () => {
  const connection = await new Promise<amqp.Connection>((resolve, reject) => {
    amqp.connect(url!, (error, value) => error ? reject(error) : resolve(value));
  });
  const channel = await new Promise<amqp.ConfirmChannel>((resolve, reject) => {
    connection.createConfirmChannel((error, value) => error ? reject(error) : resolve(value));
  });
  try {
    const exchange = `watcher.test.${Date.now()}`;
    await new Promise<void>((resolve, reject) => {
      channel.assertExchange(exchange, 'direct', { durable: true }, (error) => error ? reject(error) : resolve());
    });
    const queue = await new Promise<string>((resolve, reject) => {
      channel.assertQueue('', { exclusive: true }, (error, value) => error ? reject(error) : resolve(value.queue));
    });
    await new Promise<void>((resolve, reject) => {
      channel.bindQueue(queue, exchange, 'routed', {}, (error) => error ? reject(error) : resolve());
    });
    await publishConfirmed(channel, exchange, 'routed', Buffer.from('routed'), 'event-42');
    const message = await new Promise<amqp.GetMessage | false>((resolve, reject) => {
      channel.get(queue, { noAck: true }, (error, value) => error ? reject(error) : resolve(value));
    });
    assert.ok(message);
    assert.equal(message.content.toString(), 'routed');
    assert.equal(message.properties.deliveryMode, 2);
    assert.equal(message.properties.messageId, 'event-42');
    await assert.rejects(publishConfirmed(channel, exchange, 'missing', Buffer.from('unroutable')), /unroutable/i);
    await new Promise<void>((resolve, reject) => {
      channel.deleteExchange(exchange, {}, (error) => error ? reject(error) : resolve());
    });
  } finally {
    await new Promise<void>((resolve) => channel.close(() => resolve()));
    await new Promise<void>((resolve) => connection.close(() => resolve()));
  }
});
