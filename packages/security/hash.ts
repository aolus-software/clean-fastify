import * as bcrypt from "bcryptjs";

export class Hash {
	static async generateHash(value: string): Promise<string> {
		const saltRounds = 10;
		return await bcrypt.hash(value, saltRounds);
	}

	static async compareHash(value: string, hash: string): Promise<boolean> {
		return await bcrypt.compare(value, hash);
	}
}
