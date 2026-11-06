import type { ConfirmChannel } from 'amqplib/callback_api';

/**
 * Resolve only after the RabbitMQ broker confirms the publish.
 * A false return value from publish() is backpressure, NOT a NACK.
 * This does not provide a durable producer outbox or exactly-once delivery.
 */
export function publishConfirmed(
  channel: ConfirmChannel,
  exchange: string,
  routingKey: string,
  content: Buffer,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    try {
      channel.publish(exchange, routingKey, content, { persistent: true }, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}
