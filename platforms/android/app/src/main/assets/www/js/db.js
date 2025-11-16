// --- Archivo: js/db.js (ÚNICO PUNTO DE INICIALIZACIÓN DE LA BASE DE DATOS) ---

var db = null;

document.addEventListener('deviceready', function () {
    // 1. Inicializa la base de datos (CRÍTICO: Define la variable db)
    db = window.sqlitePlugin.openDatabase({ name: 'petcare.db', location: 'default' });

    console.log("🛠️ Inicializando estructuras de la base de datos...");

    db.transaction(function (tx) {
        
        // Función de manejo de error común
        const errorHandler = function(tx, error) {
            console.error(`❌ Error SQL en la creación de tablas: ${error.message}`);
        };

        // --- 1. Tabla de mascotas ---
        tx.executeSql(
            "CREATE TABLE IF NOT EXISTS mascotas (" +
            "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
            "nombre TEXT NOT NULL, " + // Añadir NOT NULL a campos obligatorios
            "raza TEXT, " +
            "fecha_nacimiento TEXT, " +
            "foto TEXT, " +
            "calendar_event_id_birthday TEXT)",
            [],
            null,
            errorHandler
        );

        // --- 2. Catálogo de tratamientos (mantenedor) ---
        tx.executeSql(
            "CREATE TABLE IF NOT EXISTS catalogo_tratamientos (" +
            "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
            "nombre TEXT UNIQUE NOT NULL, " +
            "frecuencia_dias INTEGER)",
            [],
            null,
            errorHandler
        );

        // --- 3. Asignaciones de tratamientos ---
 tx.executeSql(
    "CREATE TABLE IF NOT EXISTS tratamientos (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
    "mascota_id INTEGER NOT NULL, " +
    "catalogo_id INTEGER NOT NULL, " +
    "fecha_aplicacion TEXT NOT NULL, " +
    "frecuencia_dias INTEGER, " +
    "fecha_proxima TEXT NOT NULL, " +
    "calendar_event_id TEXT, " +
    "FOREIGN KEY (mascota_id) REFERENCES mascotas(id) ON DELETE CASCADE, " +
    "FOREIGN KEY (catalogo_id) REFERENCES catalogo_tratamientos(id)" +
    ")",
    [],
    null,
    errorHandler
);

        
        // --- 4. Seed inicial del catálogo (USO DE TX PARA TODAS LAS CONSULTAS DE SEEDING) ---
        tx.executeSql("SELECT COUNT(*) AS total FROM catalogo_tratamientos", [], function (tx, res) {
            var total = res.rows.item(0).total;
            if (total === 0) {
                console.log('🌱 Inicializando Catálogo de tratamientos...');
                // Todas estas inserciones están en la misma transacción, por lo que son atómicas.
                tx.executeSql("INSERT INTO catalogo_tratamientos (nombre, frecuencia_dias) VALUES (?, ?)", ["Vacunación Anual", 365]);
                tx.executeSql("INSERT INTO catalogo_tratamientos (nombre, frecuencia_dias) VALUES (?, ?)", ["Antiparasitarios", 90]);
                tx.executeSql("INSERT INTO catalogo_tratamientos (nombre, frecuencia_dias) VALUES (?, ?)", ["Otros", null]);
            }
        }, function (tx, error) {
             // Este callback de error es para el SELECT COUNT(*)
            console.error('❌ Error al contar tratamientos para seeding:', error.message);
        });

    }, function (error) { 
        // Callback de error de la transacción completa (si alguna consulta falla)
        console.error('❌ Error crítico al crear tablas (Transacción fallida):', error.message);
    }, function () { 
        // Callback de éxito de la transacción completa
        console.log('✅ Tablas creadas correctamente');
    });
});
