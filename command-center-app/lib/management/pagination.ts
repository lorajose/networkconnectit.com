export function buildHref(
  pathname: string,
  params: Record<string, string | undefined>,
  overrides: Record<string, string | undefined>
) {
  const nextParams = new URLSearchParams();

  Object.entries({
    ...params,
    ...overrides
  }).forEach(([key, value]) => {
    if (value) {
      nextParams.set(key, value);
    }
  });

  const queryString = nextParams.toString();

  return queryString ? `${pathname}?${queryString}` : pathname;
}
