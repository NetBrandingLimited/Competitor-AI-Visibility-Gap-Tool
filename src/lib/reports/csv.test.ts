import { describe, expect, it } from 'vitest';

import { buildCsvDocument, escapeCsv } from './csv';

describe('escapeCsv', () => {
  it('escapes commas and quotes', () => {
    expect(escapeCsv('a,"b"')).toBe('"a,""b"""');
  });

  it('guards against spreadsheet formula injection', () => {
    expect(escapeCsv('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)");
    expect(escapeCsv('+cmd')).toBe("'+cmd");
    expect(escapeCsv('-cmd')).toBe("'-cmd");
    expect(escapeCsv('@user')).toBe("'@user");
  });

  it('guards leading tab values', () => {
    expect(escapeCsv('\tformula')).toBe("'\tformula");
  });
});

describe('buildCsvDocument', () => {
  it('adds BOM and joins encoded rows', () => {
    const csv = buildCsvDocument(
      ['colA', 'colB'],
      [
        ['x', 'plain'],
        ['=risk', 'a,"b"']
      ]
    );

    expect(csv.startsWith('\uFEFFcolA,colB\n')).toBe(true);
    expect(csv).toContain("x,plain");
    expect(csv).toContain("'=risk");
    expect(csv).toContain('"a,""b"""');
  });
});
