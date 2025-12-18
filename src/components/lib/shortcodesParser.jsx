export class ShortcodesParser {
  constructor() {
    // This is kept simple for now, can be expanded.
    this.aliases = {
      'mahnung': 'mahnung',
      'frist': 'fristsetzung',
      'abmahnung': 'abmahnung',
      'kuendigung': 'kuendigung',
      'kündigung': 'kuendigung',
    };
  }

  parse(input) {
    const result = {
      fall: null,
      betrag: null,
      frist: null,
      iban: null,
      zahlungsempfaenger: null,
      kundennummer: null,
      referenz: null,
      anlagen: [],
      reason: '', // Free text part
      unbekannt: []
    };

    if (!input || typeof input !== 'string') {
      return result;
    }

    const commandRegex = /\s*\/([a-zA-ZüöäßÜÖÄ]+)\s+([^/]*)/g;
    let freeText = input;
    let match;

    while ((match = commandRegex.exec(input)) !== null) {
      const key = match[1].toLowerCase().trim();
      const value = match[2].trim();
      freeText = freeText.replace(match[0], ''); // Remove command from free text

      switch (key) {
        case 'fall':
          result.fall = this.aliases[value.toLowerCase()] || value;
          break;
        case 'betrag':
        case 'summe':
          result.betrag = this.parseAmount(value);
          break;
        case 'frist':
        case 'fristtage':
          result.frist = parseInt(value, 10);
          break;
        case 'iban':
          result.iban = this.cleanIban(value);
          break;
        case 'zahlungsempf':
        case 'zahlungsempfaenger':
        case 'empfaenger':
          result.zahlungsempfaenger = value;
          break;
        case 'kdnr':
        case 'kundennummer':
          result.kundennummer = value;
          break;
        case 'ref':
        case 'referenz':
        case 'az':
        case 'aktenzeichen':
          result.referenz = value;
          break;
        case 'anlage':
        case 'anlagen':
          if (value) result.anlagen.push(value);
          break;
        default:
          result.unbekannt.push(`/${key} ${value}`);
          break;
      }
    }
    
    result.reason = freeText.trim();

    return result;
  }

  parseAmount(value) {
    if (!value) return null;
    const cleaned = value.replace(/[€$£]/g, '').replace(/\./g, '').replace(',', '.').trim();
    const amount = parseFloat(cleaned);
    return isNaN(amount) ? null : amount;
  }

  cleanIban(value) {
    if (!value) return null;
    return value.replace(/\s+/g, '').toUpperCase();
  }
}

export const shortcodesParser = new ShortcodesParser();