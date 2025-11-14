var db = null;
var fotoBase64 = null;
var mascotaId = null;

document.addEventListener("deviceready", function () {
  db = window.sqlitePlugin.openDatabase({ name: "petcare.db", location: "default" });

  const params = new URLSearchParams(window.location.search);
  mascotaId = params.get("id");

  if (!mascotaId) {
    alert("Mascota no especificada.");
    return;
  }

  mostrarPerfil(mascotaId);
  mostrarTratamientos(mascotaId);
});

function mostrarPerfil(id) {
  db.executeSql("SELECT * FROM mascotas WHERE id = ?", [id], function (res) {
    if (res.rows.length === 0) return;

    const m = res.rows.item(0);
    document.getElementById("perfilMascota").innerHTML = `
      <img src="${m.foto}" class="foto-perfil"><br>
      <strong>Nombre:</strong> ${m.nombre}<br>
      <strong>Raza:</strong> ${m.raza}<br>
      <strong>Nacimiento:</strong> ${m.fecha_nacimiento}
    `;

    // Cargar datos en formulario
    document.getElementById("editNombre").value = m.nombre;
    document.getElementById("editRaza").value = m.raza;
    document.getElementById("editFecha").value = m.fecha_nacimiento;
    fotoBase64 = m.foto;
    document.getElementById("previewFoto").innerHTML = `<img src="${fotoBase64}" class="foto-perfil-preview">`;
  });
}

function mostrarTratamientos(id) {
  db.executeSql("SELECT * FROM tratamientos WHERE mascota_id = ?", [id], function (res) {
    const lista = document.getElementById("listaTratamientosMascota");
    lista.innerHTML = "";

    for (let i = 0; i < res.rows.length; i++) {
      const t = res.rows.item(i);
      const fechaProxima = calcularProximaFecha(t.fecha_aplicacion, t.frecuencia_dias);
      const item = document.createElement("li");
      item.innerHTML = `
        <strong>${t.tipo}</strong><br>
        Aplicado: ${t.fecha_aplicacion}<br>
        Próximo: ${fechaProxima}
      `;
      lista.appendChild(item);
    }
  });
}

function calcularProximaFecha(fecha, dias) {
  const f = new Date(fecha);
  f.setDate(f.getDate() + dias);
  return f.toISOString().split("T")[0];
}

// Captura de nueva foto
function capturarFoto() {
  navigator.camera.getPicture(onFotoSuccess, onFotoFail, {
    quality: 50,
    destinationType: Camera.DestinationType.DATA_URL,
    encodingType: Camera.EncodingType.JPEG,
    mediaType: Camera.MediaType.PICTURE,
    targetWidth: 300,
    targetHeight: 300,
    sourceType: Camera.PictureSourceType.CAMERA,
    correctOrientation: true
  });
}

function onFotoSuccess(imageData) {
  fotoBase64 = "data:image/jpeg;base64," + imageData;
  document.getElementById("previewFoto").innerHTML = `<img src="${fotoBase64}" class="foto-perfil-preview">`;
}

function onFotoFail(message) {
  alert("Error al capturar foto: " + message);
}

// Guardar cambios
document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("formEditarMascota");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      const nombre = document.getElementById("editNombre").value.trim();
      const raza = document.getElementById("editRaza").value.trim();
      const fecha = document.getElementById("editFecha").value;

      if (!nombre || !raza || !fecha || !fotoBase64) {
        alert("Completa todos los campos y toma una foto.");
        return;
      }

      db.transaction(function (tx) {
        tx.executeSql(
          "UPDATE mascotas SET nombre = ?, raza = ?, fecha_nacimiento = ?, foto = ? WHERE id = ?",
          [nombre, raza, fecha, fotoBase64, mascotaId],
          function () {
            alert("Datos actualizados correctamente.");
            mostrarPerfil(mascotaId);
          },
          function (error) {
            console.error("Error al actualizar:", error.message);
          }
        );
      });
    });
  }
});
