import { SourceDependency } from './types';

export function extractSourceDepsFromCode(file: string, code: string): Promise<SourceDependency[]>;
export function extractSourceDepsFromFile(file: string): Promise<SourceDependency[]>;
