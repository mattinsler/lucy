import { EventEmitter } from 'events';
import { Capabilities } from 'fb-watchman';

// fields

export interface FieldType {
  name: string;
  exists: boolean;
  cclock: string;
  oclock: string;
  ctime: string;
  ctime_ms: number;
  ctime_us: number;
  ctime_ns: number;
  ctime_f: number;
  mtime: string;
  mtime_ms: number;
  mtime_us: number;
  mtime_ns: number;
  mtime_f: number;
  size: number;
  mode: number;
  uid: number;
  gid: number;
  ino: number;
  dev: string;
  nlink: string;
  new: boolean;
  type: FileType;
  symlink_target: string;
  'content.sha1hex': string;
}

export type FieldName = keyof FieldType;

// files

type KVPair = { k: PropertyKey; v: unknown };
type Objectify<T extends KVPair> = {
  [k in T['k']]: Extract<T, { k: k }>['v'];
};

type Unionize<T extends object> = {
  [k in keyof T]: { k: k; v: T[k] };
}[keyof T];

export type File<F extends FieldName> = Objectify<FieldType['name'] & Extract<Unionize<FieldType>, { k: F }>>;

// expressions

export type Scope = 'basename' | 'filename' | 'wholename';
export type FileType =
  | 'b' // block special file
  | 'c' // character special file
  | 'd' // directory
  | 'f' // regular file
  | 'p' // named pipe (fifo)
  | 'l' // symbolic link
  | 's' // socket
  | 'D'; // Solaris Door

export type AllofExpression = ['allof', ...Expression[]];
export type AnyofExpression = ['anyof', ...Expression[]];
export type DirnameExpression = [
  'dirname' | 'idirname',
  string,
  ['depth', 'eq' | 'ne' | 'gt' | 'ge' | 'lt' | 'le', number]?
];
export type EmptyExpression = ['empty'];
export type ExistsExpression = ['exists'];
export type MatchExpressionOptions = { includedotfiles?: true; noescape?: true };
export type MatchExpression =
  | ['match' | 'imatch', string]
  | ['match' | 'imatch', string, Scope, MatchExpressionOptions?];
export type NameExpression = ['name' | 'iname', string | string[], Scope?];
export type NotExpression = ['not', Expression];
export type PcreExpression = ['pcre' | 'ipcre', string, Scope?];
export type SinceExpression =
  // ['since', string] is implicitly oclock
  ['since', string] | ['since', number, 'mtime' | 'ctime'] | ['since', string | number, 'oclock' | 'cclock'];
export type SizeExpression = ['size', 'eq' | 'ne' | 'gt' | 'ge' | 'lt' | 'le', number];
export type SuffixExpression = ['suffix', string];
// suffix-set, since 5.0
// type SuffixExpression = ['suffix', ...string[]];
export type TypeExpression = ['type', FileType];

export type Expression =
  | AllofExpression
  | AnyofExpression
  | DirnameExpression
  | EmptyExpression
  | ExistsExpression
  | MatchExpression
  | NameExpression
  | NotExpression
  | PcreExpression
  | SinceExpression
  | SizeExpression
  | SuffixExpression
  | TypeExpression;

export interface Query<Fields extends FieldName> {
  expression?: Expression;
  fields?: Fields[];
  relative_root?: string;
  since?: string;
}

export interface QueryResult<Fields extends FieldName> {
  files: File<Fields>[];
  clock: string;
  is_fresh_instance: boolean;
  version: string;
}

export interface SubscriptionEvent<F extends FieldName> {
  unilateral: boolean;
  subscription: string;
  root: string;
  files: File<F>[];
  version: string;
  since: string;
  clock: string;
  is_fresh_instance: boolean;
}

export interface Subscription<F extends FieldName>
  extends Pick<
    EventEmitter,
    | 'eventNames'
    | 'getMaxListeners'
    | 'listeners'
    | 'listenerCount'
    | 'rawListeners'
    | 'removeAllListeners'
    | 'setMaxListeners'
  > {
  addListener(event: 'data', listener: (data: SubscriptionEvent<F>) => void): this;
  on(event: 'data', listener: (data: SubscriptionEvent<F>) => void): this;
  once(event: 'data', listener: (data: SubscriptionEvent<F>) => void): this;
  removeListener(event: 'data', listener: (data: SubscriptionEvent<F>) => void): this;
  off(event: 'data', listener: (data: SubscriptionEvent<F>) => void): this;
  emit(event: 'data', data: SubscriptionEvent<F>): boolean;
  prependListener(event: 'data', listener: (data: SubscriptionEvent<F>) => void): this;
  prependOnceListener(event: 'data', listener: (data: SubscriptionEvent<F>) => void): this;

  end(): void;

  readonly subscriptionName: string;
}

export interface WatchListResult {
  roots: string[];
  version: string;
}

export interface WatchProjectResult {
  relative_path?: string;
  warning?: string;
  watch: string;
  watcher: string;
  version: string;
}

type DefaultFields = 'name' | 'exists' | 'new' | 'size' | 'mode';

export interface WatchmanClientInterface {
  // returns the watchman version
  connect(capabilities?: Capabilities): Promise<string>;
  end(): Promise<void>;
  query<Fields extends FieldName = DefaultFields>(root: string, query: Query<Fields>): Promise<QueryResult<Fields>>;
  setLogLevel(level: 'debug' | 'error' | 'off'): Promise<void>;
  subscribe<Fields extends FieldName = DefaultFields>(
    root: string,
    query: Query<Fields>,
    name?: string
  ): Promise<Subscription<Fields>>;
  watchList(): Promise<WatchListResult>;
  watchProject(root: string): Promise<WatchProjectResult>;
}
