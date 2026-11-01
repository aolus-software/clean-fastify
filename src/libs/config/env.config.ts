import {
	bool,
	cleanEnv,
	EnvError,
	host,
	makeValidator,
	num,
	port,
	str,
	url,
} from "envalid";

const JWT_SECRET_MIN_LENGTH = 32;

const PLACEHOLDER_JWT_SECRETS = new Set([
	"change-me-before-running",
	"change-me-too-before-running",
	"your_jwt_secret_here",
	"your_jwt_refresh_secret_here",
	"your-secret",
	"your-secret-key",
	"secret",
	"changeme",
]);

const jwtSecret = makeValidator<string>((input) => {
	if (PLACEHOLDER_JWT_SECRETS.has(input.trim().toLowerCase())) {
		throw new EnvError(
			"is a published placeholder; generate one with `openssl rand -base64 48`",
		);
	}
	if (input.length < JWT_SECRET_MIN_LENGTH) {
		throw new EnvError(
			`must be at least ${JWT_SECRET_MIN_LENGTH} characters; generate one with \`openssl rand -base64 48\``,
		);
	}
	return input;
});

/**
 * Every environment variable the app reads, validated once at startup. Nothing outside
 * `src/libs/config/` reads `process.env`; config objects derive from this.
 */
export const env = cleanEnv(process.env, {
	APP_NAME: str({ default: "Fastify App" }),
	APP_PORT: port({ default: 3000 }),
	APP_URL: url({ default: "http://localhost:3000" }),
	NODE_ENV: str({
		choices: ["development", "staging", "production"],
		default: "development",
	}),
	APP_TIMEZONE: str({ default: "UTC" }),
	APP_KEY: str({ default: "your-app-key" }),
	LOG_LEVEL: str({
		choices: ["info", "warn", "debug"] as const,
		default: "info",
	}),
	ENABLE_API_DOCS: bool({ default: false }),

	CLIENT_URL: url({ default: "http://localhost:3000" }),

	DATABASE_URL: str({
		default: "postgres://user:password@localhost:5432/mydb",
	}),
	DB_POOL_MIN: num({ default: 2 }),
	DB_POOL_MAX: num({ default: 10 }),
	DB_IDLE_TIMEOUT: num({ default: 30000 }),
	DB_CONNECTION_TIMEOUT: num({ default: 5000 }),

	REDIS_HOST: host({ default: "localhost" }),
	REDIS_PORT: port({ default: 6379 }),
	REDIS_PASSWORD: str({ default: "" }),
	REDIS_DB: num({ default: 0 }),

	MAIL_HOST: host({ default: "smtp.example.com" }),
	MAIL_PORT: port({ default: 587 }),
	MAIL_SECURE: str({ choices: ["true", "false"], default: "false" }),
	MAIL_FROM: str({ default: "Fastify <your_email@example.com>" }),
	MAIL_USER: str({ default: "your_email@example.com" }),
	MAIL_PASS: str({ default: "your_email_password" }),

	/**
	 * Both signing secrets are required with no default, at least 32 characters, never a known
	 * placeholder, and must differ: access tokens are verified with JWT_SECRET only and refresh
	 * tokens with JWT_REFRESH_SECRET only.
	 */
	JWT_SECRET: jwtSecret(),
	JWT_REFRESH_SECRET: jwtSecret(),

	ALLOWED_HOST: str({ default: "" }),

	CLICKHOUSE_HOST: url({ default: "http://localhost:8123" }),
	CLICKHOUSE_USER: str({ default: "default" }),
	CLICKHOUSE_PASSWORD: str({ default: "" }),
	CLICKHOUSE_DATABASE: str({ default: "default" }),
});

if (env.JWT_SECRET === env.JWT_REFRESH_SECRET) {
	throw new EnvError(
		"JWT_SECRET and JWT_REFRESH_SECRET must be different values",
	);
}
