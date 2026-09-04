# PDR — Sistema multiempresa con menú multinivel y permisos por acción

**Versión:** 1.0  
**Fecha:** 25 de agosto de 2026  
**Estado:** Borrador inicial  
**Tipo de documento:** Documento de Requisitos del Producto (PDR)

## 1. Resumen ejecutivo

El producto será un sistema web multiempresa en el que cada usuario podrá iniciar sesión, consultar las empresas a las que tiene acceso y seleccionar una empresa activa. A partir de esa selección, el sistema determinará qué módulos, opciones de menú, rutas, información y acciones puede utilizar el usuario.

El control de acceso no estará limitado a mostrar u ocultar opciones del menú. Cada pantalla podrá contener acciones independientes —por ejemplo, visualizar, crear, editar, eliminar, verificar, aprobar, rechazar, anular, exportar o imprimir— y cada acción tendrá su propio permiso.

La autorización se calculará mediante la combinación:

> **Usuario + empresa activa + rol + permiso + regla de negocio**

El frontend utilizará los permisos para construir la interfaz, pero el backend será la autoridad definitiva para validar el acceso a rutas, datos y operaciones.

## 2. Problema

El sistema debe atender varias empresas desde una misma aplicación. Un usuario puede pertenecer a una o varias empresas y tener responsabilidades diferentes en cada una. Por ejemplo, puede ser administrador en una empresa y consultor en otra.

Un modelo basado únicamente en perfiles globales o en opciones visibles del menú no es suficiente porque:

- Los permisos cambian según la empresa seleccionada.
- Una pantalla puede contener varias acciones con niveles de autorización diferentes.
- Ocultar botones en el frontend no protege las operaciones del backend.
- Los datos de una empresa nunca deben mezclarse ni quedar expuestos a usuarios de otra empresa.
- Algunas acciones dependen tanto del permiso como del estado del registro.

## 3. Objetivo general

Diseñar e implementar un sistema de autorización multiempresa que controle dinámicamente el acceso de los usuarios a empresas, módulos, menús, rutas, registros y acciones específicas, garantizando la separación de datos y la aplicación de permisos tanto en el frontend como en el backend.

## 4. Objetivos específicos

1. Permitir que un usuario tenga acceso a una o varias empresas.
2. Permitir que el usuario tenga roles diferentes en cada empresa.
3. Construir dinámicamente un menú multinivel de acuerdo con los permisos efectivos.
4. Proteger las rutas del frontend y los endpoints del backend.
5. Controlar de manera independiente las acciones disponibles dentro de cada pantalla.
6. Limitar todas las consultas y modificaciones a la empresa activa.
7. Separar los permisos de las reglas de negocio y de los estados de los registros.
8. Mantener trazabilidad de las operaciones relevantes realizadas por los usuarios.

## 5. Alcance

### 5.1 Incluido

- Inicio y cierre de sesión.
- Consulta de empresas autorizadas para el usuario.
- Selección y cambio de empresa activa.
- Administración de usuarios, empresas, roles y permisos.
- Asignación de uno o varios roles a un usuario dentro de una empresa.
- Menú jerárquico de múltiples niveles.
- Permisos por recurso y acción.
- Protección de rutas y endpoints.
- Visualización condicional de botones, formularios y acciones.
- Filtrado obligatorio de información por empresa.
- Validación de reglas de negocio asociadas con estados.
- Registro de auditoría para operaciones críticas.

### 5.2 Fuera del alcance inicial

- Facturación y pagos.
- Integración con proveedores externos de identidad.
- Permisos sobre campos individuales de formularios.
- Estructuras organizacionales internas como sedes, sucursales o departamentos.
- Flujos de aprobación configurables por cada empresa.
- Aplicación móvil nativa.

Estos elementos podrán agregarse en versiones posteriores.

## 6. Actores

| Actor | Descripción |
|---|---|
| Usuario | Persona autenticada que utiliza las funciones autorizadas. |
| Administrador global | Administra empresas y configuraciones generales de la plataforma. |
| Administrador de empresa | Administra usuarios, roles y configuraciones de una empresa específica. |
| Supervisor | Consulta, verifica o aprueba operaciones según sus permisos. |
| Operador | Crea y modifica registros operativos. |
| Consultor | Accede principalmente a funciones de visualización y reportes. |
| Sistema | Valida identidad, empresa activa, permisos y reglas de negocio. |

