var db = null; // Variable global que será definida en db.js
var idMascota = null;

// --- FUNCIÓN DE LISTADO ---
function cargarMascotas() {
    if (!db) {
        console.warn("⚠️ DB no inicializada al llamar a cargarMascotas. Revisar orden de carga de scripts.");
        return;
    }

    // Usamos db.transaction() para asegurar que la consulta se ponga en cola correctamente.
    db.transaction(function (tx) {
        tx.executeSql("SELECT * FROM mascotas ORDER BY nombre ASC", [], function (tx, res) {
            console.log(`🔍 RESULTADO DE LA CONSULTA: Filas encontradas: ${res.rows.length}`); // DEBUG: Muestra cuántas filas hay.
            const lista = document.getElementById("listaMascotas");
            if (!lista) return;

            lista.innerHTML = "";

            for (let i = 0; i < res.rows.length; i++) {
                const m = res.rows.item(i);
                // Si la foto es null o vacía, usa la imagen por defecto
                const src = m.foto && m.foto.length > 0 ? m.foto : "img/default-pet.png";
                
                const item = document.createElement("li");
                item.classList.add("tarjeta-mascota");

                // El enlace apunta a mascota.html con el ID de la mascota para edición
                item.innerHTML = `
                    <div class="perfil-contenedor">
                        <img src="${src}" alt="${m.nombre}" class="foto-perfil">
                        <strong>${m.nombre}</strong><br>
                        ${m.raza}<br>
                        <a href="mascota.html?id=${m.id}">
                            <button class="btn-primary">Ver Perfil</button>
                        </a>
                    </div>
                `;
                lista.appendChild(item);
            }
            console.log(`✅ ${res.rows.length} mascotas cargadas.`);
        }, function(tx, error) {
            console.error("❌ Error al cargar mascotas:", error.message);
        });
    });
}


