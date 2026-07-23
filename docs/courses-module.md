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
- Vista de cursos para alumnos y mención del módulo en la landing pública.

Las entidades `AcademyCourseModule` y `AcademyCourseLesson` dejan preparada la relación curso → módulos → lecciones. `AcademyCourseEnrollment` y `AcademyLessonProgress` registran la inscripción y el avance del alumno. La siguiente iteración agregará evaluaciones y carga segura de materiales.
