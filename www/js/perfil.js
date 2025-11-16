var db = null;
var fotoRuta = null;
var tratamientos = []; // Inicializamos la variable global para tratamientos

// --- Obtener idMascota desde la URL (Se ejecuta con DOMContentLoaded) ---
function getMascotaIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    return id ? parseInt(id, 10) : null;
}

document.addEventListener("DOMContentLoaded", function () {
    // Al cargar la página, solo obtenemos el ID de la URL.
    window.mascotaIdActual = getMascotaIdFromUrl();
    if (!window.mascotaIdActual) {
        console.warn("⚠️ No se recibió idMascota en la URL."); 
    }
});


// --- Al iniciar Cordova (deviceready) ---
document.addEventListener("deviceready", function () {
    console.log("Cordova listo y plugins cargados.");

    // Solicitar permisos (Dejamos esta parte para asegurar que se ejecute)
    cordova.plugins.permissions.requestPermissions([
        cordova.plugins.permissions.CAMERA,
        cordova.plugins.permissions.READ_EXTERNAL_STORAGE,
        cordova.plugins.permissions.WRITE_EXTERNAL_STORAGE
    ]);

    // **IMPORTANTE: LA INICIALIZACIÓN DE 'db' Y LAS TABLAS ESTÁ EN db.js**
    // Solo re-abrimos o accedemos a la instancia que ya creó db.js
    if (!db) {
         db = window.sqlitePlugin.openDatabase({ name: "petcare.db", location: "default" });
    }
    
    // 1. Manejador del Formulario de Guardado (formMascota)
    const form = document.getElementById("formMascota");
    if (form) {
        form.addEventListener("submit", function (e) {
            e.preventDefault();

            // Los checks de validación
            const nombre = document.getElementById("nombre").value.trim();
            const raza = document.getElementById("raza").value.trim();
            const fechaNacimiento = document.getElementById("fechaNacimiento").value;

            if (!nombre || !raza || !fechaNacimiento || !fotoRuta) {
                alert("Completa todos los campos y toma una foto.");
                return;
            }

            // Lógica de DB
            // Usamos un simple executeSql para el COUNT
            db.executeSql("SELECT COUNT(*) AS total FROM mascotas", [], function (res) {
                const total = res.rows.item(0).total;
                if (total >= 5) {
                    alert("Solo puedes registrar hasta 5 mascotas.");
                    return;
                }

                // Insertar mascota dentro de una transacción
                db.transaction(function (tx) {
                    tx.executeSql(
                        "INSERT INTO mascotas (nombre, raza, fecha_nacimiento, foto) VALUES (?, ?, ?, ?)",
                        [nombre, raza, fechaNacimiento, fotoRuta],
                        function (tx, res) {
                            console.log("✅ Mascota insertada con ID:", res.insertId);
                            alert("Mascota guardada correctamente.");
                            form.reset();
                            const preview = document.getElementById("previewFoto");
                            if (preview) preview.innerHTML = "";
                            fotoRuta = null;
                            cargarMascotas(); // refrescar lista
                        },
                        function (tx, error) {
                            console.error("❌ Error al guardar mascota:", error.message);
                            alert("No se pudo guardar la mascota.");
                        }
                    );
                });
            }, function (error) {
                console.error("❌ Error al contar mascotas:", error.message);
            });
        });
    }

    // 2. Lógica de Eliminación de Mascota (Consolidada)
    const btnEliminar = document.getElementById("btnEliminarMascota");
    if (btnEliminar) {
        btnEliminar.addEventListener("click", function () {
            const mascotaId = window.mascotaIdActual;
            if (!mascotaId) {
                alert("No se encontró el ID de la mascota.");
                return;
            }

            if (!confirm("¿Eliminar esta mascota y todos sus tratamientos?")) return;

            db.transaction(function (tx) {
                // Primero eliminar tratamientos asociados
                tx.executeSql("DELETE FROM tratamientos WHERE mascota_id = ?", [mascotaId], function () {
                    console.log("🧹 Tratamientos eliminados para mascota:", mascotaId);
                });

                // Luego eliminar la mascota
                tx.executeSql("DELETE FROM mascotas WHERE id = ?", [mascotaId], function () {
                    console.log("✅ Mascota eliminada:", mascotaId);
                    alert("Mascota eliminada correctamente.");
                    window.location.href = "mismascota.html";
                }, function (error) {
                    console.error("❌ Error al eliminar mascota:", error.message);
                    alert("No se pudo eliminar la mascota.");
                });
            });
        });
    }

    // 3. Cargar la lista de mascotas al iniciar (para mismascota.html)
    cargarMascotas();

    // 4. Cargar perfil/tratamientos si estamos en perfil.html
    if (window.mascotaIdActual) {
        console.log("🐶 Cargando perfil/tratamientos después de deviceready.");
        cargarPerfilMascota(window.mascotaIdActual);
        cargarTratamientos(window.mascotaIdActual);
    }

}, false); // FIN ÚNICO DE DEVICEREADY

