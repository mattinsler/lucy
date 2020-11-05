import path from 'path';
import { render, Lucy } from '@mattinsler/lucy';
import { useGlobby } from '@mattinsler/lucy-globby';
import { SourceDependency, useExtractSourceDepsFromFiles } from '@mattinsler/lucy-extract-source-deps';

function aggregateDeps(depsLists: SourceDependency[][]) {
  const agg = new Set<string>();

  depsLists.forEach((deps) => {
    deps.forEach((dep) => {
      agg.add(dep.value);
    });
  });

  return Array.from(agg);
}

interface RootProps {
  cwd: string;
}
function Root({ cwd }: RootProps) {
  const sourceFiles = useGlobby(['**/*.ts'], { cwd });
  const sourceDeps = useExtractSourceDepsFromFiles(sourceFiles, { cwd });

  return {
    cwd,
    deps: aggregateDeps(Object.values(sourceDeps)),
    sources: sourceFiles.map((file) => Lucy.create(TSFile, { deps: sourceDeps[file], file })),
  };
}

interface TSFileProps {
  deps: SourceDependency[];
  file: string;
}
function TSFile({ deps, file }: TSFileProps) {
  return {
    file,
    deps,
  };
}

const container = render(Lucy.create(Root, { cwd: __dirname }));
process.on('exit', () => console.log(JSON.stringify(container.toJSON(), null, 2)));
