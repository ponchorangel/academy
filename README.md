# Academy

Plataforma independiente y multiempresa de capacitación. Academy by Scalaria está diseñada para crecer como producto SaaS para escuelas, academias, coaches, consultores y empresas.

## MVP actual

- Panel de alumno con cursos, sesiones, eventos y descargables.
- Cursos estructurados con módulos, lecciones, nivel, categoría, duración y facilitadores asignados.
- Inscripción de alumnos y seguimiento de avance por lección y curso.
- Lecciones de video con proveedores externos YouTube no listado y Vimeo.
- Evaluaciones con preguntas, calificación y aprobación desde backend.
- Certificados automáticos al completar el 100% de un curso.
- Validación pública por folio y vista imprimible para guardar el certificado como PDF.
- Descargables en almacenamiento privado con enlaces temporales y control por organización.
- Registro de alumnos a eventos y control de asistencia desde Administración.
- Confirmaciones y recordatorios de eventos mediante Resend desde `academy@scalaria.com.mx`.
- Configuración de enlaces de acceso y grabación por evento.
- Portal personalizable por Academy: logo, color, bienvenida y módulos visibles.
- Inicio de sesión con correo y contraseña, Google o Microsoft; el acceso se controla mediante invitaciones y no hay registro público.
- Modelo de datos multiempresa: organizaciones, membresías y contenido con `organization_id`.
- Personalización inicial por organización (nombre, logo, colores y módulos habilitados).
- Estructura preparada para clientes Academy (escuelas, academias y empresas), alumnos y facilitadores.
- Perfiles de facilitador con biografía, expertise, background y varios facilitadores por sesión o evento.
- Invitaciones y membresías de alumnos por organización, con suspensión y reactivación.
- Alta de nuevas Academies y selector de organización activa para superadministradores.
- Onboarding con invitación al administrador responsable de cada cliente, aislado por organización.
- Checklist de onboarding por Academy y carga pública validada de logos PNG, JPG o WebP.
- Datos de demostración mientras se conectan las entidades reales del primer cliente.

## Desarrollo local

```bash
npm install
npm run dev
```

Para usar el backend local de Base44, utiliza `npx base44 dev` según la configuración de la plataforma.

## Validación y publicación

```bash
npm run verify
npx base44 deploy --yes
git push origin main
```

La publicación utiliza el proyecto vinculado en `base44/.app.jsonc`. No se deben guardar secretos en el repositorio; las integraciones futuras deberán fallar cerrado si no tienen configuración segura.

## Próximas fases

1. Conexión automatizada de dominios personalizados y verificación de DNS.
2. Paneles de vista previa para superadmin: administrador, facilitador y alumno.
3. Auditoría de actividad, métricas de uso y planes SaaS por módulos.
4. Migración selectiva desde plataformas educativas anteriores y conexión de dominios de clientes.
