import { db, password_reset_tokensTable, PasswordResetToken } from "@database";
import { injectable } from "@fastify-libs";
import { and, eq, isNull } from "drizzle-orm";

import { DbTransaction } from ".";

@injectable()
export class ForgotPasswordRepository {
	private dbInstance = db;

	async create(
		data: { user_id: string; token: string; expired_at: Date },
		tx?: DbTransaction,
	): Promise<void> {
		const database = tx || this.dbInstance;
		await database.insert(password_reset_tokensTable).values(data);
	}

	async findByToken(
		token: string,
		tx?: DbTransaction,
	): Promise<PasswordResetToken | null> {
		const database = tx || this.dbInstance;
		const row = await database.query.password_reset_tokens.findFirst({
			where: eq(password_reset_tokensTable.token, token),
		});
		return row ?? null;
	}

	async spendAllForUser(userId: string, tx?: DbTransaction): Promise<void> {
		const database = tx || this.dbInstance;
		await database
			.update(password_reset_tokensTable)
			.set({ used_at: new Date() })
			.where(
				and(
					eq(password_reset_tokensTable.user_id, userId),
					isNull(password_reset_tokensTable.used_at),
				),
			);
	}
}
