import { fetchMovementsFromSheet, getApiUrl, getSheetUrl, saveMovementsToSheet, saveSheetConnection } from './googleSheets.js'

const seed = [
  {description:'Supermercado', category:'Alimentación', type:'expense', amount:86.40, date:'2026-08-18'},
  {description:'Nómina mensual', category:'Salario', type:'income', amount:2400, date:'2026-08-15'},
  {description:'Metro y bus', category:'Transporte', type:'expense', amount:42.50, date:'2026-08-12'},
  {description:'Alquiler', category:'Vivienda', type:'expense', amount:780, date:'2026-08-01'},
  {description:'Cine con amigos', category:'Ocio', type:'expense', amount:28, date:'2026-08-05'}
]

let movements = JSON.parse(localStorage.getItem('saldo-movements') || 'null') || seed
let editingIndex = null

const oldPeriodButton = document.querySelector('#periodButton')
if (oldPeriodButton) {
  const periodSelect = document.createElement('select')
  periodSelect.id = 'periodSelect'
  periodSelect.className = 'period-button'
  periodSelect.innerHTML = '<option value="current">Este mes</option><option value="previous">Mes anterior</option><option value="all">Todos los movimientos</option>'
  oldPeriodButton.replaceWith(periodSelect)
}

const money = value => new Intl.NumberFormat('es-CO', {style:'currency', currency:'COP', maximumFractionDigits:0}).format(value).replace('\u00a0', ' ')
const dateText = date => new Intl.DateTimeFormat('es-ES', {day:'numeric', month:'short'}).format(new Date(`${date}T12:00:00`)).replace('.', '')
const categoryIcon = category => ({Alimentación:'🛒', Transporte:'▣', Vivienda:'⌂', Ocio:'◇', Salud:'✚', Salario:'↗', Freelance:'✦', Otros:'•'}[category] || '•')

function render() {
  const income = movements.filter(m => m.type === 'income').reduce((sum, m) => sum + Number(m.amount), 0)
  const expense = movements.filter(m => m.type === 'expense').reduce((sum, m) => sum + Number(m.amount), 0)
  document.querySelector('#balanceValue').textContent = money(income - expense)
  document.querySelector('#incomeValue').textContent = money(income)
  document.querySelector('#expenseValue').textContent = money(expense)
  document.querySelector('#categoryTotal').textContent = money(expense)

  const query = document.querySelector('#searchInput').value.toLowerCase()
  const type = document.querySelector('#typeFilter').value
  const period = document.querySelector('#periodSelect').value
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const previousDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const previousMonth = `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, '0')}`
  const selectedMonth = period === 'current' ? currentMonth : previousMonth
  const filtered = movements.map((movement, index) => ({...movement, index}))
    .filter(m => (type === 'all' || m.type === type) && (period === 'all' || m.date.startsWith(selectedMonth)) && m.description.toLowerCase().includes(query))
    .sort((a, b) => b.date.localeCompare(a.date))

  document.querySelector('#transactionList').innerHTML = filtered.length ? filtered.map(m => `
    <div class="transaction">
      <div class="transaction-icon ${m.category.toLowerCase()}">${m.icon || categoryIcon(m.category)}</div>
      <div class="transaction-info"><strong>${m.description}</strong><small>${m.category} · ${dateText(m.date)}</small></div>
      <div class="amount ${m.type}">${m.type === 'income' ? '+' : '−'} ${money(m.amount)}</div>
      <div class="transaction-actions"><button class="transaction-action edit-action" data-edit="${m.index}" aria-label="Editar movimiento">✎</button><button class="transaction-action delete-action" data-delete="${m.index}" aria-label="Eliminar movimiento">×</button></div>
    </div>`).join('') : '<p class="muted" style="padding:22px 0">No hay movimientos que coincidan.</p>'

  const categories = {}
  movements.filter(m => m.type === 'expense').forEach(m => { categories[m.category] = (categories[m.category] || 0) + Number(m.amount) })
  const sorted = Object.entries(categories).sort((a, b) => b[1] - a[1])
  document.querySelector('#categoryList').innerHTML = sorted.length ? sorted.map(([category, value]) => `<div class="category-row"><div class="category-meta"><span>${category}</span><small>${money(value)}</small></div><div class="bar"><i style="width:${Math.max(5, value / expense * 100)}%"></i></div></div>`).join('') : '<p class="muted">Aún no tienes gastos registrados.</p>'
  localStorage.setItem('saldo-movements', JSON.stringify(movements))
}

function openMovement(index = null) {
  editingIndex = index
  const form = document.querySelector('#movementForm')
  form.reset()
  document.querySelector('#movementTitle').textContent = index === null ? 'Añadir movimiento' : 'Editar movimiento'
  if (index === null) form.elements.date.value = new Date().toISOString().slice(0, 10)
  else Object.entries(movements[index]).forEach(([key, value]) => { if (form.elements[key]) form.elements[key].value = value })
  document.querySelector('#movementDialog').showModal()
}

