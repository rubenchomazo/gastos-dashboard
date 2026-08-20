# Activar escritura permanente en Google Sheets

El dashboard ya puede leer la hoja publicada como CSV. Para que añadir, editar y eliminar movimientos también se guarde en la hoja:

1. Abre la hoja de Google Sheets.
2. Ve a `Extensiones → Apps Script`.
3. Copia el contenido de `Code.gs` de esta carpeta y pégalo en el editor.
4. Pulsa `Implementar → Nueva implementación`.
5. Selecciona `Aplicación web`.
6. Ejecutar como: `tu cuenta de Google`.
7. Quién tiene acceso: `Cualquier persona`.
8. Implementa y copia la URL de la aplicación web.
9. En el dashboard pulsa `Configurar Google Sheets`.
10. Pega primero la URL CSV de la hoja y después la URL de la aplicación web.

La hoja debe comenzar con estos encabezados:

```text
description,category,type,amount,date
```

El endpoint reemplaza las filas de datos con la lista actual del dashboard y conserva los encabezados. No compartas la URL de la aplicación web si la implementación no está protegida con una cuenta autorizada.
