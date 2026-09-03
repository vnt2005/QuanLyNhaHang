import type { RevenueReport } from '../services/revenueReports'

const encoder = new TextEncoder()

const statusLabels: Record<string, string> = {
  Generated: 'Đã tạo',
  Exported: 'Đã xuất',
  Printed: 'Đã in',
  Cancelled: 'Đã hủy',
}

function formatDate(value: string) {
  const datePart = value.slice(0, 10)
  return new Intl.DateTimeFormat('vi-VN').format(new Date(`${datePart}T00:00:00`))
}

function csvCell(value: string | number) {
  const safeValue = typeof value === 'string' && /^[=+\-@]/.test(value) ? `'${value}` : value
  return `"${String(safeValue).replace(/"/g, '""')}"`
}

function safeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'bao-cao-doanh-thu'
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function downloadRevenueReportCsv(report: RevenueReport) {
  const header = [
    'Mã báo cáo',
    'Từ ngày',
    'Đến ngày',
    'Số hóa đơn',
    'Số đơn hàng',
    'Tổng tiền món',
    'Giảm giá',
    'VAT',
    'Doanh thu',
    'Trung bình/hóa đơn',
    'Ghi chú',
    'Món',
    'Số lượng bán',
    'Doanh thu món',
  ]

  const base = [
    report.reportCode,
    formatDate(report.fromDate),
    formatDate(report.toDate),
    report.totalInvoices,
    report.totalOrders,
    report.totalAmount,
    report.totalDiscountAmount,
    report.totalVatAmount,
    report.totalRevenue,
    report.averageRevenuePerInvoice,
    report.note ?? '',
  ]

  const itemRows = (report.items ?? []).length > 0
    ? report.items.map(item => [...base, item.menuItemName, item.quantitySold, item.totalRevenue])
    : [[...base, '', '', '']]

  const csv = `\uFEFF${[header, ...itemRows]
    .map(row => row.map(value => csvCell(value as string | number)).join(','))
    .join('\r\n')}`

  downloadBlob(
    new Blob([csv], { type: 'text/csv;charset=utf-8' }),
    `${safeFileName(report.reportCode)}.csv`,
  )
}

function xmlEscape(value: string) {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  })[character] ?? character)
}

function excelSerial(value: string) {
  const datePart = value.slice(0, 10)
  const time = Date.parse(`${datePart}T00:00:00Z`)
  return Math.floor(time / 86_400_000) + 25_569
}

function inlineCell(reference: string, value: string, style = 0) {
  return `<c r="${reference}" t="inlineStr" s="${style}"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`
}

function numberCell(reference: string, value: number, style = 0) {
  const normalized = Number.isFinite(value) ? value : 0
  return `<c r="${reference}" t="n" s="${style}"><v>${normalized}</v></c>`
}

function row(index: number, cells: string[], height?: number) {
  const heightAttributes = height ? ` ht="${height}" customHeight="1"` : ''
  return `<row r="${index}"${heightAttributes}>${cells.join('')}</row>`
}

