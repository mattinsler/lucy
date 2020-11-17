import path from 'path';
import { render, Lucy } from '@mattinsler/lucy';
import { useFiles } from '@mattinsler/lucy-watchman';
import { SourceDependency, useExtractSourceDepsFromFiles } from '@mattinsler/lucy-extract-source-deps-babel';

function aggregateDeps(depsLists: SourceDependency[][]): string[] {
  const agg = new Set<string>();

  depsLists.forEach((deps) => {
    deps.forEach((dep) => {
      agg.add(dep.value);
    });
  });

  return Array.from(agg);
}

interface RootProps {
  root: string;
}
function Root({ root }: RootProps) {
  const pkgFiles = useFiles({
    directories: { exclude: ['node_modules'] },
    filenames: ['package.json'],
    root,
  });

  return {
    packages: pkgFiles.map((pkgFile) => Lucy.create(Project, { packageJsonFile: pkgFile, root })),
  };
}

interface ProjectProps {
  packageJsonFile: string;
  root: string;
}
function Project({ packageJsonFile, root }: ProjectProps) {
  const packageRoot = path.dirname(packageJsonFile);
  const sourceFiles = useFiles({
    directories: { exclude: ['node_modules'] },
    extensions: ['js', 'jsx', 'ts', 'tsx'],
    root: path.join(root, packageRoot),
  });
  const dependenciesBySourceFile = useExtractSourceDepsFromFiles(sourceFiles, { cwd: packageRoot });

  return {
    dependencies: aggregateDeps(Object.values(dependenciesBySourceFile)),
    dependenciesBySourceFile,
    sourceFiles,
    root: packageRoot,
  };
}

const container = render(Lucy.create(Root, { root: process.cwd() }));

const print = () => console.log(JSON.stringify(container.state, null, 2));

container.onIdle(print);
process.on('exit', print);
