// import LRU from 'lru-cache';
import path from 'path';

import { File, Lucy } from '@mattinsler/lucy';
import {
  Expression,
  File as WatchmanFile,
  MatchExpression,
  Subscription,
  SuffixExpression,
  WatchmanClient,
  simplifyExpression,
} from '@mattinsler/watchman-client';

type IncludeOrExclude = string[] | { include?: string[]; exclude?: string[] };

export interface FilesQuery {
  root?: string;
  // glob: {};
  directories?: IncludeOrExclude;
  extensions?: IncludeOrExclude;
  filenames?: IncludeOrExclude;
}

function normalizeIncludeOrExclude(
  includeOrExclude: IncludeOrExclude | undefined
): { include?: string[]; exclude?: string[] } {
  if (!includeOrExclude) {
    return {};
  }
  if (Array.isArray(includeOrExclude)) {
    if (includeOrExclude.length === 0) {
      return {};
    }
    return { include: includeOrExclude };
  }
  return {
    exclude: includeOrExclude.exclude && includeOrExclude.exclude.length > 0 ? includeOrExclude.exclude : undefined,
    include: includeOrExclude.include && includeOrExclude.include.length > 0 ? includeOrExclude.include : undefined,
  };
}

function includeOrExcludeExpression(
  includeOrExclude: IncludeOrExclude | undefined,
  fn: (value: string[]) => Expression
): Expression | undefined {
  const { exclude, include } = normalizeIncludeOrExclude(includeOrExclude);

  if (include && exclude) {
    return ['allof', fn(include), ['not', fn(exclude)]];
  } else if (include) {
    return fn(include);
  } else if (exclude) {
    return ['not', fn(exclude)];
  }

  return undefined;
}

function queryToExpression(query: FilesQuery): Expression | undefined {
  const directories = includeOrExcludeExpression(query.directories, (dirs) => [
    'anyof',
    ...dirs.map<MatchExpression>((dir) => ['match', `**/${dir}/**`, 'wholename']),
  ]);

  const extensions = includeOrExcludeExpression(query.extensions, (exts) => [
    'anyof',
    ...exts.map<SuffixExpression>((ext) => ['suffix', ext.replace(/^\.+/, '')]),
  ]);

  const filenames = includeOrExcludeExpression(query.filenames, (files) => ['name', files, 'basename']);

  const expressions = [directories, extensions, filenames].filter(Boolean) as Expression[];

  return simplifyExpression(['allof', ...expressions]);
}

function parseFilesQuery(query: FilesQuery) {
  return {
    expression: queryToExpression(query),
    root: query.root || process.cwd(),
  };
}

// // lru cache to keep the file shas we've already seen for optimized file writes
// const fileShaCache =

// files... add by filename, remove by filename, modify by filename/sha

export function useFiles(query: FilesQuery): File[] {
  const { mode } = Lucy.useLucyEnvironment();
  const filesToHashMap = Lucy.useNamedSingleton('FilesToHashMap', () => new Map<string, string>());
  const [files, setFiles, triggerFilesChange] = Lucy.useState<Map<string, File>>(new Map());

  const watchman = new WatchmanClient();

  Lucy.useEffect(() => {
    const { expression, root } = parseFilesQuery(query);

    let subscription: Subscription<any>;

    function updateFiles(watchmanFiles: WatchmanFile<'name' | 'exists' | 'content.sha1hex'>[]) {
      for (const watchmanFile of watchmanFiles) {
        if (watchmanFile.exists) {
          filesToHashMap.set(path.join(root, watchmanFile.name), watchmanFile['content.sha1hex']);
        } else {
          filesToHashMap.delete(path.join(root, watchmanFile.name));
        }
      }

      // even though we won't be returning a new object, we should use the callback setter
      // so that the process of updating the files object is scheduled in a linear way
      setFiles((oldFiles) => {
        let hasChanged = false;

        for (const watchmanFile of watchmanFiles) {
          if (watchmanFile.exists) {
            if (!oldFiles.has(watchmanFile.name)) {
              oldFiles.set(watchmanFile.name, {
                absolutePath: path.join(root, watchmanFile.name),
                hash: watchmanFile['content.sha1hex'],
                path: watchmanFile.name,
              });
              hasChanged = true;
            } else if (oldFiles.get(watchmanFile.name)!.hash !== watchmanFile['content.sha1hex']) {
              oldFiles.set(watchmanFile.name, {
                absolutePath: path.join(root, watchmanFile.name),
                hash: watchmanFile['content.sha1hex'],
                path: watchmanFile.name,
              });
              hasChanged = true;
            }
          } else {
            if (oldFiles.delete(watchmanFile.name)) {
              hasChanged = true;
            }
          }
        }

        // setters work on object equivalency, which does not detect internal object changes
        if (hasChanged) {
          triggerFilesChange();
        }

        return oldFiles;
      });
    }

    async function start() {
      await watchman.connect();
      await watchman.watchProject(root);
      const queryResult = await watchman.query(root, {
        expression,
        fields: ['name', 'exists', 'content.sha1hex'],
      });

      updateFiles(queryResult.files);
      // cache queryResult.clock

      if (mode === 'continuous') {
        try {
          subscription = await watchman.subscribe(root, {
            expression,
            fields: ['name', 'exists', 'content.sha1hex'],
            since: queryResult.clock,
          });

          subscription.on('data', (data) => {
            console.log(data);
            updateFiles(data.files);
            // cache data.clock
          });
        } catch (err) {
          console.log(err.stack);
        }
      }
    }
    async function stop() {
      if (subscription) {
        subscription.end();
      }
      await watchman.watchDel(root);
    }

    start();
    return () => stop();
  }, [query]);

  return Array.from(files.values());
}
