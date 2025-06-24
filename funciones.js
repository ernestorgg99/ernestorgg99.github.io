 let workbook;
let hojaSeleccionada = "";

document.getElementById('fileInput').addEventListener('change', (e) => {
  const archivo = e.target.files[0];
  // 👇 Esto la hace accesible globalmente
  window.nombreArchivoOriginal = archivo.name.split('.').slice(0, -1).join('.');
  
  const reader = new FileReader();
  reader.onload = function(event) {
    const data = new Uint8Array(event.target.result);
    workbook = XLSX.read(data, { type: 'array' });



    // Verificar si el libro tiene al menos 3 hojas
    const totalHojas = workbook.SheetNames.length;

// Si hay 4 hojas o menos, usar la hoja 3 (índice 2)
// Si hay 5 hojas o más, usar la hoja 4 (índice 3)
let hojaObjetivoIndex = totalHojas <= 4 ? 2 : 3;

// Verifica que la hoja exista para evitar errores
if (workbook.SheetNames[hojaObjetivoIndex]) {
  const hojaNombre = workbook.SheetNames[hojaObjetivoIndex];
  hojaSeleccionada = hojaNombre;
  previsualizarHoja(hojaNombre);
} else {
  alert("No se encontró la hoja esperada. Revisa que el archivo tenga suficientes hojas.");
}

   //  mostrarSelectorHojas();  (esta funcion despliega una la lista de hojas para seleccionarlas)
  };
  
  reader.readAsArrayBuffer(e.target.files[0]);
});



//prueba detectar campo
function detectarYFormatearFecha(celda) {
  if (typeof celda !== 'string') return celda;

  const valor = celda.trim();

  // Caso: DD.MM.YYYY → DD/MM/YYYY
  if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(valor)) {
    const [dd, mm, yyyy] = valor.split('.');
    return `${dd.padStart(2, '0')}/${mm.padStart(2, '0')}/${yyyy}`;
  }

  // Caso: DD/MM/YYYY → ya está bien
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(valor)) {
    return valor;
  }

  // Caso: MM.DD (decimal como 6.22)
  const decimal = parseFloat(valor.replace(',', '.'));
  if (!isNaN(decimal) && decimal < 13) {
    const mes = Math.floor(decimal);
    const dia = Math.round((decimal - mes) * 100);
    const año = new Date().getFullYear();
    return `${dia.toString().padStart(2, '0')}/${mes.toString().padStart(2, '0')}/${año}`;
  }

  return celda; // No es fecha conocida
}




