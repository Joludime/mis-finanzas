const pantallaLogin = document.getElementById("pantalla-login");
const app = document.getElementById("app");
const formLogin = document.getElementById("form-login");
const botonCrear = document.getElementById("boton-crear");
const loginMensaje = document.getElementById("login-mensaje");
const botonSalir = document.getElementById("boton-salir");
const form = document.getElementById("form-movimiento");
const lista = document.getElementById("lista-movimientos");
const vacio = document.getElementById("vacio");
const filtroMes = document.getElementById("filtro-mes");
const balanceEl = document.getElementById("balance");
const ingresosEl = document.getElementById("total-ingresos");
const gastosEl = document.getElementById("total-gastos");
const fechaInput = document.getElementById("fecha");

if (SUPABASE_URL.includes("PEGA_AQUI")) {
  pantallaLogin.innerHTML =
    "<h2>Falta configurar</h2><p class='ayuda'>Edita config.js con la URL y la anon key de tu proyecto de Supabase.</p>";
  throw new Error("config.js sin configurar");
}

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let movimientos = [];

fechaInput.value = hoy();

db.auth.onAuthStateChange((evento, sesion) => {
  mostrarPantalla(sesion);
  if (sesion) {
    cargarMovimientos();
  }
});

function mostrarPantalla(sesion) {
  const dentro = Boolean(sesion);
  pantallaLogin.classList.toggle("hidden", dentro);
  app.classList.toggle("hidden", !dentro);
  botonSalir.classList.toggle("hidden", !dentro);
}

function datosLogin() {
  return {
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value,
  };
}

formLogin.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  loginMensaje.textContent = "";

  const { error } = await db.auth.signInWithPassword(datosLogin());

  if (error) {
    loginMensaje.textContent = "No se pudo entrar: " + error.message;
  }
});

botonCrear.addEventListener("click", async () => {
  loginMensaje.textContent = "";

  const { data, error } = await db.auth.signUp(datosLogin());

  if (error) {
    if (error.message.includes("already")) {
      loginMensaje.textContent = "Esa cuenta ya existe. Usa el botón Entrar.";
    } else {
      loginMensaje.textContent = error.message;
    }
    return;
  }

  if (data.session) {
    loginMensaje.textContent = "Cuenta creada. ¡Bienvenido!";
  } else {
    loginMensaje.textContent = "Cuenta creada. Ahora pulsa Entrar.";
  }
});

botonSalir.addEventListener("click", async () => {
  await db.auth.signOut();
});

form.addEventListener("submit", agregarMovimiento);
filtroMes.addEventListener("change", renderizar);

async function cargarMovimientos() {
  const { data, error } = await db
    .from("movimientos")
    .select("*")
    .order("fecha", { ascending: false });

  if (error) {
    alert("No se pudieron cargar los datos: " + error.message);
    return;
  }

  movimientos = data.map((movimiento) => ({
    ...movimiento,
    monto: Number(movimiento.monto),
  }));

  renderizar();
}

async function agregarMovimiento(evento) {
  evento.preventDefault();

  const nuevo = {
    descripcion: document.getElementById("descripcion").value.trim(),
    monto: parseFloat(document.getElementById("monto").value),
    tipo: document.getElementById("tipo").value,
    categoria: document.getElementById("categoria").value,
    fecha: fechaInput.value,
  };

  const { error } = await db.from("movimientos").insert(nuevo);

  if (error) {
    alert("No se pudo guardar: " + error.message);
    return;
  }

  form.reset();
  fechaInput.value = hoy();

  await cargarMovimientos();
}

async function eliminarMovimiento(id) {
  const { error } = await db.from("movimientos").delete().eq("id", id);

  if (error) {
    alert("No se pudo borrar: " + error.message);
    return;
  }

  await cargarMovimientos();
}

function hoy() {
  const fecha = new Date();
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
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
