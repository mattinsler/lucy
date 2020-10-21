import { useWriteFile } from './hooks';

export interface FileProps {
  content: string | Buffer;
  encoding?: BufferEncoding;
  path: string;
}
export function File(props: FileProps) {
  useWriteFile(props);
  return null;
}

export interface JSONFileProps {
  content: any;
  path: string;
}
export function JSONFile(props: JSONFileProps) {
  useWriteFile({ ...props, json: true });
  return null;
}
