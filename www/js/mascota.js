var db = null;
var idMascota = null;

document.addEventListener("deviceready", function () {
  db = window.sqlitePlugin.openDatabase({ name: "petcare.db", location: "default" });

  const params = new URLSearchParams(window.location.search);
  idMascota = parseInt(params.get("id"), 10);

  if (!idMascota) {
    console.warn("Mascota no especificada. Este script solo aplica en perfil de mascota.");
    return;
  }

  cargarPerfilMascota(idMascota);
  cargarTratamientosMascota(idMascota);

  const form = document.getElementById("formEditarMascota");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const nombre = document.getElementById("editNombre").value.trim();
      const raza = document.getElementById("editRaza").value.trim();
      const fecha = document.getElementById("editFecha").value;

      db.transaction(function (tx) {
        tx.executeSql(
          "UPDATE mascotas SET nombre = ?, raza = ?, fecha_nacimiento = ? WHERE id = ?",
          [nombre, raza, fecha, idMascota],
          function () {
            console.log("Datos actualizados.");
            cargarPerfilMascota(idMascota);
          }
        );
      });
    });
  }

const btnEliminar = document.getElementById("btnEliminarMascota");
if (btnEliminar) {
  btnEliminar.addEventListener("click", function () {
    if (!confirm("¿Eliminar esta mascota y todos sus tratamientos?")) return;

    cancelarNotificacionesMascota(idMascota);

    db.transaction(function (tx) {
      tx.executeSql("DELETE FROM tratamientos WHERE mascota_id = ?", [idMascota]);
      tx.executeSql("DELETE FROM mascotas WHERE id = ?", [idMascota], function () {
        window.location.href = "mismascotas.html";
      });
    });
  });
}


  wireFotoBotones();
});

// --- Funciones de foto ---
function wireFotoBotones() {
  const btnActualizarFoto = document.getElementById("btnActualizarFoto");
  const btnTomarFoto = document.getElementById("btnTomarFoto");
  const inputFallback = document.getElementById("inputFotoFallback");

  if (!navigator.camera && inputFallback && btnActualizarFoto) {
    btnActualizarFoto.addEventListener("click", () => inputFallback.click());
    inputFallback.addEventListener("change", function () {
      const file = this.files && this.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (e) {
        const base64 = e.target.result;
        actualizarFotoPerfil(base64);
      };
      reader.readAsDataURL(file);
    });
  }

  if (btnActualizarFoto && navigator.camera) {
    btnActualizarFoto.addEventListener("click", function () {
      navigator.camera.getPicture(onFotoSuccess, onFotoError, {
        quality: 60,
        destinationType: Camera.DestinationType.DATA_URL,
        sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
        encodingType: Camera.EncodingType.JPEG,
        targetWidth: 600,
        targetHeight: 600,
        correctOrientation: true
      });
    });
  }

  if (btnTomarFoto && navigator.camera) {
    btnTomarFoto.addEventListener("click", function () {
      navigator.camera.getPicture(onFotoSuccess, onFotoError, {
        quality: 60,
        destinationType: Camera.DestinationType.DATA_URL,
        sourceType: Camera.PictureSourceType.CAMERA,
        encodingType: Camera.EncodingType.JPEG,
        targetWidth: 600,
        targetHeight: 600,
        correctOrientation: true
      });
    });
  }
}

function onFotoSuccess(imageData) {
  const imgSrc = normalizarImagen(imageData);
  if (!imgSrc) return;
  actualizarFotoPerfil(imgSrc);
}

function onFotoError(message) {
  if (message && message !== "No Image Selected") {
    console.error("Error cámara/galería:", message);
  }
}

function normalizarImagen(imageData) {
  if (typeof imageData !== "string") return null;
  if (imageData.startsWith("data:image")) return imageData;
  if (/^[A-Za-z0-9+/]+=*$/.test(imageData.slice(0, 50))) {
    return "data:image/jpeg;base64," + imageData;
  }
  if (imageData.startsWith("file:") || imageData.startsWith("content:")) {
    return imageData;
  }
  return null;
}

function actualizarFotoPerfil(imgSrc) {
  const preview = document.getElementById("previewFoto");
  if (preview) preview.innerHTML = `<img src="${imgSrc}" class="foto-perfil">`;

  const imgPerfil = document.getElementById("imgPerfil");
  if (imgPerfil) imgPerfil.src = imgSrc;

  db.transaction(function (tx) {
    tx.executeSql(
      "UPDATE mascotas SET foto = ? WHERE id = ?",
      [imgSrc, idMascota],
      function () {
        cargarPerfilMascota(idMascota);
      }
    );
  });
}

