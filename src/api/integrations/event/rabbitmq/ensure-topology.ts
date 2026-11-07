import type { ConfirmChannel } from 'amqplib/callback_api';

/** Wait for each declaration before a confirmed publish is attempted. */
export async function ensureTopology(
  channel: ConfirmChannel,
  exchange: string,
  queue: string,
  route: string,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    channel.assertExchange(exchange, 'topic', { durable: true, autoDelete: false }, (error) =>
      error ? reject(error) : resolve(),
    );
  });
  await new Promise<void>((resolve, reject) => {
    channel.assertQueue(
      queue,
      { durable: true, autoDelete: false, arguments: { 'x-queue-type': 'quorum' } },
      (error) => (error ? reject(error) : resolve()),
    );
  });
  await new Promise<void>((resolve, reject) => {
    channel.bindQueue(queue, exchange, route, {}, (error) => (error ? reject(error) : resolve()));
  });
}
