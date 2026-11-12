import type { EmailOptions } from "@libs/mail/mail.service";
import { mock } from "bun:test";

export const queuedMails: EmailOptions[] = [];

/* Importing the real queue opens a BullMQ connection; tests capture jobs instead. */
await mock.module("@bull/queue/send-email.queue", () => ({
	sendEmailQueue: {
		add: (_name: string, data: EmailOptions): Promise<void> => {
			queuedMails.push(data);
			return Promise.resolve();
		},
	},
}));

const { createAppInstance } = await import("../../src/app");

export const app = createAppInstance();
await app.ready();

type JsonBody = Record<string, unknown>;

export type TestResponse<T = unknown> = {
	status: number;
	body: {
		status: number;
		success: boolean;
		message: string;
		data?: T;
		errors?: { field: string; message: string }[];
	};
};

export const request = async <T = unknown>(
	method: "GET" | "POST" | "PATCH" | "DELETE",
	url: string,
	options: { body?: JsonBody; token?: string } = {},
): Promise<TestResponse<T>> => {
	const headers: Record<string, string> = {};
	if (options.token) headers.authorization = `Bearer ${options.token}`;

	const response = await app.inject({
		method,
		url,
		headers,
		payload: options.body,
	});
	return {
		status: response.statusCode,
		body: response.json<TestResponse<T>["body"]>(),
	};
};
