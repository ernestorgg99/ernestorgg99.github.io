let datosOriginales = [];
let columnasDisponibles = [];

document.getElementById('fileInput').addEventListener('change', function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const hoja = workbook.Sheets[workbook.SheetNames[0]];
    const registros = XLSX.utils.sheet_to_json(hoja, { header: 1 });

    columnasDisponibles = registros[0];             // Encabezados
    datosOriginales = registros.slice(1);           // Filas
    generarCheckboxes();
  };
  reader.readAsArrayBuffer(file);
});

function generarCheckboxes() {
  const selector = document.getElementById('columnSelector');
  selector.innerHTML = '';

  columnasDisponibles.forEach((col, index) => {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = index;
    checkbox.id = `col_${index}`;

    const label = document.createElement('label');
    label.htmlFor = `col_${index}`;
    label.innerText = col;

    const br = document.createElement('br');

    selector.appendChild(checkbox);
    selector.appendChild(label);
    selector.appendChild(br);
  });
}

function mostrarDatos() {
  const seleccionadas = Array.from(document.querySelectorAll('#columnSelector input:checked'))
    .map(cb => parseInt(cb.value));

  const thead = document.getElementById('tablaHead');
  const tbody = document.getElementById('tablaBody');

  thead.innerHTML = '';
  tbody.innerHTML = '';

  // Encabezados
  seleccionadas.forEach(i => {
    const th = document.createElement('th');
    th.textContent = columnasDisponibles[i];
    thead.appendChild(th);
  });

  // Filas
  datosOriginales.forEach(fila => {
    const tr = document.createElement('tr');
    seleccionadas.forEach(i => {
      const td = document.createElement('td');
      td.textContent = fila[i] ?? '';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}
function mostrarDatos() {
  const seleccionadas = Array.from(document.querySelectorAll('#columnSelector input:checked'))
    .map(cb => parseInt(cb.value));

  const thead = document.getElementById('tablaHead');
  const tbody = document.getElementById('tablaBody');

  thead.innerHTML = '';
  tbody.innerHTML = '';

  // Encabezados
  const columnasElegidas = seleccionadas.map(i => columnasDisponibles[i]);
  columnasElegidas.forEach(nombre => {
    const th = document.createElement('th');
    th.textContent = nombre;
    thead.appendChild(th);
  });

  // Filas
  const datosFiltrados = datosOriginales.map(fila =>
    seleccionadas.map(i => fila[i] ?? '')
  );

  datosFiltrados.forEach(fila => {
    const tr = document.createElement('tr');
    fila.forEach(valor => {
      const td = document.createElement('td');
      td.textContent = valor;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  // Guardar en localStorage
  localStorage.setItem('datosSeleccionados', JSON.stringify({
    columnas: columnasElegidas,
    filas: datosFiltrados
  }));
}
document.addEventListener('DOMContentLoaded', () => {
  const guardado = localStorage.getItem('datosSeleccionados');
  if (guardado) {
    const { columnas, filas } = JSON.parse(guardado);

    const thead = document.getElementById('tablaHead');
    const tbody = document.getElementById('tablaBody');

    thead.innerHTML = '';
    tbody.innerHTML = '';

    columnas.forEach(nombre => {
      const th = document.createElement('th');
      th.textContent = nombre;
      thead.appendChild(th);
    });

    filas.forEach(fila => {
      const tr = document.createElement('tr');
      fila.forEach(valor => {
        const td = document.createElement('td');
        td.textContent = valor;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }
});

//validar si hay informacion cargada
document.addEventListener('DOMContentLoaded', () => {
  const guardado = localStorage.getItem('datosSeleccionados');

  if (guardado) {
    const { columnas, filas } = JSON.parse(guardado);

    // Mostrar tabla de forma inmediata
    const thead = document.getElementById('tablaHead');
    const tbody = document.getElementById('tablaBody');

    thead.innerHTML = '';
    tbody.innerHTML = '';

    columnas.forEach(nombre => {
      const th = document.createElement('th');
      th.textContent = nombre;
      thead.appendChild(th);
    });

    filas.forEach(fila => {
      const tr = document.createElement('tr');
      fila.forEach(valor => {
        const td = document.createElement('td');
        td.textContent = valor;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    console.log("Se cargaron datos persistentes desde localStorage ✅");
  } else {
    console.warn("No hay datos guardados en localStorage. Por favor carga un archivo.");
  }
}); 

//mostrar un mensaje visual si no hay datos cargados
if (!guardado) {
  const tbody = document.getElementById('tablaBody');
  const tr = document.createElement('tr');
  const td = document.createElement('td');
  td.colSpan = 10;
  td.textContent = "No hay datos guardados. Por favor, selecciona un archivo.";
  td.style.textAlign = 'center';
  td.style.padding = '10px';
  tr.appendChild(td);
  tbody.appendChild(tr);
}