/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'sql.js' {
  export interface Database {
    run(sql: string, params?: unknown[]): void;
    exec(sql: string, params?: unknown[]): QueryExecResult[];
    export(): Uint8Array;
    close(): void;
  }

  export interface QueryExecResult {
    columns: string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    values: any[][];
  }

  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number>) => Database;
  }

  export interface SqlJsConfig {
    locateFile?: (file: string) => string;
  }

  type InitSqlJs = (config?: SqlJsConfig) => Promise<SqlJsStatic>;

  const initSqlJs: InitSqlJs;
  export default initSqlJs;
}
