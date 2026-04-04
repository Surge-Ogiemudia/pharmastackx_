// Utility to extract required product fields from a CSV row, regardless of column order or extra columns
// If a required field is missing, it is set to 'N/A'

export type ProductCsvRow = {
  name: string;
  active: string;
  class: string;
  price: string;
};

// Accepts a parsed CSV row (object with keys as headers) and returns a normalized ProductCsvRow
export function normalizeProductCsvRow(row: Record<string, any>): ProductCsvRow {
  // Possible header variations for each field
  const nameKeys = ['name', 'medicine name', 'product name', 'drug name'];
  const activeKeys = ['active', 'active ingredient', 'ingredient', 'active_ingredient'];
  const classKeys = ['class', 'drug class', 'category', 'medicine class'];
  const priceKeys = ['price', 'cost', 'unit price', 'amount'];

  function findValue(keys: string[]): string {
    for (const key of keys) {
      for (const rowKey in row) {
        if (rowKey.trim().toLowerCase() === key) {
          return row[rowKey] || 'N/A';
        }
      }
    }
    return 'N/A';
  }

  return {
    name: findValue(nameKeys),
    active: findValue(activeKeys),
    class: findValue(classKeys),
    price: findValue(priceKeys),
  };
}