Los nombres de los roles son configurables. La autorización debe depender de permisos concretos y no de nombres codificados directamente en el software.

## 7. Conceptos principales

| Concepto | Definición |
|---|---|
| Empresa | Organización o contexto dentro del cual se consultan y procesan los datos. |
| Empresa activa | Empresa seleccionada por el usuario para la sesión o solicitud actual. |
| Rol | Agrupación reutilizable de permisos. |
| Recurso | Funcionalidad o entidad protegida, como usuarios, solicitudes o reportes. |
| Acción | Operación realizada sobre un recurso, como visualizar, crear o verificar. |
| Permiso | Combinación única entre un recurso y una acción. |
| Módulo | Agrupación principal de funcionalidades. |
| Opción de menú | Elemento navegable que puede depender de otra opción y formar varios niveles. |
| Regla de negocio | Condición funcional adicional que determina si una acción es válida. |

## 8. Modelo de autorización

Se utilizará un modelo **RBAC multiempresa**, es decir, control de acceso basado en roles y limitado por empresa.

Ejemplo:

| Usuario | Empresa | Rol |
|---|---|---|
| Valentina | Empresa A | Administradora |
| Valentina | Empresa B | Consultora |
| Valentina | Empresa C | Sin acceso |

Los permisos efectivos del usuario serán la unión de los permisos de todos sus roles activos dentro de la empresa seleccionada. Los roles son plantillas reutilizables; su asignación solo es válida en la combinación `usuario + empresa + rol`.

Para pruebas y administración de plataforma existirá el rol `platform_admin`. Este rol tendrá el permiso explícito `platform.admin`, será auditado y no se implementará como una excepción basada en correo, nombre u otra condición codificada.

### 8.1 Convención de permisos

Cada permiso tendrá un código único con la estructura:

```text
recurso.accion
```

Ejemplos:

```text
usuarios.visualizar
usuarios.crear
usuarios.editar
usuarios.desactivar
solicitudes.visualizar
solicitudes.crear
solicitudes.editar
solicitudes.verificar
solicitudes.aprobar
solicitudes.rechazar
solicitudes.anular
reportes.visualizar
reportes.exportar
reportes.imprimir
```

### 8.2 Catálogo inicial de acciones

- Visualizar.
- Crear.
- Editar.
- Eliminar.
- Activar o desactivar.
- Verificar.
- Aprobar.
- Rechazar.
- Anular.
- Cerrar o reabrir.
- Asignar.
- Importar o exportar.
- Imprimir o descargar.
- Firmar.
- Enviar.
- Publicar.
- Consultar historial.
- Administrar.

El catálogo debe permitir incorporar nuevas acciones sin rediseñar el esquema de autorización.

## 9. Estructura del menú multinivel

Ejemplo conceptual:

```text
Administración
├── Usuarios
│   ├── Listado de usuarios
│   └── Asignación de roles
├── Empresas
│   └── Configuración
Operaciones
├── Solicitudes
│   ├── Mis solicitudes
│   └── Solicitudes pendientes
└── Reportes
    ├── Reporte general
    └── Reporte por estado
```

Cada opción podrá contener:

- Identificador.
- Nombre.
- Descripción.
- Ruta.
- Ícono.
- Orden.
- Nivel o referencia a la opción padre.
- Estado activo o inactivo.
- Permiso mínimo requerido.

El menú será una representación de la autorización, no el mecanismo de seguridad definitivo.

### 9.1 Reglas de visibilidad del menú

- Una opción padre sin ruta propia será visible cuando el usuario tenga acceso a al menos una de sus opciones descendientes.
- Una opción padre con ruta propia requerirá además su permiso mínimo para permitir la navegación a esa ruta.
- Cada hijo se evaluará independientemente; un usuario puede ver uno, varios o todos los hijos de un mismo padre.
- Cuando una opción esté asociada a varios permisos, el comportamiento predeterminado será permitirla si el usuario posee al menos uno de ellos (OR). Una condición que requiera todos los permisos (AND) deberá declararse explícitamente.

## 10. Requisitos funcionales

### RF-01. Autenticación

El sistema deberá permitir el inicio de sesión mediante credenciales válidas y generar una sesión o token seguro.

### RF-02. Empresas autorizadas

Después del inicio de sesión, el sistema deberá consultar exclusivamente las empresas activas a las que pertenece el usuario.

### RF-03. Selección de empresa

El usuario deberá seleccionar una empresa antes de acceder a las funcionalidades que dependan de información empresarial.