document.querySelector('#addButton').addEventListener('click', () => openMovement())
document.querySelector('#movementForm').addEventListener('submit', async event => {
  event.preventDefault()
  const data = Object.fromEntries(new FormData(event.target))
  const movement = {...data, amount:Number(data.amount), icon:categoryIcon(data.category)}
  if (editingIndex === null) movements.push(movement)
  else movements[editingIndex] = movement
  editingIndex = null
  event.target.reset()
  document.querySelector('#movementDialog').close()
  render()
  await persistChanges()
})
document.querySelector('#closeDialogButton').addEventListener('click', () => document.querySelector('#movementDialog').close())
document.querySelector('#movementDialog').addEventListener('click', event => { if (event.target === event.currentTarget) event.currentTarget.close() })
document.querySelector('#transactionList').addEventListener('click', event => {
  const edit = event.target.closest('[data-edit]')
  const remove = event.target.closest('[data-delete]')
  if (edit) openMovement(Number(edit.dataset.edit))
  if (remove && confirm('¿Eliminar este movimiento?')) { movements.splice(Number(remove.dataset.delete), 1); render(); persistChanges() }
})
document.querySelector('#searchInput').addEventListener('input', render)
document.querySelector('#typeFilter').addEventListener('change', render)
document.querySelector('#periodSelect').addEventListener('change', render)
document.querySelector('#resetButton').addEventListener('click', async () => { movements = [...seed]; render(); await persistChanges() })
document.querySelectorAll('.nav-item').forEach(link => link.addEventListener('click', () => { document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active')); link.classList.add('active') }))

const csvEscape = value => `"${String(value ?? '').replaceAll('"', '""')}"`
document.querySelector('#exportButton').addEventListener('click', () => {
  const rows = [['Descripción', 'Categoría', 'Tipo', 'Monto', 'Fecha'], ...movements.map(m => [m.description, m.category, m.type, m.amount, m.date])]
  const csv = '\ufeff' + rows.map(row => row.map(csvEscape).join(';')).join('\r\n')
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'}), url = URL.createObjectURL(blob), link = document.createElement('a')
  link.href = url; link.download = `saldo-movimientos-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url)
})
document.querySelector('#importInput').addEventListener('change', event => {
  const file = event.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = async () => { movements = reader.result.replace(/^\ufeff/, '').split(/\r?\n/).filter(Boolean).slice(1).map(line => line.split(';').map(value => value.replace(/^"|"$/g, '').replaceAll('""', '"'))).filter(row => row.length >= 5 && row[0]).map(([description, category, type, amount, date]) => ({description, category, type, amount:Number(amount) || 0, date, icon:categoryIcon(category)})); render(); event.target.value = ''; await persistChanges() }
  reader.readAsText(file)
})

async function syncFromSheet(showMessage = true) {
  const status = document.querySelector('#syncStatus')
  try {
    status.textContent = 'Sincronizando...'
    const result = await fetchMovementsFromSheet()
    if (!result.configured) { status.textContent = 'Google Sheets no configurado'; return }
    movements = result.movements; render(); status.textContent = result.writable ? `Sincronizado · escritura activa` : `Solo lectura · ${new Date().toLocaleTimeString('es-CO', {hour:'2-digit', minute:'2-digit'})}`
  } catch (error) { status.textContent = 'Error al sincronizar'; if (showMessage) alert(error.message) }
}
async function persistChanges() {
  if (!getApiUrl()) { document.querySelector('#syncStatus').textContent = 'Cambio local · conecta Apps Script para guardarlo'; return }
  try { document.querySelector('#syncStatus').textContent = 'Guardando en Google Sheets...'; await saveMovementsToSheet(movements); document.querySelector('#syncStatus').textContent = 'Enviado a Google Sheets' }
  catch (error) { document.querySelector('#syncStatus').textContent = 'Error al guardar'; alert(error.message) }
}
document.querySelector('#syncButton').addEventListener('click', () => syncFromSheet())
document.querySelector('#connectSheetButton').addEventListener('click', () => { const csvUrl = prompt('Pega la URL CSV publicada de tu Google Sheet:', getSheetUrl()); if (csvUrl === null) return; const apiUrl = prompt('Pega la URL de tu Google Apps Script Web App para guardar cambios (opcional por ahora):', getApiUrl()); if (apiUrl === null) return; saveSheetConnection(csvUrl, apiUrl); syncFromSheet() })
syncFromSheet(false)
setInterval(() => { if (getSheetUrl()) syncFromSheet(false) }, 60000)
render()
