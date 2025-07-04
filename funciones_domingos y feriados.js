
let pivotRows = [], dataRows = [], finalRows = [];



function showOverlay(message, success = true) {
  const overlay = document.getElementById('overlayMessage');
  const content = document.getElementById('overlayContent');
  content.textContent = message;
  content.style.color = success ? 'green' : 'red';
  overlay.style.display = 'flex';
}

function hideOverlay() {
  document.getElementById('overlayMessage').style.display = 'none';
}

// Permitir cerrar al hacer clic en cualquier parte del overlay
document.getElementById('overlayMessage').addEventListener('click', hideOverlay);

  function readWorkbook(file) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = e => {
        res(XLSX.read(new Uint8Array(e.target.result), {
          type: 'array',
          cellDates: true
        }));
      };
      fr.onerror = rej;
      fr.readAsArrayBuffer(file);
    });
  }

  function formatDateTime(d) {
    if (!(d instanceof Date)) return d;
    const D = d.getDate(), M = d.getMonth()+1, Y = d.getFullYear();
    const h = String(d.getHours()).padStart(2,'0'),
          m = String(d.getMinutes()).padStart(2,'0');
    return `${D}/${M}/${Y} ${h}:${m}:00`;
  }


//////////////////////////////////////////////////////////////////
  function buildTable(rows, targetId) {
  const c = document.getElementById(targetId);
  if (!rows.length) {
    c.innerHTML = '<p>— sin datos —</p>';
    const span = document.querySelector(`#${targetId}`).previousElementSibling?.querySelector('span');
    if (span) span.textContent = '';
    return;
  }
  let html = '<table><tbody>';
  rows.forEach(r => {
    html += '<tr>' + r.map((v, i) => {
      return `<td>${(i===0||i===1||i===2)? formatDateTime(v) : v}</td>`;
    }).join('') + '</tr>';
  });
  html += '</tbody></table>';
  c.innerHTML = html;

  // 💡 Actualiza contador de filas si corresponde
  const countId = {
    previewPivot: 'countPivot',
    previewData: 'countDatos',
    previewFinal: 'countFinal'
  }[targetId];

  if (countId) {
    document.getElementById(countId).textContent = `(${rows.length} filas)`;
  }
}

  // Carga Pivot
  document.getElementById('pivotFile').addEventListener('change', async e => {
    const wb = await readWorkbook(e.target.files[0]);
    const sh = wb.Sheets[wb.SheetNames[0]];
    pivotRows = XLSX.utils.sheet_to_json(sh, {
      header:1, defval:''
    }).slice(1);
    buildTable(pivotRows, 'previewPivot');
  });

  // Carga Datos
  document.getElementById('fileInput').addEventListener('change', async e => {
    const wb = await readWorkbook(e.target.files[0]);
    const sh = wb.Sheets[wb.SheetNames[0]];
    dataRows = XLSX.utils.sheet_to_json(sh, {
      header:1, defval:'', blankrows:false
    }).slice(1);
    buildTable(dataRows, 'previewData');
  });












  // Filtrar Cruzado domingos
 document.getElementById('btnCrossFilter').addEventListener('click', () => {
  console.log('⏳ Clic en Filtrar Cruzado');

  console.log('pivotRows.length =', pivotRows.length);
  console.log('dataRows.length  =', dataRows.length);

  if (!pivotRows.length || !dataRows.length) {
    console.warn('Faltan datos: carga ambos archivos primero.');
    alert('Carga ambos archivos antes de filtrar.');
    return;
  }

  // 1) Construir Set de empleados del pivot (índice 6)
  const pivotSet = new Set(pivotRows.map(r => r[6]));
  console.log('pivotSet:', Array.from(pivotSet));

  // 2) Filtrar y mapear
  finalRows = dataRows
    .filter(r => {
      const exists = pivotSet.has(r[7]);
      console.log(`Empleado ${r[7]} existe en pivot?`, exists);
      return exists;
    })
    .map(r => {
      const pr      = pivotRows.find(p => p[6] === r[7]) || [];
      const rawName = pr[4] || '';
      const partes  = rawName.split(':');
      const resto   = partes.slice(1).join(':').trim();
      const newName = resto
        ? `Día domingo trabajado: ${resto}`
        : 'Día domingo trabajado';

      return [
        r[0], r[1], r[2], r[3], r[4],
        newName,
        'Día domingo trabajado',
        r[7]
      ];
    });

  console.log('finalRows.length =', finalRows.length);
  console.table(finalRows);

finalRows.sort((a, b) => {
  const empA = (a[7] || '').toLowerCase();
  const empB = (b[7] || '').toLowerCase();
  return empA.localeCompare(empB);
});
  // 3) Mostrar la tabla
  buildTable(finalRows, 'previewFinal');
});









  // Filtrar Cruzado feriados

document.getElementById('btnFeriadoFilter').addEventListener('click', () => {
  if (!pivotRows.length || !dataRows.length) {
    return alert('Carga ambos archivos antes de filtrar.');
  }

  const pivotSet = new Set(pivotRows.map(r => r[6]));

  finalRows = dataRows
    .filter(r => pivotSet.has(r[7]))
    .map(r => {
      const pr = pivotRows.find(p => p[6] === r[7]) || [];
      const rawName = pr[4] || '';
      const partes = rawName.split(':');
      const resto  = partes.slice(1).join(':').trim();
      const newName = resto
        ? `Día Feriado Trabajado: ${resto}`
        : 'Día Feriado Trabajado';

      return [
        r[0], r[1], r[2], r[3], r[4],
        newName,
        'Día Feriado Trabajado',
        r[7]
      ];
    });

  finalRows.sort((a, b) => {
    const empA = (a[7] || '').toLowerCase();
    const empB = (b[7] || '').toLowerCase();
    return empA.localeCompare(empB);
  });

  buildTable(finalRows, 'previewFinal');
  // –– Validar procesados –
const pivotCount = pivotRows.length;
const finalCount = finalRows.length;
const msgEl      = document.getElementById('messageFinal');
});








document.getElementById('btnExportar').addEventListener('click', () => {
  if (!finalRows.length) {
    alert('Primero genera la tabla final.');
    return;
  }

  // Define los encabezados
  const headers = [
    'id', 'date_stop', 'date_start', 'duration',
    'state', 'name', 'work_entry_type_id', 'employee_id'
  ];

  // Combina encabezado + filas
  const worksheetData = [headers, ...finalRows];

  // Crea worksheet y libro
  const ws = XLSX.utils.aoa_to_sheet(worksheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Filtrado');

  // Exporta
  XLSX.writeFile(wb, 'tabla_final.xlsx');
});











