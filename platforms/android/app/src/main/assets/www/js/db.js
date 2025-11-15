var db = null;

document.addEventListener('deviceready', function () {
  db = window.sqlitePlugin.openDatabase({ name: 'petcare.db', location: 'default' });

  db.transaction(function (tx) {
    // Tabla de mascotas
    tx.executeSql(`CREATE TABLE IF NOT EXISTS mascotas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT,
      raza TEXT,
      fecha_nacimiento TEXT,
      foto TEXT
    )`);

    // Catálogo de tratamientos (mantenedor)
    tx.executeSql(`CREATE TABLE IF NOT EXISTS catalogo_tratamientos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT UNIQUE,
      frecuencia_dias INTEGER
    )`);

    // Seed inicial del catálogo (firma correcta del callback: (tx, res))
    tx.executeSql("SELECT COUNT(*) AS total FROM catalogo_tratamientos", [], function (tx, res) {
      var total = res.rows.item(0).total;
      if (total === 0) {
        tx.executeSql("INSERT INTO catalogo_tratamientos (nombre, frecuencia_dias) VALUES (?, ?)", ["Vacunación Anual", 365]);
        tx.executeSql("INSERT INTO catalogo_tratamientos (nombre, frecuencia_dias) VALUES (?, ?)", ["Antiparasitarios", 90]);
        tx.executeSql("INSERT INTO catalogo_tratamientos (nombre, frecuencia_dias) VALUES (?, ?)", ["Otros", null]);
      }
    });

    // Asignaciones de tratamientos a mascotas (referenciando el catálogo)
    tx.executeSql(`CREATE TABLE IF NOT EXISTS tratamientos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mascota_id INTEGER,
      catalogo_id INTEGER,
      fecha_aplicacion TEXT,
      frecuencia_dias INTEGER,
      FOREIGN KEY (mascota_id) REFERENCES mascotas(id),
      FOREIGN KEY (catalogo_id) REFERENCES catalogo_tratamientos(id)
    )`);

  }, function (error) {
    console.error('Error al crear tablas:', error.message);
  }, function () {
    console.log('Tablas creadas correctamente');
  });
});
