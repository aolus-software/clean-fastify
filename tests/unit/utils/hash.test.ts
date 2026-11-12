import { Hash } from "@utils";
import { describe, expect, test } from "bun:test";

describe("Hash", () => {
	test("verifies the original value and rejects another", async () => {
		const hash = await Hash.generateHash("S3crEtP4ssw0rd!");
		expect(hash).not.toBe("S3crEtP4ssw0rd!");
		expect(await Hash.compareHash("S3crEtP4ssw0rd!", hash)).toBe(true);
		expect(await Hash.compareHash("wrong", hash)).toBe(false);
	});
});