document.addEventListener("deviceready", function () {
    // ❌ LÍNEA ELIMINADA: NO inicializar 'db' aquí. 'db' debe ser inicializado SOLO en db.js.
    // db = window.sqlitePlugin.openDatabase({ name: "petcare.db", location: "default" });

    const params = new URLSearchParams(window.location.search);
    idMascota = parseInt(params.get("id"), 10);
    window.mascotaIdActual = idMascota; 

    // 2. Control de flujo principal. Usamos db.transaction para garantizar que 
    // todas las consultas posteriores esperen a que las tablas de db.js se hayan creado.
    if (document.getElementById("listaMascotas") || document.getElementById("formEditarMascota") || document.getElementById("btnEliminarMascota") || document.getElementById("formMascota")) {
        
        // Verificamos si la variable global 'db' existe antes de intentar una transacción.
        if (!db) {
            console.error("❌ La variable DB no está disponible. Asegúrese de que db.js se cargue y se ejecute primero.");
            return;
        }

        db.transaction(function (tx) {
            // Este callback se ejecuta DESPUÉS de que la DB se haya abierto y las transacciones 
            // de inicialización de db.js hayan finalizado.
            
            // Lógica Condicional: Listado vs. Edición
            if (isNaN(idMascota)) {
                // Lógica para 'mismascotas.html' (Listado) y 'perfil.html' (Creación)
                console.log("📌 Modo Listado/Registro. Ejecutando lógica general.");
                
                // Cargar Listado (si estamos en mismascotas.html)
                if (document.getElementById("listaMascotas")) {
                    cargarMascotas(); 
                }
            } else {
                // Lógica para 'mascota.html?id=X' (Edición/Perfil)
                console.log(`📌 Modo Perfil/Edición. Cargando datos para ID ${idMascota}`);
                cargarPerfilMascota(idMascota);
                cargarTratamientosMascota(idMascota);
            }
        
        // Manejo de errores de la transacción de inicialización de mascota.js
        }, function(error) {
             console.error('❌ Error en la transacción de inicialización de mascota.js:', error.message);
        }, function() {
            // Callback de éxito de la transacción
             console.log('✅ Transacción de flujo de mascota.js completada.');
        });
    }

// ----------------------------------------------------------------------
// --- 3. Lógica de Creación de Nueva Mascota (Formulario en perfil.html) ---
// ----------------------------------------------------------------------

const formCreacion = document.getElementById("formMascota"); 
if (formCreacion) {
    formCreacion.addEventListener("submit", function (e) {
        e.preventDefault();
        const nombre = document.getElementById("nombre").value.trim();
        const raza = document.getElementById("raza").value.trim();
        const fecha = document.getElementById("fechaNacimiento").value;

        if (!nombre || !raza || !fecha) {
            alert("Por favor, complete todos los campos de la mascota.");
            return;
        }

        db.transaction(function (tx) {
            tx.executeSql(
                "INSERT INTO mascotas (nombre, raza, fecha_nacimiento, foto) VALUES (?, ?, ?, ?)",
                [nombre, raza, fecha, null], 
                function (tx, res) {
                    const insertId = res.insertId;
                    console.log("✅ Mascota insertada con ID:", insertId);

                    // --- Crear evento de cumpleaños ---
                    if (typeof cordova !== "undefined" && cordova.plugins && cordova.plugins.calendar) {
                        cordova.plugins.calendar.requestReadWritePermission(
                            function() {
                                const fechaInicio = new Date(fecha + "T09:00:00");
                                const fechaFin = new Date(fechaInicio.getTime() + 60*60*1000);

                                cordova.plugins.calendar.createEvent(
                                    `🎂 Cumpleaños de ${nombre}`,
                                    "",
                                    "Recordatorio anual",
                                    fechaInicio,
                                    fechaFin,
                                    function(eventId) {
                                        console.log("✅ Evento de cumpleaños creado:", eventId);

                                        // Guardar el eventId en la DB usando insertId
                                        db.transaction(function(tx2){
                                            tx2.executeSql(
                                                "UPDATE mascotas SET calendar_event_id_birthday = ? WHERE id = ?",
                                                [eventId, insertId]
                                            );
                                        });
                                    },
                                    function(err) {
                                        console.error("❌ Error creando evento de cumpleaños:", err);
                                    }
                                );
                            },
                            function(err) {
                                console.error("❌ Permiso calendario denegado:", err);
                            }
                        );
                    }

                    alert("Mascota registrada exitosamente!");
                    formCreacion.reset();
                    window.location.href = "mismascotas.html"; 
                },
                function (txError, error) {
                    console.error("❌ Error al registrar mascota:", error.message);
                }
            );
        });
    });
}



// ----------------------------------------------------------------------
// --- 4. Lógica de Edición de Mascota (Formulario en mascota
//.html) ---
// ----------------------------------------------------------------------
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

                    // --- CALENDARIO: Crear o actualizar evento de cumpleaños ANUAL ---
                    if (fecha && typeof crearEventoCalendario === 'function') {
                        const fecha_str = fecha + "T12:00:00"; 
                        const inicio = new Date(fecha_str);
                        const fin = new Date(inicio.getTime() + 60 * 60 * 1000);

                        
                        crearEventoCalendario(
                            `🎂 Cumpleaños: ${nombre}`,
                            `Mascota ID ${idMascota}. ¡Recordatorio anual!`,
                            inicio,
                            fin,
                            'YEARLY',
                            1 
                        ).then(eventId => {
                            if (eventId) {
                                db.transaction(function (tx2) {
                                    tx2.executeSql(
                                        "UPDATE mascotas SET calendar_event_id_birthday = ? WHERE id = ?", 
                                        [eventId, idMascota]
                                    );
                                });
                            }
                        }).catch(error => {
                            console.error("❌ Error al crear evento de cumpleaños:", error);
                        });
                    }
                },
                function (txError, error) {
                     console.error("❌ Error al actualizar mascota:", error.message);
                }
            );
        });
    });
}


