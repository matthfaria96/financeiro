/** Leitor de CSV com aspas (RFC 4180) e separador detectado (`,`, `;` ou tab). */
export function detectDelimiter(line: string): string {
  const count = (character: string) => {
    let inside = false;
    let total = 0;
    for (const c of line) {
      if (c === '"') inside = !inside;
      else if (c === character && !inside) total++;
    }
    return total;
  };
  return [';', ',', '\t'].reduce((best, candidate) => (count(candidate) > count(best) ? candidate : best), ';');
}

export function csvRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inside = false;
  const endField = () => {
    row.push(field.trim());
    field = '';
  };
  const endRow = () => {
    endField();
    if (row.some((cell) => cell !== '')) rows.push(row);
    row = [];
  };
  for (let index = 0; index < text.length; index++) {
    const c = text[index];
    if (inside) {
      if (c === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index++;
        } else inside = false;
      } else field += c;
    } else if (c === '"') inside = true;
    else if (c === delimiter) endField();
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[index + 1] === '\n') index++;
      endRow();
    } else field += c;
  }
  if (field || row.length) endRow();
  return rows;
}
