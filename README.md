# Academy

Plataforma independiente y multiempresa de capacitación. Academy by Scalaria está diseñada para crecer como producto SaaS para escuelas, academias, coaches, consultores y empresas.

## MVP actual

- Panel de alumno con sesiones, eventos y descargables.
- Modelo de datos multiempresa: organizaciones, membresías y contenido con `organization_id`.
- Personalización inicial por organización (nombre, logo, colores y módulos habilitados).
- Estructura preparada para clientes Academy (escuelas, academias y empresas), alumnos y facilitadores.
- Perfiles de facilitador con biografía, expertise, background y varios facilitadores por sesión o evento.
- Invitaciones y membresías de alumnos por organización, con suspensión y reactivación.
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

1. Resolver el contexto de organización y membresía en backend.
2. Paneles separados para superadmin, administrador, maestro y alumno.
3. CRUD de sesiones, eventos y descargables.
4. Inscripción, asistencia, grabaciones y notificaciones.
5. Migración selectiva desde plataformas educativas anteriores y conexión de dominios de clientes.
