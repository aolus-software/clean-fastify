import { JwtConfig } from "@config";
import fastifyJwt from "@fastify/jwt";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import fastify from "fastify";

/* The same @fastify/jwt registration and signing options src/app.ts and AuthService use. */
const app = fastify();
const userId = "550e8400-e29b-41d4-a716-446655440000";

const signAccess = (): string =>
	app.jwt.sign(
		{ id: userId, type: "access" },
		{ key: JwtConfig.ACCESS_SECRET, expiresIn: JwtConfig.ACCESS_EXPIRES_IN },
	);
const signRefresh = (): string =>
	app.jwt.sign(
		{ id: userId, type: "refresh", jti: "jti" },
		{ key: JwtConfig.REFRESH_SECRET, expiresIn: JwtConfig.REFRESH_EXPIRES_IN },
	);

beforeAll(async () => {
	await app.register(fastifyJwt, { secret: JwtConfig.ACCESS_SECRET });
	await app.ready();
});

afterAll(async () => {
	await app.close();
});

describe("JwtConfig", () => {
	test("access and refresh use different secrets and lifetimes", () => {
		expect(JwtConfig.ACCESS_SECRET).not.toBe(JwtConfig.REFRESH_SECRET);
		expect(JwtConfig.ACCESS_EXPIRES_IN).toBe("1d");
		expect(JwtConfig.REFRESH_EXPIRES_IN).toBe("7d");
		expect(JwtConfig.REFRESH_EXPIRES_IN_SECONDS).toBe(7 * 24 * 60 * 60);
	});
});

describe("token signing", () => {
	test("an access token verifies with the access secret", () => {
		const payload = app.jwt.verify<{ id: string; type: string }>(signAccess());
		expect(payload.id).toBe(userId);
		expect(payload.type).toBe("access");
	});

	test("a refresh token does not verify as a bearer token", () => {
		expect(() => app.jwt.verify(signRefresh())).toThrow();
	});

	test("an access token does not verify with the refresh secret", () => {
		expect(() =>
			app.jwt.verify(signAccess(), { key: JwtConfig.REFRESH_SECRET }),
		).toThrow();
	});

	test("a malformed token is rejected", () => {
		expect(() => app.jwt.verify("not.a.token")).toThrow();
	});
});
