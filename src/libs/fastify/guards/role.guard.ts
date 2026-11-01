import { t } from "@i18n";
import { onRequestAsyncHookHandler } from "fastify";

import { ForbiddenError, UnauthorizedError } from "../error";

/** Route-level `onRequest` hook requiring every listed role (AND). `superuser` bypasses it. */
export const RoleGuard =
	(roles: string[]): onRequestAsyncHookHandler =>
	// eslint-disable-next-line @typescript-eslint/require-await
	async (request) => {
		const user = request.userInformation;
		if (!user) throw new UnauthorizedError(t("auth.authRequired"));
		if (user.roles.includes("superuser")) return;
		if (!roles.every((role) => user.roles.includes(role))) {
			throw new ForbiddenError(t("auth.accessDeniedRole"));
		}
	};
