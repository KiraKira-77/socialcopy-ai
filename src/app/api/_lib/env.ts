type RuntimeEnv = typeof globalThis & {
  Deno?: {
    env?: {
      get(key: string): string | undefined;
    };
  };
};

export const getRuntimeEnvVar = (key: string): string | undefined => {
  if (typeof process !== "undefined" && process.env?.[key]) {
    return process.env[key];
  }

  const runtime = globalThis as RuntimeEnv;

  try {
    return runtime.Deno?.env?.get?.(key);
  } catch {
    return undefined;
  }
};