// --- Bloque para ELIMINAR Mascota y sus eventos de calendario ---
const btnEliminar = document.getElementById("btnEliminarMascota");
if (btnEliminar) {
    btnEliminar.addEventListener("click", function () {
        if (!confirm("¿Eliminar esta mascota y todos sus tratamientos? Esta acción también eliminará sus recordatorios de calendario.")) return;
    
        const mascotaId = window.mascotaIdActual; 
        if (!mascotaId) {
            console.error("❌ No se encontró idMascota en el contexto.");
            return;
        }
    
        // 1. OBTENER el ID del evento de cumpleaños antes de la eliminación
        db.transaction(function (tx) { // Usamos una transacción para el SELECT
            tx.executeSql("SELECT calendar_event_id_birthday FROM mascotas WHERE id = ?", [mascotaId], function (tx, res) {
                if (res.rows.length > 0) {
                    const eventIdCumpleanos = res.rows.item(0).calendar_event_id_birthday;
        
                    if (eventIdCumpleanos && typeof eliminarEventoCalendario === "function") {
                        eliminarEventoCalendario(eventIdCumpleanos)
                            .then(() => console.log(`✅ Evento de Cumpleaños (${eventIdCumpleanos}) eliminado del calendario.`))
                            .catch(err => console.warn(`⚠️ Error al eliminar cumpleaños del calendario: ${err.message}`));
                    }
                }
            
                // 2. ELIMINAR TRATAMIENTOS ASOCIADOS Y SUS EVENTOS DE CALENDARIO
                cancelarEventosTratamientosMascota(mascotaId)
                    .then(() => {
                        // 3. ELIMINAR REGISTROS DE LA BD (Mascota y Tratamientos)
                        db.transaction(function (tx2) { // Nueva transacción para el DELETE
                            // La eliminación de tratamientos debería ser manejada por ON DELETE CASCADE en db.js
                            // pero se añade aquí por seguridad y para el borrado de tratamientos si no se usó CASCADE.
                            tx2.executeSql("DELETE FROM tratamientos WHERE mascota_id = ?", [mascotaId]); 
                            tx2.executeSql("DELETE FROM mascotas WHERE id = ?", [mascotaId], function () {
                                console.log(`✅ Mascota ID ${mascotaId} eliminada.`);
                                window.location.href = "mismascotas.html";
                            }, function(tx2, error) {
                                console.error("❌ Error al eliminar mascota de la BD:", error.message);
                            });
                        });
                    })
                    .catch(err => {
                        console.error("❌ Fallo crítico al cancelar eventos de tratamientos, procediendo con borrado de BD:", err);
                        db.transaction(function (tx2) {
                            tx2.executeSql("DELETE FROM tratamientos WHERE mascota_id = ?", [mascotaId]);
                            tx2.executeSql("DELETE FROM mascotas WHERE id = ?", [mascotaId], function () {
                                console.log(`✅ Mascota ID ${mascotaId} eliminada (con errores de calendario).`);
                                window.location.href = "mismascotas.html";
                            });
                        });
                    });
            
                // 4. Cancelar notificaciones locales
                cancelarNotificacionesMascota(mascotaId);
            }, function(tx, error) {
                console.error("Error al buscar cumpleaños para eliminar:", error.message);
            });
        });
    });
}


wireFotoBotones();
});

