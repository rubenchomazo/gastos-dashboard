const seed = [
  {description:'Supermercado', category:'Alimentación', type:'expense', amount:86.40, date:'2026-08-18', icon:'🛒'},
  {description:'Nómina mensual', category:'Salario', type:'income', amount:2400, date:'2026-08-15', icon:'↗'},
  {description:'Metro y bus', category:'Transporte', type:'expense', amount:42.50, date:'2026-08-12', icon:'▣'},
  {description:'Alquiler', category:'Vivienda', type:'expense', amount:780, date:'2026-08-01', icon:'⌂'},
  {description:'Cine con amigos', category:'Ocio', type:'expense', amount:28, date:'2026-08-05', icon:'◇'}
];
let movements = JSON.parse(localStorage.getItem('saldo-movements') || 'null') || seed;
const money = value => new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(value).replace(' ',' ');
const dateText = date => new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'short'}).format(new Date(`${date}T12:00:00`)).replace('.','');
const categoryIcon = c => ({Alimentación:'🛒',Transporte:'▣',Vivienda:'⌂',Ocio:'◇',Salud:'✚',Salario:'↗',Freelance:'✦',Otros:'•'}[c] || '•');
function render(){
  const income=movements.filter(m=>m.type==='income').reduce((a,m)=>a+Number(m.amount),0), expense=movements.filter(m=>m.type==='expense').reduce((a,m)=>a+Number(m.amount),0);
  document.querySelector('#balanceValue').textContent=money(income-expense); document.querySelector('#incomeValue').textContent=money(income); document.querySelector('#expenseValue').textContent=money(expense); document.querySelector('#categoryTotal').textContent=money(expense);
  const query=document.querySelector('#searchInput').value.toLowerCase(), filter=document.querySelector('#typeFilter').value;
  const filtered=movements.filter(m=>(filter==='all'||m.type===filter)&&m.description.toLowerCase().includes(query)).sort((a,b)=>b.date.localeCompare(a.date));
  document.querySelector('#transactionList').innerHTML=filtered.length?filtered.map(m=>`<div class="transaction"><div class="transaction-icon ${m.category.toLowerCase()}">${m.icon||categoryIcon(m.category)}</div><div class="transaction-info"><strong>${m.description}</strong><small>${m.category} · ${dateText(m.date)}</small></div><div class="amount ${m.type}">${m.type==='income'?'+':'−'} ${money(m.amount)}</div></div>`).join(''):'<p class="muted" style="padding:22px 0">No hay movimientos que coincidan.</p>';
  const cats={}; movements.filter(m=>m.type==='expense').forEach(m=>cats[m.category]=(cats[m.category]||0)+Number(m.amount)); const sorted=Object.entries(cats).sort((a,b)=>b[1]-a[1]);
  document.querySelector('#categoryList').innerHTML=sorted.length?sorted.map(([c,v])=>`<div class="category-row"><div class="category-meta"><span>${c}</span><small>${money(v)}</small></div><div class="bar"><i style="width:${Math.max(5,v/expense*100)}%"></i></div></div>`).join(''):'<p class="muted">Aún no tienes gastos registrados.</p>';
  localStorage.setItem('saldo-movements',JSON.stringify(movements));
}
document.querySelector('#addButton').addEventListener('click',()=>{document.querySelector('[name=date]').value=new Date().toISOString().slice(0,10);document.querySelector('#movementDialog').showModal()});
document.querySelector('#movementForm').addEventListener('submit',e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.target));movements.push({...data,amount:Number(data.amount),icon:categoryIcon(data.category)});e.target.reset();document.querySelector('#movementDialog').close();render()});
document.querySelector('#searchInput').addEventListener('input',render); document.querySelector('#typeFilter').addEventListener('change',render);
document.querySelector('#resetButton').addEventListener('click',()=>{movements=[...seed];render()});

// Navegación suave y estado activo del menú lateral.
document.querySelectorAll('.nav-item').forEach(link=>link.addEventListener('click',()=>{
  document.querySelectorAll('.nav-item').forEach(item=>item.classList.remove('active'));
  link.classList.add('active');
}));

// Exporta los movimientos en un CSV compatible con Excel y Google Sheets.
const csvEscape=value=>`"${String(value??'').replaceAll('"','""')}"`;
document.querySelector('#exportButton').addEventListener('click',()=>{
  const rows=[['Descripción','Categoría','Tipo','Monto','Fecha'],...movements.map(m=>[m.description,m.category,m.type,m.amount,m.date])];
  const csv='\ufeff'+rows.map(row=>row.map(csvEscape).join(';')).join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}), url=URL.createObjectURL(blob), link=document.createElement('a');
  link.href=url; link.download=`saldo-movimientos-${new Date().toISOString().slice(0,10)}.csv`; link.click(); URL.revokeObjectURL(url);
});

// Permite recuperar un CSV exportado previamente.
document.querySelector('#importInput').addEventListener('change',event=>{
  const file=event.target.files[0]; if(!file) return;
  const reader=new FileReader(); reader.onload=()=>{
    const lines=reader.result.replace(/^\\ufeff/,'').split(/\\r?\\n/).filter(Boolean).slice(1);
    const imported=lines.map(line=>line.split(';').map(v=>v.replace(/^"|"$/g,'').replaceAll('""','"'))).filter(row=>row.length>=5&&row[0]);
    movements=imported.map(([description,category,type,amount,date])=>({description,category,type,amount:Number(amount)||0,date,icon:categoryIcon(category)}));
    render(); event.target.value='';
  }; reader.readAsText(file);
});
render();
