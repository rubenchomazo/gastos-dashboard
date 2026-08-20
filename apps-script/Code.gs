const SHEET_NAME = '' // Déjalo vacío para usar la primera pestaña, o escribe su nombre.

function getSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
  return SHEET_NAME ? spreadsheet.getSheetByName(SHEET_NAME) : spreadsheet.getSheets()[0]
}

function doGet() {
  const sheet = getSheet_()
  const values = sheet.getDataRange().getValues()
  const rows = values.slice(1).filter(row => row[0] !== '')
  const movements = rows.map(row => ({
    description: String(row[0] || ''), category: String(row[1] || 'Otros'), type: String(row[2] || 'expense').toLowerCase().includes('income') || String(row[2] || '').toLowerCase().includes('ingreso') ? 'income' : 'expense', amount: Number(row[3]) || 0, date: formatDate_(row[4])
  })).filter(item => item.amount > 0)
  return json_({movements})
}

function doPost(event) {
  const body = JSON.parse(event.postData.contents || '{}')
  if (body.action !== 'replace' || !Array.isArray(body.movements)) return json_({ok:false, error:'Acción no válida'})
  const sheet = getSheet_()
  const rows = [['description', 'category', 'type', 'amount', 'date'], ...body.movements.map(item => [item.description, item.category, item.type, Number(item.amount) || 0, item.date])]
  const lock = LockService.getScriptLock()
  lock.waitLock(10000)
  try { sheet.clearContents(); sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows) } finally { lock.releaseLock() }
  return json_({ok:true, count:body.movements.length})
}

function formatDate_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]') return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd')
  return String(value || '')
}

function json_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON) }