// --- Utilidad para convertir rutas a algo que el WebView acepte ---
function urlParaWebView(ruta) {
    if (!ruta) return "";
    if (window.IonicWebView && typeof window.IonicWebView.convertFileSrc === "function") {
        return window.IonicWebView.convertFileSrc(ruta);
    }
    return ruta;
}

// --- Captura de foto y copia a ruta accesible ---
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
                        fotoRuta = newFileEntry.toURL();
                        console.log("Imagen copiada a:", fotoRuta);
                        const src = urlParaWebView(fotoRuta);
                        const preview = document.getElementById("previewFoto");
                        if (preview) {
                            preview.innerHTML = `<img src="${src}" class="foto-perfil-preview">`;
                        }
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

// --- Mostrar mascotas registradas (para mismascota.html) ---
function cargarMascotas() {
    // Si 'db' es null al inicio, simplemente salimos. deviceready la llamará cuando esté listo.
    if (!db) return; 

    db.executeSql("SELECT * FROM mascotas", [], function (tx, res) {
        const lista = document.getElementById("listaMascotas");
        if (!lista) return;

        lista.innerHTML = "";

        for (let i = 0; i < res.rows.length; i++) {
            const m = res.rows.item(i);
            console.log("Ruta recuperada desde BD:", m.foto);

            const src = urlParaWebView(m.foto);
            const tieneFoto = src && src.length > 10;

            const item = document.createElement("li");
            item.classList.add("tarjeta-mascota");

            item.innerHTML = `
                <div class="perfil-contenedor">
                    ${tieneFoto
                        ? `<img src="${src}" class="foto-perfil">`
                        : `<div class="foto-perfil sin-foto"></div>`}
                    <strong>${m.nombre}</strong><br>
                    ${m.raza} - Nacido: ${m.fecha_nacimiento}<br>
                    <a href="perfil.html?id=${m.id}">
                        <button>Ver Perfil</button>
                    </a>
                </div>
            `;
            lista.appendChild(item);
        }
    });
}


// --- Cargar perfil de mascota (depende de 'db') ---
function cargarPerfilMascota(mascotaId) {
    // Ya no necesitamos el setTimeout, porque se llama desde deviceready.
    if (!db) return;
    
    const contenedor = document.getElementById("perfilMascota");
    if (!contenedor) return;

    db.executeSql("SELECT * FROM mascotas WHERE id = ?", [mascotaId], function (tx, res) {
        if (res.rows.length === 0) {
            contenedor.innerHTML = "<p>No se encontró la mascota.</p>";
            return;
        }
        const m = res.rows.item(0);
        const src = urlParaWebView(m.foto);
        contenedor.innerHTML = `
            <img src="${src}" class="foto-perfil">
            <h2>${m.nombre}</h2>
            <p>Raza: ${m.raza}</p>
            <p>Nacimiento: ${m.fecha_nacimiento}</p>
        `;
    }, function (tx, error) {
        console.error("Error al cargar perfil:", error);
    });
}


// --- Cargar tratamientos asociados (depende de 'db') ---
function cargarTratamientos(mascotaId) {
    // Ya no necesitamos el setTimeout, porque se llama desde deviceready.
    if (!db) return;
    
    db.executeSql("SELECT * FROM tratamientos WHERE mascota_id = ?", [mascotaId], function (tx, res) {
        const lista = document.getElementById("listaTratamientos");
        if (!lista) return;

        lista.innerHTML = "";
        tratamientos = [];
        
        for (let i = 0; i < res.rows.length; i++) {
            const t = res.rows.item(i);
            // NOTA: EL INSERT EN LA FUNCIÓN DE GUARDADO USA 'nombre', 'fecha' y 'dosis'
            // Sin embargo, la tabla 'tratamientos' que creamos en db.js usa 'catalogo_id', 'fecha_aplicacion', y 'frecuencia_dias'.
            // Es probable que necesites corregir el INSERT, pero por ahora mantendremos el código de carga.
            tratamientos.push(t);

            const item = document.createElement("li");
            item.classList.add("tarjeta-tratamiento");
            
            item.innerHTML = `
                <strong>${t.nombre || 'Tratamiento sin nombre'}</strong><br>
                Fecha: ${t.fecha_aplicacion || 'N/A'} - Dosis/Frecuencia: ${t.frecuencia_dias || 'N/A'}
            `;
            lista.appendChild(item);
        }
        console.log(`Cargados ${tratamientos.length} tratamientos.`);
    }, function (tx, error) {
        console.error("Error al cargar tratamientos:", error);
    });
}