// import LRU from 'lru-cache';
import { Lucy } from '@mattinsler/lucy';
import {
  Expression,
  MatchExpression,
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

export function useFiles(query: FilesQuery): string[] {
  const [files, setFiles] = Lucy.useState<string[]>([]);

  const watchman = new WatchmanClient();

  Lucy.useEffect(() => {
    const { expression, root } = parseFilesQuery(query);
    console.log(JSON.stringify(expression, null, 2));

    async function start() {
      await watchman.connect();
      await watchman.watchProject(root);
      const queryResult = await watchman.query(root, {
        expression,
        fields: ['name', 'exists', 'content.sha1hex'],
      });

      setFiles(queryResult.files.filter((file) => file.exists).map((file) => file.name));
    }
    async function stop() {
      await watchman.watchDel(root);
    }

    start();
    return () => stop();
  }, [query]);

  return files;
}
