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

    // Tabla de tratamientos
    tx.executeSql(`CREATE TABLE IF NOT EXISTS tratamientos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mascota_id INTEGER,
      tipo TEXT,
      fecha_aplicacion TEXT,
      frecuencia_dias INTEGER,
      FOREIGN KEY (mascota_id) REFERENCES mascotas(id)
    )`);
  }, function (error) {
    console.error('Error al crear tablas:', error.message);
  }, function () {
    console.log('Tablas creadas correctamente');
  });
});
