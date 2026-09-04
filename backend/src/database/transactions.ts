export type TransactionalClient<T> = T & { $transaction?: unknown };
export type TransactionRunner<T> = (transaction: T) => Promise<unknown>;

/** Runs work in Prisma's interactive transaction API. Kept generic for unit-test doubles. */
export async function inTransaction<T extends { $transaction: (fn: (tx: T) => Promise<unknown>) => Promise<unknown> }>(
  client: T,
  work: TransactionRunner<T>,
): Promise<unknown> {
  return client.$transaction((tx) => work(tx));
}

export async function transactional<T extends { $transaction: (fn: (tx: T) => Promise<unknown>) => Promise<unknown> }, R>(
  client: T,
  work: (transaction: T) => Promise<R>,
): Promise<R> {
  return client.$transaction((tx) => work(tx)) as Promise<R>;
}
