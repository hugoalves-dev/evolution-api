import assert from 'node:assert/strict';
import { test } from 'node:test';

import { rabbitEventEnvelope } from '../src/api/integrations/event/rabbitmq/rabbit-event-envelope';

test('does not expose the configured API key in the RabbitMQ event envelope', () => {
  const message = rabbitEventEnvelope({
    instanceName: 'watcher', event: 'messages.upsert', data: { key: { id: '42' } },
    serverUrl: 'https://example.invalid', dateTime: '2026-11-07T00:00:00Z', sender: 'sender',
    apiKey: 'secret', extra: { apikey: 'other-secret', request: 'safe' },
  });
  assert.equal('apikey' in message, false);
  assert.equal('apiKey' in message, false);
  assert.equal(message.request, 'safe');
  assert.equal(message.instance, 'watcher');
});