### RF-04. Cambio de empresa

El usuario podrá cambiar de empresa activa sin volver a autenticarse, siempre que tenga acceso vigente a la nueva empresa.

### RF-05. Contexto empresarial

El sistema deberá mantener la empresa activa en cada solicitud y verificar que el usuario pertenece a ella.

### RF-06. Roles por empresa

El sistema deberá permitir asignar roles diferentes al mismo usuario dependiendo de la empresa.

### RF-07. Múltiples roles

El diseño deberá permitir que un usuario tenga uno o varios roles activos en una misma empresa.

### RF-08. Permisos efectivos

El sistema deberá calcular los permisos efectivos del usuario a partir de sus roles activos dentro de la empresa seleccionada.

### RF-09. Menú dinámico

El sistema deberá devolver y representar únicamente los módulos y opciones de menú autorizados.

### RF-10. Menú multinivel

El sistema deberá soportar opciones de menú anidadas sin limitarse a un número fijo de niveles.

### RF-11. Protección de rutas

El frontend deberá impedir la navegación normal hacia rutas no autorizadas. El backend deberá rechazar cualquier solicitud no autorizada aunque la ruta se invoque directamente.

### RF-12. Permisos dentro de la pantalla

Cada acción de una pantalla deberá mostrar, ocultar o deshabilitar su control visual según los permisos del usuario.

### RF-13. Validación de acciones

Antes de ejecutar una acción, el backend deberá validar autenticación, empresa, permiso, pertenencia del registro y regla de negocio.

### RF-14. Aislamiento de información

Todas las consultas, actualizaciones y eliminaciones de información empresarial deberán limitarse a la empresa activa.

### RF-15. Revalidación

Los permisos deberán verificarse nuevamente en el backend en cada operación protegida, sin confiar exclusivamente en la información almacenada por el frontend.

### RF-16. Administración de permisos

Un usuario autorizado podrá consultar el catálogo de permisos y asociarlos o retirarlos de los roles.

### RF-17. Administración del menú

Un usuario autorizado podrá organizar módulos, opciones, rutas, jerarquía, orden, iconos y permisos mínimos del menú.

### RF-18. Estados y reglas de negocio

El sistema deberá validar si el estado actual de un registro permite ejecutar una acción, además de comprobar el permiso.

### RF-19. Auditoría

El sistema deberá registrar las acciones críticas indicando usuario, empresa, acción, recurso, registro afectado, fecha y resultado.

### RF-20. Respuestas de acceso denegado

El sistema deberá diferenciar entre una sesión no autenticada y una operación autenticada pero no autorizada.

## 11. Reglas de negocio

| Código | Regla |
|---|---|
| RN-01 | Un usuario solo puede seleccionar empresas con una vinculación activa. |
| RN-02 | Un rol solo otorga permisos dentro de la empresa donde fue asignado al usuario. |
| RN-03 | Un registro empresarial debe pertenecer exactamente a una empresa. |
| RN-04 | Toda consulta empresarial debe incluir el filtro de empresa en el backend. |
| RN-05 | Ocultar un botón no reemplaza la autorización del backend. |
| RN-06 | El acceso a una opción de menú no implica autorización para todas sus acciones. |
| RN-07 | La desactivación de una vinculación usuario–empresa debe retirar el acceso inmediatamente o al renovar la sesión, según la política definida. |
| RN-08 | Un permiso autoriza una acción, pero la regla de negocio determina si puede ejecutarse sobre un registro particular. |
| RN-09 | No deben utilizarse nombres de roles como condiciones rígidas dentro de la lógica funcional. |
| RN-10 | Las operaciones de administración y seguridad deben quedar registradas en auditoría. |
| RN-11 | El administrador de plataforma se identificará por el permiso explícito `platform.admin`; no se utilizarán excepciones codificadas por usuario. |
| RN-12 | La administración de una empresa no autoriza cambios sobre roles, permisos, menús o datos de otra empresa. |
| RN-13 | El menú padre se mostrará si al menos una opción descendiente está autorizada; cada opción hija conservará su validación independiente. |

## 12. Ejemplo de permisos en una pantalla

Pantalla: **Solicitudes**

