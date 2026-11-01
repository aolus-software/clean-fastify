import { AppConfig, MailConfig } from "@config";
import { DEFAULT_LOCALE, getCurrentLocale, Locale } from "@i18n";
import { logger } from "@utils";
import fs from "fs";
import path from "path";

import { transporter } from "./transport.mail";

export interface EmailOptions {
	to: string;
	subject: string;
	template?: string;
	lang?: Locale;
	variables?: Record<string, string>;
	html?: string;
	text?: string;
}

const TEMPLATES_DIR = path.join(__dirname, "templates");

function resolveTemplatePath(template: string, lang: Locale): string {
	const normalized = template.startsWith("/") ? template.slice(1) : template;
	if (lang !== DEFAULT_LOCALE) {
		const localized = path.join(TEMPLATES_DIR, `${normalized}.${lang}.html`);
		if (fs.existsSync(localized)) return localized;
	}
	return path.join(TEMPLATES_DIR, `${normalized}.html`);
}

export const EmailService = {
	async sendEmail(options: EmailOptions) {
		const lang = options.lang ?? getCurrentLocale();
		let htmlContent = options.html;

		// if the option is using template, we need to find the template and replace the key
		if (options.template) {
			try {
				const templatePath = resolveTemplatePath(options.template, lang);
				htmlContent = fs.readFileSync(templatePath, "utf-8");

				// Replace variables in template
				if (options.variables) {
					Object.entries(options.variables).forEach(([key, value]) => {
						htmlContent = htmlContent?.replace(
							new RegExp(`{{${key}}}`, "g"),
							value,
						);
					});
				}
			} catch (error) {
				throw new Error("Error when parsing the template file", {
					cause: error,
				});
			}
		}

		// update title for dev / staging
		if (AppConfig.APP_ENV !== "production") {
			options.subject = `[${AppConfig.APP_ENV.toUpperCase()}] ${options.subject}`;
		}

		const mailOptions = {
			from: MailConfig.from || "noreply@yourapp.com",
			to: options.to,
			subject: options.subject,
			html: htmlContent,
			text: options.text,
		};

		logger.info({ template: options.template, lang }, "Sending email");

		return await transporter
			.sendMail({
				...mailOptions,
			})
			.then(() => {
				logger.info({ template: options.template, lang }, "Email sent");
			})
			.catch((error: unknown) => {
				/**
				 * SMTP error messages can quote the recipient address, so only the error code
				 * and the SMTP response code are logged or passed on.
				 */
				const { code, responseCode } = (error ?? {}) as {
					code?: string;
					responseCode?: number;
				};
				logger.error(
					{ template: options.template, lang, code, responseCode },
					"Failed to send email",
				);
				throw new Error(
					`Failed to send email (${code ?? "unknown"}${responseCode ? ` ${responseCode}` : ""})`,
				);
			});
	},
};
