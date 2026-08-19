const STORAGE_KEY = 'saldo-sheet-csv-url'
const DEFAULT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1yiuTaDgGzbFhT-GNO3criDebXTFhNoWNsLPQlJIBP_k/edit?usp=sharing'

export function getSheetUrl() {
  return localStorage.getItem(STORAGE_KEY) || normalizeSheetUrl(DEFAULT_SHEET_URL)
}

export function saveSheetUrl(url) {
  const cleanUrl = normalizeSheetUrl(url)
  if (cleanUrl) localStorage.setItem(STORAGE_KEY, cleanUrl)
  else localStorage.removeItem(STORAGE_KEY)
  return cleanUrl
}

function normalizeSheetUrl(url) {
  const cleanUrl = String(url || '').trim()
  if (!cleanUrl) return ''
  try {
    const parsed = new URL(cleanUrl)
    const match = parsed.pathname.match(/\/spreadsheets\/d\/([^/]+)/)
    if (parsed.hostname === 'docs.google.com' && match && !parsed.pathname.includes('/export')) {
      return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`
    }
  } catch {
    return cleanUrl
  }
  return cleanUrl
}

export async function fetchMovementsFromSheet() {
  const url = getSheetUrl()
  if (!url) return { movements: [], configured: false }

  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) throw new Error(`Google Sheets respondió con HTTP ${response.status}`)
  const csv = await response.text()
  return { movements: parseCSV(csv), configured: true }
}

function normalize(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

function parseCSV(csv) {
  const rows = csv.trim().split(/\r?\n/).filter(Boolean).map(parseLine)
  if (rows.length < 2) return []

  const headers = rows[0].map(normalize)
  const find = (...names) => names.map(normalize).map(name => headers.indexOf(name)).find(index => index >= 0)
  const columns = {
    description: find('description', 'descripcion', 'concepto', 'nombre'),
    category: find('category', 'categoria'),
    type: find('type', 'tipo'),
    amount: find('amount', 'monto', 'valor'),
    date: find('date', 'fecha')
  }

  if (Object.values(columns).some(index => index === undefined)) {
    throw new Error('La hoja debe tener las columnas: description, category, type, amount y date')
  }

  return rows.slice(1).map(row => {
    const rawType = normalize(row[columns.type])
    const rawAmount = String(row[columns.amount] || '').replace(/[^\d,.-]/g, '').replace(',', '.')
    return {
      description: row[columns.description]?.trim() || 'Sin descripción',
      category: row[columns.category]?.trim() || 'Otros',
      type: rawType.includes('ingreso') || rawType.includes('income') ? 'income' : 'expense',
      amount: Number(rawAmount) || 0,
      date: row[columns.date]?.trim() || new Date().toISOString().slice(0, 10)
    }
  }).filter(item => item.amount > 0)
}

function parseLine(line) {
  const separator = line.includes(';') && !line.includes(',') ? ';' : ','
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i += 1 }
      else inQuotes = !inQuotes
    } else if (char === separator && !inQuotes) {
      result.push(current); current = ''
    } else current += char
  }
  result.push(current)
  return result
}