| Acción | Permiso requerido | Comportamiento |
|---|---|---|
| Consultar listado | `solicitudes.visualizar` | Permite abrir la pantalla y consultar datos. |
| Ver detalle | `solicitudes.visualizar` | Permite consultar un registro de la empresa activa. |
| Crear | `solicitudes.crear` | Muestra el botón y permite registrar. |
| Editar | `solicitudes.editar` | Permite modificar registros en estados autorizados. |
| Verificar | `solicitudes.verificar` | Permite cambiar una solicitud enviada a verificada. |
| Aprobar | `solicitudes.aprobar` | Permite aprobar únicamente solicitudes verificadas. |
| Rechazar | `solicitudes.rechazar` | Permite rechazar según las reglas del proceso. |
| Anular | `solicitudes.anular` | Permite anular registros que no estén cerrados. |
| Exportar | `solicitudes.exportar` | Permite descargar información autorizada. |

## 13. Flujo principal

1. El usuario ingresa sus credenciales.
2. El backend valida la autenticación.
3. El sistema consulta las empresas autorizadas.
4. El usuario selecciona una empresa.
5. El backend verifica la relación usuario–empresa.
6. El sistema calcula roles y permisos efectivos.
7. El backend devuelve el contexto de empresa y el menú autorizado.
8. El frontend construye el menú y protege las rutas.
9. El usuario abre una opción.
10. La pantalla muestra únicamente las acciones autorizadas.
11. Al ejecutar una acción, el backend vuelve a validar empresa, permiso, registro y regla de negocio.
12. El sistema ejecuta la operación y registra la auditoría correspondiente.

## 14. Flujos alternos y excepciones

### FA-01. Usuario sin empresas

El sistema informará que el usuario no tiene empresas activas asignadas y no mostrará módulos empresariales.

### FA-02. Empresa desactivada

Si la empresa seleccionada fue desactivada, el sistema cancelará el contexto activo y solicitará seleccionar otra empresa válida.

### FA-03. Permiso retirado

Si un permiso fue retirado, la siguiente validación del backend deberá rechazar la operación. La política de caché deberá evitar mantener permisos obsoletos por periodos prolongados.

### FA-04. Acceso directo a una ruta

Si el usuario escribe manualmente una URL no autorizada, el frontend mostrará una vista de acceso denegado y el backend rechazará cualquier consulta relacionada.

### FA-05. Registro de otra empresa

Si se solicita un identificador que pertenece a otra empresa, el sistema no devolverá sus datos. Se recomienda responder como recurso inexistente para evitar revelar su existencia.

### FA-06. Acción incompatible con el estado

Si el usuario tiene el permiso pero el estado del registro no admite la acción, el sistema devolverá un error de regla de negocio.

## 15. Modelo de datos propuesto

### 15.1 Tablas principales

#### usuarios

```text
id
nombre
correo
contrasena_hash
estado
ultimo_acceso
created_at
updated_at
```

#### empresas

```text
id
nombre
nit
estado
created_at
updated_at
```

#### roles

```text
id
nombre
descripcion
tipo                 // platform, shared or company
empresa_id nullable  // required only for company roles
estado
created_at
updated_at
```

Los roles `shared` pueden reutilizarse entre empresas. Los roles `company` pertenecen a una única empresa. El rol `platform` se reserva para administración de plataforma.

#### permisos

```text
id
codigo
recurso
accion
descripcion
estado
```

#### rol_permisos

```text
rol_id
permiso_id
```

#### usuario_empresa_roles

```text
id
usuario_id
empresa_id
rol_id
estado
fecha_inicio
fecha_fin
```

#### modulos

```text
id
nombre
descripcion
icono
orden
estado
```

#### opciones_menu

```text
id
modulo_id
opcion_padre_id
nombre
descripcion
ruta
icono
orden
estado
```

#### opcion_menu_permisos

```text
opcion_menu_id
permiso_id
```

#### auditorias

```text
id
usuario_id
empresa_id
recurso
accion
registro_id
resultado
detalle
ip
user_agent
created_at
```

### 15.2 Consideraciones

- `opcion_padre_id` permite construir el menú mediante una relación recursiva.
- `permisos.codigo` debe ser único.
- La combinación usuario, empresa y rol no debe duplicarse mientras esté activa.
- Las tablas operativas deberán incluir `empresa_id NOT NULL`.
- Las consultas de registros empresariales deberán filtrar siempre por `id + empresa_id` o por `empresa_id` según el caso.
- Las relaciones entre datos empresariales deberán incluir `empresa_id` cuando corresponda; se usarán claves foráneas o restricciones compuestas para impedir asociaciones cruzadas entre empresas.
- Los índices deberán priorizar combinaciones frecuentes como `empresa_id + id`, `empresa_id + estado` y `usuario_id + empresa_id`.
- La auditoría no podrá ser modificada por flujos funcionales ordinarios y su lectura requerirá un permiso explícito.

