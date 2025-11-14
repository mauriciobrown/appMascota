var db = null;
var fotoRuta = null;

document.addEventListener("deviceready", function () {
  console.log("Cordova listo");

  // Solicitar permisos
  cordova.plugins.permissions.requestPermissions(
    [
      cordova.plugins.permissions.CAMERA,
      cordova.plugins.permissions.READ_EXTERNAL_STORAGE,
      cordova.plugins.permissions.WRITE_EXTERNAL_STORAGE
    ],
    function (status) {
      if (!status.hasPermission) {
        alert("La app necesita permisos para funcionar correctamente.");
      }
    },
    function () {
      alert("Error al solicitar permisos.");
    }
  );

  // Abrir base de datos
  db = window.sqlitePlugin.openDatabase({ name: "petcare.db", location: "default" });

  db.transaction(function (tx) {
    tx.executeSql(
      "CREATE TABLE IF NOT EXISTS mascotas (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT, raza TEXT, fecha_nacimiento TEXT, foto TEXT)"
    );
  });

  cargarMascotas();
}, false);

// Captura de foto y copia a ruta accesible
function capturarFoto() {
  navigator.camera.getPicture(function (imageURI) {
    console.log("Ruta original:", imageURI);

    window.resolveLocalFileSystemURL(imageURI, function (fileEntry) {
      const nombreArchivo = "perfil_" + Date.now() + ".jpg";

      window.resolveLocalFileSystemURL(cordova.file.externalDataDirectory, function (dirEntry) {
        fileEntry.copyTo(
          dirEntry,
          nombreArchivo,
          function (newFileEntry) {
            fotoRuta = newFileEntry.nativeURL;
            console.log("Imagen copiada a:", fotoRuta);
            document.getElementById("previewFoto").innerHTML = `<img src="${fotoRuta}" class="foto-perfil-preview">`;
          },
          function (error) {
            console.error("Error al copiar imagen:", error);
            alert("No se pudo guardar la imagen.");
          }
        );
      }, function (err) {
        console.error("Error al acceder a directorio destino:", err);
        alert("No se pudo acceder al almacenamiento externo.");
      });
    }, function (err) {
      console.error("Error al resolver ruta:", err);
      alert("No se pudo acceder al archivo de imagen.");
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

// Guardar mascota
document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("formMascota");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      const nombre = document.getElementById("nombre").value.trim();
      const raza = document.getElementById("raza").value.trim();
      const fechaNacimiento = document.getElementById("fechaNacimiento").value;

      if (!nombre || !raza || !fechaNacimiento || !fotoRuta) {
        alert("Completa todos los campos y toma una foto.");
        return;
      }

      db.executeSql("SELECT COUNT(*) AS total FROM mascotas", [], function (res) {
        if (res.rows.item(0).total >= 5) {
          alert("Solo puedes registrar hasta 5 mascotas.");
          return;
        }

        db.transaction(function (tx) {
          tx.executeSql(
            "INSERT INTO mascotas (nombre, raza, fecha_nacimiento, foto) VALUES (?, ?, ?, ?)",
            [nombre, raza, fechaNacimiento, fotoRuta],
            function () {
              alert("Mascota guardada correctamente.");
              document.getElementById("formMascota").reset();
              document.getElementById("previewFoto").innerHTML = "";
              fotoRuta = null;
              cargarMascotas();
            },
            function (error) {
              console.error("Error al guardar mascota:", error.message);
            }
          );
        });
      });
    });
  }
});

// Mostrar mascotas registradas
function cargarMascotas() {
  db.executeSql("SELECT * FROM mascotas", [], function (res) {
    const lista = document.getElementById("listaMascotas");
    if (!lista) return;

    lista.innerHTML = "";

    for (let i = 0; i < res.rows.length; i++) {
      const m = res.rows.item(i);
      console.log("Ruta recuperada desde BD:", m.foto);

      const tieneFoto = m.foto && m.foto.length > 10;
      const item = document.createElement("li");
      item.classList.add("tarjeta-mascota");

      item.innerHTML = `
        <div class="perfil-contenedor">
          ${tieneFoto
            ? `<img src="${m.foto}" class="foto-perfil">`
            : `<div class="foto-perfil sin-foto"></div>`}
          <strong>${m.nombre}</strong><br>
          ${m.raza} - Nacido: ${m.fecha_nacimiento}<br>
          <a href="mascota.html?id=${m.id}">
            <button>Ver Perfil</button>
          </a>
        </div>
      `;
      lista.appendChild(item);
    }
  });
}
