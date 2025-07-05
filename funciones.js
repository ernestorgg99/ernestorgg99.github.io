let hojaSeleccionada = "";
let datosCombinados = [];
let workbook;

document.getElementById('fileInput').addEventListener('change', (e) => {
  const archivos = Array.from(e.target.files);
   datosCombinados = [];

  const procesarArchivo = (archivo, callback) => {
    nombreArchivoOriginal = archivo.name.split('.').slice(0, -1).join('.').split('-')[0].trim();
    const reader = new FileReader();
    reader.onload = function(event) {
      const data = new Uint8Array(event.target.result);
      const libro = XLSX.read(data, { type: 'array' });

      const totalHojas = libro.SheetNames.length;
      const hojaIndex = totalHojas <= 4 ? 2 : 3;
      const hojaNombre = libro.SheetNames[hojaIndex];

      if (!hojaNombre) {
        alert(`El archivo ${archivo.name} no tiene suficientes hojas.`);
        callback();
        return;
      }

      const hoja = libro.Sheets[hojaNombre];
      let datos = XLSX.utils.sheet_to_json(hoja, { header: 1 }).slice(4);
      datos = transformarDatos(datos);
      datosCombinados.push(...datos);
      callback();
    };
    reader.readAsArrayBuffer(archivo);
  };

  const procesarTodos = (i = 0) => {
    if (i >= archivos.length) {
      datosCombinados.sort((a, b) => {
        const [d1, m1, y1] = (a[2] ?? '').split('/');
        const [d2, m2, y2] = (b[2] ?? '').split('/');
        return new Date(`${y1}-${m1}-${d1}`) - new Date(`${y2}-${m2}-${d2}`);
      });
      renderizarTabla(datosCombinados);
      return;
    }
    procesarArchivo(archivos[i], () => procesarTodos(i + 1));
  };

  procesarTodos();
});

function transformarDatos(datos) {
  const columnasOcultas = [0, 6, 7, 8, 9, 10, 11, 12];

  datos = datos.map(fila => fila.map((celda, i) => {
    if (i === 3 && celda) return detectarYFormatearFecha(celda);
    return celda;
  }));

  datos = datos.map(fila => fila.map((celda, i) => {
    if ((i === 4 || i === 5) && celda) {
      const texto = String(celda).replace(',', '.').trim();
      const decimal = parseFloat(texto);
      if (!isNaN(decimal) && texto.match(/^\d+(\.\d+)?$/)) {
        const totalHoras = decimal * 24;
        const horas = Math.floor(totalHoras);
        const minutos = Math.round((totalHoras - horas) * 60);
        return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
      }
      if (/^\d{1,2}:\d{1,2}$/.test(texto)) {
        const [h, m] = texto.split(':').map(t => t.padStart(2, '0'));
        return `${h}:${m}`;
      }
    }
    if (i === 2 && celda) {
      const numero = parseFloat(String(celda).replace(',', '.'));
      if (!isNaN(numero)) {
        const mes = Math.floor(numero);
        const dia = Math.round((numero - mes) * 100);
        const año = new Date().getFullYear();
        return `${dia.toString().padStart(2, '0')}/${mes.toString().padStart(2, '0')}/${año}`;
      }
    }
    return celda;
  }));

  datos = datos.map(fila => fila.filter((_, i) => !columnasOcultas.includes(i)));

  datos = datos.map(fila => fila.map(celda => celda === 'Falta' ? '-' : celda));

  datos = datos.map(fila => {
    const entrada = fila[3];
    const salida = fila[4];
    const horasTrabajadas = calcularHorasTrabajadas(entrada, salida);
    const estado = determinarEstado(entrada, salida);
    const horasExtras = calcularHorasExtras(horasTrabajadas);
    return [...fila, horasTrabajadas, estado, horasExtras];
  });

  datos = datos.map(fila => {
    const celda = fila[0];
    if (typeof celda === 'string') {
      const limpio = celda.replace(/\s+/g, '').replace(/[^\d]/g, '');
      fila[0] = limpio;
    }
    return fila;
  });

  const base = JSON.parse(localStorage.getItem('datosSeleccionados'));
  const columnasBase = base?.columnas || [];
  const filasBase = base?.filas || [];
  const mapaBase = new Map();
  filasBase.forEach(fila => mapaBase.set(fila[1], fila[0]));

  datos = datos.map(fila => {
    const idEditable = fila[0];
    const valorCoincidente = mapaBase.get(idEditable) || '';
    return [...fila, valorCoincidente];
  });

  datos = datos.filter(fila => !(fila[3]?.trim() === '-' && fila[4]?.trim() === '-'));

  return datos;
}