## 16. Contratos de API propuestos

### 16.1 Autenticación

```http
POST /auth/login
POST /auth/logout
POST /auth/refresh
GET  /auth/me
```

### 16.2 Empresas del usuario

```http
GET /me/empresas
POST /auth/contexto-empresa
```

Después de seleccionar una empresa, el frontend enviará el contexto mediante el encabezado canónico `X-Company-Id` en cada solicitud empresarial. El backend deberá comprobar que coincide con una vinculación activa del usuario y rechazar cualquier discrepancia con identificadores de empresa incluidos en la ruta.

Solicitud de selección:

```json
{
  "empresaId": 1
}
```

Respuesta conceptual:

```json
{
  "empresa": {
    "id": 1,
    "nombre": "Empresa A"
  },
  "roles": ["SUPERVISOR"],
  "permisos": [
    "solicitudes.visualizar",
    "solicitudes.crear",
    "solicitudes.editar",
    "solicitudes.verificar",
    "reportes.visualizar"
  ],
  "menu": []
}
```

### 16.3 Recursos empresariales

```http
GET   /empresas/:empresaId/solicitudes
POST  /empresas/:empresaId/solicitudes
GET   /empresas/:empresaId/solicitudes/:id
PATCH /empresas/:empresaId/solicitudes/:id
PATCH /empresas/:empresaId/solicitudes/:id/verificar
PATCH /empresas/:empresaId/solicitudes/:id/aprobar
PATCH /empresas/:empresaId/solicitudes/:id/rechazar
```

El identificador de empresa de la ruta identifica el recurso solicitado; el contexto de autorización canónico se transporta en `X-Company-Id`. El backend deberá comprobar siempre la pertenencia del usuario, la coincidencia entre ambos valores y que el registro solicitado pertenece a esa empresa.

### 16.4 Códigos de respuesta

| Código | Uso |
|---|---|
| 200/201 | Operación exitosa. |
| 400 | Solicitud inválida o regla de negocio incumplida. |
| 401 | Usuario no autenticado o sesión vencida. |
| 403 | Usuario autenticado sin permiso suficiente. |
| 404 | Recurso inexistente o no visible dentro de la empresa activa. |
| 409 | Conflicto de estado o duplicidad. |

## 17. Diseño técnico de referencia

### 17.1 Frontend

- Servicio de autenticación.
- Servicio de contexto empresarial.
- Selector de empresa.
- Almacén de sesión y permisos.
- Servicio de construcción del menú.
- Guard de autenticación.
- Guard de empresa seleccionada.
- Guard de permisos de ruta.
- Directiva o componente para controlar acciones.
- Interceptor para incorporar el contexto autorizado a las solicitudes.
- Pantalla de acceso denegado.

Ejemplo conceptual:

```html
<button *tienePermiso="'solicitudes.verificar'">
  Verificar
</button>
```

### 17.2 Backend

- Módulo de autenticación.
- Módulo de usuarios.
- Módulo de empresas.
- Módulo de roles y permisos.
- Módulo de menú.
- Guard de autenticación.
- Guard de pertenencia a la empresa.
- Guard de permisos.
- Servicio de contexto empresarial.
- Servicio de auditoría.
- Repositorios que exijan el filtro de empresa.

Ejemplo conceptual:

```typescript
@RequirePermission('solicitudes.verificar')
@Patch(':id/verificar')
verificarSolicitud() {
  // Validar estado y ejecutar la operación.
}
```

### 17.3 Orden obligatorio de validación

1. Validar autenticación.
2. Resolver empresa activa.
3. Validar vinculación usuario–empresa.
4. Calcular o consultar permisos efectivos.
5. Validar el permiso requerido.
6. Consultar el registro limitado por empresa.
7. Validar la regla de negocio.
8. Ejecutar la operación.
9. Registrar auditoría.

## 18. Estados y reglas del proceso

Ejemplo de flujo para solicitudes:

```text
BORRADOR → ENVIADA → VERIFICADA → APROBADA
                         └──────→ RECHAZADA
```

Para aprobar una solicitud deberán cumplirse, como mínimo, estas condiciones:

```text
El usuario tiene solicitudes.aprobar
+ La solicitud pertenece a la empresa activa
+ La solicitud está en estado VERIFICADA
```

Los permisos responden a **quién puede hacer algo**. Las reglas de negocio responden a **cuándo y sobre qué registro puede hacerlo**.

## 19. Requisitos no funcionales

### RNF-01. Seguridad

Las contraseñas deberán almacenarse mediante un algoritmo de hash seguro. Los tokens de acceso deberán tener una duración corta (objetivo inicial: 10 a 15 minutos) y renovación controlada mediante tokens revocables. Los permisos no se confiarán exclusivamente al token: el backend los consultará o cacheará por `usuario + empresa`, con invalidación o `permission_version` al modificar roles o permisos.

### RNF-02. Aislamiento multiempresa

Ninguna consulta podrá retornar información de una empresa diferente a la empresa validada en el contexto de la operación.

### RNF-03. Rendimiento

La obtención del contexto, permisos y menú deberá responder en un tiempo objetivo inferior a dos segundos bajo condiciones normales.

### RNF-04. Escalabilidad

El diseño deberá soportar el crecimiento de usuarios, empresas, roles, permisos y niveles del menú sin modificaciones estructurales importantes.

### RNF-05. Mantenibilidad

Los permisos deberán declararse mediante códigos centralizados y reutilizables. La lógica de autorización no deberá repetirse manualmente en cada controlador.

### RNF-06. Auditoría

Los registros de auditoría deberán ser consultables, protegidos contra modificaciones no autorizadas y conservarse según la política institucional.

### RNF-07. Disponibilidad

Los fallos al cargar permisos o contexto empresarial deberán cerrar el acceso de forma segura, evitando conceder permisos por defecto.

### RNF-08. Usabilidad

El usuario deberá identificar claramente la empresa activa y recibir advertencias antes de cambiarla cuando existan formularios sin guardar.

### RNF-09. Accesibilidad

Las acciones ocultas o deshabilitadas deberán mantener una experiencia comprensible mediante etiquetas, mensajes y navegación accesible.

### RNF-10. Observabilidad

El sistema deberá producir logs técnicos sin exponer contraseñas, tokens ni información sensible.

## 20. Seguridad y amenazas principales

| Riesgo | Control esperado |
|---|---|
| Manipulación del ID de empresa | Validar siempre la relación usuario–empresa. |
| Acceso directo a endpoints | Validar permisos en el backend. |
| IDOR: consulta de registros ajenos | Buscar los registros por `id + empresa_id`. |
| Permisos obsoletos en caché | Expiración corta, invalidación o versionado de permisos. |
| Escalamiento de privilegios | Restringir la administración de roles y auditar cambios. |
| Exposición mediante exportaciones | Aplicar los mismos filtros y permisos que en pantalla. |
| Tokens robados | Expiración, renovación segura y revocación. |
| Concesión por fallo | Denegar acceso cuando no pueda verificarse el permiso. |

## 21. Auditoría mínima

Se deberán auditar al menos:

- Inicio y cierre de sesión.
- Intentos fallidos relevantes.
- Selección y cambio de empresa.
- Creación o modificación de usuarios.
- Asignación o retiro de roles.
- Modificación de permisos.
- Operaciones de verificación, aprobación, rechazo y anulación.
- Exportaciones de información sensible.
- Cambios de configuración empresarial.

## 22. Historias de usuario iniciales

### HU-01. Seleccionar empresa

Como usuario con acceso a varias empresas, quiero seleccionar la empresa con la cual trabajaré para consultar y procesar solamente su información.

### HU-02. Visualizar menú autorizado

Como usuario, quiero ver únicamente los módulos y opciones que puedo utilizar dentro de la empresa activa para navegar de manera clara y segura.

### HU-03. Controlar acciones

Como administrador, quiero asignar permisos independientes para visualizar, crear, editar, verificar y aprobar, con el fin de controlar las responsabilidades de cada rol.

### HU-04. Tener roles diferentes

Como usuario, quiero tener un rol diferente en cada empresa para que mis capacidades correspondan a las responsabilidades que desempeño en cada organización.

### HU-05. Proteger la información empresarial

Como empresa, quiero que mis datos solo sean consultados por usuarios autorizados dentro de mi contexto para evitar accesos cruzados.

### HU-06. Auditar operaciones críticas

