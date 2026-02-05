import { db, password_reset_tokensTable } from "@database";
import { eq } from "drizzle-orm";
import { DbTransaction } from ".";
import { injectable } from "@fastify-libs";

@injectable()
export class ForgotPasswordRepository {
	private dbInstance = db;

	get db() {
		return this.dbInstance;
	}

	getDb(tx?: DbTransaction) {
		return tx || this.dbInstance.$cache;
	}

	async create(
		data: { user_id: string; token: string },
		tx?: DbTransaction,
	): Promise<void> {
		const database = tx || this.dbInstance;
		await database.insert(password_reset_tokensTable).values({
			token: data.token,
			user_id: data.user_id,
		});
	}

	async findByToken(token: string, tx?: DbTransaction) {
		const database = tx || this.dbInstance;
		return await database.query.password_reset_tokens.findFirst({
			where: eq(password_reset_tokensTable.token, token),
		});
	}
}