// --- Cargar perfil ---
function cargarPerfilMascota(id) {
  db.executeSql("SELECT * FROM mascotas WHERE id = ?", [id], function (res) {
    if (res.rows.length === 0) return;
    const m = res.rows.item(0);
    const srcFoto = m.foto && m.foto.length > 0 ? m.foto : "img/default-pet.png";

    document.getElementById("perfilMascota").innerHTML = `
      <img id="imgPerfil" src="${srcFoto}" alt="${m.nombre}" class="foto-perfil">
      <p><strong>Nombre:</strong> ${m.nombre}</p>
      <p><strong>Raza:</strong> ${m.raza}</p>
      <p><strong>Fecha de nacimiento:</strong> ${m.fecha_nacimiento}</p>
    `;

    document.getElementById("editNombre").value = m.nombre;
    document.getElementById("editRaza").value = m.raza;
    document.getElementById("editFecha").value = m.fecha_nacimiento;
  });
}

// --- Cargar tratamientos de la mascota ---
function cargarTratamientosMascota(id) {
  db.executeSql(
    `SELECT t.id, c.nombre AS tipo, t.fecha_aplicacion, t.frecuencia_dias
     FROM tratamientos t
     JOIN catalogo_tratamientos c ON t.catalogo_id = c.id
     WHERE t.mascota_id = ?
     ORDER BY t.fecha_aplicacion DESC`,
    [id],
    function (res) {
      const lista = document.getElementById("listaTratamientosMascota");
      lista.innerHTML = "";

      for (let i = 0; i < res.rows.length; i++) {
        const t = res.rows.item(i);
        const fechaProxima = calcularProximaFecha(t.fecha_aplicacion, t.frecuencia_dias);
        const li = document.createElement("li");
        li.innerHTML = `
          <strong>${t.tipo}</strong><br>
          Aplicado: <span id="fecha-${t.id}">${t.fecha_aplicacion}</span><br>
          Próximo: ${fechaProxima}<br>
          <input type="date" id="inputFecha-${t.id}" value="${t.fecha_aplicacion}" data-id="${t.id}">
          <button class="btn-eliminar-tratamiento" data-id="${t.id}">🗑️ Eliminar</button>
        `;
        lista.appendChild(li);
      }

      // Auto-guardar nueva fecha al cambiar el input
      lista.querySelectorAll("input[type='date']").forEach(input => {
        input.addEventListener("change", () => {
          const idTratamiento = parseInt(input.dataset.id, 10);
          const nuevaFecha = input.value;
          if (!nuevaFecha) return;

          db.transaction(function (tx) {
            tx.executeSql(
              "UPDATE tratamientos SET fecha_aplicacion = ? WHERE id = ?",
              [nuevaFecha, idTratamiento],
              function () {
                cargarTratamientosMascota(idMascota);
              },
              function (error) {
                console.error("Error al actualizar fecha:", error.message);
              }
            );
          });
        });
      });

      // Eliminar tratamiento sin confirmación modal
      lista.querySelectorAll(".btn-eliminar-tratamiento").forEach(btn => {
        btn.addEventListener("click", () => {
          const idTratamiento = parseInt(btn.dataset.id, 10);
          if (!idTratamiento) return;

          // Cancelar notificación asociada
          cancelarNotificacionTratamiento(idTratamiento);

          // Eliminar en BD y refrescar lista
          db.transaction(function (tx) {
            tx.executeSql(
              "DELETE FROM tratamientos WHERE id = ?",
              [idTratamiento],
              function () {
                cargarTratamientosMascota(idMascota);
              },
              function (error) {
                console.error("Error al eliminar tratamiento:", error.message);
              }
            );
          });
        });
      });
    }
  );
}

// --- Calcular próxima fecha ---
function calcularProximaFecha(fecha, dias) {
  if (!dias) return "No definido";
  const f = new Date(fecha);
  f.setDate(f.getDate() + dias);
  return f.toISOString().split("T")[0];
}

// --- Cancelar notificación de tratamiento ---
function cancelarNotificacionTratamiento(tratamientoId) {
  if (!cordova.plugins || !cordova.plugins.notification) return;
  // Debe coincidir con el esquema usado al programar notificaciones (2000 + idTratamiento)
  cordova.plugins.notification.local.cancel(2000 + tratamientoId);
}

// --- Cancelar todas las notificaciones de una mascota ---
function cancelarNotificacionesMascota(mascotaId) {
  if (!cordova.plugins || !cordova.plugins.notification) return;

  // Cancelar cumpleaños (1000 + idMascota)
  cordova.plugins.notification.local.cancel(1000 + mascotaId);

  // Cancelar notificaciones de todos los tratamientos de la mascota
  db.executeSql("SELECT id FROM tratamientos WHERE mascota_id = ?", [mascotaId], function (res) {
    for (let i = 0; i < res.rows.length; i++) {
      const t = res.rows.item(i);
      cordova.plugins.notification.local.cancel(2000 + t.id);
    }
  });
}
