export type SearchParamValue = string | string[] | undefined;

export function getSearchParamValue(value: SearchParamValue) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export function getPageParam(value: SearchParamValue) {
  const pageValue = Number(getSearchParamValue(value));

  if (!Number.isInteger(pageValue) || pageValue < 1) {
    return 1;
  }

  return pageValue;
}