function detectarYFormatearFecha(celda) {
  if (typeof celda !== 'string') return celda;
  const valor = celda.trim();
  if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(valor)) {
    const [dd, mm, yyyy] = valor.split('.');
    return `${dd.padStart(2, '0')}/${mm.padStart(2, '0')}/${yyyy}`;
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(valor)) return valor;
  const decimal = parseFloat(valor.replace(',', '.'));
  if (!isNaN(decimal) && decimal < 13) {
    const mes = Math.floor(decimal);
    const dia = Math.round((decimal - mes) * 100);
    const año = new Date().getFullYear();
    return `${dia.toString().padStart(2, '0')}/${mes.toString().padStart(2, '0')}/${año}`;
  }
  return celda;
}

function calcularHorasTrabajadas(entrada, salida) {
  const normalizar = v => (v?.trim().toLowerCase() === 'falta' || v.trim() === '-' ? '-' : v.trim());
  entrada = normalizar(entrada);
  salida = normalizar(salida);
  if (entrada === '-' || salida === '-') return '-';
  if (!/^\d{2}:\d{2}$/.test(entrada) || !/^\d{2}:\d{2}$/.test(salida)) return '-';
  const [hEntrada, mEntrada] = entrada.split(':').map(Number);
  const [hSalida, mSalida] = salida.split(':').map(Number);
  const minutos = (hSalida * 60 + mSalida) - (hEntrada * 60 + mEntrada);
  if (minutos <= 0) return '00:00';
  const horas = Math.floor(minutos / 60);
  const minutosRestantes = minutos % 60;
  return `${horas.toString().padStart(2, '0')}:${minutosRestantes.toString().padStart(2, '0')}`;
}

function determinarEstado(entrada, salida) {
  const normalizar = valor => (valor?.toString().trim().toLowerCase() === 'falta' ? '-' : valor);
  entrada = normalizar(entrada);
  salida = normalizar(salida);
  if (entrada === '-' && salida !== '-') return 'Sin entrada';
  if (salida === '-' && entrada !== '-') return 'Sin salida';
  if (entrada === '-' && salida === '-') return 'Ausente';
  return 'Presente';
}

function calcularHorasExtras(horasTrabajadas) {
  if (!horasTrabajadas || horasTrabajadas === '-' || horasTrabajadas.toLowerCase() === 'falta') return '-';
  if (!/^\d{2}:\d{2}$/.test(horasTrabajadas)) return '-';
  const [h, m] = horasTrabajadas.split(':').map(Number);
  const minutosExtras = (h * 60 + m) - (9 * 60);
  if (minutosExtras <= 0) return '0:00';
  const horas = Math.floor(minutosExtras / 60);
  const minutos = minutosExtras % 60;
  return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
}

function renderizarTabla(datos) {
  const contenedor = document.getElementById('previewContainer');
  let html = '<h3>Contenido editable:</h3><table contenteditable="true">';
  datos.forEach(fila => {
    html += '<tr>';
    fila.forEach(celda => {
      html += `<td>${celda !== undefined ? celda : ''}</td>`;
    });
    html += '</tr>';
  });
  html += '</table>';
  contenedor.innerHTML = html;
}

// Filtrado automático por fecha
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('fechaDesde').addEventListener('change', filtrarPorRango);
  document.getElementById('fechaHasta').addEventListener('change', filtrarPorRango);
});

function construirFechaLocal(dateStr) {
  const [año, mes, día] = dateStr.split('-');
  return new Date(parseInt(año), parseInt(mes) - 1, parseInt(día));
}

function filtrarPorRango() {
  const desdeStr = document.getElementById('fechaDesde').value;
  const hastaStr = document.getElementById('fechaHasta').value;
  const desdeDate = new Date(desdeStr);
  const hastaDate = new Date(hastaStr);

  const diffMs = hastaDate - desdeDate;
  const diffDays = diffMs / (1000 * 60 * 60 * 24) + 1;
  if (diffDays > 7) {
    mostrarMensaje("Has seleccionado un rango mayor a 7 días. El cálculo puede demorar. Puedes continuar.");
  }

  const filas = document.querySelectorAll('#previewContainer table tr');
  filas.forEach((fila, index) => {
    const celdas = fila.querySelectorAll('td');
    if (celdas.length === 0) return;
    const fechaTexto = celdas[2]?.innerText;
    if (!fechaTexto) return;
    const [dia, mes, año] = fechaTexto.split('/');
    const fechaFila = new Date(`${año}-${mes}-${dia}`);
    fila.style.display = (fechaFila >= desdeDate && fechaFila <= hastaDate) ? '' : 'none';
  });
}

