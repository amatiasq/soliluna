export interface Env {
  DB: D1Database;
  SYNC_HUB: DurableObjectNamespace;
  ASSETS: Fetcher;
  ENVIRONMENT?: string;
}
