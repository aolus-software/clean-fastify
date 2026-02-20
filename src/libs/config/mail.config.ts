import { bool, cleanEnv, num, str } from "envalid";

const env = cleanEnv(process.env, {
	MAIL_HOST: str({ default: "smtp.example.com" }),
	MAIL_PORT: num({ default: 587 }),
	MAIL_SECURE: bool({ default: false }),
	MAIL_FROM: str({ default: "Elysia <your_email@example.com>" }),
	MAIL_USER: str({ default: "your_email@example.com" }),
	MAIL_PASS: str({ default: "your_email_password" }),
});

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
	secure: env.MAIL_SECURE,
	from: env.MAIL_FROM,
	auth: {
		user: env.MAIL_USER,
		pass: env.MAIL_PASS,
	},
};
