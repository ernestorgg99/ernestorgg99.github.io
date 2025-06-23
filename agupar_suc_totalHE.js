const HEADERS = ["Desde", "A", "Duración", "Estado", "Nombre", "Tipo de entrada de trabajo", "Empleado"];
    const COLUMN_CLASSES = ["col-desde", "col-a", "col-duracion", "col-estado", "col-nombre", "col-tipo", "col-empleado"];

    let datosPorArchivo = [];
    let datosCombinados = [];

    document.getElementById("input-multiple").addEventListener("change", async (e) => {
      datosPorArchivo = [];
      datosCombinados = [];

      const archivos = Array.from(e.target.files);
      const resultados = await Promise.all(
        archivos.map(file =>
          new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = function (event) {
              const data = new Uint8Array(event.target.result);
              const workbook = XLSX.read(data, { type: 'array' });
              const sheet = workbook.Sheets[workbook.SheetNames[0]];
              const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
              resolve({ nombreArchivo: file.name, filas: rows });
            };
            reader.readAsArrayBuffer(file);
          })
        )
      );

      datosPorArchivo = resultados;
      datosCombinados = resultados.flatMap(r => r.filas);
      const mapaDuplicados = mapearDuplicadosConColores(datosCombinados);
      mostrarPrevisualizacionPorArchivo(datosPorArchivo, mapaDuplicados);
    });

    function mapearDuplicadosConColores(data) {
      const conteo = {};
      data.forEach(row => {
        const emp = row["Empleado"] || "";
        conteo[emp] = (conteo[emp] || 0) + 1;
      });

      const duplicados = Object.keys(conteo).filter(e => conteo[e] > 1);
      const mapa = {};
      duplicados.forEach((emp, i) => {
        mapa[emp] = `dup-color-${(i % 8) + 1}`; // Hasta 8 colores
      });
      return mapa;
    }

    function mostrarPrevisualizacionPorArchivo(lista, mapaDuplicados) {
  const contenedor = document.getElementById("contenedor-tablas");
  contenedor.innerHTML = "";

  lista.forEach(({ nombreArchivo, filas }) => {
    const titulo = document.createElement("h3");
    titulo.textContent = `Archivo: ${nombreArchivo}`;
    contenedor.appendChild(titulo);

    const tabla = document.createElement("table");
    const thead = document.createElement("thead");
    const trHead = document.createElement("tr");

    HEADERS.forEach((h, i) => {
      const th = document.createElement("th");
      th.textContent = h;
      th.classList.add(COLUMN_CLASSES[i]);
      trHead.appendChild(th);
    });

    thead.appendChild(trHead);
    tabla.appendChild(thead);

    const tbody = document.createElement("tbody");
    filas.forEach(row => {
      const duracion = parseFloat(row["Duración"]) || 0;
      if (duracion === 0) return;

      const tr = document.createElement("tr");
      const clase = mapaDuplicados[row["Empleado"]];
      if (clase) tr.classList.add(clase);

      HEADERS.forEach((h, i) => {
        const td = document.createElement("td");
        td.textContent = row[h] ?? "";
        td.classList.add(COLUMN_CLASSES[i]);
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    tabla.appendChild(tbody);
    contenedor.appendChild(tabla);
  });
}

    function agruparPorEmpleado(data) {
      const resultado = {};
      data.forEach(row => {
        const emp = row["Empleado"] || "";
        const dur = parseFloat(row["Duración"]) || 0;
        if (!resultado[emp]) {
          resultado[emp] = { ...row, suma: dur, max: dur };
        } else {
          resultado[emp].suma += dur;
          if (dur > resultado[emp].max) {
            resultado[emp] = { ...row, suma: resultado[emp].suma, max: dur };
          }
        }
      });

      return Object.values(resultado).map(r => {
        const total = r.suma;
        r["Duración"] = total > 10 ? 9.30 : total.toFixed(2);
        return r;
      });
    }

    function agruparYMostrar() {
      const agrupados = agruparPorEmpleado(datosCombinados);
      const contenedor = document.getElementById("contenedor-tablas");
      contenedor.innerHTML = "";

      const titulo = document.createElement("h3");
      titulo.textContent = "Tabla Agrupada por Empleado";
      contenedor.appendChild(titulo);

      const tabla = document.createElement("table");
      const thead = document.createElement("thead");
      const trHead = document.createElement("tr");

      HEADERS.forEach((h, i) => {
        const th = document.createElement("th");
        th.textContent = h;
        th.classList.add(COLUMN_CLASSES[i]);
        trHead.appendChild(th);
      });

      thead.appendChild(trHead);
      tabla.appendChild(thead);

      const tbody = document.createElement("tbody");
     agrupados.forEach(row => {
  const duracion = parseFloat(row["Duración"]) || 0;
  if (duracion === 0) return; // Filtrar duración cero

  const tr = document.createElement("tr");
        HEADERS.forEach((h, i) => {
          const td = document.createElement("td");
          td.textContent = row[h] ?? "";
          td.classList.add(COLUMN_CLASSES[i]);
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });

      tabla.appendChild(tbody);
      contenedor.appendChild(tabla);
    }
