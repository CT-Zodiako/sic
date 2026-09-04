# Guía de uso de la plataforma SIC

Una guía rápida para entender el flujo completo y qué hace cada sección.

**Acceso:** http://localhost:4200/login

| Rol | Usuario | Contraseña | Para qué sirve |
|---|---|---|---|
| Administrador | `admin@sic.test` | `Cambiar1234!` | Configura todo: permisos, roles, usuarios, servicios, menús |
| Operador | `operaciones@sic.test` | `Cambiar1234!` | Trabaja con los registros según sus permisos |

---

## 1. Diagrama de flujo general

```text
┌──────────┐
│  LOGIN   │  admin@sic.test o operaciones@sic.test
└────┬─────┘
     ▼
┌──────────────────┐
│ ELEGIR EMPRESA   │  Empresa A o Empresa B (selector en la barra superior)
└────┬─────────────┘
     ▼
┌──────────────────────────────────────────┐
│ EL SISTEMA CALCULA TU CONTEXTO           │
│ Usuario → Empresa → Roles → Permisos     │
│         → Menús y acciones visibles      │
└────┬─────────────────────────────────────┘
     ▼
┌──────────────────────────────────────────┐
│ NAVEGACIÓN (menú lateral izquierdo)      │
│ Solo ves lo que tus permisos autorizan   │
└────┬────────────────┬────────────────────┘
     ▼                ▼
┌─────────────┐  ┌─────────────────────────┐
│ OPERACIONES │  │ ADMINISTRACIÓN          │
│ (trabajo    │  │ DE LA PLATAFORMA        │
│  diario)    │  │ (solo administradores)  │
└─────────────┘  └─────────────────────────┘
```

---

## 2. Cómo se construye el acceso (la cadena)

Todo el sistema funciona con esta cadena, en este orden:

```text
1. PERMISO     Qué acción existe        ej: "Crear registros"
      ▼
2. ROL         Paquete de permisos      ej: "Operador de Empresa A"
      ▼
3. USUARIO + EMPRESA
               Quién y dónde            ej: Juan en Empresa A
      ▼
4. MENÚ        Qué opción de navegación ej: "Operaciones"
               se muestra
      ▼
5. SERVICIO    Qué módulo tiene         ej: Acueducto habilitado
               habilitada la empresa
      ▼
6. RESULTADO   El usuario solo ve y usa
               lo que su cadena permite
```

**Regla de oro:** nada se asigna directo al usuario. Todo pasa por el rol. Así, 10 personas con el mismo rol comparten la misma configuración.

---

## 3. Pantalla: Login

**Qué hacés:** ingresás con tu correo y contraseña.

**Qué pasa:** el servidor valida tus credenciales y te lleva al panel. Si entrás a una URL protegida sin sesión, te redirige al login y después vuelve a donde querías ir.

---

## 4. Barra superior (después de entrar)

| Elemento | Qué hace |
|---|---|
| **Empresa activa** | Selector de empresa. Cambiar de empresa recalcula todos tus permisos y menús al instante. |
| **Sesión activa** | Tu estado de autenticación. |
| **Cerrar sesión** | Sale y vuelve al login. |

---

## 5. Menú lateral (navegación)

El menú se construye según tus permisos **y** los servicios habilitados de la empresa activa.

| Opción | Quién la ve | Qué hace |
|---|---|---|
| **Operaciones** | Quien tenga permiso de lectura | Pantalla de trabajo con registros |
| **Acueducto / Energía / Gas** | Solo si la empresa tiene ese servicio habilitado **y** tenés permiso de lectura | Abre Operaciones filtrada por ese servicio |
| **Administración de la plataforma** | Solo administradores (`platform.admin`) | Panel de configuración completa |

Ejemplo real del seed:

```text
Empresa A → menú: Operaciones | Acueducto | Energía
Empresa B → menú: Operaciones | Gas
```

---

## 6. Pantalla: Operaciones (trabajo diario)

**Qué hacés acá:** trabajás con los registros de la empresa y servicio activos.

**Para qué sirve:** es la pantalla operativa; cada registro representa una operación del negocio.

### Qué ves

- **Servicios habilitados:** chips con los servicios de la empresa activa.
- **Servicio activo:** si entraste desde el menú de un servicio, se muestra cuál es; los registros son solo de ese servicio.
- **Tabla de registros:** nombre y acciones disponibles.
- **Formulario de creación:** solo si tenés permiso de crear.

### Acciones posibles (según tus permisos)

| Botón | Qué hace | Permiso que lo habilita |
|---|---|---|
| **Crear registro** | Agrega un registro a la empresa + servicio activo | `create` |
| **Actualizar** | Guarda el nombre actual del registro | `update` |
| **Eliminar** | Quita el registro de la lista | `delete` |
| **Completar** | Marca el registro como terminado | `action` |

**Si un botón no aparece:** tu rol en esa empresa no incluye esa acción. Aunque alguien llame a la API directamente, el backend responde `403` y no modifica nada.

### Resultado esperado

Los cambios se guardan en el servidor y la tabla se actualiza al instante. Los datos de un servicio no se mezclan con los de otro servicio ni con los de otra empresa.

---

## 7. Pantalla: Administración de la plataforma (solo admin)

Es el panel de configuración. Está organizado en pasos numerados, cada uno con **Qué hacés / Para qué sirve / Resultado**.

### Paso 0 — Cómo configurar acceso (checklist)

Una lista de verificación con la cadena completa:

