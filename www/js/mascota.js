// --- Utilidad para convertir rutas ---
function urlParaWebView(ruta) {
  if (!ruta) return "";
  if (window.IonicWebView && typeof window.IonicWebView.convertFileSrc === "function") {
    return window.IonicWebView.convertFileSrc(ruta);
  }
  return ruta;
}

// --- Cargar datos de una mascota ---
function cargarMascota(idMascota) {
  db.executeSql("SELECT * FROM mascotas WHERE id = ?", [idMascota], function (res) {
    if (res.rows.length > 0) {
      const m = res.rows.item(0);
      const src = urlParaWebView(m.foto);

      document.getElementById("perfilMascota").innerHTML = `
        <div class="perfil-contenedor">
          ${src ? `<img src="${src}" class="foto-perfil">` : `<div class="foto-perfil sin-foto"></div>`}
          <strong>${m.nombre}</strong><br>
          ${m.raza} - Nacido: ${m.fecha_nacimiento}
        </div>
      `;

      // Rellenar formulario
      document.getElementById("editNombre").value = m.nombre || "";
      document.getElementById("editRaza").value = m.raza || "";
      document.getElementById("editFecha").value = m.fecha_nacimiento || "";

      // Cargar tratamientos
      cargarTratamientosMascota(idMascota);
    }
  }, function (err) {
    console.error("Error al cargar mascota:", err.message);
  });
}

// --- Actualizar foto ---
function actualizarFoto(idMascota) {
  navigator.camera.getPicture(function (imageURI) {
    window.resolveLocalFileSystemURL(imageURI, function (fileEntry) {
      const nombreArchivo = "perfil_" + Date.now() + ".jpg";
      window.resolveLocalFileSystemURL(cordova.file.externalDataDirectory, function (dirEntry) {
        fileEntry.copyTo(dirEntry, nombreArchivo, function (newFileEntry) {
          const nuevaRuta = newFileEntry.toURL();
          const src = urlParaWebView(nuevaRuta);

          db.transaction(function (tx) {
            tx.executeSql(
              "UPDATE mascotas SET foto = ? WHERE id = ?",
              [nuevaRuta, idMascota],
              function () {
                console.log("Foto actualizada en BD:", nuevaRuta);
                document.getElementById("previewFoto").innerHTML =
                  `<img src="${src}" class="foto-perfil-preview">`;
                cargarMascota(idMascota);
              },
              function (error) {
                console.error("Error al actualizar foto:", error.message);
              }
            );
          });
        }, function (e) {
          console.error("Error al copiar imagen:", e.message);
        });
      }, function (e) {
        console.error("Error al acceder a directorio destino:", e.message);
      });
    }, function (e) {
      console.error("Error al resolver URI:", e.message);
    });
  }, function (message) {
    alert("Error al capturar foto: " + message);
  }, {
    quality: 50,
    destinationType: Camera.DestinationType.FILE_URI,
    encodingType: Camera.EncodingType.JPEG,
    mediaType: Camera.MediaType.PICTURE,
    targetWidth: 300,
    targetHeight: 300,
    sourceType: Camera.PictureSourceType.CAMERA,
    correctOrientation: true
  });
}

// --- Guardar cambios básicos ---
function guardarCambios(idMascota) {
  const nombre = document.getElementById("editNombre").value.trim();
  const raza = document.getElementById("editRaza").value.trim();
  const fecha = document.getElementById("editFecha").value;

  if (!nombre || !raza || !fecha) {
    alert("Completa todos los campos.");
    return;
  }

  db.transaction(function (tx) {
    tx.executeSql(
      "UPDATE mascotas SET nombre = ?, raza = ?, fecha_nacimiento = ? WHERE id = ?",
      [nombre, raza, fecha, idMascota],
      function () {
        alert("Datos actualizados correctamente.");
        cargarMascota(idMascota);
      },
      function (error) {
        console.error("Error al actualizar mascota:", error.message);
      }
    );
  });
}

// --- Tratamientos: insertar y listar ---
function agregarTratamiento(idMascota, tipo, frecuenciaDias) {
  const fechaAplicacion = new Date().toISOString().split("T")[0];

  db.transaction(function (tx) {
    tx.executeSql(
      "INSERT INTO tratamientos (mascota_id, tipo, fecha_aplicacion, frecuencia_dias) VALUES (?, ?, ?, ?)",
      [idMascota, tipo, fechaAplicacion, frecuenciaDias],
      function () {
        alert("Tratamiento agregado correctamente.");

        // 🔍 Bloque de validación en consola
        db.executeSql("SELECT * FROM tratamientos WHERE mascota_id = ?", [idMascota], function (res) {
          console.log("Tratamientos encontrados:", res.rows.length);
          for (let i = 0; i < res.rows.length; i++) {
            console.log("Tratamiento:", res.rows.item(i));
          }
        });

        cargarTratamientosMascota(idMascota);
      },
      function (error) {
        console.error("Error al agregar tratamiento:", error.message);
      }
    );
  });
}

function cargarTratamientosMascota(idMascota) {
  db.executeSql(
    "SELECT id, tipo, fecha_aplicacion, frecuencia_dias FROM tratamientos WHERE mascota_id = ? ORDER BY fecha_aplicacion DESC",
    [idMascota],
    function (res) {
      console.log("Tratamientos cargados:", res.rows.length);
      const lista = document.getElementById("listaTratamientosMascota");
      if (!lista) return;
      lista.innerHTML = "";

      for (let i = 0; i < res.rows.length; i++) {
        const t = res.rows.item(i);
        const li = document.createElement("li");
        li.className = "tratamiento-item";
        li.innerHTML = `
          <strong>${t.tipo}</strong>
          <span>Aplicado: ${t.fecha_aplicacion}</span>
          ${t.frecuencia_dias ? `<span>Frecuencia: ${t.frecuencia_dias} días</span>` : ""}
        `;
        lista.appendChild(li);
      }
    },
    function (err) {
      console.error("Error al cargar tratamientos:", err.message);
    }
  );
}

// --- Inicialización y wiring ---
document.addEventListener("deviceready", function () {
  if (!window.db) {
    console.error("BD no inicializada: incluye js/db.js antes de js/mascota.js");
    alert("Error de inicialización de BD.");
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const mascotaId = params.get("id");

  if (mascotaId) {
    cargarMascota(mascotaId);

    const btnActualizar = document.getElementById("btnActualizarFoto");
    if (btnActualizar) {
      btnActualizar.addEventListener("click", function () {
        actualizarFoto(mascotaId);
      });
    }

    const form = document.getElementById("formEditarMascota");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        guardarCambios(mascotaId);
      });
    }

    const btnBravecto = document.getElementById("btnBravecto");
    if (btnBravecto) {
      btnBravecto.addEventListener("click", function () {
        agregarTratamiento(mascotaId, "Bravecto (3 meses)", 90);
      });
    }
  }
});
