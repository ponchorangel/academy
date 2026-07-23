# Módulo de cursos

Academy incorpora cursos como una ruta de aprendizaje estructurada, independiente de las sesiones en vivo y los eventos.

## Alcance de esta versión

- Cursos por organización, con título, descripción, categoría, nivel, duración y facilitadores.
- Estados de borrador, publicado y archivado.
- Acceso configurable para todos los miembros, personas inscritas, invitación o contenido público.
- Alta, edición y archivado desde Administración.
- Constructor de módulos y lecciones desde Administración.
- Vista de detalle del curso para el alumno, con módulos y lecciones ordenadas.
- Inscripción individual y avance por lección con porcentaje de progreso.
- Videos externos mediante YouTube no listado o Vimeo, sin almacenar archivos de video en Academy.
- Evaluaciones tipo quiz con preguntas, opciones, calificación mínima de 70% y avance al aprobar.
- Certificado automático con folio al completar todas las lecciones.
- Página pública de validación y vista imprimible del certificado.
- Vista de cursos para alumnos y mención del módulo en la landing pública.

Las entidades `AcademyCourseModule` y `AcademyCourseLesson` dejan preparada la relación curso → módulos → lecciones. `AcademyCourseEnrollment` y `AcademyLessonProgress` registran la inscripción y el avance del alumno. `AcademyQuizQuestion` y `AcademyQuizAttempt` gestionan evaluaciones y calificaciones; queda pendiente la carga segura de archivos.

## Video externo

Las lecciones de video guardan únicamente el proveedor y el identificador del video. Academy genera un reproductor seguro con una lista permitida de dominios; no acepta iframes ni código HTML arbitrario. Para contenido privado se recomienda Vimeo con restricciones de incrustación por dominio. YouTube se admite como alternativa de bajo costo usando videos no listados.
