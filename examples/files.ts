import { render, Lucy } from '@mattinsler/lucy';
import { useGlobby } from '@mattinsler/lucy-globby';
import { useReadFile, JSONFile } from '@mattinsler/lucy-files';

interface RootProps {
  cwd: string;
}
function Root({ cwd }: RootProps) {
  const files = useGlobby(['**/*.ts'], { cwd });
  console.log(files);

  return {
    cwd,
    sources: files.map((file) => Lucy.create(TSFile, { file })),
  };
}

interface TSFileProps {
  file: string;
}
function TSFile({ file }: TSFileProps) {
  const source = useReadFile(file, 'utf8');

  return {
    file,
    source,
  };
}

const container = render(Lucy.create(Root, { cwd: __dirname }));
setInterval(() => console.log(container.toJSON()), 1000);
// process.on('exit', () => console.log(container.toJSON()));
