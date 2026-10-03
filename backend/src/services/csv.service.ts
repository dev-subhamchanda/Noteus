export const parseCsv = (content: string): string[][] => {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let quoted = false;
    let closedQuote = false;
    const input = content.replace(/^\uFEFF/, '');

    for (let index = 0; index < input.length; index += 1) {
        const character = input[index]!;

        if (quoted) {
            if (character === '"') {
                if (input[index + 1] === '"') {
                    cell += '"';
                    index += 1;
                } else {
                    quoted = false;
                    closedQuote = true;
                }
            } else {
                cell += character;
            }
            continue;
        }

        if (character === ',' || character === '\n' || character === '\r') {
            row.push(cell);
            cell = '';
            closedQuote = false;
            if (character === ',') continue;

            if (character === '\r' && input[index + 1] === '\n') index += 1;
            if (row.some((value) => value.trim())) rows.push(row);
            row = [];
            continue;
        }

        if (character === '"') {
            if (cell || closedQuote) throw new Error('CSV contains a quote in an invalid position');
            quoted = true;
            continue;
        }

        if (closedQuote && character.trim()) {
            throw new Error('CSV has unexpected text after a quoted value');
        }
        cell += character;
    }

    if (quoted) throw new Error('CSV contains an unclosed quoted value');
    row.push(cell);
    if (row.some((value) => value.trim())) rows.push(row);
    return rows;
};
