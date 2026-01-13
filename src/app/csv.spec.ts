import { describe, expect, it } from 'vitest';
import { escapeCsvCell, rowsToCsv } from './csv';

describe('csv utilities', () => {
	it('escapes commas, quotes, and newlines', () => {
		expect(escapeCsvCell('simple')).toBe('simple');
		expect(escapeCsvCell('a,b')).toBe('"a,b"');
		expect(escapeCsvCell('a"b')).toBe('"a""b"');
		expect(escapeCsvCell('a\n b')).toBe('"a\n b"');
	});

	it('renders rows with header and CRLF', () => {
		const csv = rowsToCsv(
			[
				{ colA: 'x', colB: 'y' },
				{ colA: '1,2', colB: '3' }
			],
			['colA', 'colB']
		);

		expect(csv).toBe('colA,colB\r\nx,y\r\n"1,2",3\r\n');
	});
});
