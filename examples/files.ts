process.on('unhandledRejection', (err) => console.error(err));

import path from 'path';
import { JSONFile } from '@mattinsler/lucy-files';
import { useFiles } from '@mattinsler/lucy-watchman';
import { render, File, Lucy } from '@mattinsler/lucy';
import { SourceDependency, useExtractSourceDepsFromFiles } from '@mattinsler/lucy-extract-source-deps-babel';

function aggregateDeps(depsLists: SourceDependency[][]): string[] {
  const agg = new Set<string>();

  depsLists.forEach((deps) => {
    deps.forEach((dep) => {
      agg.add(dep.value);
    });
  });

  return Array.from(agg).sort();
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
    packages: pkgFiles.map((pkgFile) => Lucy.create(Project, { key: pkgFile.path, packageJsonFile: pkgFile, root })),
  };
}

interface ProjectProps {
  packageJsonFile: File;
  root: string;
}
function Project({ packageJsonFile, root }: ProjectProps) {
  const packageRoot = path.dirname(packageJsonFile.path);
  const sourceFiles = useFiles({
    directories: { exclude: ['node_modules'] },
    extensions: ['js', 'jsx', 'ts', 'tsx'],
    root: path.join(root, packageRoot),
  });
  const dependenciesBySourceFile = useExtractSourceDepsFromFiles(sourceFiles);
  const dependencies = aggregateDeps(Object.values(dependenciesBySourceFile));

  return {
    dependencies,
    dependenciesBySourceFile,
    sourceFiles,
    root: packageRoot,
    lucyConfigFile: Lucy.create(JSONFile, {
      path: path.join(root, packageRoot, 'fooey.json'),
      content: {
        name: packageRoot,
        dependencies,
        files: sourceFiles.map(({ hash, path }) => ({ hash, path })),
      },
    }),
  };
}

const container = render(Lucy.create(Root, { root: process.cwd() }), { continuous: false });
// const container = render(Lucy.create(Root, { root: path.join(process.cwd(), 'packages/lucy') }), { continuous: true });

// const print = () => console.log(JSON.stringify(container.state, null, 2));

// container.onIdle(print);
// process.on('exit', print);
