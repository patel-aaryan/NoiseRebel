import { Pool, type QueryResult, type QueryResultRow } from "@neondatabase/serverless";

let _pool: Pool | undefined;

export function pool(): Pool {
  if (_pool) return _pool;

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  _pool = new Pool({ connectionString: url });
  return _pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: ReadonlyArray<unknown>
): Promise<QueryResult<T>> {
  return pool().query<T>(text, params as unknown[] | undefined);
}