// ----------------------------------------------------------------------
// --- FUNCIONES AUXILIARES (Sin cambios mayores, excepto manejo de DB) ---
// ----------------------------------------------------------------------

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
    db.transaction(function(tx) { // Usamos transacción para seguridad
        tx.executeSql("SELECT * FROM mascotas WHERE id = ?", [id], function (tx, res) {
            if (res.rows.length === 0) return;
            const m = res.rows.item(0);
            const srcFoto = m.foto && m.foto.length > 0 ? m.foto : "img/default-pet.png";

            const perfilContainer = document.getElementById("perfilMascota");
            if (perfilContainer) {
                 perfilContainer.innerHTML = `
                    <img id="imgPerfil" src="${srcFoto}" alt="${m.nombre}" class="foto-perfil">
                    <p><strong>Nombre:</strong> ${m.nombre}</p>
                    <p><strong>Raza:</strong> ${m.raza}</p>
                    <p><strong>Fecha de nacimiento:</strong> ${m.fecha_nacimiento}</p>
                `;
            }

            // Llenar formulario de edición si existe
            const editNombre = document.getElementById("editNombre");
            if (editNombre) {
                document.getElementById("editNombre").value = m.nombre;
                document.getElementById("editRaza").value = m.raza;
                document.getElementById("editFecha").value = m.fecha_nacimiento;
            }
        });
    });
}

// --- Cargar tratamientos de la mascota ---
function cargarTratamientosMascota(id) {
    db.transaction(function (tx) { // Usamos transacción para seguridad
        tx.executeSql(
            `SELECT t.id, c.nombre AS tipo, t.fecha_aplicacion, t.frecuencia_dias, t.calendar_event_id
             FROM tratamientos t
             JOIN catalogo_tratamientos c ON t.catalogo_id = c.id
             WHERE t.mascota_id = ?
             ORDER BY t.fecha_aplicacion DESC`,
            [id],
            function (tx, res) {
                const lista = document.getElementById("listaTratamientosMascota");
                if (!lista) return;

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
                                function (txError, error) {
                                    console.error("Error al actualizar fecha:", error.message);
                                }
                            );
                        });
                    });
                });

                // Eliminar tratamiento individual
                lista.querySelectorAll(".btn-eliminar-tratamiento").forEach(btn => {
                    btn.addEventListener("click", () => {
                        const idTratamiento = parseInt(btn.dataset.id, 10);
                        if (!idTratamiento) return;

                        // 1. OBTENER ID de calendario del tratamiento
                        db.transaction(function (tx2) {
                            tx2.executeSql("SELECT calendar_event_id FROM tratamientos WHERE id = ?", [idTratamiento], function (tx2, res) {
                                let eventIdTratamiento = null;
                                if (res.rows.length > 0) {
                                    eventIdTratamiento = res.rows.item(0).calendar_event_id;
                                }

                                // 2. ELIMINAR el evento del calendario (si existe)
                                const promiseCalendar = eventIdTratamiento && typeof eliminarEventoCalendario === 'function' ? 
                                                            eliminarEventoCalendario(eventIdTratamiento) : 
                                                            Promise.resolve(); 

                                promiseCalendar
                                    .then(() => {
                                        console.log(`✅ Evento de calendario para ID ${idTratamiento} procesado para eliminación.`);
                                        
                                        // 3. Eliminar en BD y refrescar lista
                                        db.transaction(function (tx3) {
                                            tx3.executeSql(
                                                "DELETE FROM tratamientos WHERE id = ?",
                                                [idTratamiento],
                                                function () {
                                                    cargarTratamientosMascota(idMascota);
                                                },
                                                function (txError, error) {
                                                    console.error("Error al eliminar tratamiento en BD:", error.message);
                                                }
                                            );
                                        });
                                    })
                                    .catch(err => {
                                        console.error("❌ Fallo al eliminar evento de calendario, procediendo con borrado de BD:", err);
                                        // Si el calendario falla, aun así intentamos borrar el registro local
                                        db.transaction(function (tx3) {
                                            tx3.executeSql("DELETE FROM tratamientos WHERE id = ?", [idTratamiento], function () {
                                                cargarTratamientosMascota(idMascota);
                                            });
                                        });
                                    });
                                
                                // Cancelar notificación local (se mantiene por si acaso)
                                cancelarNotificacionTratamiento(idTratamiento);
                                
                            }, function (tx2, error) {
                                console.error("Error al buscar ID de calendario para eliminación:", error.message);
                            });
                        });
                    });
                });
            }, function(tx, error) {
                console.error("Error al cargar tratamientos:", error.message);
            }
        );
    });
}


