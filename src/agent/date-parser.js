import chrono from 'chrono-node';

/**
 * Date parser using chrono-node for natural language dates
 */
export class DateParser {
  /**
   * Parse natural language date to ISO format
   */
  parse(text) {
    if (!text) return null;

    // Try to parse with chrono-node
    const results = chrono.parse(text, new Date(), { forwardDate: true });

    if (results.length > 0) {
      const date = results[0].start.date();
      return {
        iso: date.toISOString(),
        text: results[0].text,
        parsed: true
      };
    }

    return null;
  }

  /**
   * Parse date and return just the date part
   */
  parseToDate(text) {
    const result = this.parse(text);
    return result ? result.iso : null;
  }

  /**
   * Format date for display in Brazilian Portuguese
   */
  formatForDisplay(isoDate) {
    if (!isoDate) return null;

    const date = new Date(isoDate);

    const options = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    };

    return date.toLocaleDateString('pt-BR', options);
  }

  /**
   * Format date short (for confirmation)
   */
  formatShort(isoDate) {
    if (!isoDate) return null;

    const date = new Date(isoDate);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

export const dateParser = new DateParser();
