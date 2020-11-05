export interface SourceDependency {
  type: 'dynamic import' | 'import' | 'require';
  typesOnly: boolean;
  value: string;
}