// --- Calcular próxima fecha ---
function calcularProximaFecha(fecha, dias) {
    if (!dias) return "No definido";
    const f = new Date(fecha.replace(/-/g, '\/')); // Normaliza la fecha para compatibilidad
    // Clonar la fecha para no modificar el objeto original
    const prox = new Date(f.getTime()); 
    prox.setDate(prox.getDate() + dias);
    // Usar toISOString().split("T")[0] para obtener el formato YYYY-MM-DD
    return prox.toISOString().split("T")[0]; 
}

// --- Cancelar notificaciones ---
function cancelarNotificacionTratamiento(tratamientoId) {
    if (!cordova.plugins || !cordova.plugins.notification) return;
    cordova.plugins.notification.local.cancel(2000 + tratamientoId);
}

function cancelarNotificacionesMascota(mascotaId) {
    if (!cordova.plugins || !cordova.plugins.notification) return;
    cordova.plugins.notification.local.cancel(1000 + mascotaId); // Asumiendo que el cumpleaños usa 1000+ID
    
    // Cancelar notificaciones de tratamientos asociados
    db.transaction(function(tx) {
        tx.executeSql("SELECT id FROM tratamientos WHERE mascota_id = ?", [mascotaId], function (tx, res) {
            for (let i = 0; i < res.rows.length; i++) {
                const t = res.rows.item(i);
                cordova.plugins.notification.local.cancel(2000 + t.id); // Asumiendo que el tratamiento usa 2000+ID
            }
        });
    });
}


// --- FUNCIONES AUXILIARES DE CALENDARIO ---

function cancelarEventosTratamientosMascota(mascotaId) {
    if (typeof eliminarEventoCalendario !== 'function') {
        return Promise.resolve(); // Si la función no existe, asume éxito
    }

    return new Promise((resolve, reject) => {
        db.transaction(function(tx) {
            tx.executeSql("SELECT calendar_event_id FROM tratamientos WHERE mascota_id = ?", [mascotaId], function (tx, res) {
                let promises = [];
                for (let i = 0; i < res.rows.length; i++) {
                    const eventId = res.rows.item(i).calendar_event_id;
                    if (eventId) {
                        promises.push(eliminarEventoCalendario(eventId));
                    }
                }
                
                Promise.all(promises)
                    .then(results => {
                        console.log(`✅ ${results.length} eventos de tratamientos de mascota eliminados/procesados.`);
                        resolve();
                    })
                    .catch(reject);
                
            }, function (tx, error) {
                console.error("Error al obtener IDs de tratamientos para eliminación:", error.message);
                reject(error);
            });
        });
    });
}


// --- Crear evento de cumpleaños recurrente ---
function crearEventoCumpleanos(nombreMascota, fechaNacimiento, insertId) {
    if (!fechaNacimiento) return;

    // Hora fija para el recordatorio (ej: 9 AM)
    const fechaInicio = new Date(fechaNacimiento + "T09:00:00");
    const fechaFin = new Date(fechaInicio.getTime() + 60*60*1000); // +1 hora

    if (typeof crearEventoCalendario !== 'function') {
        console.warn("⚠️ crearEventoCalendario no está definido. Evento de cumpleaños no se creará.");
        return;
    }

    crearEventoCalendario(
        `🎂 Cumpleaños de ${nombreMascota}`,
        `Feliz cumpleaños a ${nombreMascota}!`,
        fechaInicio,
        fechaFin,
        'YEARLY',  // recurrencia anual exacta
        1
    ).then(eventId => {
        db.transaction(function(tx){
            tx.executeSql(
                "UPDATE mascotas SET calendar_event_id_birthday = ? WHERE id = ?",
                [eventId, insertId]
            );
        });
        console.log(`✅ Evento de cumpleaños creado para ${nombreMascota} (ID evento: ${eventId})`);
    }).catch(err => console.error("❌ Error creando evento cumpleaños:", err));
}
