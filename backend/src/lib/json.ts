export function serializeJsonValue(value: unknown) {
  if (typeof value === 'undefined') {
    return value;
  }

  return JSON.parse(
    JSON.stringify(value, (_key, nestedValue) => {
      if (typeof nestedValue === 'bigint') {
        return nestedValue.toString();
      }

      return nestedValue;
    }),
  );
}
