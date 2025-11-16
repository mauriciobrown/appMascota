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

    // Solicitar permisos
    cordova.plugins.permissions.requestPermissions([
        cordova.plugins.permissions.CAMERA,
        cordova.plugins.permissions.READ_EXTERNAL_STORAGE,
        cordova.plugins.permissions.WRITE_EXTERNAL_STORAGE
    ]);

    // Inicialización de la DB
    if (!db) {
        db = window.sqlitePlugin.openDatabase({ name: "petcare.db", location: "default" });
    }
    
    // --- 1. Manejador del Formulario de Guardado (formMascota) ---
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

            // Contar mascotas existentes
            db.executeSql("SELECT COUNT(*) AS total FROM mascotas", [], function (res) {
                const total = res.rows.item(0).total;
                if (total >= 5) {
                    alert("Solo puedes registrar hasta 5 mascotas.");
                    return;
                }

                // Registrar mascota usando la función con cumpleaños
                registrarMascotaConCumple(nombre, raza, fechaNacimiento, fotoRuta, function(insertId){
                    alert("Mascota registrada correctamente!");
                    form.reset();
                    const preview = document.getElementById("previewFoto");
                    if(preview) preview.innerHTML = "";
                    fotoRuta = null;
                    cargarMascotas(); // refresca la lista
                });
            });
        });
    }

    // --- 2. Lógica de Eliminación de Mascota ---
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
                tx.executeSql("DELETE FROM tratamientos WHERE mascota_id = ?", [mascotaId], function () {
                    console.log("🧹 Tratamientos eliminados para mascota:", mascotaId);
                });
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

    // --- 3. Cargar la lista de mascotas al iniciar ---
    cargarMascotas();

    // --- 4. Cargar perfil/tratamientos si estamos en perfil.html ---
    if (window.mascotaIdActual) {
        console.log("🐶 Cargando perfil/tratamientos después de deviceready.");
        cargarPerfilMascota(window.mascotaIdActual);
        cargarTratamientos(window.mascotaIdActual);
    }

}, false); // FIN DEVICEREADY

// --- Utilidad para convertir rutas a algo que el WebView acepte ---
function urlParaWebView(ruta) {
    if (!ruta) return "";
    if (window.IonicWebView && typeof window.IonicWebView.convertFileSrc === "function") {
        return window.IonicWebView.convertFileSrc(ruta);
    }
    return ruta;
}

// --- Captura de foto ---
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

// --- Mostrar mascotas registradas ---
function cargarMascotas() {
    if (!db) return; 
    db.executeSql("SELECT * FROM mascotas", [], function (tx, res) {
        const lista = document.getElementById("listaMascotas");
        if (!lista) return;

        lista.innerHTML = "";
        for (let i = 0; i < res.rows.length; i++) {
            const m = res.rows.item(i);
            const src = urlParaWebView(m.foto);
            const tieneFoto = src && src.length > 10;

            const item = document.createElement("li");
            item.classList.add("tarjeta-mascota");

            item.innerHTML = `
                <div class="perfil-contenedor">
                    ${tieneFoto ? `<img src="${src}" class="foto-perfil">` : `<div class="foto-perfil sin-foto"></div>`}
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

// --- Cargar perfil de mascota ---
function cargarPerfilMascota(mascotaId) {
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

// --- Cargar tratamientos asociados ---
function cargarTratamientos(mascotaId) {
    if (!db) return;
    db.executeSql("SELECT * FROM tratamientos WHERE mascota_id = ?", [mascotaId], function (tx, res) {
        const lista = document.getElementById("listaTratamientos");
        if (!lista) return;

        lista.innerHTML = "";
        tratamientos = [];
        
        for (let i = 0; i < res.rows.length; i++) {
            const t = res.rows.item(i);
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

// --- Registrar mascota con cumpleaños ---
// --- Registrar mascota con cumpleaños ---
function registrarMascotaConCumple(nombre, raza, fechaNacimiento, fotoRuta, callback) {
    if (!nombre || !raza || !fechaNacimiento) {
        alert("Completa todos los campos de la mascota.");
        return;
    }

    db.transaction(function (tx) {
        tx.executeSql(
            "INSERT INTO mascotas (nombre, raza, fecha_nacimiento, foto) VALUES (?, ?, ?, ?)",
            [nombre, raza, fechaNacimiento, fotoRuta],
            function (tx, res) {
                const insertId = res.insertId;
                console.log("✅ Mascota insertada con ID:", insertId);

                // --- Crear evento de cumpleaños en el calendario ---
                if (typeof crearEventoCalendario === 'function') {
                    const inicio = new Date(fechaNacimiento + "T12:00:00");
                    const fin = new Date(inicio.getTime() + 60*60*1000); // +1 hora

                    crearEventoCalendario(
                        `🎂 Cumpleaños de ${nombre}`,
                        `Feliz cumpleaños a ${nombre}!`,
                        inicio,
                        fin,
                        'YEARLY',
                        1
                    ).then(eventId => {
                        // Guardar eventId en la DB
                        db.transaction(function(tx2){
                            tx2.executeSql(
                                "UPDATE mascotas SET calendar_event_id_birthday = ? WHERE id = ?",
                                [eventId, insertId]
                            );
                        });
                        console.log(`✅ Evento de cumpleaños creado para ${nombre} (ID evento: ${eventId})`);
                    }).catch(err => console.error("❌ Error creando evento cumpleaños:", err));
                }

                if (callback) callback(insertId);
            },
            function (txError, error) {
                console.error("❌ Error al registrar mascota:", error.message);
            }
        );
    });
}

