import { t } from "@i18n";
import { onRequestAsyncHookHandler } from "fastify";

import { ForbiddenError, UnauthorizedError } from "../error";

/**
 * Route-level `onRequest` hook requiring every listed permission (AND). `superuser` bypasses it.
 * It throws, so a refused request never reaches validation or the handler. It must run after
 * the module's `authenticate` hook, which is what puts `userInformation` on the request.
 */
export const PermissionGuard =
	(permissions: string[]): onRequestAsyncHookHandler =>
	// eslint-disable-next-line @typescript-eslint/require-await
	async (request) => {
		const user = request.userInformation;
		if (!user) throw new UnauthorizedError(t("auth.authRequired"));
		if (user.roles.includes("superuser")) return;
		if (!permissions.every((p) => user.permissions.includes(p))) {
			throw new ForbiddenError(t("auth.accessDeniedPermission"));
		}
	};
