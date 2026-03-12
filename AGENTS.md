# Proyecto: Control de Horas

Aplicación web para registrar horas de trabajo, calcular ingresos y visualizar estadísticas.

El objetivo del proyecto es construir una app moderna que permita a un usuario registrar sus turnos de trabajo, ver cuánto dinero gana por mes y gestionar su información laboral.

---

# Arquitectura del proyecto

El proyecto está dividido en dos partes principales:

frontend/
backend/

---

# Frontend

Tecnologías:

- HTML
- CSS
- JavaScript (vanilla)
- Chart.js para gráficos
- Supabase Auth para autenticación

Archivos principales:

index.html  
style.css  
script.js  
auth.js  

Funciones principales del frontend:

- login y registro de usuario
- dashboard con dinero total y horas trabajadas
- gráfico mensual de ingresos
- calendario que marca días trabajados
- formulario para cargar horas
- tabla con detalle de horas cargadas
- borrar horas
- modo oscuro
- menú lateral
- perfil del usuario
- subida de recibos

El frontend consume la API del backend mediante fetch.

---

# Backend

Tecnologías:

- Node.js
- Express
- Supabase como base de datos

Deploy:

Render

Endpoints principales:

POST /add-hours  
DELETE /delete-hour/:id  
GET /resumen  
GET /hours-by-month  
GET /hours-by-calendar-month  

La tabla principal en Supabase es:

hours

Columnas principales:

id  
user_id  
date  
start_time  
end_time  
sector  
money  

El user_id corresponde al UUID generado por Supabase Auth.

---

# Funcionalidades actuales

- autenticación con Supabase
- registrar horas trabajadas
- cálculo automático de dinero ganado
- dashboard con métricas
- gráfico mensual de ingresos
- calendario con días trabajados
- borrar registros
- modo oscuro
- menú lateral responsive
- perfil del usuario (guardado en localStorage)
- subida de recibos (guardados en localStorage)

---

# Reglas de desarrollo

Cuando se hagan cambios en el proyecto:

- no romper funcionalidades existentes
- mantener compatibilidad mobile
- mantener JavaScript vanilla (no frameworks)
- mantener integración con Supabase Auth
- mantener estructura actual de API

Si se modifica HTML o CSS, verificar que script.js siga funcionando correctamente.

---

# Objetivo del proyecto

Convertir esta aplicación en una herramienta moderna para registrar horas laborales que pueda evolucionar a un producto más completo.

Futuras mejoras posibles:

- cargar horas desde el calendario
- estadísticas más avanzadas
- exportar datos a PDF
- mejor interfaz de usuario
- optimización mobile
- almacenamiento de perfil y recibos en base de datos

---

# Nota para el agente (Codex)

Antes de realizar cambios en el código:

1. Analizar la estructura del proyecto.
2. Revisar index.html, script.js y style.css.
3. Mantener compatibilidad con el backend existente.
4. Priorizar mejoras de interfaz y experiencia de usuario sin romper la lógica actual.

# Nota de continuidad

Última revisión real del proyecto:

- El frontend ya tiene `apiFetch()` centralizado en `frontend/script.js`.
- Ya están implementados estados de carga para:
  - guardar horas
  - guardar perfil
  - borrar horas
  - editar horas
  - cargar horas rápidas desde calendario
- Ya está implementada la edición de horas desde “Detalle de horas”.
- El backend ya expone `PUT /update-hour/:id`.
- `DELETE /delete-hour/:id` está alineado con el frontend y recibe `user_id` por body.
- El período del dashboard ya se muestra en formato amigable, por ejemplo `Febrero 2026`.
- El gráfico mensual ya usa labels amigables, por ejemplo `Feb 2026`.

Estado actual confirmado:

- Stack mantenido:
  - HTML
  - CSS
  - JavaScript vanilla
  - Supabase Auth
  - Backend Node + Express
  - Supabase
  - Render
- No se reescribió la app; las mejoras fueron sobre la base existente.
- La estructura principal actual sigue siendo:
  - `frontend/index.html`
  - `frontend/style.css`
  - `frontend/script.js`
  - `frontend/auth.js`
  - `backend/server.js`

Pendientes reales detectados en la última revisión:

1. Mostrar mejor las tarifas actuales en la interfaz
- En `frontend/script.js` existe `updateHourlyRateUI()`.
- Esa función intenta actualizar:
  - `#currentHourlyRate`
  - `#currentHourlyRateNight`
- Pero esos elementos no existen hoy en `frontend/index.html`.
- Decidir si:
  - se agregan al dashboard como cards o texto visible
  - o se elimina esa lógica si ya no se quiere mostrar ahí

2. Revisar navegación por año en el panel principal
- Los botones de meses del dashboard principal usan siempre el año actual.
- Eso impide navegar fácilmente a otros años desde esa vista.
- El calendario sí permite elegir mes y año.
- Evaluar si conviene agregar selector de año también al resumen principal.

