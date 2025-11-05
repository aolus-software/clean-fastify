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
	host: process.env.MAIL_HOST || "smtp.example.com",
	port: process.env.MAIL_PORT ? parseInt(process.env.MAIL_PORT, 10) : 587,
	secure: process.env.MAIL_SECURE === "true",
	from: process.env.MAIL_FROM || "Elysia <your_email@example.com>",
	auth: {
		user: process.env.MAIL_USER || "your_email@example.com",
		pass: process.env.MAIL_PASS || "your_email_password",
	},
};
