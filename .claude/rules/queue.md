# Rule: BullMQ queues and workers (`src/bull/`)

Background work runs through BullMQ on Redis. The worker is a **separate process** (`bun run dev:worker` / `start:worker`), not part of the API process. Layout:

```
src/bull/
├── index.ts                   # entry point: imports each worker for side effects
├── queue/
│   └── <feature>.queue.ts     # one Queue per file
└── worker/
    └── <feature>.worker.ts    # one Worker per file
```

`src/bull/index.ts` imports `./worker/<feature>.worker` **for its side effects** — instantiating the `new Worker(...)` is what registers it with Redis. When you add a new worker, you must add its import to `src/bull/index.ts`, or it won't run.

The worker process imports `"reflect-metadata"` first (so tsyringe metadata is available if a worker resolves a service via the container). Keep that import in `src/bull/index.ts`.

## Queue file

- One queue per file under `src/bull/queue/`. Filename: `<feature>.queue.ts`. Export name: `<feature>Queue` (camelCase).
- Connection comes from `RedisClient.getQueueRedisClient()` (`@database`) — **never** `new IORedis(...)` directly. Queues and workers share that singleton so they hit the same Redis DB BullMQ expects.
- Queue name is a kebab-case string (`"send-email"`) and **must match** between the queue and its worker.
- Type the payload at the `Queue` generic level: `new Queue<EmailOptions>("send-email", { connection: queueRedis })`. Export the payload type from `@types` (or co-locate with the underlying service that owns the shape).
- Set `defaultJobOptions` when retries matter:
  ```ts
  new Queue<EmailOptions>("send-email", {
  	connection: queueRedis,
  	defaultJobOptions: {
  		attempts: 3,
  		backoff: { type: "exponential", delay: 2000 },
  	},
  });
  ```

## Worker file

- One worker per queue under `src/bull/worker/`. Filename matches: `<feature>.worker.ts`.
- Same queue name and same payload type as the queue:

  ```ts
  import { RedisClient } from "@database";
  import { logger } from "@utils";
  import { Worker } from "bullmq";

  const queueRedis = RedisClient.getQueueRedisClient();

  const worker = new Worker<EmailOptions>(
  	"send-email",
  	async (job) => {
  		try {
  			await EmailService.sendEmail(job.data);
  			logger.info({}, `Email job processed for ${job.data.to}`);
  		} catch (error) {
  			logger.error(error, `Failed to process email job for ${job.data.to}`);
  			throw error;
  		}
  	},
  	{ connection: queueRedis },
  );

  worker.on("failed", (job, err) => {
  	logger.error(err, `Job ${job ? job.id : "unknown"} failed`);
  });

  export { worker };
  ```

- The processor function **must** wrap its work in try/catch, log both success and failure with structured `logger` from `@utils`, and **re-throw** on failure so BullMQ retries.
- Attach a `.on("failed", ...)` handler — that's the catch-all if all attempts fail.
- Workers do **not** call repositories directly when the same logic lives in a service. They delegate to a service (`EmailService`, `<Feature>Service`) so business rules stay in one place. If the service is `@injectable()` and has dependencies, resolve it once at module top via `container.resolve(EmailService)`.

## Producing jobs

Services produce, never route handlers:

```ts
import { sendEmailQueue } from "@bull/queue/send-email.queue";

await sendEmailQueue.add("welcome", { to: user.email, subject: "Welcome", ... });
```

First arg is the job name (free-form, used for filtering in dashboards); second is the typed payload. Always `await` `.add(...)` — `@typescript-eslint/no-floating-promises` is an error.

## Wiring up a new queue

1. Add `src/bull/queue/<feature>.queue.ts` — instantiate `new Queue<Payload>("kebab-name", { connection })`.
2. Add `src/bull/worker/<feature>.worker.ts` — `new Worker<Payload>("kebab-name", processor, { connection })`.
3. Define the payload type once (e.g. in `@types` or the producing service) and reuse it on both sides.
4. Add `import "./worker/<feature>.worker"` to `src/bull/index.ts` so the worker registers when the worker process boots.
5. Producer-side: import the queue and `.add(...)` from inside a service.

## Don't

- Don't open a new Redis client inside a queue or worker file. Reuse `RedisClient.getQueueRedisClient()`.
- Don't swallow errors inside the worker processor — log and re-throw so BullMQ retries with backoff.
- Don't run blocking, multi-minute jobs without setting an explicit `lockDuration` — the default lease will expire and BullMQ will redeliver the job.
- Don't import a worker file from anywhere except `src/bull/index.ts`. Workers are not utilities; they're side effects of the worker process.
- Don't share a single concrete `Worker` between two queue names. Each queue gets its own `Worker` instance.