3. Seguir profesionalizando el frontend sin romper lógica existente
- mantener compatibilidad mobile
- mantener JS vanilla
- no romper integración con Supabase Auth
- no romper endpoints actuales del backend

Si retomamos este proyecto más adelante, primero revisar:

1. `frontend/index.html`
2. `frontend/script.js`
3. `frontend/style.css`
4. `backend/server.js`

Siguiente paso sugerido al volver:

- Resolver la visualización de `Valor hora normal` y `Valor hora nocturna` en el dashboard.
- Después evaluar mejora de navegación por año en la vista principal.
- Feb 2026
- Mar 2026
o equivalente claro en español.

7. Mejorar experiencia al guardar horas
Actualmente al guardar se limpian todos los campos.
Quiero que:
- la fecha NO se limpie
- solo se limpien:
  - hora inicio
  - hora fin
  - sector

Esto es para que si cargo varios turnos del mismo día sea más rápido.

8. Claridad visual entre tarifas actuales y total del mes
Quiero que quede claro que:
- el total del dashboard depende de la lógica actual configurada
- las tarifas visibles son las actuales del perfil

No quiero que el usuario se confunda.
Si hace falta ajustar textos, subtítulos o labels para hacerlo más claro, hacelo.

--------------------------------
MEJORA IMPORTANTE: EDITAR HORAS DESDE DETALLE
--------------------------------

Quiero poder editar registros ya cargados desde la tabla o detalle de horas.

Necesito lo siguiente:

1. Agregar botón Editar en cada fila del detalle
Además del botón Eliminar, agregar un botón:
- Editar

2. Flujo de edición
Cuando el usuario toca Editar en un registro:
- abrir una interfaz para editar ese registro

Puede ser:
- un modal
o
- una card expandible
o
- un formulario inline debajo de la fila
o
- reutilizar el formulario principal cargando los datos

Elegí la solución más limpia y usable.

3. Datos editables
Quiero poder editar:
- fecha
- hora inicio
- hora fin
- sector

4. Guardado de edición
Al guardar cambios:
- llamar al backend para actualizar el registro
- recalcular correctamente:
  - horas normales
  - horas nocturnas
  - total money
según la lógica actual del backend

5. Después de editar
Actualizar automáticamente:
- detalle del mes
- dashboard
- calendario si corresponde
- gráfico si corresponde

6. Feedback visual
Mostrar toast de éxito al editar:
- “Hora actualizada correctamente”

Y si falla:
- toast de error claro

7. Requisito backend/frontend
Si el backend todavía no tiene endpoint de edición, agregalo o dejá preparado lo necesario.

Ejemplo posible:
PUT /update-hour/:id

Debe recibir:
- user_id
- date
- start_time
- end_time
- sector

Y recalcular todo correctamente en backend.

--------------------------------
MEJORA DEL DETALLE DE HORAS
--------------------------------

1. Hacer más claro el detalle
Quiero que el detalle de horas sea más útil y profesional.

Si es posible, en cada fila mostrar mejor:
- fecha
- horario
- sector
- monto
- acciones

2. Si backend ya devuelve esto, también mostrar:
- horas normales
- horas nocturnas

No tiene que quedar recargado, pero sí más claro.

3. En mobile
La vista mobile del detalle debe seguir funcionando bien.
No romper la tabla responsive actual.

--------------------------------
PERFIL
--------------------------------

1. Mantener bien funcionales:
- valor por hora normal
- valor por hora nocturna

2. Cuando el usuario guarda perfil:
- refrescar dashboard automáticamente
- refrescar visualmente los valores mostrados en cards

3. Mantener compatibilidad con Supabase
No romper loadProfile() ni saveProfile().

--------------------------------
CALENDARIO
--------------------------------

1. Mantener la carga rápida desde calendario.
2. Que siga funcionando después de cualquier mejora.
3. Si se edita o elimina un registro y eso afecta un día, actualizar el calendario correctamente.

--------------------------------
RECIBOS
--------------------------------

No quiero rehacer recibos ahora, pero sí dejar el código más preparado para una migración futura a storage real.
Si hace falta ordenar o mejorar naming, hacelo sin romper lo que hoy funciona.

--------------------------------
IMPORTANTE
--------------------------------

No romper:
- login
- register
- logout
- dark mode
- guardar horas
- borrar horas
- dashboard
- gráfico mensual
- calendario
- perfil
- recibos
- carga rápida desde calendario

--------------------------------
ESTILO DE IMPLEMENTACIÓN
--------------------------------

Quiero cambios concretos sobre mis archivos actuales.
No quiero teoría solamente.

Quiero que:
- modifiques HTML, CSS y JS si hace falta
- si hace falta tocar backend para editar horas, hacelo
- mantengas JavaScript vanilla
- mantengas compatibilidad mobile
- mejores UX y claridad general

--------------------------------
RESULTADO ESPERADO
--------------------------------

Quiero que me devuelvas:
- archivos corregidos
- frontend más claro y sólido
- labels más amigables
- mejor experiencia de uso
- detalle con edición de horas
- mejor consistencia entre frontend y backend
