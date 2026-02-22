# Actividad_Potafolio_Mod6

📁 Estructura del proyecto
ecommerce/
├── server.js          
├── package.json       
├── productos.json    
├── ventas.json        
└── public/
    └── index.html     

🚀 
1. Instalar dependencias
npm install

2. Iniciar el servidor
node server.js

3. Abrir en el navegador
http://localhost:3000

✅ Endpoints implementados
Método  Ruta  Código_éxito     Descripción
GET      /      200            Sirve el frontend
GET      /    productos 200    Lista todos los productos activos con stock
POST    /     producto 201     Crea un nuevo producto
PUT     /     producto 200     Actualiza nombre/precio/stock/activo
DELETE  /     producto  200    Soft-delete (activo: false)
POST    /     venta 201        Registra venta, descuenta stock, guarda en ventas.json
GET    /      ventas 200       Retorna historial completo de ventas

🎯 Características destacadas

uuid para ID de venta único en cada POST /venta
fs.readFileSync/writeFileSync para toda la persistencia (sin DB)
Validaciones completas con try/catch y códigos 400, 404, 409, 500
Verificación de stock antes de procesar la venta (devuelve 409 si hay conflicto)
Frontend con carrito, panel admin para agregar/eliminar productos, historial de ventas y modal de confirmación con los datos de la venta

=============================================================================
DESARROLLO DE APLICACIONES FULL STACK JAVASCRIPT TRAINEE V2.0

  ASTRID EVA PALOMINOS ESPINOZA
