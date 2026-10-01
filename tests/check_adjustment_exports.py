"""Read-only integration check against Payara with a controlled adjustment fixture.

Usage: STOCK_MOVEMENT_COOKIE='JSESSIONID=...' python tests/check_adjustment_exports.py
  http://localhost:8080/prestige/api/v1/stock-movements fixture.json
Fixture: {"filters": {"searchValue": "RECETTE_AJUST_", "dateDebut": "...",
"dateFin": "..."}, "expected": [["CIP", "signed quantity"], ...]}
Only enable details under enable parents in the connected user's emplacement belong
in expected. Use unique fixture products with no other movements in the period.
No inventory or suggestion is created by this script.
"""
import csv
import io
import json
import os
import sys
import urllib.parse
import urllib.request
import zipfile
import xml.etree.ElementTree as ET
from collections import Counter


def run(base, fixture):
    cookie = os.environ['STOCK_MOVEMENT_COOKIE']
    expected = Counter(tuple(map(str, row)) for row in fixture['expected'])
    ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

    def get(path, params):
        request = urllib.request.Request(
            base.rstrip('/') + path + '?' + urllib.parse.urlencode(params),
            headers={'Cookie': cookie})
        with urllib.request.urlopen(request, timeout=60) as response:
            return response.read()

    for movement_type in ('AJUSTEMENT', 'TOUS'):
        params = dict(fixture['filters'], transactionType=movement_type)
        rows = []
        start = 0
        while True:
            page = json.loads(get('', dict(params, start=start, limit=2)))
            assert page['success'], page
            if start == 0:
                total = page['total']
            assert page['total'] == total, 'Fixture changed during pagination'
            rows.extend(page['results'])
            start += len(page['results'])
            if start >= total:
                break
            assert page['results'], 'Pagination ended before total'
        assert len(rows) == total
        actual = Counter((str(r['int_CIP']), str(r['int_NUMBER'])) for r in rows)
        assert actual == expected, (movement_type, actual, expected)

        content = get('/export.csv', params)
        assert content.startswith(b'\xef\xbb\xbf'), 'Missing CSV UTF-8 BOM'
        records = list(csv.reader(io.StringIO(content.decode('utf-8-sig')), delimiter=';'))
        assert records[0][:3] == ['CIP', 'Article', 'Quantité']
        assert Counter((r[0], r[2]) for r in records[1:]) == expected

        with zipfile.ZipFile(io.BytesIO(get('/export.xlsx', params))) as archive:
            strings = ET.fromstring(archive.read('xl/sharedStrings.xml'))
            strings = [''.join(si.itertext()) for si in strings]
            sheet = ET.fromstring(archive.read('xl/worksheets/sheet1.xml'))
            records = []
            for row in sheet.findall('.//s:sheetData/s:row', ns):
                values = {}
                for cell in row.findall('s:c', ns):
                    value = cell.find('s:v', ns)
                    value = '' if value is None else value.text
                    if cell.get('t') == 's':
                        value = strings[int(value)]
                    values[cell.get('r').rstrip('0123456789')] = value
                records.append(values)
            assert records[0]['A'] == 'CIP'
            assert Counter((r['A'], r['C']) for r in records[1:]) == expected
        print(movement_type + ': pagination, total, CSV and XLSX match the fixture')


if __name__ == '__main__':
    with open(sys.argv[2], encoding='utf-8') as source:
        run(sys.argv[1], json.load(source))
