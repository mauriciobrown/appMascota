// --- Archivo: js/calendar.js (Versión FINAL Y CORREGIDA) ---

function crearEventoCalendario(title, notes, startDate, endDate, recurrence = 'none', recurrenceInterval = 1) {
    // Retornamos una Promise para que tratamientos.js pueda usar .then()
    return new Promise((resolve, reject) => {
        // 1. Verificar el objeto correcto del plugin
        if (!window.plugins || !window.plugins.calendar) {
            console.warn("❌ Plugin de calendario no disponible (window.plugins.calendar).");
            return reject(new Error("Plugin no encontrado"));
        }

        // >>> MODIFICACIÓN CLAVE: Propiedades de Recurrencia Directas en options
        const options = {
            calendarName: "PetCare",
            firstReminderMinutes: 1440, // 24 horas antes
            // El plugin espera las propiedades de recurrencia directamente aquí:
            recurrence: recurrence !== 'none' ? recurrence.toUpperCase() : null, // Ej: 'DAILY'
            recurrenceInterval: recurrenceInterval // Ej: 1, 7, etc.
        };

        // 2. Usar la sintaxis de callbacks con el objeto correcto
        window.plugins.calendar.createEventWithOptions(
            title,
            'Mi Hogar', // Ubicación
            notes,
            startDate,
            endDate,
            options,
            // Callback de ÉXITO
            function (message) {
                // message es el ID del evento en Android
                console.log(`✅ Evento creado en calendario. ID: ${message}`);
                resolve(message); // Resuelve la promesa con el ID
            },
            // Callback de ERROR
            function (err) {
                console.error("❌ Error al crear evento de calendario (Fallo Nativo): " + JSON.stringify(err));
                reject(err); // Rechaza la promesa con el error
            }
        );
    });
}


// --- FUNCIÓN ADICIONAL: Eliminar Evento de Calendario (Usando el Event ID) ---

function eliminarEventoCalendario(eventId) {
    // Retornamos una Promise para manejar la asincronía en tratamientos.js
    return new Promise((resolve, reject) => {
        // Validación del plugin
        if (!window.plugins || !window.plugins.calendar) {
            console.warn("❌ Plugin de calendario no disponible para eliminar.");
            return resolve(false); // No se puede eliminar, pero no es un error fatal.
        }
        
        // El plugin usa deleteEventById para eliminar un evento por su ID único.
        if (!eventId) {
            console.warn("⚠️ Event ID es nulo, no se puede eliminar el evento.");
            return resolve(false);
        }

        window.plugins.calendar.deleteEventById(
            eventId,
            // Callback de ÉXITO
            function (message) {
                if (message === true) {
                    console.log(`✅ Evento de calendario ID ${eventId} eliminado con éxito.`);
                    resolve(true);
                } else {
                    console.warn(`⚠️ Intento de eliminar evento ID ${eventId}, pero el resultado no fue 'true'.`);
                    resolve(false);
                }
            },
            // Callback de ERROR
            function (err) {
                console.error(`❌ Error al intentar eliminar evento ID ${eventId} (Fallo Nativo):`, JSON.stringify(err));
                reject(err); // Rechaza la promesa con el error
            }
        );
    });
}