// Asegúra de tener definida la función previsualizarHoja
// Ejemplo:
function previsualizarHoja(nombre) {
  console.log(`Previsualizando la hoja: ${nombre}`);
  hojaSeleccionada = nombre;


  //Funcion previsualizar hoja
}

    function previsualizarHoja(nombreHoja) {
  hojaSeleccionada = nombreHoja;
  const hoja = workbook.Sheets[nombreHoja];




  // Obtener los datos y omitir las primeras 5 filas
  let datos = XLSX.utils.sheet_to_json(hoja, { header: 1 }).slice(5);

datos = datos.map(fila => fila.map((celda, i) => {



  // Columna 4 (índice 3): aplicar detección automática de fecha
if (i === 3 && celda !== undefined && celda !== null) {
  return detectarYFormatearFecha(celda);
}

  return celda;
}));



  // Procesar datos por columnas específicas
  datos = datos.map(fila => fila.map((celda, i) => {

    
    //  Columnas 5 y 6 (índices 4 y 5) → decimal a HH:MM
    if ((i === 4 || i === 5) && celda !== undefined && celda !== null) {
  const texto = String(celda).replace(',', '.').trim();

  // Caso 1: formato decimal tipo 0.25
  const decimal = parseFloat(texto);
  if (!isNaN(decimal) && texto.match(/^\d+(\.\d+)?$/)) {
    const totalHoras = decimal * 24;
    const horas = Math.floor(totalHoras);
    const minutos = Math.round((totalHoras - horas) * 60);
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
  }

  // Caso 2: ya viene en formato HH:MM pero sin ceros
  if (/^\d{1,2}:\d{1,2}$/.test(texto)) {
    const [h, m] = texto.split(':').map(t => t.padStart(2, '0'));
    return `${h}:${m}`;
  }

  return celda; // dejar tal cual si no coincide con nada
}

    // } Columna 3 (índice 2): decimal tipo MM.DD a DD/MM/YYYY
    if (i === 2 && celda !== undefined && celda !== null) {
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
  const columnasOcultas = [0, 6, 7, 8, 9, 10, 11, 12];
datos = datos.map(fila => fila.filter((_, i) => !columnasOcultas.includes(i)));




//calcular horas trabajadas indice 4-3
  const calcularHorasTrabajadas = (entrada, salida) => {
  if (!entrada || !salida) return '-';

  // Unificar valores tipo "falta" o guiones
  const normalizar = v => (v.trim().toLowerCase() === 'falta' || v.trim() === '-' ? '-' : v.trim());
  entrada = normalizar(entrada);
  salida  = normalizar(salida);

  // Si alguno está ausente, no se calcula
  if (entrada === '-' || salida === '-') return '-';

  // Validar formato HH:MM
  if (!/^\d{2}:\d{2}$/.test(entrada) || !/^\d{2}:\d{2}$/.test(salida)) return '-';

  const [hEntrada, mEntrada] = entrada.split(':').map(Number);
  const [hSalida, mSalida]   = salida.split(':').map(Number);

  const minutos = (hSalida * 60 + mSalida) - (hEntrada * 60 + mEntrada);
  if (minutos <= 0) return '00:00'; // por si alguien se registra al revés

  const horas = Math.floor(minutos / 60);
  const minutosRestantes = minutos % 60;

  return `${horas.toString().padStart(2, '0')}:${minutosRestantes.toString().padStart(2, '0')}`;
};








// limpiar "falta" a "-""
datos = datos.map(fila =>
  fila.map(celda => celda === 'Falta' ? '-' : celda)
);


//determinar estado de entrada y salida
const determinarEstado = (entrada, salida) => {

  // Normalizamos
  const normalizar = valor => (valor?.toString().trim().toLowerCase() === 'falta' ? '-' : valor);

  entrada = normalizar(entrada);
  salida  = normalizar(salida);

  if (entrada === '-' && salida !== '-') return 'Sin entrada';
  if (salida === '-' && entrada !== '-') return 'Sin salida';
  if (entrada === '-' && salida === '-') return 'Ausente';

  return 'Presente';
};

//calcular horas extras
const calcularHorasExtras = (horasTrabajadas) => {
  if (!horasTrabajadas || horasTrabajadas === '-' || horasTrabajadas.toLowerCase() === 'falta') {
    return '-';
  }

  // Validar que tenga formato correcto HH:MM
  if (!/^\d{2}:\d{2}$/.test(horasTrabajadas)) return '-';

  const [h, m] = horasTrabajadas.split(':').map(Number);
  const minutosExtras = (h * 60 + m) - (9 * 60); // jornada base: 9 horas

  if (minutosExtras <= 0) return '0:00';

  const horas = Math.floor(minutosExtras / 60);
  const minutos = minutosExtras % 60;
  return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
};





//integrar calculos a la tabla
datos = datos.map(fila => {
  const entrada = fila[3]; // Índice 3
  const salida = fila[4];  // Índice 4

  const horasTrabajadas = calcularHorasTrabajadas(entrada, salida);
  const estado = determinarEstado(entrada, salida);
  const horasExtras = calcularHorasExtras(horasTrabajadas);

  return [...fila, horasTrabajadas, estado, horasExtras]; // Agregar nuevas columnas
});

//Ordenar tabla editable por fecha
// Ordenar por fecha (columna índice 2)
datos.sort((a, b) => {
  const [d1, m1, y1] = (a[2] ?? '').split('/');
  const [d2, m2, y2] = (b[2] ?? '').split('/');

  const fechaA = new Date(`${y1}-${m1}-${d1}`);
  const fechaB = new Date(`${y2}-${m2}-${d2}`);

  return fechaA - fechaB; // Ascendente: más antiguo primero
});

// Limpiar columna índice 0: eliminar espacios y letras
datos = datos.map(fila => {
  const celda = fila[0];
  if (typeof celda === 'string') {
    const limpio = celda.replace(/\s+/g, '').replace(/[^\d]/g, '');
    fila[0] = limpio;
  }
  return fila;
});


 //recuperar la tabla desde la base en local storage
 const base = JSON.parse(localStorage.getItem('datosSeleccionados'));
const columnasBase = base?.columnas || [];
const filasBase = base?.filas || [];

// Suponiendo que columnasBase[1] es el campo de identificación
const mapaBase = new Map();
filasBase.forEach(fila => {
  const identificacion = fila[1]; // índice 1 = identificación
  const valorAsociado = fila[0];  // índice 0 = valor que quieres mostrar
  mapaBase.set(identificacion, valorAsociado);
});

datos = datos.map(fila => {
  const idEditable = fila[0]; // índice 0 de la tabla editable
  const valorCoincidente = mapaBase.get(idEditable) || ''; // si no hay coincidencia, vacío
  return [...fila, valorCoincidente]; // agregamos la nueva columna
});






// Eliminar filas donde entrada (índice 3) y salida (índice 4) son ambos "-"
datos = datos.filter(fila => {
  const entrada = fila[3]?.toString().trim();
  const salida  = fila[4]?.toString().trim();
  return !(entrada === '-' && salida === '-');
});





  // Renderizar la tabla visualmente
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

//funcion filtrar por rango
// Antes de aplicar el nuevo filtro, mostrar todas las filas
document.querySelectorAll('#previewContainer table tr').forEach(fila => {
  fila.style.display = '';
});

function filtrarPorRango() {
  const desdeStr = document.getElementById('fechaDesde').value;
const hastaStr = document.getElementById('fechaHasta').value;

const desdeDate = new Date(desdeStr);
const hastaDate = new Date(hastaStr);

//  INSERTA AQUÍ
const diffMs = hastaDate - desdeDate;
const diffDays = diffMs / (1000 * 60 * 60 * 24) + 1;

if (diffDays > 7) {
  mostrarMensaje("Has seleccionado un rango mayor a 7 días. El cálculo puede demorar. Puedes continuar.");
}





// mensaje si la seleccion es superior a 7 dias


function mostrarMensaje(mensaje) {
  if (document.getElementById('mensajeEmergente')) return;

  const div = document.createElement('div');
  div.id = 'mensajeEmergente';
  div.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #f1c40f;
    color: #222;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    z-index: 9999;
  `;
  div.innerHTML = `
    <strong>¡Atención!</strong><br>${mensaje}
    <button onclick="this.parentElement.remove()" style="margin-left: 20px;">Cerrar</button>
  `;

  document.body.appendChild(div);
}


  // Recorremos la tabla y ocultamos filas fuera del rango
  const filas = document.querySelectorAll('#previewContainer table tr');

  filas.forEach((fila, index) => {
    
    // Saltar encabezado si lo tienes
    const celdas = fila.querySelectorAll('td');
    if (celdas.length === 0) return;

    const fechaTexto = celdas[2]?.innerText; // índice 2 = columna 3
    if (!fechaTexto) return;

    const [dia, mes, año] = fechaTexto.split('/');
    const fechaFila = new Date(`${año}-${mes}-${dia}`);

    if (fechaFila >= desdeDate && fechaFila <= hastaDate) {
      fila.style.display = '';
    } else {
      fila.style.display = 'none';
    }
  });
}

//construir fecha local
function construirFechaLocal(dateStr) {
  const [año, mes, día] = dateStr.split('-');
  return new Date(parseInt(año), parseInt(mes) - 1, parseInt(día));
}

// agrupar a formato final
 function agruparTabla() {
 const desdeStr = document.getElementById('fechaDesde').value;
const hastaStr = document.getElementById('fechaHasta').value;

const desdeObj = construirFechaLocal(desdeStr);
const hastaObj = construirFechaLocal(hastaStr);

  if (!desdeStr || !hastaStr) {
    alert("Por favor selecciona ambas fechas.");
    return;
  }

  // Convertir al formato deseado con hora fija
  function formatearFechaHora(fechaObj, horaStr) {
  const yyyy = fechaObj.getFullYear();
  const mm = String(fechaObj.getMonth() + 1).padStart(2, '0');
  const dd = String(fechaObj.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${horaStr}`;
}

const desdeFinal = formatearFechaHora(desdeObj, '17:00:00');
const hastaFinal = formatearFechaHora(desdeObj, '23:59:00');






  const filasDOM = document.querySelectorAll('#previewContainer table tr');
  const agrupados = {};

  filasDOM.forEach(fila => {
    if (fila.style.display === 'none') return;

    const celdas = fila.querySelectorAll('td');
    if (celdas.length === 0) return;

    const id = celdas[0]?.innerText.trim(); // Índice 0: ID
    const fecha = celdas[2]?.innerText.trim(); // Índice 2: Fecha (DD/MM/YYYY)
    if (!id || !fecha) return;

    const [dd, mm, yyyy] = fecha.split('/');
    const fechaObj = new Date(`${yyyy}-${mm}-${dd}`);
    const desde = new Date(desdeStr);
    const hasta = new Date(hastaStr);
    if (fechaObj < desde || fechaObj > hasta) return;

    if (!agrupados[id]) agrupados[id] = [];
    agrupados[id].push(celdas);
  });

  const resultado = [];

  Object.entries(agrupados).forEach(([id, filas]) => {
    let totalMin = 0;
    filas.forEach(celdas => {
      const extras = celdas[7]?.innerText.trim(); // índice 7: horas extras
      if (extras && extras.includes(':')) {
        const [h, m] = extras.split(':').map(Number);
        totalMin += (h * 60 + m);
      }
    });

    let horas = Math.floor(totalMin / 60);
let minutos = totalMin % 60;

// Limitar a 09:30 si supera las 10:00
if (horas > 10 || (horas === 10 && minutos > 0)) {
  horas = 9;
  minutos = 30;
}
const duracion = (horas + minutos / 60).toFixed(2);// esta convierte a decimales las horas extras




//const duracion = `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`; // <-este comentario hace que la duracion este en formato HH:MM







    const nombre = filas[0][9]?.innerText.trim() ?? ''; // índice 9: Nombre
    const empleado = filas[0][8]?.innerText.trim() ?? ''; // índice 8: Empleado

    resultado.push([
  desdeFinal,    // Columna "Desde"
  hastaFinal,    // Columna "A"
  duracion,
  'Borrador',
  `Horas extras diurnas: ${empleado}`,
  'Horas extras diurnas',
  empleado
]);
  });

  // Mostrar tabla final
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


//- Detectar cambios automáticamente sin botón filtar

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('fechaDesde').addEventListener('change', filtrarPorRango);
  document.getElementById('fechaHasta').addEventListener('change', filtrarPorRango);
});


   
  //funcion para exportar archivos a xlsx
    function exportarxlsx() {
  if (!hojaSeleccionada) {
    alert("Primero selecciona una hoja para editar.");
    return;
  }

  const tabla = document.querySelector('#previewContainer table');
  const datos = Array.from(tabla.rows).map(row =>
    Array.from(row.cells).map(cell => cell.innerText)
  );

  const nuevaHoja = XLSX.utils.aoa_to_sheet(datos);
  const nuevoLibro = XLSX.utils.book_new(); // ⬅️ importante
  const nombreExportado = `${nombreArchivoOriginal}_HE.xlsx`;

  XLSX.utils.book_append_sheet(nuevoLibro, nuevaHoja, hojaSeleccionada);
  XLSX.writeFile(nuevoLibro, nombreExportado, { bookType: "xlsx" });
}