function buildWorksheet(report: RevenueReport) {
  const rows: string[] = []
  rows.push(row(1, [inlineCell('A1', 'BÁO CÁO DOANH THU', 1)], 30))
  rows.push(row(2, [inlineCell('A2', `Mã báo cáo: ${report.reportCode}`, 2)], 22))
  rows.push(row(3, []))
  rows.push(row(4, [inlineCell('A4', 'THÔNG TIN BÁO CÁO', 3)], 22))
  rows.push(row(5, [
    inlineCell('A5', 'Từ ngày', 4),
    numberCell('B5', excelSerial(report.fromDate), 7),
    inlineCell('C5', 'Đến ngày', 4),
    numberCell('D5', excelSerial(report.toDate), 7),
    inlineCell('E5', 'Trạng thái', 4),
    inlineCell('F5', statusLabels[report.status] ?? report.status, 5),
  ]))
  rows.push(row(6, [
    inlineCell('A6', 'Số hóa đơn', 4),
    numberCell('B6', report.totalInvoices, 6),
    inlineCell('C6', 'Số đơn hàng', 4),
    numberCell('D6', report.totalOrders, 6),
    inlineCell('E6', 'Ngày tạo', 4),
    inlineCell(
      'F6',
      new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(
        new Date(report.generatedAt),
      ),
      5,
    ),
  ]))
  rows.push(row(7, []))
  rows.push(row(8, [inlineCell('A8', 'TỔNG HỢP TÀI CHÍNH', 3)], 22))
  rows.push(row(9, [
    inlineCell('A9', 'Tổng tiền món', 4),
    numberCell('B9', report.totalAmount, 8),
    inlineCell('C9', 'Giảm giá', 4),
    numberCell('D9', report.totalDiscountAmount, 8),
    inlineCell('E9', 'VAT', 4),
    numberCell('F9', report.totalVatAmount, 8),
  ]))
  rows.push(row(10, [
    inlineCell('A10', 'Doanh thu', 4),
    numberCell('B10', report.totalRevenue, 9),
    inlineCell('C10', 'Trung bình/hóa đơn', 4),
    numberCell('D10', report.averageRevenuePerInvoice, 8),
    inlineCell('E10', 'Khách thanh toán', 4),
    numberCell('F10', report.totalCustomerPaid, 8),
  ]))
  rows.push(row(11, [
    inlineCell('E11', 'Tiền thừa hoàn lại', 4),
    numberCell('F11', report.totalChangeAmount, 8),
  ]))
  rows.push(row(12, []))
  rows.push(row(13, [inlineCell('A13', 'DOANH THU THEO MÓN', 3)], 22))
  rows.push(row(14, [
    inlineCell('A14', 'Món', 10),
    inlineCell('B14', 'Số lượng bán', 10),
    inlineCell('C14', 'Doanh thu', 10),
  ]))

  let nextRow = 15
  for (const item of report.items ?? []) {
    rows.push(row(nextRow, [
      inlineCell(`A${nextRow}`, item.menuItemName, 5),
      numberCell(`B${nextRow}`, item.quantitySold, 6),
      numberCell(`C${nextRow}`, item.totalRevenue, 8),
    ]))
    nextRow += 1
  }

  if ((report.items ?? []).length === 0) {
    rows.push(row(nextRow, [inlineCell(`A${nextRow}`, 'Không có dữ liệu món.', 5)]))
    nextRow += 1
  }

  const noteHeaderRow = nextRow + 1
  const noteValueRow = nextRow + 2
  rows.push(row(nextRow, []))
  rows.push(row(noteHeaderRow, [inlineCell(`A${noteHeaderRow}`, 'GHI CHÚ', 3)], 22))
  rows.push(row(
    noteValueRow,
    [inlineCell(`A${noteValueRow}`, report.note?.trim() || 'Không có ghi chú.', 11)],
    34,
  ))

  const lastItemRow = Math.max(15, nextRow - 1)

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:F${noteValueRow}"/>
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="14" topLeftCell="A15" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>
    <col min="1" max="1" width="32" customWidth="1"/>
    <col min="2" max="2" width="18" customWidth="1"/>
    <col min="3" max="3" width="22" customWidth="1"/>
    <col min="4" max="4" width="20" customWidth="1"/>
    <col min="5" max="5" width="22" customWidth="1"/>
    <col min="6" max="6" width="22" customWidth="1"/>
  </cols>
  <sheetData>${rows.join('')}</sheetData>
  <autoFilter ref="A14:C${lastItemRow}"/>
  <mergeCells count="7">
    <mergeCell ref="A1:F1"/>
    <mergeCell ref="A2:F2"/>
    <mergeCell ref="A4:F4"/>
    <mergeCell ref="A8:F8"/>
    <mergeCell ref="A13:F13"/>
    <mergeCell ref="A${noteHeaderRow}:F${noteHeaderRow}"/>
    <mergeCell ref="A${noteValueRow}:F${noteValueRow}"/>
  </mergeCells>
  <pageMargins left="0.4" right="0.4" top="0.55" bottom="0.55" header="0.2" footer="0.2"/>
  <pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>
</worksheet>`
}

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="2">
    <numFmt numFmtId="164" formatCode="#,##0 [$₫-vi-VN]"/>
    <numFmt numFmtId="165" formatCode="dd/mm/yyyy"/>
  </numFmts>
  <fonts count="4">
    <font><sz val="11"/><name val="Aptos"/><family val="2"/></font>
    <font><b/><sz val="18"/><color rgb="FFFFFFFF"/><name val="Aptos Display"/><family val="2"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Aptos"/><family val="2"/></font>
    <font><b/><sz val="11"/><color rgb="FF172033"/><name val="Aptos"/><family val="2"/></font>
  </fonts>
  <fills count="5">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF162033"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFEAF0F6"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFE4CC"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left style="thin"><color rgb="FFD8E0E8"/></left><right style="thin"><color rgb="FFD8E0E8"/></right><top style="thin"><color rgb="FFD8E0E8"/></top><bottom style="thin"><color rgb="FFD8E0E8"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="12">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="164" fontId="3" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`

const crcTable = (() => {
  const table = new Uint32Array(256)
  for (let index = 0; index < 256; index += 1) {
    let value = index
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    }
    table[index] = value >>> 0
  }
  return table
})()

