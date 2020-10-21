import fs from 'fs-extra';
import { Lucy } from '@mattinsler/lucy';

export function useReadFile(file: fs.PathLike | number): Buffer | undefined;
export function useReadFile(file: fs.PathLike | number, encoding: string): string | undefined;
export function useReadFile(
  file: fs.PathLike | number,
  options: { flag?: string } | { encoding: string; flag?: string }
): string | undefined;

export function useReadFile(file: fs.PathLike | number, options?: any) {
  const [content, setContent] = Lucy.useState<Buffer | string | undefined>(undefined);

  Lucy.useEffect(() => {
    fs.readFile(file, options, (err, data) => {
      if (err) {
        console.error(err);
      } else {
        setContent(data);
      }
    });
  }, []);

  return content;
}

export function useReadJSONFile<T>(file: fs.PathLike | number): T | undefined {
  const [jsonContent, setJSONContent] = Lucy.useState<T | undefined>(undefined);

  Lucy.useEffect(() => {
    fs.readFile(file, 'utf8', (err, data) => {
      if (err) {
        console.error(err);
      } else {
        setJSONContent(JSON.parse(data));
      }
    });
  }, []);

  return jsonContent;
}

interface WriteJSONFileProps {
  content: any;
  json: true;
  path: string;
}
interface WriteOtherFileProps {
  content: string | Buffer;
  encoding?: BufferEncoding;
  json?: false;
  path: string;
}

export type WriteFileProps = WriteJSONFileProps | WriteOtherFileProps;

export function useWriteFile(props: WriteFileProps) {
  Lucy.useEffect(() => {
    const text = props.json ? JSON.stringify(props.content, null, 2) : props.content;
    const encoding = props.json ? 'utf8' : props.encoding;

    fs.writeFile(props.path, text, { encoding }, (err) => {
      if (err) {
        throw err;
      }
    });

    return () => fs.unlink(props.path);
  }, []);
}
