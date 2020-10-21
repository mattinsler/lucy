import globby from 'globby';
import { Lucy } from '@mattinsler/lucy';

export function useGlobby(patterns: string | ReadonlyArray<string>, options?: globby.GlobbyOptions): string[] {
  const [files, setFiles] = Lucy.useState<string[]>([]);

  Lucy.useEffect(() => {
    setFiles([]);
    globby(patterns, options).then(setFiles);
  }, [patterns, options]);

  return files;
}