function mostrarMensaje(mensaje) {
  if (document.getElementById('mensajeEmergente')) return;
  const div = document.createElement('div');
  div.id = 'mensajeEmergente';
  div.style.cssText = `
    position: fixed;
    top: 400px;
    right: 100px;
    background: #f1c40f;
    color: #222;
    padding: 100px 200px;
    border-radius: 20px;
    font-size: 25px;
    box-shadow: 0 150px 250px rgba(0,0,0,0.2);
    z-index: 9999;
  `;
  div.innerHTML = `
    <strong>¡Atención!</strong><br>${mensaje}
    <button onclick="this.parentElement.remove()" style="margin-left: 20px;">Cerrar</button>
  `;
  document.body.appendChild(div);
}

function agruparTabla() {
  const desdeStr = document.getElementById('fechaDesde').value;
  const hastaStr = document.getElementById('fechaHasta').value;

  if (!desdeStr || !hastaStr) {
    alert("Por favor selecciona ambas fechas.");
    return;
  }

  // Convertir fechas de entrada a objetos Date sin hora
  const desdeObj = new Date(desdeStr);
  const hastaObj = new Date(hastaStr);

  // Limpiar hora para comparar solo fechas
  function limpiarHora(fecha) {
    return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  }

  const desde = limpiarHora(desdeObj);
  const hasta = limpiarHora(hastaObj);

  const desdeFinal = `${desdeStr} 17:00:00`;
  const hastaFinal = `${hastaStr} 23:59:00`;

  const filasDOM = document.querySelectorAll('#previewContainer table tr');
  const agrupados = {};

  filasDOM.forEach(fila => {
    if (fila.style.display === 'none') return;

    const celdas = fila.querySelectorAll('td');
    if (celdas.length === 0) return;

    const id = celdas[0]?.innerText.trim();
    const fechaTexto = celdas[2]?.innerText?.trim();

    if (!id || !fechaTexto || !fechaTexto.includes('/')) return;

    const partesFecha = fechaTexto.split('/');
    if (partesFecha.length !== 3) return;

    const [dd, mm, yyyy] = partesFecha;
    const fechaObj = limpiarHora(new Date(`${yyyy}-${mm}-${dd}`));

    // ✅ Comparar solo fechas, incluyendo el mismo día "desde" y "hasta"
    if (fechaObj < desde || fechaObj > hasta) return;

    if (!agrupados[id]) agrupados[id] = [];
    agrupados[id].push(celdas);
  });

  const resultado = [];

  Object.entries(agrupados).forEach(([id, filas]) => {
    let totalMin = 0;

    filas.forEach(celdas => {
      const extras = celdas[7]?.innerText.trim();
      if (extras && /^\d{1,2}:\d{2}$/.test(extras)) {
        const [h, m] = extras.split(':').map(Number);
        totalMin += (h * 60 + m);
      }
    });

    // ✅ Aplicar límite si se exceden 600 minutos
    if (totalMin >= 600) {
      totalMin = 570;
    }

    const horas = Math.floor(totalMin / 60);
    const minutos = totalMin % 60;
    const duracion = (horas + minutos / 60).toFixed(2);

    const nombre = filas[0][9]?.innerText.trim() ?? '';
    const empleado = filas[0][8]?.innerText.trim() ?? '';

    resultado.push([
      desdeFinal,
      hastaFinal,
      duracion,
      'Borrador',
      `Horas extras diurnas: ${empleado}`,
      'Horas extras diurnas',
      empleado
    ]);
  });

  // Renderizar tabla resumen
  const contenedor = document.getElementById('previewContainer');
  let html = '<h3>Resumen agrupado:</h3><table><thead><tr>';
  const headers = ['Desde', 'A', 'Duración', 'Estado', 'Nombre', 'Tipo de entrada de trabajo', 'Empleado'];
  headers.forEach(h => html += `<th>${h}</th>`);
  html += '</tr></thead><tbody>';

  resultado.forEach(fila => {
    html += '<tr>';
    fila.forEach(celda => html += `<td>${celda}</td>`);
    html += '</tr>';
  });

  html += '</tbody></table>';
  contenedor.innerHTML = html;
}

function exportarxlsx() {
  const tabla = document.querySelector('#previewContainer table');
  if (!tabla) {
    alert("No hay tabla para exportar.");
    return;
  }
  const datos = Array.from(tabla.rows).map(row =>
    Array.from(row.cells).map(cell => cell.innerText)
  );
  const nuevaHoja = XLSX.utils.aoa_to_sheet(datos);
  const nuevoLibro = XLSX.utils.book_new();
  const nombreExportado = `${nombreArchivoOriginal}_HE.xlsx`;
  XLSX.utils.book_append_sheet(nuevoLibro, nuevaHoja, "Resumen");
  XLSX.writeFile(nuevoLibro, nombreExportado, { bookType: "xlsx" });
}
