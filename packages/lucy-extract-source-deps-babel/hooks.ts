import path from 'path';
import { File, Lucy } from '@mattinsler/lucy';

import { SourceDependency } from './types';
import { extractSourceDepsFromFile } from './extract-dependencies';

export function useExtractSourceDepsFromFiles(files: File[]) {
  const [deps, setDeps] = Lucy.useState<{ [file: string]: SourceDependency[] }>(() => {
    const originalDeps: { [file: string]: SourceDependency[] } = {};
    files.forEach((file) => (originalDeps[file.path] = []));
    return originalDeps;
  });

  Lucy.useEffect(() => {
    Promise.all(files.map((file) => extractSourceDepsFromFile(file.absolutePath))).then((fileDeps) => {
      const newDeps: { [file: string]: SourceDependency[] } = {};
      files.forEach((file, idx) => (newDeps[file.path] = fileDeps[idx]));
      setDeps(newDeps);
    });
  }, [files]);

  return deps;
}

export function useExtractSourceDepsFromFile(file: File) {
  const [deps, setDeps] = Lucy.useState<SourceDependency[]>([]);

  Lucy.useEffect(() => {
    extractSourceDepsFromFile(file.absolutePath).then(setDeps);
  }, []);

  return deps;
}
