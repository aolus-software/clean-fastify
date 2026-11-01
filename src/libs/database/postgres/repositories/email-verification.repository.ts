import { db, email_verificationsTable, EmailVerification } from "@database";
import { injectable } from "@fastify-libs";
import { and, eq, isNull } from "drizzle-orm";

import { DbTransaction } from ".";

@injectable()
export class EmailVerificationRepository {
	private dbInstance = db;

	async create(
		data: { user_id: string; token: string; expired_at: Date },
		tx?: DbTransaction,
	): Promise<void> {
		const database = tx || this.dbInstance;
		await database.insert(email_verificationsTable).values(data);
	}

	async findByToken(
		token: string,
		tx?: DbTransaction,
	): Promise<EmailVerification | null> {
		const database = tx || this.dbInstance;
		const row = await database.query.email_verifications.findFirst({
			where: eq(email_verificationsTable.token, token),
		});
		return row ?? null;
	}

	async spendAllForUser(userId: string, tx?: DbTransaction): Promise<void> {
		const database = tx || this.dbInstance;
		await database
			.update(email_verificationsTable)
			.set({ used_at: new Date() })
			.where(
				and(
					eq(email_verificationsTable.user_id, userId),
					isNull(email_verificationsTable.used_at),
				),
			);
	}
}
