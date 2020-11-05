import path from 'path';
import { Lucy } from '@mattinsler/lucy';

import { SourceDependency } from './types';
import { extractSourceDepsFromFile } from './extract-with-swc';

export function useExtractSourceDepsFromFiles(files: string[], opts: { cwd?: string } = {}) {
  const [deps, setDeps] = Lucy.useState<{ [file: string]: SourceDependency[] }>(() => {
    const originalDeps: { [file: string]: SourceDependency[] } = {};
    files.forEach((file) => (originalDeps[file] = []));
    return originalDeps;
  });

  Lucy.useEffect(() => {
    Promise.all(files.map((file) => extractSourceDepsFromFile(opts.cwd ? path.join(opts.cwd, file) : file))).then(
      (fileDeps) => {
        const newDeps: { [file: string]: SourceDependency[] } = {};
        files.forEach((file, idx) => (newDeps[file] = fileDeps[idx]));
        setDeps(newDeps);
      }
    );
  }, [files, opts]);

  return deps;
}

export function useExtractSourceDepsFromFile(file: string) {
  const [deps, setDeps] = Lucy.useState<SourceDependency[]>([]);

  Lucy.useEffect(() => {
    extractSourceDepsFromFile(file).then(setDeps);
  }, []);

  return deps;
}
