/**
 * Normalizes a string for umlaut-tolerant search.
 * Converts umlauts to their ASCII equivalents and lowercases.
 * This allows "Apfel" to match "Äpfel" and "Aepfel" to match "Äpfel".
 */
export function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss')
    // Also normalize ae/oe/ue input so "aepfel" matches "äpfel" (both become "apfel")
    .replace(/ae/g, 'a')
    .replace(/oe/g, 'o')
    .replace(/ue/g, 'u');
}

/**
 * Check if haystack contains needle using umlaut-tolerant matching.
 */
export function fuzzyIncludes(haystack: string, needle: string): boolean {
  return normalizeForSearch(haystack).includes(normalizeForSearch(needle));
}

/**
 * Migration map: common ASCII workarounds → proper German umlauts.
 * Used for one-time data migration of existing names.
 */
const UMLAUT_REPLACEMENTS: [RegExp, string][] = [
  [/Ae/g, 'Ä'],
  [/Oe/g, 'Ö'],
  [/Ue/g, 'Ü'],
  [/ae/g, 'ä'],
  [/oe/g, 'ö'],
  [/ue/g, 'ü'],
  [/ss(?=[aeiouyäöü])/gi, 'ß'], // only before vowels to avoid false positives
];

/**
 * Attempts to restore German umlauts from ASCII workarounds.
 * Conservative approach: only replaces common patterns.
 */
export function restoreUmlauts(text: string): string {
  let result = text;
  // Handle specific known words first (whitelist approach for ss→ß)
  const ssWords: Record<string, string> = {
    'Strasse': 'Straße',
    'strasse': 'straße',
    'Grosse': 'Große',
    'grosse': 'große',
    'Suesse': 'Süße',
    'suesse': 'süße',
    'Suess': 'Süß',
    'suess': 'süß',
    'Weisswein': 'Weißwein',
    'weisswein': 'weißwein',
    'Grillkaese': 'Grillkäse',
    'grillkaese': 'grillkäse',
    'Kaese': 'Käse',
    'kaese': 'käse',
    'Gemuese': 'Gemüse',
    'gemuese': 'gemüse',
    'Huehnersue': 'Hühnersu',
    'Groesse': 'Größe',
    'groesse': 'größe',
    'Spaetburgunder': 'Spätburgunder',
    'spaetburgunder': 'spätburgunder',
    'Getraenke': 'Getränke',
    'getraenke': 'getränke',
  };

  for (const [ascii, umlaut] of Object.entries(ssWords)) {
    result = result.replace(new RegExp(ascii, 'g'), umlaut);
  }

  // General ae→ä, oe→ö, ue→ü replacements (applied after specific words)
  result = result.replace(/Ae/g, 'Ä');
  result = result.replace(/Oe/g, 'Ö');
  result = result.replace(/Ue/g, 'Ü');
  result = result.replace(/ae/g, 'ä');
  result = result.replace(/oe/g, 'ö');
  result = result.replace(/ue/g, 'ü');

  return result;
}
