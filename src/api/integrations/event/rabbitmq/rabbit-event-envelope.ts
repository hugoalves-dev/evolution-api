import type { EmitData } from '../event.controller';

type EnvelopeInput = Pick<
  EmitData,
  'instanceName' | 'event' | 'data' | 'serverUrl' | 'dateTime' | 'sender' | 'apiKey' | 'extra'
>;

/** The API key must not be sent to RabbitMQ consumers or included in event logs. */
export function rabbitEventEnvelope(input: EnvelopeInput): Record<string, unknown> {
  const extra = Object.fromEntries(Object.entries(input.extra ?? {}).filter(([key]) => key.toLowerCase() !== 'apikey'));
  return {
    ...extra,
    event: input.event,
    instance: input.instanceName,
    data: input.data,
    server_url: input.serverUrl,
    date_time: input.dateTime,
    sender: input.sender,
  };
}
