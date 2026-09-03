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
  const mergeReferences = [
    'D1:I1',
    'D2:I2',
    'D4:I4',
    'D8:I8',
    'D13:I13',
    'D14:F14',
    'H14:I14',
  ]

  rows.push(row(1, [inlineCell('D1', 'BÁO CÁO DOANH THU', 1)], 36))
  rows.push(row(2, [inlineCell('D2', `Mã báo cáo: ${report.reportCode}`, 2)], 24))
  rows.push(row(3, []))
  rows.push(row(4, [inlineCell('D4', 'THÔNG TIN BÁO CÁO', 3)], 25))
  rows.push(row(5, [
    inlineCell('D5', 'Từ ngày', 4),
    numberCell('E5', excelSerial(report.fromDate), 7),
    inlineCell('F5', 'Đến ngày', 4),
    numberCell('G5', excelSerial(report.toDate), 7),
    inlineCell('H5', 'Trạng thái', 4),
    inlineCell('I5', statusLabels[report.status] ?? report.status, 5),
  ], 25))
  rows.push(row(6, [
    inlineCell('D6', 'Số hóa đơn', 4),
    numberCell('E6', report.totalInvoices, 6),
    inlineCell('F6', 'Số đơn hàng', 4),
    numberCell('G6', report.totalOrders, 6),
    inlineCell('H6', 'Ngày tạo', 4),
    inlineCell(
      'I6',
      new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(
        new Date(report.generatedAt),
      ),
      5,
    ),
  ], 25))
  rows.push(row(7, []))
  rows.push(row(8, [inlineCell('D8', 'TỔNG HỢP TÀI CHÍNH', 3)], 25))
  rows.push(row(9, [
    inlineCell('D9', 'Tổng tiền món', 4),
    numberCell('E9', report.totalAmount, 8),
    inlineCell('F9', 'Giảm giá', 4),
    numberCell('G9', report.totalDiscountAmount, 8),
    inlineCell('H9', 'VAT', 4),
    numberCell('I9', report.totalVatAmount, 8),
  ], 25))
  rows.push(row(10, [
    inlineCell('D10', 'Doanh thu', 4),
    numberCell('E10', report.totalRevenue, 9),
    inlineCell('F10', 'Trung bình/hóa đơn', 4),
    numberCell('G10', report.averageRevenuePerInvoice, 8),
    inlineCell('H10', 'Khách thanh toán', 4),
    numberCell('I10', report.totalCustomerPaid, 8),
  ], 25))
  rows.push(row(11, [
    inlineCell('H11', 'Tiền thừa hoàn lại', 4),
    numberCell('I11', report.totalChangeAmount, 8),
  ], 25))
  rows.push(row(12, []))
  rows.push(row(13, [inlineCell('D13', 'DOANH THU THEO MÓN', 3)], 25))
  rows.push(row(14, [
    inlineCell('D14', 'Món', 10),
    inlineCell('G14', 'Số lượng bán', 10),
    inlineCell('H14', 'Doanh thu', 10),
  ], 26))

  let nextRow = 15
  for (const item of report.items ?? []) {
    const alternate = (nextRow - 15) % 2 === 1
    const textStyle = alternate ? 12 : 5
    const countStyle = alternate ? 13 : 6
    const currencyStyle = alternate ? 14 : 8

    rows.push(row(nextRow, [
      inlineCell(`D${nextRow}`, item.menuItemName, textStyle),
      numberCell(`G${nextRow}`, item.quantitySold, countStyle),
      numberCell(`H${nextRow}`, item.totalRevenue, currencyStyle),
    ], 24))
    mergeReferences.push(`D${nextRow}:F${nextRow}`, `H${nextRow}:I${nextRow}`)
    nextRow += 1
  }

  if ((report.items ?? []).length === 0) {
    rows.push(row(nextRow, [inlineCell(`D${nextRow}`, 'Không có dữ liệu món.', 11)], 26))
    mergeReferences.push(`D${nextRow}:I${nextRow}`)
    nextRow += 1
  }

  const noteHeaderRow = nextRow + 1
  const noteValueRow = nextRow + 2
  rows.push(row(nextRow, []))
  rows.push(row(noteHeaderRow, [inlineCell(`D${noteHeaderRow}`, 'GHI CHÚ', 3)], 25))
  rows.push(row(
    noteValueRow,
    [inlineCell(`D${noteValueRow}`, report.note?.trim() || 'Không có ghi chú.', 11)],
    38,
  ))
  mergeReferences.push(`D${noteHeaderRow}:I${noteHeaderRow}`, `D${noteValueRow}:I${noteValueRow}`)

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
  <dimension ref="A1:I${noteValueRow}"/>
  <sheetViews>
    <sheetView workbookViewId="0" showGridLines="0" zoomScale="90" zoomScaleNormal="90">
      <pane ySplit="14" topLeftCell="D15" activePane="bottomLeft" state="frozen"/>
      <selection pane="bottomLeft" activeCell="D15" sqref="D15"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="20"/>
  <cols>
    <col min="1" max="1" width="18" customWidth="1"/>
    <col min="2" max="2" width="18" customWidth="1"/>
    <col min="3" max="3" width="8" customWidth="1"/>
    <col min="4" max="4" width="24" customWidth="1"/>
    <col min="5" max="5" width="18" customWidth="1"/>
    <col min="6" max="6" width="24" customWidth="1"/>
    <col min="7" max="7" width="18" customWidth="1"/>
    <col min="8" max="8" width="24" customWidth="1"/>
    <col min="9" max="9" width="20" customWidth="1"/>
  </cols>
  <sheetData>${rows.join('')}</sheetData>
  <mergeCells count="${mergeReferences.length}">${mergeReferences
    .map(reference => `<mergeCell ref="${reference}"/>`)
    .join('')}</mergeCells>
  <printOptions horizontalCentered="1" gridLines="0"/>
  <pageMargins left="0.35" right="0.35" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>
  <pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>
</worksheet>`
}

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="2">
    <numFmt numFmtId="164" formatCode="#,##0 [$₫-vi-VN]"/>
    <numFmt numFmtId="165" formatCode="dd/mm/yyyy"/>
  </numFmts>
  <fonts count="6">
    <font><sz val="10.5"/><color rgb="FF334155"/><name val="Aptos"/><family val="2"/></font>
    <font><b/><sz val="19"/><color rgb="FF9A4B1F"/><name val="Aptos Display"/><family val="2"/></font>
    <font><b/><sz val="10.5"/><color rgb="FF64748B"/><name val="Aptos"/><family val="2"/></font>
    <font><b/><sz val="11"/><color rgb="FF0F5D64"/><name val="Aptos"/><family val="2"/></font>
    <font><b/><sz val="10.5"/><color rgb="FF334155"/><name val="Aptos"/><family val="2"/></font>
    <font><b/><sz val="11"/><color rgb="FFC65D21"/><name val="Aptos"/><family val="2"/></font>
  </fonts>
  <fills count="9">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFF6EE"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE8F3F4"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF6F8FA"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFF0E2"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFDCEEEF"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF8FBFC"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFFBF5"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left style="thin"><color rgb="FFD8E2E8"/></left><right style="thin"><color rgb="FFD8E2E8"/></right><top style="thin"><color rgb="FFD8E2E8"/></top><bottom style="thin"><color rgb="FFD8E2E8"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="15">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="4" fillId="4" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="164" fontId="5" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="4" fillId="6" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="8" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="7" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="7" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="164" fontId="0" fillId="7" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
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
