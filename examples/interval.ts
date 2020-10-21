import { render, Lucy } from '@mattinsler/lucy';

function useInterval(fn: () => void, interval: number) {
  Lucy.useEffect(() => {
    let intervalId: NodeJS.Timeout | null = setInterval(fn, interval);

    function cancel() {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }

    process.on('SIGINT', cancel);
    return cancel;
  });
}

function Root() {
  const [value, setValue] = Lucy.useState(0);
  useInterval(() => setValue((oldValue) => oldValue + 1), 500);

  return {
    log: Lucy.create(LogValue, { value }),
    value,
  };
}

function LogValue({ value }: { value: number }) {
  console.log('LogValue', value);
  return null;
}

const container = render(Lucy.create(Root, {}));
process.on('exit', () => console.log(container.toJSON()));
