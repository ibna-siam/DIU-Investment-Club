export function formatBDT(amount?: number | null): string {
  if (amount === undefined || amount === null || isNaN(Number(amount))) return '৳0.00';
  const val = Number(amount);
  const formatted = Math.abs(val).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return val < 0 ? `-৳${formatted}` : `৳${formatted}`;
}

export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const processRow = (row: (string | number)[]) => {
    return row
      .map((val) => {
        let str = String(val ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          str = `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(',');
  };

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(processRow)].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToExcel(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: (string | number)[][]
) {
  // Generates SpreadsheetML XML format natively recognized by Microsoft Excel, LibreOffice, and Google Sheets
  const xmlHeader = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="Default">
   <Font ss:Color="#000000"/>
  </Style>
  <Style ss:ID="Currency">
   <NumberFormat ss:Format="৳#,##0.00;[Red]-৳#,##0.00"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${sheetName}">
  <Table>
   <Row ss:StyleID="Header">
    ${headers.map((h) => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('')}
   </Row>
   ${rows
     .map((row) => {
       return `<Row>${row
         .map((val) => {
           const isNum = typeof val === 'number';
           const type = isNum ? 'Number' : 'String';
           const style = isNum ? ' ss:StyleID="Currency"' : '';
           return `<Cell${style}><Data ss:Type="${type}">${val ?? ''}</Data></Cell>`;
         })
         .join('')}</Row>`;
     })
     .join('')}
  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xmlHeader], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function triggerPrint() {
  if (typeof window !== 'undefined') {
    window.print();
  }
}
