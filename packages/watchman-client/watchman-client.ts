import crypto from 'crypto';
import watchman from 'fb-watchman';
import { EventEmitter } from 'events';

import {
  FieldName,
  Query,
  QueryResult,
  Subscription as SubscriptionInterface,
  SubscriptionEvent,
  WatchmanClientInterface,
  WatchListResult,
  WatchProjectResult,
} from './types';

interface LogEvent {
  level: 'debug' | 'error' | 'off';
  log: string;
  unilateral: boolean;
}

let SUBSCRIPTION_ID = 0;

class Subscription<F extends FieldName> extends EventEmitter implements SubscriptionInterface<F> {
  private readonly onEnd: () => unknown;
  readonly id: number;
  readonly subscriptionName: string;

  constructor(id: number, name: string, onEnd: () => unknown) {
    super();

    this.id = id;
    this.subscriptionName = name;
    this.onEnd = onEnd;
  }

  end() {
    this.removeAllListeners();
    this.onEnd();
  }
}

let singleton: WatchmanClient;

export class WatchmanClient implements WatchmanClientInterface {
  private client?: watchman.Client;
  private connectPromise?: Promise<string>;
  private endPromise?: Promise<void>;

  private subscriptions: { [name: string]: Subscription<FieldName>[] } = {};
  private watchedProjects: { [root: string]: WatchProjectResult } = {};

  constructor() {
    if (!singleton) {
      singleton = this;
    }
    return singleton;
  }

  private onLogEvent = (info: LogEvent) => {
    console.log(`[${info.level}] ${info.log.trimRight()}`);
  };

  private onSubscriptionEvent = (event: SubscriptionEvent<any>) => {
    const subscriptions = this.subscriptions[event.subscription];
    (subscriptions || []).forEach((sub) => sub.emit('data', event));
  };

  private commandAsync<T>(...args: any[]): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (!this.client) {
        return reject(new Error('Not connected'));
      }

      this.client!.command(args, (err, result) => (err ? reject(err) : resolve(result)));
    });
  }

  connect(capabilities: watchman.Capabilities = { optional: [], required: [] }): Promise<string> {
    if (!this.client) {
      this.client = new watchman.Client();

      this.connectPromise = new Promise((resolve, reject) => {
        this.client!.once('error', reject);
        this.client!.once('connect', () => {
          this.client!.off('error', reject);
          this.client!.on('error', (err) => {
            console.log(err.stack);
          });
        });

        this.client!.capabilityCheck(capabilities, (err, result) => {
          if (err) {
            this.client!.end();
            return reject(err);
          }

          resolve(result.version);
        });
      });

      this.client.on('log', this.onLogEvent);
      this.client.on('subscription', this.onSubscriptionEvent);
    }

    return this.connectPromise!;
  }

  end(): Promise<void> {
    if (this.client) {
      if (!this.endPromise) {
        this.endPromise = new Promise((resolve) => {
          this.client!.once('end', () => {
            delete this.client;
            delete this.connectPromise;
            delete this.endPromise;
            resolve();
          });
          this.client!.end();
        });
      }

      return this.endPromise;
    } else {
      return Promise.resolve();
    }
  }

  async query<Fields extends FieldName>(root: string, query: Query<Fields>): Promise<QueryResult<Fields>> {
    if (this.watchedProjects[root]) {
      query.relative_root = this.watchedProjects[root].relative_path;
      root = this.watchedProjects[root].watch;
    }

    // console.log('========== >>> QUERY', root, query);
    return this.commandAsync('query', root, query);
  }

  async setLogLevel(level: 'debug' | 'error' | 'off'): Promise<void> {
    await this.commandAsync('log-level', level);
  }

  async subscribe<Fields extends FieldName>(
    root: string,
    query: Query<Fields>,
    name?: string
  ): Promise<SubscriptionInterface<Fields>> {
    if (this.watchedProjects[root]) {
      query.relative_root = this.watchedProjects[root].relative_path;
      root = this.watchedProjects[root].watch;
    }

    const subscriptionName = name || crypto.createHash('sha1').update(JSON.stringify({ root, query })).digest('hex');

    const id = ++SUBSCRIPTION_ID;
    const subscription = new Subscription(id, subscriptionName, async () => {
      this.subscriptions[subscriptionName] = this.subscriptions[subscriptionName].filter((sub) => sub.id !== id);
      if (this.subscriptions[subscriptionName].length === 0) {
        delete this.subscriptions[subscriptionName];
        // unsubscribe
        await this.commandAsync('unsubscribe', root, subscriptionName);
      }
    });

    if (this.subscriptions[subscriptionName] && this.subscriptions[subscriptionName].length > 0) {
      this.subscriptions[subscriptionName].push(subscription);
    } else {
      // can throw...
      // console.log('========== >>> SUBSCRIBE', root, name, query);
      await this.commandAsync('subscribe', root, name, query);

      if (!this.subscriptions[subscriptionName]) {
        this.subscriptions[subscriptionName] = [];
      }
      this.subscriptions[subscriptionName].push(subscription);
    }

    return subscription;
  }

  async watchDel(root: string): Promise<void> {
    if (this.watchedProjects[root]) {
      await this.commandAsync('watch-del', root);
      delete this.watchedProjects[root];
    }
  }

  async watchProject(root: string): Promise<WatchProjectResult> {
    if (!this.watchedProjects[root]) {
      // console.log('========== >>> WATCH PROJECT', root);
      this.watchedProjects[root] = await this.commandAsync('watch-project', root);
    }
    return this.watchedProjects[root];
  }

  watchList(): Promise<WatchListResult> {
    return this.commandAsync('watch-list');
  }
}
