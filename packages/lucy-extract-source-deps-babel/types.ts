export interface SourceDependency {
  location: [start: number, end: number];
  type: 'dynamic import' | 'import' | 'require';
  typesOnly: boolean;
  value: string;
}
