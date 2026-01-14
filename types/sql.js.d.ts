declare module 'sql.js' {
  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database
  }

  export interface Database {
    run(sql: string, params?: unknown[]): void
    exec(sql: string): QueryExecResult[]
    export(): Uint8Array
    close(): void
    prepare(sql: string): Statement
    getRowsModified(): number
  }

  export interface Statement {
    bind(params?: unknown[]): boolean
    step(): boolean
    get(params?: unknown[]): unknown[]
    getAsObject(params?: unknown[]): Record<string, unknown>
    free(): boolean
    reset(): void
  }

  export interface QueryExecResult {
    columns: string[]
    values: unknown[][]
  }

  export interface SqlJsConfig {
    locateFile?: (file: string) => string
    wasmBinary?: ArrayLike<number> | Buffer | null
  }

  export default function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>
}
