import { JwtConfig } from "@config";
import type { AccessTokenPayload } from "@services";

import { app, request } from "./app";
import { SEED_PASSWORD } from "./database";

type TokenPair = { accessToken: string; refreshToken: string };

export const login = async (
	email: string,
	password: string = SEED_PASSWORD,
): Promise<TokenPair> => {
	const response = await request<TokenPair>("POST", "/auth/login", {
		body: { email, password },
	});
	if (response.status !== 200 || !response.body.data) {
		throw new Error(`Login failed for ${email}: ${response.status}`);
	}
	return response.body.data;
};

/** Signs an access token the way AuthService does, for users that cannot log in (unverified). */
export const signAccessToken = (userId: string): string => {
	const payload: AccessTokenPayload = { id: userId, type: "access" };
	return app.jwt.sign(payload, {
		key: JwtConfig.ACCESS_SECRET,
		expiresIn: JwtConfig.ACCESS_EXPIRES_IN,
	});
};
