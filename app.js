const CLAVE_STORAGE = "movimientos";

const form = document.getElementById("form-movimiento");
const lista = document.getElementById("lista-movimientos");
const vacio = document.getElementById("vacio");
const filtroMes = document.getElementById("filtro-mes");
const balanceEl = document.getElementById("balance");
const ingresosEl = document.getElementById("total-ingresos");
const gastosEl = document.getElementById("total-gastos");
const fechaInput = document.getElementById("fecha");

let movimientos = cargarMovimientos();

fechaInput.value = hoy();

form.addEventListener("submit", agregarMovimiento);
filtroMes.addEventListener("change", renderizar);

function cargarMovimientos() {
  const datos = localStorage.getItem(CLAVE_STORAGE);
  return datos ? JSON.parse(datos) : [];
}

function guardarMovimientos() {
  const datos = JSON.stringify(movimientos);
  localStorage.setItem(CLAVE_STORAGE, datos);
}

function hoy() {
  const fecha = new Date();
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function agregarMovimiento(evento) {
  evento.preventDefault();

  const movimiento = {
    id: Date.now(),
    descripcion: document.getElementById("descripcion").value.trim(),
    monto: parseFloat(document.getElementById("monto").value),
    tipo: document.getElementById("tipo").value,
    categoria: document.getElementById("categoria").value,
    fecha: fechaInput.value,
  };

  movimientos.push(movimiento);
  guardarMovimientos();

  form.reset();
  fechaInput.value = hoy();

  renderizar();
}

function eliminarMovimiento(id) {
  movimientos = movimientos.filter((movimiento) => movimiento.id !== id);
  guardarMovimientos();
  renderizar();
}

function movimientosFiltrados() {
  if (filtroMes.value === "todos") {
    return movimientos;
  }

  return movimientos.filter((movimiento) =>
    movimiento.fecha.startsWith(filtroMes.value)
  );
}

function renderizar() {
  actualizarFiltroMes();
  renderizarLista();
  renderizarResumen();
}

function renderizarLista() {
  const filtrados = movimientosFiltrados().sort((a, b) =>
    b.fecha.localeCompare(a.fecha)
  );

  lista.innerHTML = "";
  vacio.style.display = filtrados.length === 0 ? "block" : "none";

  filtrados.forEach((movimiento) => {
    const li = document.createElement("li");
    li.className = "movimiento";

    const signo = movimiento.tipo === "ingreso" ? "+" : "-";

    li.innerHTML = `
      <div class="movimiento-info">
        <div class="descripcion">${movimiento.descripcion}</div>
        <div class="detalle">${movimiento.categoria} · ${formatearFecha(movimiento.fecha)}</div>
      </div>
      <div class="monto ${movimiento.tipo}">${signo}${formatearMoneda(movimiento.monto)}</div>
      <button class="boton-eliminar" type="button">X</button>
    `;

    const boton = li.querySelector(".boton-eliminar");
    boton.addEventListener("click", () => eliminarMovimiento(movimiento.id));

    lista.appendChild(li);
  });
}

function renderizarResumen() {
  const filtrados = movimientosFiltrados();

  const ingresos = filtrados
    .filter((movimiento) => movimiento.tipo === "ingreso")
    .reduce((suma, movimiento) => suma + movimiento.monto, 0);

  const gastos = filtrados
    .filter((movimiento) => movimiento.tipo === "gasto")
    .reduce((suma, movimiento) => suma + movimiento.monto, 0);

  balanceEl.textContent = formatearMoneda(ingresos - gastos);
  ingresosEl.textContent = formatearMoneda(ingresos);
  gastosEl.textContent = formatearMoneda(gastos);
}

function actualizarFiltroMes() {
  const meses = [...new Set(movimientos.map((m) => m.fecha.slice(0, 7)))].sort(
    (a, b) => b.localeCompare(a)
  );

  const seleccionado = filtroMes.value;

  filtroMes.innerHTML = '<option value="todos">Todos los meses</option>';

  meses.forEach((mes) => {
    const opcion = document.createElement("option");
    opcion.value = mes;
    opcion.textContent = formatearMes(mes);
    filtroMes.appendChild(opcion);
  });

  if (meses.includes(seleccionado)) {
    filtroMes.value = seleccionado;
  }
}

function formatearMoneda(valor) {
  return valor.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });
}

function formatearFecha(fecha) {
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}

function formatearMes(mes) {
  const [anio, numeroMes] = mes.split("-");
  const nombres = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];
  return `${nombres[Number(numeroMes) - 1]} ${anio}`;
}

renderizar();
