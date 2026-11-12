/**
 * Runs before every test file. `bun test` sets NODE_ENV=test and loads `.env`, so the values that
 * matter are pinned here: a NODE_ENV that env.config.ts accepts, the quietest LOG_LEVEL it accepts,
 * throwaway JWT secrets, and a database and Redis db that are never the development ones.
 */
import "reflect-metadata";

process.env.NODE_ENV = "development";
process.env.LOG_LEVEL = "warn";
process.env.ENABLE_API_DOCS = "false";
process.env.DB_LOG_QUERIES = "false";
process.env.JWT_SECRET = "test-access-secret-0123456789abcdefghij";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-0123456789abcdefghij";
process.env.DATABASE_URL =
	process.env.TEST_DATABASE_URL ??
	"postgresql://postgres:postgres@localhost:5432/clean_fastify_test";
process.env.REDIS_DB = process.env.TEST_REDIS_DB ?? "15";
