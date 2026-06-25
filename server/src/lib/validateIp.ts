const IPV4_REGEX =
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

export function isValidIp(value: string): boolean {
  return IPV4_REGEX.test(value);
}

/**
 * Lève une erreur si `value` n'est pas une IPv4 valide.
 * Utilisé en garde au début de chaque handler ciblant une enceinte.
 */
export function assertValidIp(value: string): string {
  if (!isValidIp(value)) {
    const err = new Error(`Adresse IP invalide: ${value}`);
    (err as Error & { status?: number }).status = 400;
    throw err;
  }
  return value;
}
