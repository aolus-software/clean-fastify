# Rule: BullMQ queues and workers (`src/bull/`)

Background work runs through BullMQ on Redis. The worker is a **separate process**
(`bun run dev:worker`, `start:worker`, the compose `worker` service), not part of the API.

```
src/bull/
├── index.ts                   # worker entry: reflect-metadata, then side-effect imports of workers
├── queue/<job>.queue.ts       # one Queue per file
└── worker/<job>.worker.ts     # one Worker per file
```

Today there is one pair: `queue/send-email.queue.ts` (`sendEmailQueue`) and
`worker/send-email.worker.ts`, payload `EmailOptions` from `src/libs/mail/mail.service.ts`.

## Queue file

- Export `<job>Queue`; queue name is a kebab-case string (`"send-email"`) matching its worker.
- Connection is `RedisClient.getQueueRedisClient()` (`@database`) — never a new `IORedis(...)`.
- Type the payload at the generic: `new Queue<EmailOptions>("send-email", { connection })`.
- The email queue sets `defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 2000 } }`:
  without `attempts` BullMQ tries a job once and the worker's re-throw retries nothing. A new
  queue sets its own `attempts` the same way.

## Worker file

- Same queue name and payload type. Wrap the processor in try/catch, log success and failure with
  `logger` from `@utils`, and **re-throw** so BullMQ retries. Attach `.on("failed", ...)`.
- Run work in the requester's locale: `runWithLocale(job.data.lang ?? DEFAULT_LOCALE, ...)`.
- Delegate to a service (`EmailService`) rather than calling repositories directly.
- Register by adding `import "./worker/<job>.worker"` to `src/bull/index.ts`.

## Producing jobs

Services produce, never handlers, and always `await queue.add(...)`. A job that depends on a database
write is enqueued **after** that write's transaction commits ([mail.md](./mail.md)). Import the queue
by path: `import { sendEmailQueue } from "@bull/queue/send-email.queue"`.

## Don't

- Don't open a new Redis connection in a queue or worker file.
- Don't swallow errors in the processor.
- Don't import a worker anywhere except `src/bull/index.ts`.
- Don't log the recipient address or any token in a log message; put identifiers in the object.