Como administrador, quiero consultar quién realizó cada operación crítica, en qué empresa y en qué momento para mantener trazabilidad.

## 23. Criterios de aceptación generales

1. Un usuario sin relación activa con una empresa no puede seleccionarla ni consultar sus datos.
2. Al cambiar la empresa activa, el menú, las rutas, los permisos y los datos se actualizan según el nuevo contexto.
3. Un usuario puede tener capacidades diferentes en dos empresas distintas.
4. Una ruta no autorizada es bloqueada aunque el usuario escriba manualmente su URL.
5. Una operación no autorizada es rechazada por el backend aunque el botón haya sido manipulado en el navegador.
6. Todas las consultas empresariales filtran por la empresa validada.
7. Un registro de otra empresa no puede consultarse modificando su identificador.
8. Un usuario con permiso para visualizar, pero sin permiso para editar, puede consultar la pantalla pero no modificar registros.
9. Un usuario con permiso para aprobar no puede hacerlo si el registro no se encuentra en el estado requerido.
10. Las operaciones críticas generan un registro de auditoría.

## 24. Pruebas mínimas

### Pruebas funcionales

- Inicio de sesión válido e inválido.
- Usuario sin empresas.
- Usuario con una empresa.
- Usuario con varias empresas.
- Cambio de empresa activa.
- Roles diferentes entre empresas.
- Unión de permisos de múltiples roles.
- Menú con varios niveles.
- Acciones visibles, ocultas o deshabilitadas.
- Validaciones por estado del registro.

### Pruebas de seguridad

- Cambio manual del identificador de empresa.
- Cambio manual del identificador del registro.
- Invocación directa de endpoints sin permiso.
- Acceso con token vencido.
- Acceso después de retirar un rol.
- Exportación sin autorización.
- Modificación de roles por un usuario no autorizado.

### Pruebas de aislamiento

- Consultar listados y verificar que solo incluyan la empresa activa.
- Consultar detalles pertenecientes a otra empresa.
- Actualizar y eliminar registros de otra empresa.
- Ejecutar reportes y exportaciones con filtros multiempresa.

## 25. Fases sugeridas

### Fase 1. Seguridad base

- Autenticación.
- Usuarios y empresas.
- Vinculación usuario–empresa.
- Roles y permisos.

### Fase 2. Contexto y navegación

- Selector de empresa.
- Cálculo de permisos efectivos.
- Menú multinivel.
- Guards de rutas.

### Fase 3. Permisos operativos

- Protección de endpoints.
- Control de acciones en las pantallas.
- Filtro obligatorio por empresa.
- Reglas de estados.

### Fase 4. Administración y auditoría

- Gestión de roles y permisos.
- Gestión del menú.
- Auditoría.
- Pruebas de seguridad e integración.

## 26. Métricas de éxito

- Cero accesos confirmados a datos de otra empresa.
- Cien por ciento de endpoints empresariales protegidos por autenticación, empresa y permiso.
- Cien por ciento de acciones críticas registradas en auditoría.
- Menú generado correctamente para todos los roles de prueba.
- Reducción de lógica de autorización duplicada mediante guards, políticas o decoradores reutilizables.
- Aprobación de las pruebas de acceso cruzado y escalamiento de privilegios.

## 27. Decisiones pendientes

1. Definir si una empresa puede crear roles personalizados y bajo qué límites.
2. Definir el tiempo máximo de actualización de permisos después de un cambio y el mecanismo de invalidación de caché.
3. Determinar cuáles acciones requieren auditoría detallada antes y después del cambio.
4. Precisar el alcance del permiso `platform.admin` sobre datos empresariales fuera de las pruebas.
5. Establecer la política de eliminación lógica y conservación de auditorías.
6. Precisar los primeros módulos funcionales que utilizarán el sistema de permisos.
7. Diseñar y validar permisos por campo mediante una pantalla piloto antes de generalizarlos.

## 28. Recomendación de arquitectura

Para una primera versión se recomienda:

- Aplicación web de una sola página.
- API backend modular.
- Base de datos relacional.
- Autenticación mediante tokens de acceso de corta duración y renovación segura.
- RBAC multiempresa con permisos `recurso.accion`.
- Contexto empresarial validado en cada solicitud.
- Menú dinámico calculado desde permisos.
- Guards o políticas reutilizables en frontend y backend.
- Auditoría centralizada.

La regla arquitectónica principal será:

> **El frontend adapta la experiencia; el backend protege el sistema.**

