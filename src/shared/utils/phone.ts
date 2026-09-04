/**
 * Normalizes and validates E.164 international phone number format (+[country][national_number])
 */
export function normalizePhoneNumber(raw: string): string {
  // Strip spaces, dashes, brackets
  let cleaned = raw.replace(/[\s\-\(\)\.]/g, '');

  if (!cleaned.startsWith('+')) {
    // If user entered without +, add it assuming valid international format
    cleaned = '+' + cleaned;
  }

  // Basic regex check for E.164: + followed by 7 to 15 digits
  const e164Regex = /^\+[1-9]\d{6,14}$/;
  if (!e164Regex.test(cleaned)) {
    throw new Error(`Invalid phone number format: "${raw}". Must be in E.164 format (e.g. +1234567890).`);
  }

  return cleaned;
}
