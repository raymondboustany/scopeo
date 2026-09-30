export const MIN_PASSWORD = 12

/** Mêmes critères que le serveur : 12 caractères et quatre familles de caractères. */
export function passwordChecks(password: string) {
  return {
    length: password.length >= MIN_PASSWORD,
    lower: /\p{Ll}/u.test(password),
    upper: /\p{Lu}/u.test(password),
    digit: /\p{Nd}/u.test(password),
    special: /[^\p{L}\p{Nd}]/u.test(password),
  }
}

export function isStrongPassword(password: string): boolean {
  return Object.values(passwordChecks(password)).every(Boolean)
}
