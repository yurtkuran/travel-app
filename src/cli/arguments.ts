export function readArgument(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  return value && !value.startsWith("--") ? value : undefined;
}

export function requireArgument(name: string): string {
  const value = readArgument(name);
  if (!value) throw new Error(`Missing required --${name} argument`);
  return value;
}