function crc32(data: Uint8Array) {
  let crc = 0xffffffff
  for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function pushUint16(target: number[], value: number) {
  target.push(value & 0xff, (value >>> 8) & 0xff)
}

function pushUint32(target: number[], value: number) {
  target.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff)
}

function pushBytes(target: number[], bytes: Uint8Array) {
  for (const byte of bytes) target.push(byte)
}

function dosDateTime(date: Date) {
  const year = Math.max(1980, date.getFullYear())
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
  const day = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  return { time, day }
}

type ZipEntry = { name: string; content: string }

function createStoredZip(entries: ZipEntry[]) {
  const body: number[] = []
  const centralDirectory: number[] = []
  const now = dosDateTime(new Date())

  for (const entry of entries) {
    const name = encoder.encode(entry.name)
    const data = encoder.encode(entry.content)
    const checksum = crc32(data)
    const offset = body.length

    pushUint32(body, 0x04034b50)
    pushUint16(body, 20)
    pushUint16(body, 0x0800)
    pushUint16(body, 0)
    pushUint16(body, now.time)
    pushUint16(body, now.day)
    pushUint32(body, checksum)
    pushUint32(body, data.length)
    pushUint32(body, data.length)
    pushUint16(body, name.length)
    pushUint16(body, 0)
    pushBytes(body, name)
    pushBytes(body, data)

    pushUint32(centralDirectory, 0x02014b50)
    pushUint16(centralDirectory, 20)
    pushUint16(centralDirectory, 20)
    pushUint16(centralDirectory, 0x0800)
    pushUint16(centralDirectory, 0)
    pushUint16(centralDirectory, now.time)
    pushUint16(centralDirectory, now.day)
    pushUint32(centralDirectory, checksum)
    pushUint32(centralDirectory, data.length)
    pushUint32(centralDirectory, data.length)
    pushUint16(centralDirectory, name.length)
    pushUint16(centralDirectory, 0)
    pushUint16(centralDirectory, 0)
    pushUint16(centralDirectory, 0)
    pushUint16(centralDirectory, 0)
    pushUint32(centralDirectory, 0)
    pushUint32(centralDirectory, offset)
    pushBytes(centralDirectory, name)
  }

  const centralOffset = body.length
  for (const byte of centralDirectory) body.push(byte)
  pushUint32(body, 0x06054b50)
  pushUint16(body, 0)
  pushUint16(body, 0)
  pushUint16(body, entries.length)
  pushUint16(body, entries.length)
  pushUint32(body, centralDirectory.length)
  pushUint32(body, centralOffset)
  pushUint16(body, 0)

  return new Uint8Array(body)
}

export function downloadRevenueReportXlsx(report: RevenueReport) {
  const entries: ZipEntry[] = [
    {
      name: '[Content_Types].xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`,
    },
    {
      name: '_rels/.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`,
    },
    {
      name: 'docProps/app.xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>QuanLyNhaHang</Application></Properties>`,
    },
    {
      name: 'docProps/core.xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Báo cáo doanh thu ${xmlEscape(report.reportCode)}</dc:title><dc:creator>QuanLyNhaHang</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created></cp:coreProperties>`,
    },
    {
      name: 'xl/workbook.xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets><sheet name="Báo cáo doanh thu" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    },
    { name: 'xl/styles.xml', content: stylesXml },
    { name: 'xl/worksheets/sheet1.xml', content: buildWorksheet(report) },
  ]

  const archive = createStoredZip(entries)
  downloadBlob(
    new Blob([archive.buffer as ArrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `${safeFileName(report.reportCode)}.xlsx`,
  )
}
