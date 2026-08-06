export class ConflictResolver {
  public static resolveLWW<T extends { timestamp: number }>(localRecord: T, serverRecord: T): T {
    if (localRecord.timestamp > serverRecord.timestamp) {
      return localRecord;
    }
    return serverRecord;
  }
}
