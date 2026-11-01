import { env } from "./env.config";

interface IMailConfig {
	host: string;
	port: number;
	secure: boolean;
	from: string;
	auth: {
		user: string;
		pass: string;
	};
}

export const MailConfig: IMailConfig = {
	host: env.MAIL_HOST,
	port: env.MAIL_PORT,
	secure: env.MAIL_SECURE === "true",
	from: env.MAIL_FROM,
	auth: {
		user: env.MAIL_USER,
		pass: env.MAIL_PASS,
	},
};