```text
Permiso → Rol → Usuario en empresa → Menú → Acción → Operaciones
```

Cada paso muestra **Listo** o **Pendiente** según el estado real de la configuración.

### Paso 1 — Permisos

**Qué hacés:** definís las acciones que el sistema puede autorizar.

| Acción | Para qué sirve | Resultado |
|---|---|---|
| **Crear permiso** | Define una acción nueva (código, recurso, acción) | Aparece en la lista, disponible para vincular a roles |
| **Desactivar** | Deja de autorizar la acción en todos los roles que la incluyen | Los usuarios pierden esa acción al instante; nada se borra |
| **Activar** | Vuelve a autorizar la acción | Los roles que la incluyen la recuperan |

### Paso 2 — Roles

**Qué hacés:** revisás los roles (paquetes de permisos) y su ámbito.

| Acción | Para qué sirve | Resultado |
|---|---|---|
| **Desactivar** | Retira los permisos del rol a quienes lo tienen | Esas personas pierden el acceso del rol; nada se borra |

El chip de ámbito indica: **Toda la plataforma** / **Compartido entre empresas** / **Solo una empresa**.

### Paso 3 — Asignaciones

**Qué hacés:** registrás personas y conectás persona + empresa + rol.

| Acción | Para qué sirve | Resultado |
|---|---|---|
| **Crear persona** | Habilita una cuenta de acceso | La persona puede iniciar sesión |
| **Asignar rol** | Otorga los permisos del rol a una persona dentro de una empresa | Acceso efectivo solo en esa empresa |
| **Vincular permiso** | Suma una acción a un rol | Todos con ese rol la obtienen al instante |
| **Desactivar asignación** | Retira el acceso de la persona a la empresa | Pierde el acceso; nada se borra |

### Paso 4 — Menús

**Qué hacés:** decidís qué opciones de navegación ve cada perfil y a qué URL llevan.

| Acción | Para qué sirve | Resultado |
|---|---|---|
| **Vincular permiso a un menú** | Controla la visibilidad del elemento | Solo lo ve quien tenga ese permiso |
| **Guardar URL** | Cambia a dónde lleva el elemento | La navegación usa la nueva ruta de inmediato |
| **Desactivar menú** | Oculta el elemento de la navegación | Desaparece del menú; nada se borra |

### Paso 5 — Servicios

**Qué hacés:** administrás el catálogo (Acueducto, Energía, Gas y los que crees) y qué servicios tiene cada empresa.

| Acción | Para qué sirve | Resultado |
|---|---|---|
| **Crear servicio** | Agrega un servicio nuevo al catálogo | Disponible para asignar a empresas |
| **Asignar servicio** | Habilita el servicio en una empresa | Aparece en el menú de esa empresa y en su pantalla Operaciones |
| **Desactivar servicio** | Impide nuevas asignaciones y lo oculta donde ya está | Nadie lo ve hasta reactivarlo; nada se borra |
| **Desactivar asignación** | Retira el servicio de una empresa | La empresa lo pierde; podés reasignarlo |

### Paso 6 — Auditoría

**Qué hacés:** revisás el historial de solo lectura.

**Para qué sirve:** verificar quién cambió qué. Cada cambio de los pasos anteriores queda registrado con actor, empresa, acción y resultado. Los datos sensibles no se muestran.

---

## 8. Flujo completo de ejemplo (punta a punta)

```text
ADMIN                              OPERADOR
─────────────────────────────────────────────────────────────
1. Login como admin@sic.test
2. Elegí Empresa A
3. Paso 5: asigná "Acueducto" a Empresa A
4. Paso 3: asigná rol "Operador" a Juan en Empresa A
5. Paso 1-2: verificá que el rol tenga "Leer registros"
                                     │
                                     ▼
                          6. Login como operaciones@sic.test
                          7. Elegí Empresa A
                          8. El menú muestra "Acueducto"
                          9. Entrá: ves solo registros de Acueducto
                          10. Sin botón Crear (el rol no lo incluye)

ADMIN (revocación)
─────────────────────────────────────────────────────────────
11. Paso 1: desactivá el permiso "Leer registros"
                                     │
                                     ▼
                          12. El operador recarga:
                              el menú desaparece y la API
                              responde 403 — sin cerrar sesión
13. Paso 6: verificá el evento en Auditoría
```

---

## 9. Reglas de seguridad (siempre activas)

- El menú y los botones **solo muestran**; la autoridad real es el backend.
- Un rol de Empresa A **no da acceso** a Empresa B.
- Los registros no se mezclan entre empresas ni entre servicios.
- Desactivar algo nunca borra datos: todo es reversible.
- Cada cambio de configuración queda en auditoría con antes/después.

---

## 10. Solución rápida de problemas

| Situación | Causa probable | Qué hacer |
|---|---|---|
| El selector de empresa está vacío | El usuario no tiene membership activa | El admin debe asignarlo a una empresa (paso 3) |
| No veo una opción del menú | Falta el permiso o el servicio no está habilitado | Revisar paso 4 (menú) y paso 5 (servicio) |
| No aparece un botón en Operaciones | El rol no incluye esa acción | El admin vincula el permiso al rol (paso 3) |
| "Este servicio no está habilitado" | El servicio se desactivó o nunca se asignó | Asignarlo desde el paso 5 |
| Cambié algo y no se refleja | El contexto se recalcula al cambiar de empresa | Cambiá de empresa y volvé, o recargá |
