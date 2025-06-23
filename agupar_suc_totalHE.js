const HEADERS = ["Desde", "A", "Duración", "Estado", "Nombre", "Tipo de entrada de trabajo", "Empleado"];
    const COLUMN_CLASSES = ["col-desde", "col-a", "col-duracion", "col-estado", "col-nombre", "col-tipo", "col-empleado"];

    document.getElementById('input-multiple').addEventListener('change', function (e) {
      const contenedor = document.getElementById('contenedor-tablas');
      contenedor.innerHTML = '';

      Array.from(e.target.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = function (event) {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

          const tabla = document.createElement('table');
          const thead = document.createElement('thead');
          const trHead = document.createElement('tr');

          HEADERS.forEach((header, i) => {
            const th = document.createElement('th');
            th.textContent = header;
            th.classList.add(COLUMN_CLASSES[i]);
            trHead.appendChild(th);
          });
          thead.appendChild(trHead);
          tabla.appendChild(thead);

          const tbody = document.createElement('tbody');
          rawRows.forEach(row => {
            const tr = document.createElement('tr');
            HEADERS.forEach((header, i) => {
              const td = document.createElement('td');
              td.textContent = row[header] ?? '';
              td.classList.add(COLUMN_CLASSES[i]);
              tr.appendChild(td);
            });
            tbody.appendChild(tr);
          });
          tabla.appendChild(tbody);

          const titulo = document.createElement('h3');
          titulo.textContent = `Archivo: ${file.name}`;
          contenedor.appendChild(titulo);
          contenedor.appendChild(tabla);
        };
        reader.readAsArrayBuffer(file);
      });
    });




function agruparPorEmpleadoConDuracionMaxima(data) {
  const resultado = {};
  data.forEach(row => {
    const empleado = row["Empleado"] || "";
    const duracion = parseFloat(row["Duración"]) || 0;

    if (!resultado[empleado]) {
      resultado[empleado] = { ...row, DuraciónSumada: duracion, DuraciónMaxima: duracion };
    } else {
      resultado[empleado].DuraciónSumada += duracion;

      if (duracion > resultado[empleado].DuraciónMaxima) {
        resultado[empleado] = { ...row, DuraciónSumada: resultado[empleado].DuraciónSumada, DuraciónMaxima: duracion };
      }
    }
  });

  // Postprocesamiento: ajustar duración final a 9.30 si se pasa de 10
  return Object.values(resultado).map(r => {
    let total = r.DuraciónSumada;
    r["Duración"] = total > 10 ? 9.30 : total.toFixed(2);
    return r;
  });
}



let datosCombinados = [];

Array.from(e.target.files).forEach((file, index, array) => {
  const reader = new FileReader();
  reader.onload = function (event) {
    const data = new Uint8Array(event.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

    datosCombinados = datosCombinados.concat(rows);

    // Esperar hasta que todos los archivos se hayan procesado
    if (index === array.length - 1) {
      const agrupados = agruparPorEmpleadoConDuracionMaxima(datosCombinados);
      pintarTablaUnica(agrupados);
    }
  };
  reader.readAsArrayBuffer(file);
});









function pintarTablaUnica(data) {
  const contenedor = document.getElementById('contenedor-tablas');
  contenedor.innerHTML = '';

  const tabla = document.createElement('table');
  const thead = document.createElement('thead');
  const trHead = document.createElement('tr');
  HEADERS.forEach((header, i) => {
    const th = document.createElement('th');
    th.textContent = header;
    th.classList.add(COLUMN_CLASSES[i]);
    trHead.appendChild(th);
  });
  thead.appendChild(trHead);
  tabla.appendChild(thead);

  const tbody = document.createElement('tbody');
  data.forEach(row => {
    const tr = document.createElement('tr');
    HEADERS.forEach((header, i) => {
      const td = document.createElement('td');
      td.textContent = row[header] ?? '';
      td.classList.add(COLUMN_CLASSES[i]);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  tabla.appendChild(tbody);
  contenedor.appendChild(tabla);
}