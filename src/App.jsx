import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Download,
  GraduationCap,
  LayoutDashboard,
  LogIn,
  Menu,
  PlayCircle,
  Users,
  Video,
  X,
} from "lucide-react";
import { base44 } from "@/api/base44Client";

const demoSessions = [
  { id: "session-1", title: "Hábitos que sí se sostienen", type: "Taller", date: "Jueves 23 de julio", time: "18:00 h", teacher: "Equipo Academy", status: "Próxima", color: "mint" },
  { id: "session-2", title: "Preguntas y respuestas: decisiones financieras", type: "Sesión en vivo", date: "Martes 28 de julio", time: "19:00 h", teacher: "Equipo Academy", status: "Próxima", color: "blue" },
  { id: "session-3", title: "Introducción a tu panel financiero", type: "Grabación", date: "Disponible ahora", time: "42 min", teacher: "Academy", status: "Disponible", color: "sand" },
];

const demoDownloads = [
  { id: "download-1", title: "Checklist para ordenar tus finanzas", category: "Guías", format: "PDF" },
  { id: "download-2", title: "Plantilla de presupuesto mensual", category: "Plantillas", format: "XLSX" },
  { id: "download-3", title: "Material de apoyo: seguros", category: "Sesiones", format: "PDF" },
];

const demoEvents = [
  { id: "event-1", title: "Webinar: decisiones financieras con claridad", description: "Un encuentro práctico para ordenar prioridades y avanzar con acompañamiento.", start_at: "2026-07-30T18:00:00-06:00", status: "Próximo" },
];

const navItems = [
  { id: "inicio", label: "Inicio", icon: LayoutDashboard },
  { id: "sesiones", label: "Mis sesiones", icon: CalendarDays },
  { id: "cursos", label: "Cursos", icon: BookOpen },
  { id: "eventos", label: "Eventos", icon: Video },
  { id: "descargables", label: "Descargables", icon: Download },
];

function formatDate(value) {
  if (!value) return "Fecha por confirmar";
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long" }).format(new Date(value));
}

export default function App() {
  const [activeView, setActiveView] = useState("inicio");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState(demoSessions);
  const [downloads, setDownloads] = useState(demoDownloads);
  const [events, setEvents] = useState(demoEvents);
  const [courses, setCourses] = useState([]);
  const [courseModules, setCourseModules] = useState([]);
  const [courseLessons, setCourseLessons] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [lessonProgress, setLessonProgress] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [facilitators, setFacilitators] = useState([]);
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [academyContext, setAcademyContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [requestedOrganizationId, setRequestedOrganizationId] = useState("");
  const [previewRole, setPreviewRole] = useState("");
  const certificateNumber = new URLSearchParams(window.location.search).get("certificate");
  const organization = academyContext?.organization;
  const enabledModules = organization?.enabled_modules?.length ? organization.enabled_modules : ["sessions", "courses", "downloads", "events"];
  const visibleNavItems = useMemo(() => navItems.filter((item) => item.id === "inicio" || enabledModules.includes({ sesiones: "sessions", cursos: "courses", eventos: "events", descargables: "downloads" }[item.id])), [enabledModules.join(",")]);
  const effectiveContext = useMemo(() => {
    if (!academyContext || !previewRole) return academyContext;
    const previewPermissions = previewRole === "student"
      ? { ...academyContext.permissions, can_manage: false, can_manage_organization: false, can_manage_sessions: false, can_manage_events: false, can_manage_downloads: false }
      : previewRole === "teacher"
        ? { ...academyContext.permissions, can_manage: true, can_manage_organization: false, can_manage_events: false, can_manage_downloads: true }
        : { ...academyContext.permissions, can_manage: true, can_manage_organization: true };
    return { ...academyContext, user: { ...academyContext.user, role: previewRole }, permissions: previewPermissions };
  }, [academyContext, previewRole]);

  useEffect(() => {
    let alive = true;
    async function loadAcademy() {
      const currentUser = await base44.auth.me().catch(() => null);
      const contextResponse = currentUser ? await base44.functions.invoke("getAcademyContext", requestedOrganizationId ? { organization_id: requestedOrganizationId } : {}).catch(() => null) : null;
      const context = contextResponse?.data || contextResponse;
      if (!alive) return;
      setUser(context?.user || currentUser);
      setAcademyContext(context);
      const remoteSessions = context?.content?.sessions || [];
      const remoteDownloads = context?.content?.downloads || [];
      const remoteEvents = context?.content?.events || [];
      const remoteFacilitators = context?.content?.facilitators || [];
      const remoteMembers = context?.content?.members || [];
      const remoteInvitations = context?.content?.invitations || [];
      const remoteCourses = context?.content?.courses || [];
      const remoteCourseModules = context?.content?.course_modules || [];
      const remoteCourseLessons = context?.content?.course_lessons || [];
      const remoteEnrollments = context?.content?.enrollments || [];
      const remoteLessonProgress = context?.content?.lesson_progress || [];
      const remoteCertificates = context?.content?.certificates || [];
      const remoteRegistrations = context?.content?.registrations || [];
      if (remoteSessions.length) setSessions(remoteSessions.map((item) => ({ ...item, date: formatDate(item.start_at), time: item.duration_minutes ? `${item.duration_minutes} min` : "Horario por confirmar", status: item.status === "published" ? "Próxima" : item.status, type: item.session_type || "Sesión", teacher: item.teacher_name || "Academy", color: "mint" })));
      if (remoteDownloads.length) setDownloads(remoteDownloads.map((item) => ({ ...item, category: item.category || "Recursos", format: item.file_type || "Archivo" })));
      if (remoteEvents.length) setEvents(remoteEvents);
      else setEvents(demoEvents);
      if (remoteFacilitators.length) setFacilitators(remoteFacilitators);
      setMembers(remoteMembers);
      setInvitations(remoteInvitations);
      setCourses(remoteCourses);
      setCourseModules(remoteCourseModules);
      setCourseLessons(remoteCourseLessons);
      setEnrollments(remoteEnrollments);
      setLessonProgress(remoteLessonProgress);
      setCertificates(remoteCertificates);
      setRegistrations(remoteRegistrations);
      setLoading(false);
    }
    loadAcademy();
    return () => { alive = false; };
  }, [requestedOrganizationId]);

  const firstName = user?.full_name?.split(" ")[0] || "estudiante";
  const nextSession = useMemo(() => sessions.find((session) => session.status === "Próxima"), [sessions]);

  function navigate(view) {
    setActiveView(view);
    setMobileMenu(false);
  }

  function handleContentSaved(type, item, mode = "create") {
    const update = (current, next) => mode === "update" ? current.map((existing) => existing.id === next.id ? next : existing) : [next, ...current];
    if (type === "session") setSessions((current) => update(current, { ...item, date: formatDate(item.start_at), time: item.duration_minutes ? `${item.duration_minutes} min` : "Horario por confirmar", status: item.status === "published" ? "Próxima" : item.status, type: item.session_type || "Sesión", teacher: item.teacher_name || "Academy", color: "mint" }));
    if (type === "download") setDownloads((current) => update(current, { ...item, category: item.category || "Recursos", format: item.file_type || "Archivo" }));
    if (type === "event") setEvents((current) => update(current, item));
    if (type === "facilitator") setFacilitators((current) => update(current, item));
    if (type === "course") setCourses((current) => update(current, item));
    if (type === "course_module") setCourseModules((current) => update(current, item));
    if (type === "course_lesson") setCourseLessons((current) => update(current, item));
    recordAudit(`${mode === "update" ? "update" : "create"}.${type}`, type, item?.id);
  }

  function handleOrganizationSaved(organization) {
    setAcademyContext((current) => current ? { ...current, organization } : current);
    recordAudit("update.organization", "organization", organization?.id);
  }

  function switchOrganization(organizationId) {
    if (!organizationId || organizationId === organization?.id) return;
    setLoading(true);
    setActiveView("inicio");
    setPreviewRole("");
    setRequestedOrganizationId(organizationId);
  }

  function handleTenantCreated(tenant) {
    setRequestedOrganizationId(tenant.id);
    recordAudit("create.organization", "organization", tenant.id, tenant.id);
  }

  function handleMemberChanged(member) {
    setMembers((current) => current.map((item) => item.id === member.id ? member : item));
    recordAudit("update.membership", "membership", member?.id);
  }

  function handleInvitationCreated(invitation) {
    setInvitations((current) => [invitation, ...current]);
    recordAudit("create.invitation", "invitation", invitation?.id);
  }

  function recordAudit(eventAction, entityType, entityId, organizationId = academyContext?.organization?.id) {
    if (!organizationId || !eventAction) return;
    base44.functions.invoke("academyAuditMutation", { action: "record", organization_id: organizationId, event_action: eventAction, entity_type: entityType, entity_id: entityId }).catch(() => null);
  }

  async function enrollInCourse(courseId) {
    const result = await base44.functions.invoke("academyLearningMutation", { action: "enroll", organization_id: academyContext?.organization?.id, course_id: courseId });
    const payload = result?.data || result;
    if (payload?.enrollment) setEnrollments((current) => [...current.filter((item) => item.id !== payload.enrollment.id), payload.enrollment]);
    if (payload?.certificate) setCertificates((current) => [...current.filter((item) => item.id !== payload.certificate.id), payload.certificate]);
    return payload?.enrollment;
  }

  async function completeLesson(lessonId) {
    const result = await base44.functions.invoke("academyLearningMutation", { action: "complete_lesson", organization_id: academyContext?.organization?.id, lesson_id: lessonId });
    const payload = result?.data || result;
    if (payload?.progress) setLessonProgress((current) => [...current.filter((item) => item.id !== payload.progress.id), payload.progress]);
    if (payload?.enrollment) setEnrollments((current) => [...current.filter((item) => item.id !== payload.enrollment.id), payload.enrollment]);
  }

  async function openDownload(download) {
    if (download.file_type === "link" && /^https:\/\//i.test(download.file_uri || "")) { window.open(download.file_uri, "_blank", "noopener,noreferrer"); return; }
    const result = await base44.functions.invoke("academyFileAccess", { organization_id: academyContext?.organization?.id, download_id: download.id });
    const payload = result?.data || result;
    if (payload?.signed_url) window.open(payload.signed_url, "_blank", "noopener,noreferrer");
  }

  async function registerFor(resourceType, resourceId) {
    const result = await base44.functions.invoke("academyRegistrationMutation", { action: "register", organization_id: academyContext?.organization?.id, resource_type: resourceType, resource_id: resourceId });
    const payload = result?.data || result;
    if (payload?.registration) setRegistrations((current) => [...current.filter((item) => item.id !== payload.registration.id), payload.registration]);
  }

  async function updateAttendance(registration, status = "attended") {
    const result = await base44.functions.invoke("academyRegistrationMutation", { action: "attendance", organization_id: academyContext?.organization?.id, resource_type: registration.resource_type, resource_id: registration.resource_id, registration_id: registration.id, status });
    const payload = result?.data || result;
    if (payload?.registration) setRegistrations((current) => current.map((item) => item.id === payload.registration.id ? payload.registration : item));
  }

  async function sendEventReminders(resourceType, resourceId) {
    await base44.functions.invoke("academyRegistrationMutation", { action: "send_reminders", organization_id: academyContext?.organization?.id, resource_type: resourceType, resource_id: resourceId });
  }

  async function handleArchived(type, id) {
    const organizationId = academyContext?.organization?.id;
    if (!organizationId || !id) return;
    await base44.functions.invoke("academyContentMutation", { action: "archive", type, organization_id: organizationId, id });
    recordAudit(`archive.${type}`, type, id, organizationId);
    if (type === "session") setSessions((current) => current.filter((item) => item.id !== id));
    if (type === "download") setDownloads((current) => current.filter((item) => item.id !== id));
    if (type === "event") setEvents((current) => current.filter((item) => item.id !== id));
    if (type === "facilitator") setFacilitators((current) => current.filter((item) => item.id !== id));
    if (type === "course") setCourses((current) => current.filter((item) => item.id !== id));
    if (type === "course_module") setCourseModules((current) => current.filter((item) => item.id !== id));
    if (type === "course_lesson") setCourseLessons((current) => current.filter((item) => item.id !== id));
  }

  if (certificateNumber) return <PublicCertificateView certificateNumber={certificateNumber} />;
  if (!user) return showLogin ? <LoginPage onBack={() => setShowLogin(false)} /> : <PublicLanding onSignIn={() => setShowLogin(true)} />;

  return (
    <div className="academy-shell" style={{ "--tenant-color": organization?.primary_color || "#0091D1" }}>
      {previewRole && <PreviewBanner role={previewRole} onExit={() => { setPreviewRole(""); setActiveView("inicio"); }} />}
      <header className="topbar">
        <button className="brand" onClick={() => navigate("inicio")} aria-label="Ir al inicio">
          <span className="brand-mark">{organization?.logo_url ? <img className="tenant-logo" src={organization.logo_url} alt={organization.display_name || "Academy"} /> : <ScalariaMark />}</span>
          <span><strong>Academy</strong><small>by Scalaria</small></span>
        </button>
        <nav className="desktop-nav" aria-label="Navegación principal">
          {visibleNavItems.map((item) => <NavButton key={item.id} item={item} active={activeView === item.id} onClick={navigate} />)}
          {effectiveContext?.permissions?.can_manage && <NavButton item={{ id: "administracion", label: "Administración", icon: Users }} active={activeView === "administracion"} onClick={navigate} />}
        </nav>
        <div className="topbar-actions">
          {academyContext?.organizations?.length > 0 && <label className="tenant-switcher"><span className="sr-only">Academy activa</span><select value={organization?.id || ""} onChange={(event) => switchOrganization(event.target.value)} aria-label="Cambiar Academy activa">{academyContext.organizations.map((item) => <option key={item.id} value={item.id}>{item.display_name || item.name}</option>)}</select></label>}
          {user?.role === "superadmin" && <PreviewSelector value={previewRole} onChange={(value) => { setPreviewRole(value); setActiveView("inicio"); }} />}
          {user ? <div className="avatar">{firstName.slice(0, 1)}</div> : <button className="sign-in" onClick={() => setShowLogin(true)}><LogIn size={16} /> Entrar</button>}
          <button className="mobile-menu-button" onClick={() => setMobileMenu((value) => !value)} aria-label="Abrir menú">{mobileMenu ? <X /> : <Menu />}</button>
        </div>
      </header>

      {mobileMenu && <nav className="mobile-nav">{visibleNavItems.map((item) => <NavButton key={item.id} item={item} active={activeView === item.id} onClick={navigate} />)}{effectiveContext?.permissions?.can_manage && <NavButton item={{ id: "administracion", label: "Administración", icon: Users }} active={activeView === "administracion"} onClick={navigate} />}</nav>}

      <main className="content">
        {activeView === "inicio" && <HomeView firstName={firstName} nextSession={nextSession} sessions={sessions} downloads={downloads} events={events} registrations={registrations} loading={loading} onNavigate={navigate} organization={organization} onDownload={openDownload} onRegister={(id) => registerFor("event", id)} />}
        {activeView === "sesiones" && <CollectionView title="Mis sesiones" eyebrow="APRENDE A TU RITMO" description="Encuentra tus próximas sesiones, talleres y grabaciones." icon={CalendarDays}><div className="session-grid">{sessions.map((session) => <SessionCard key={session.id} session={session} />)}</div></CollectionView>}
        {activeView === "cursos" && <CollectionView title="Cursos" eyebrow="RUTAS DE APRENDIZAJE" description="Avanza por cursos estructurados a tu ritmo." icon={BookOpen}>{courses.length ? <div className="session-grid">{courses.map((course) => <CourseCard key={course.id} course={course} onOpen={() => { setSelectedCourseId(course.id); navigate("curso"); }} />)}</div> : <EmptyState title="Próximamente" text="Aquí aparecerán los cursos de tu Academy." />}</CollectionView>}
        {activeView === "curso" && <CourseDetailView course={courses.find((item) => item.id === selectedCourseId) || courses[0]} modules={courseModules} lessons={courseLessons} enrollment={enrollments.find((item) => item.course_id === (selectedCourseId || courses[0]?.id))} progress={lessonProgress} certificate={certificates.find((item) => item.course_id === (selectedCourseId || courses[0]?.id))} organizationId={academyContext?.organization?.id} onEnroll={enrollInCourse} onCompleteLesson={completeLesson} onBack={() => navigate("cursos")} />}
        {activeView === "eventos" && <CollectionView title="Eventos y webinars" eyebrow="ENCUENTROS EN VIVO" description="Regístrate, participa y vuelve a la grabación cuando quieras." icon={Video}>{events.length ? <div className="session-grid">{events.map((event) => <EventCard key={event.id} event={event} registration={registrations.find((item) => item.resource_id === event.id)} onRegister={() => registerFor("event", event.id)} />)}</div> : <EmptyState title="Próximamente" text="Aquí aparecerán los webinars y eventos de tu Academy." />}</CollectionView>}
        {activeView === "descargables" && <CollectionView title="Descargables" eyebrow="RECURSOS PARA AVANZAR" description="Materiales prácticos para llevar lo aprendido a tu día a día." icon={Download}><div className="download-list">{downloads.map((download) => <DownloadRow key={download.id} download={download} onOpen={() => openDownload(download)} />)}</div></CollectionView>}
        {activeView === "administracion" && effectiveContext?.permissions?.can_manage && <AdminView context={effectiveContext} sessions={sessions} downloads={downloads} events={events} courses={courses} courseModules={courseModules} courseLessons={courseLessons} facilitators={facilitators} members={members} invitations={invitations} onContentSaved={handleContentSaved} onOrganizationSaved={handleOrganizationSaved} onArchived={handleArchived} onMemberChanged={handleMemberChanged} onInvitationCreated={handleInvitationCreated} onTenantCreated={handleTenantCreated} />}
        {activeView === "administracion" && effectiveContext?.permissions?.can_manage_downloads && <SecureDownloadUploader organization={effectiveContext?.organization} onSaved={(item) => handleContentSaved("download", item)} />}
        {activeView === "administracion" && effectiveContext?.permissions?.can_manage_events && <EventOperations organization={effectiveContext?.organization} events={events} registrations={registrations} onSaved={(item) => handleContentSaved("event", item, "update")} onRemind={sendEventReminders} />}
        {activeView === "administracion" && effectiveContext?.permissions?.can_manage_organization && <ModuleSettings organization={effectiveContext?.organization} onSaved={handleOrganizationSaved} />}
        {activeView === "administracion" && effectiveContext?.permissions?.can_manage_events && <RegistrationManager events={events} registrations={registrations} onAttendance={updateAttendance} onRemind={sendEventReminders} />}
      </main>
    </div>
  );
}

function PreviewBanner({ role, onExit }) {
  const labels = { organization_admin: "Administrador del cliente", teacher: "Facilitador", student: "Alumno" };
  return <div className="preview-banner"><span>Vista previa: <strong>{labels[role] || role}</strong></span><button onClick={onExit}>Salir de vista previa</button></div>;
}

function PreviewSelector({ value, onChange }) {
  return <label className="preview-selector"><span className="sr-only">Vista previa</span><select value={value} onChange={(event) => onChange(event.target.value)} aria-label="Ver Academy como"><option value="">Vista real</option><option value="organization_admin">Ver como administrador</option><option value="teacher">Ver como facilitador</option><option value="student">Ver como alumno</option></select></label>;
}

function NavButton({ item, active, onClick }) {
  const Icon = item.icon;
  return <button className={`nav-item ${active ? "active" : ""}`} onClick={() => onClick(item.id)}><Icon size={17} />{item.label}</button>;
}

function ScalariaMark() {
  return <svg className="scalaria-mark" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Scalaria">
    <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="4" />
    {[20, 29, 38, 47, 56, 65, 74].map((x, index) => <rect key={x} x={x} y={[54, 42, 30, 18, 30, 42, 54][index]} width="6" height={[20, 32, 44, 56, 44, 32, 20][index]} rx="1.5" fill={index === 3 ? "#d48c3c" : "currentColor"} />)}
    <text x="78" y="86" fontSize="14" fontWeight="600" fill="currentColor" fontFamily="Inter, Arial, sans-serif">®</text>
  </svg>;
}

function LoginPage({ onBack }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [status, setStatus] = useState("idle");
  async function submit(event) { event.preventDefault(); setStatus("saving"); try { await base44.auth.loginViaEmailPassword(form.email, form.password); window.location.reload(); } catch { setStatus("error"); } }
  async function forgotPassword() { if (!form.email) { setStatus("missing_email"); return; } setStatus("resetting"); try { await base44.auth.resetPasswordRequest(form.email); setStatus("reset_sent"); } catch { setStatus("error"); } }
  function socialLogin(provider) { setStatus("social"); base44.auth.loginWithProvider(provider, window.location.href); }
  return <div className="login-page"><div className="login-card"><button className="text-link login-back" onClick={onBack}><ChevronRight size={16} className="back-icon" /> Volver a Academy</button><div className="login-brand"><span className="brand-mark"><ScalariaMark /></span><span><strong>Academy</strong><small>by Scalaria</small></span></div><p className="eyebrow">ACCESO PRIVADO</p><h1>Entra a tu Academy.</h1><p className="login-copy">El acceso es únicamente por invitación. Usa el correo con el que te registraron.</p><div className="social-login-grid"><button type="button" className="social-button" onClick={() => socialLogin("google")} disabled={status === "social"}><span className="social-letter google-letter">G</span>Continuar con Google</button><button type="button" className="social-button" onClick={() => socialLogin("microsoft")} disabled={status === "social"}><span className="social-letter microsoft-letter">⊞</span>Continuar con Microsoft</button></div><div className="login-divider"><span>o con correo</span></div><form className="login-form" onSubmit={submit}><label>Correo electrónico<input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} autoComplete="email" required /></label><label>Contraseña<input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} autoComplete="current-password" required /></label><button className="primary-button" disabled={status === "saving"}>{status === "saving" ? "Entrando..." : "Entrar"}</button></form><button className="text-link" onClick={forgotPassword} disabled={status === "resetting"}>{status === "resetting" ? "Enviando..." : "¿Olvidaste tu contraseña?"}</button>{status === "reset_sent" && <span className="form-success">Revisa tu correo para restablecerla.</span>}{status === "missing_email" && <span className="form-error">Escribe tu correo primero.</span>}{status === "error" && <span className="form-error">No pudimos iniciar sesión. Verifica tus datos o acepta la invitación.</span>}</div></div>;
}

function PublicLanding({ onSignIn }) {
  const modules = [
    { icon: CalendarDays, title: "Sesiones", text: "Clases, talleres, mentorías y sesiones en vivo con seguimiento." },
    { icon: Video, title: "Eventos y webinars", text: "Registros, encuentros en vivo, grabaciones y materiales posteriores." },
    { icon: Download, title: "Descargables", text: "Guías, plantillas, checklists y recursos para aplicar lo aprendido." },
    { icon: BookOpen, title: "Cursos", text: "Rutas estructuradas con contenidos, módulos y aprendizaje a tu ritmo." },
  ];
  return <div className="public-page">
    <header className="public-topbar"><div className="brand"><span className="brand-mark"><ScalariaMark /></span><span><strong>Academy</strong><small>by Scalaria</small></span></div><button className="sign-in" onClick={onSignIn}><LogIn size={16} /> Entrar a mi Academy</button></header>
    <main>
      <section className="public-hero"><div className="public-hero-copy"><p className="eyebrow">PLATAFORMA DE CAPACITACIÓN</p><h1>Aprende lo que necesitas para avanzar.</h1><p>Academy reúne cursos, sesiones, talleres, webinars y recursos en un espacio claro para que cada escuela, academia o empresa pueda formar a su comunidad.</p><div className="hero-actions"><button className="primary-button" onClick={onSignIn}>Entrar a mi Academy <ChevronRight size={17} /></button><a href="#modulos" className="text-link light">Conocer los módulos <ChevronRight size={16} /></a></div></div><div className="hero-card"><div className="hero-card-header"><span className="status-dot" /> Academy activa</div><div className="hero-card-title">Tu aprendizaje,<br /><strong>en un solo lugar.</strong></div><div className="hero-mini-row"><span><BookOpen size={16} /> Cursos</span><span><CalendarDays size={16} /> Sesiones</span></div><div className="hero-mini-row"><span><Video size={16} /> Webinars</span><span><Download size={16} /> Recursos</span></div></div></section>
      <section className="public-section" id="modulos"><div className="public-section-heading"><p className="eyebrow">TODO LO QUE NECESITAS</p><h2>Una experiencia de aprendizaje simple y práctica.</h2><p>Academy puede personalizarse para cada cliente, con su identidad, sus facilitadores y sus alumnos.</p></div><div className="module-grid">{modules.map(({ icon: Icon, title, text }) => <article className="module-card" key={title}><span className="module-icon"><Icon size={22} /></span><h3>{title}</h3><p>{text}</p><span className="module-arrow"><ChevronRight size={17} /></span></article>)}</div></section>
      <section className="public-section split-section"><div><p className="eyebrow">DISEÑADA PARA CRECER</p><h2>Tu Academy, con la identidad de tu organización.</h2><p className="public-body">Cada cliente puede tener su propia marca, módulos y comunidad dentro de la misma plataforma. Academy está preparada para coaches, consultores, escuelas, academias y empresas.</p></div><div className="steps-card"><div><span>01</span><strong>Publica</strong><small>sesiones y recursos</small></div><div><span>02</span><strong>Conecta</strong><small>con tu comunidad</small></div><div><span>03</span><strong>Acompaña</strong><small>el progreso</small></div></div></section>
      <section className="public-cta"><p className="eyebrow">ACADEMY</p><h2>El conocimiento también se construye acompañado.</h2><button className="primary-button" onClick={onSignIn}>Entrar a mi Academy <ChevronRight size={17} /></button></section>
    </main>
    <footer className="public-footer"><span>Academy by Scalaria</span><span>Plataforma de capacitación multiempresa</span></footer>
  </div>;
}

function PublicCertificateView({ certificateNumber }) {
  const [state, setState] = useState({ status: "loading", certificate: null });
  useEffect(() => { base44.functions.invoke("academyCertificateVerify", { certificate_number: certificateNumber }).then((response) => { const payload = response?.data || response; setState({ status: payload.valid ? "valid" : "invalid", certificate: payload.certificate || null }); }).catch(() => setState({ status: "invalid", certificate: null })); }, [certificateNumber]);
  if (state.status === "loading") return <div className="certificate-page"><div className="certificate-loading">Validando certificado...</div></div>;
  if (state.status !== "valid") return <div className="certificate-page"><div className="certificate-invalid"><ScalariaMark /><p className="eyebrow">ACADEMY BY SCALARIA</p><h1>Certificado no encontrado</h1><p>El folio no existe o ya no está vigente.</p><a className="secondary-button" href="/">Volver a Academy</a></div></div>;
  const { certificate } = state;
  return <div className="certificate-page"><article className="certificate-print"><div className="certificate-logo"><ScalariaMark /></div><p className="eyebrow">ACADEMY BY SCALARIA</p><p className="certificate-kicker">CERTIFICADO DE FINALIZACIÓN</p><h1>{certificate.course_title}</h1><p className="certificate-award">Se reconoce que</p><h2>{certificate.student_name || "Alumno de Academy"}</h2><p className="certificate-copy">ha completado satisfactoriamente la ruta de aprendizaje y sus evaluaciones correspondientes.</p><div className="certificate-meta"><span>Folio<strong>{certificate.certificate_number}</strong></span><span>Emitido<strong>{formatDate(certificate.issued_at)}</strong></span></div><div className="certificate-actions"><button className="primary-button" onClick={() => window.print()}>Guardar como PDF</button><a className="secondary-button" href="/">Volver a Academy</a></div><p className="certificate-valid">✓ Certificado validado por Academy by Scalaria</p></article></div>;
}

function HomeView({ firstName, nextSession, sessions, downloads, events, registrations, loading, onNavigate, organization, onDownload, onRegister }) {
  return <>
    <section className="welcome-panel">
      <div><p className="eyebrow">{organization?.display_name || "ACADEMY"}</p><h1>Hola, {firstName}.</h1><p className="welcome-copy">{organization?.welcome_message || "Aquí encontrarás tus sesiones, talleres, webinars y recursos para tomar mejores decisiones con acompañamiento profesional."}</p></div>
      <div className="welcome-orbit"><GraduationCap size={54} strokeWidth={1.2} /><span>Aprender<br />transforma.</span></div>
    </section>
    <section className="section-block"><div className="section-heading"><div><p className="eyebrow">TU PRÓXIMO PASO</p><h2>Continúa aprendiendo</h2></div><button className="text-link" onClick={() => onNavigate("sesiones")}>Ver todas <ChevronRight size={16} /></button></div>{loading ? <div className="loading-card">Cargando tu Academy...</div> : <div className="session-grid"><SessionCard session={nextSession || sessions[0]} featured /></div>}</section>
    <section className="section-block"><div className="section-heading"><div><p className="eyebrow">RECURSOS</p><h2>Para llevar contigo</h2></div><button className="text-link" onClick={() => onNavigate("descargables")}>Ver biblioteca <ChevronRight size={16} /></button></div><div className="download-list compact">{downloads.slice(0, 2).map((download) => <DownloadRow key={download.id} download={download} onOpen={() => onDownload(download)} />)}</div></section>
    <section className="section-block"><div className="section-heading"><div><p className="eyebrow">ENCUENTROS EN VIVO</p><h2>Próximos webinars</h2></div><button className="text-link" onClick={() => onNavigate("eventos")}>Ver eventos <ChevronRight size={16} /></button></div><div className="session-grid">{events.slice(0, 3).map((event) => <EventCard key={event.id} event={event} registration={registrations.find((item) => item.resource_id === event.id)} onRegister={() => onRegister(event.id)} />)}</div></section>
  </>;
}

function CollectionView({ title, eyebrow, description, icon: Icon, children }) {
  return <section className="collection-view"><div className="collection-header"><span className="collection-icon"><Icon size={24} /></span><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div></div>{children}</section>;
}

function SessionCard({ session, featured }) {
  if (!session) return <EmptyState title="Sin sesiones todavía" text="Cuando tengas una sesión asignada aparecerá aquí." />;
  return <article className={`session-card ${featured ? "featured" : ""} ${session.color || "mint"}`}><div className="session-card-top"><span className="badge">{session.status}</span><span className="session-type">{session.type}</span></div><div className="session-card-body"><h3>{session.title}</h3><p className="session-meta"><CalendarDays size={15} /> {session.date} · {session.time}</p><p className="session-meta"><Users size={15} /> {session.teacher}</p></div><button className="card-action">{session.status === "Disponible" ? "Ver grabación" : "Ver sesión"} <ChevronRight size={16} /></button></article>;
}

function EventCard({ event, registration, onRegister }) {
  const registered = registration?.status === "registered" || registration?.status === "attended";
  return <article className="event-card"><span className="badge">{event.status || "Próximo"}</span><h3>{event.title}</h3><p>{event.description || "Evento de Academy"}</p><p className="session-meta"><CalendarDays size={15} /> {formatDate(event.start_at)}</p><button className="card-action" onClick={onRegister} disabled={registered}>{registered ? "Registrado" : "Registrarme"} <ChevronRight size={16} /></button>{registered && event.meeting_url && <a className="event-link" href={event.meeting_url} target="_blank" rel="noreferrer">Entrar al evento</a>}{event.recording_url && <a className="event-link" href={event.recording_url} target="_blank" rel="noreferrer">Ver grabación</a>}</article>;
}

function CourseCard({ course, onOpen }) {
  const levelLabels = { introductory: "Introductorio", intermediate: "Intermedio", advanced: "Avanzado" };
  return <article className="session-card course-card"><div className="session-card-top"><span className="badge">{course.status === "published" ? "Publicado" : course.status || "Curso"}</span><span className="session-type">{levelLabels[course.level] || "Ruta"}</span></div><div className="session-card-body"><h3>{course.title}</h3><p className="course-description">{course.description || "Curso estructurado para avanzar paso a paso."}</p><p className="session-meta"><BookOpen size={15} /> {course.category || "Ruta de aprendizaje"}</p>{course.estimated_minutes ? <p className="session-meta"><PlayCircle size={15} /> {course.estimated_minutes} min estimados</p> : null}</div><button className="card-action" onClick={onOpen}>Ver curso <ChevronRight size={16} /></button></article>;
}

function videoEmbedUrl(lesson) {
  const id = String(lesson?.video_id || "").trim();
  if (!id || !/^[a-zA-Z0-9_-]{4,160}$/.test(id)) return null;
  if (lesson.video_provider === "youtube") return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
  if (lesson.video_provider === "vimeo" && /^\d{5,14}$/.test(id)) return `https://player.vimeo.com/video/${id}`;
  return null;
}

function VideoPlayer({ lesson }) {
  const src = videoEmbedUrl(lesson);
  if (!src) return <div className="video-placeholder">Video externo configurado sin reproductor compatible.</div>;
  return <div className="video-frame"><iframe src={src} title={lesson.title} loading="lazy" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen /></div>;
}

function QuizPlayer({ lesson, organizationId, onPassed }) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("loading");
  useEffect(() => { let active = true; base44.functions.invoke("academyQuizMutation", { action: "get_quiz", organization_id: organizationId, lesson_id: lesson.id }).then((response) => { const payload = response?.data || response; if (active) { setQuestions(payload.questions || []); setStatus("ready"); } }).catch(() => active && setStatus("error")); return () => { active = false; }; }, [lesson.id, organizationId]);
  async function submit(event) { event.preventDefault(); setStatus("saving"); try { const response = await base44.functions.invoke("academyQuizMutation", { action: "submit_quiz", organization_id: organizationId, lesson_id: lesson.id, answers }); const payload = response?.data || response; setResult(payload.attempt); setStatus("ready"); if (payload.attempt?.passed) onPassed(lesson.id); } catch { setStatus("error"); } }
  if (status === "loading") return <div className="quiz-box">Cargando evaluación...</div>;
  if (status === "error") return <div className="quiz-box">No se pudo cargar esta evaluación.</div>;
  return <form className="quiz-box" onSubmit={submit}><div className="quiz-heading"><strong>Evaluación</strong><span>Aprueba con 70%</span></div>{questions.length ? questions.sort((a, b) => a.order - b.order).map((question, index) => <fieldset className="quiz-question" key={question.id}><legend>{index + 1}. {question.prompt}</legend>{question.options.map((option, optionIndex) => <label key={option}><input type="radio" name={question.id} checked={answers[index] === optionIndex} onChange={() => setAnswers((current) => { const next = [...current]; next[index] = optionIndex; return next; })} required />{option}</label>)}</fieldset>) : <p className="panel-note">Esta evaluación todavía no tiene preguntas.</p>}<button className="primary-button" disabled={status === "saving" || !questions.length}>{status === "saving" ? "Calificando..." : "Enviar evaluación"}</button>{result && <div className={`quiz-result ${result.passed ? "passed" : "failed"}`}><strong>{result.score}%</strong><span>{result.passed ? "Aprobada. Lección completada." : "Aún no aprobada. Puedes intentarlo nuevamente."}</span></div>}</form>;
}

function SecureDownloadUploader({ organization, onSaved }) {
  const [form, setForm] = useState({ title: "", description: "", category: "Guías" });
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle");
  async function submit(event) {
    event.preventDefault();
    if (!file) { setStatus("error"); return; }
    const allowed = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "text/plain"];
    if (file.size > 20 * 1024 * 1024 || !allowed.includes(file.type)) { setStatus("error"); return; }
    setStatus("uploading");
    try {
      const uploaded = await base44.integrations.Core.UploadPrivateFile({ file });
      const fileType = file.name.split(".").pop()?.toLowerCase() || "archivo";
      const result = await base44.functions.invoke("academyContentMutation", { action: "create", type: "download", organization_id: organization?.id, data: { ...form, file_type: fileType, file_uri: uploaded.file_uri, status: "published", access: "all_members" } });
      const payload = result?.data || result;
      if (payload?.error) throw new Error(payload.error);
      onSaved(payload.item);
      setForm({ title: "", description: "", category: "Guías" }); setFile(null); setStatus("saved"); event.target.reset();
    } catch { setStatus("error"); }
  }
  return <section className="admin-panel secure-upload-panel"><div className="admin-panel-heading"><div><p className="eyebrow">BIBLIOTECA PRIVADA</p><h3>Subir descargable seguro</h3></div><span className="panel-note">Máximo 20 MB</span></div><form className="admin-form" onSubmit={submit}><label>Título<input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required /></label><label>Categoría<input value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} /></label><label>Descripción<textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows="2" /></label><label>Archivo privado<input type="file" accept=".pdf,.docx,.xlsx,.pptx,.txt" onChange={(event) => setFile(event.target.files?.[0] || null)} required /><span className="panel-note">PDF, Word, Excel, PowerPoint o TXT. El archivo se entrega mediante enlace temporal.</span></label><div className="form-actions"><button className="primary-button" disabled={status === "uploading"}>{status === "uploading" ? "Subiendo..." : "Subir y publicar"}</button>{status === "saved" && <span className="form-success">Publicado</span>}{status === "error" && <span className="form-error">Revisa el archivo e inténtalo nuevamente</span>}</div></form></section>;
}

function ModuleSettings({ organization, onSaved }) {
  const labels = { sessions: "Sesiones", courses: "Cursos", events: "Eventos y webinars", downloads: "Descargables", facilitators: "Facilitadores", students: "Comunidad" };
  const [modules, setModules] = useState(organization?.enabled_modules || ["sessions", "courses", "events", "downloads"]);
  const [status, setStatus] = useState("idle");
  useEffect(() => { setModules(organization?.enabled_modules || ["sessions", "courses", "events", "downloads"]); }, [organization?.id, organization?.enabled_modules?.join(",")]);
  function toggle(module) { setModules((current) => current.includes(module) ? current.filter((item) => item !== module) : [...current, module]); }
  async function save() { setStatus("saving"); try { const result = await base44.functions.invoke("academyOrganizationMutation", { organization_id: organization?.id, display_name: organization?.display_name, primary_color: organization?.primary_color || "#0091D1", logo_url: organization?.logo_url || "", welcome_message: organization?.welcome_message || "", custom_domain: organization?.custom_domain || "", enabled_modules: modules }); const payload = result?.data || result; onSaved(payload.organization); setStatus("saved"); } catch { setStatus("error"); } }
  return <section className="admin-panel"><div className="admin-panel-heading"><div><p className="eyebrow">EXPERIENCIA DEL TENANT</p><h3>Módulos visibles</h3></div><span className="panel-note">Personaliza este portal</span></div><div className="module-toggle-grid">{Object.entries(labels).map(([module, label]) => <label className={`module-toggle ${modules.includes(module) ? "selected" : ""}`} key={module}><input type="checkbox" checked={modules.includes(module)} onChange={() => toggle(module)} />{label}</label>)}</div><div className="form-actions"><button className="primary-button" onClick={save} disabled={status === "saving"}>{status === "saving" ? "Guardando..." : "Guardar módulos"}</button>{status === "saved" && <span className="form-success">Guardado</span>}{status === "error" && <span className="form-error">No se pudo guardar</span>}</div></section>;
}

function EventOperations({ organization, events, registrations, onSaved, onRemind }) {
  const [eventId, setEventId] = useState(events[0]?.id || "");
  const selected = events.find((event) => event.id === eventId) || events[0];
  const [form, setForm] = useState({ meeting_url: selected?.meeting_url || "", recording_url: selected?.recording_url || "" });
  const [status, setStatus] = useState("idle");
  useEffect(() => { if (selected) setForm({ meeting_url: selected.meeting_url || "", recording_url: selected.recording_url || "" }); }, [selected?.id]);
  async function save(event) { event.preventDefault(); setStatus("saving"); try { const result = await base44.functions.invoke("academyContentMutation", { action: "update", type: "event", organization_id: organization?.id, id: selected?.id, data: { title: selected.title, description: selected.description, start_at: selected.start_at, status: selected.status, access: selected.access || "free", meeting_url: form.meeting_url, recording_url: form.recording_url } }); const payload = result?.data || result; onSaved(payload.item); setStatus("saved"); } catch { setStatus("error"); } }
  if (!events.length) return <section className="admin-panel"><div className="empty-state compact-empty"><Video size={24} /><p>Crea un evento para configurar su acceso y grabación.</p></div></section>;
  const registeredCount = registrations.filter((registration) => registration.resource_id === selected?.id && registration.status === "registered").length;
  return <section className="admin-panel"><div className="admin-panel-heading"><div><p className="eyebrow">OPERACIÓN DEL EVENTO</p><h3>Acceso, grabación y recordatorios</h3></div><span className="panel-note">{registeredCount} inscritos pendientes</span></div><form className="admin-form" onSubmit={save}><label>Evento<select value={eventId} onChange={(event) => setEventId(event.target.value)}>{events.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label>Enlace de acceso<input type="url" value={form.meeting_url} onChange={(event) => setForm((current) => ({ ...current, meeting_url: event.target.value }))} placeholder="https://meet.google.com/..." /></label><label>Enlace de grabación<input type="url" value={form.recording_url} onChange={(event) => setForm((current) => ({ ...current, recording_url: event.target.value }))} placeholder="https://vimeo.com/..." /></label><div className="form-actions"><button className="primary-button" disabled={status === "saving"}>{status === "saving" ? "Guardando..." : "Guardar enlaces"}</button><button type="button" className="secondary-button" onClick={() => onRemind("event", selected.id)}>Enviar recordatorio</button>{status === "saved" && <span className="form-success">Guardado</span>}{status === "error" && <span className="form-error">No se pudo guardar</span>}</div></form></section>;
}

function RegistrationManager({ events, registrations, onAttendance, onRemind }) {
  return <section className="admin-panel"><div className="admin-panel-heading"><div><p className="eyebrow">EVENTOS Y ASISTENCIA</p><h3>Registros de eventos</h3></div><span className="panel-note">{registrations.length} registros</span></div>{registrations.length ? <div className="operation-list">{registrations.map((registration) => { const event = events.find((item) => item.id === registration.resource_id); return <article className="operation-row" key={registration.id}><div><strong>{event?.title || "Evento"}</strong><span>{registration.email || "Alumno"} · {registration.status}</span></div><div className="operation-actions"><button className="edit-button" onClick={() => onAttendance(registration, registration.status === "attended" ? "registered" : "attended")}>{registration.status === "attended" ? "Quitar asistencia" : "Marcar asistencia"}</button>{event && <button className="secondary-button" onClick={() => onRemind(registration.resource_type, registration.resource_id)}>Recordar</button>}</div></article>; })}</div> : <div className="empty-state compact-empty"><Video size={24} /><p>Aún no hay registros de eventos.</p></div>}</section>;
}

function CourseDetailView({ course, modules, lessons, enrollment, progress, certificate, organizationId, onEnroll, onCompleteLesson, onBack }) {
  const [status, setStatus] = useState("idle");
  if (!course) return <EmptyState title="Curso no encontrado" text="Regresa a Cursos para elegir otra ruta." />;
  const courseModules = modules.filter((module) => module.course_id === course.id).sort((a, b) => a.order - b.order);
  const completedLessons = new Set(progress.filter((item) => item.course_id === course.id && item.status === "completed").map((item) => item.lesson_id));
  async function enroll() { setStatus("saving"); try { await onEnroll(course.id); setStatus("saved"); } catch { setStatus("error"); } }
  async function complete(lessonId) { setStatus("saving"); try { await onCompleteLesson(lessonId); setStatus("saved"); } catch { setStatus("error"); } }
  return <section className="course-detail"><button className="text-link" onClick={onBack}><ChevronRight size={16} className="back-icon" /> Volver a cursos</button><div className="course-detail-heading"><p className="eyebrow">CURSO · {course.category || "RUTA DE APRENDIZAJE"}</p><h1>{course.title}</h1><p>{course.description || "Un recorrido estructurado para aprender paso a paso."}</p>{enrollment ? <div className="progress-summary"><div><strong>{enrollment.progress_percent || 0}%</strong><span>de avance</span></div><div className="progress-track"><span style={{ width: `${enrollment.progress_percent || 0}%` }} /></div><small>{enrollment.status === "completed" ? "Curso completado" : "Continúa con tu siguiente lección"}</small></div> : <button className="primary-button" onClick={enroll} disabled={status === "saving"}>{status === "saving" ? "Inscribiendo..." : "Inscribirme al curso"}</button>}{certificate && <div className="certificate-card"><GraduationCap size={24} /><div><strong>Certificado disponible</strong><span>{certificate.certificate_number} · {formatDate(certificate.issued_at)}</span></div><a className="secondary-button" href={`?certificate=${encodeURIComponent(certificate.certificate_number)}`} target="_blank" rel="noreferrer">Ver certificado</a></div>}{status === "error" && <span className="form-error">No se pudo actualizar tu inscripción.</span>}</div>{courseModules.length ? <div className="course-outline">{courseModules.map((module) => { const moduleLessons = lessons.filter((lesson) => lesson.module_id === module.id).sort((a, b) => a.order - b.order); return <article className="module-row" key={module.id}><div><span className="module-number">{String(module.order + 1).padStart(2, "0")}</span><div><h3>{module.title}</h3><p>{module.description || "Módulo de aprendizaje"}</p></div></div><div className="lesson-list">{moduleLessons.length ? moduleLessons.map((lesson) => <div key={lesson.id}><div className={`lesson-row ${completedLessons.has(lesson.id) ? "completed" : ""}`}><button className="lesson-complete" onClick={() => enrollment && !completedLessons.has(lesson.id) && complete(lesson.id)} disabled={!enrollment || completedLessons.has(lesson.id) || status === "saving"} aria-label={completedLessons.has(lesson.id) ? "Lección completada" : "Marcar lección como completada"}>{completedLessons.has(lesson.id) ? "✓" : "○"}</button><span>{lesson.title}</span><small>{lesson.duration_minutes ? `${lesson.duration_minutes} min` : lesson.lesson_type || "Lección"}</small></div>{enrollment && lesson.lesson_type === "video" && <VideoPlayer lesson={lesson} />}{enrollment && lesson.lesson_type === "quiz" && <QuizPlayer lesson={lesson} organizationId={organizationId} onPassed={onCompleteLesson} />}</div>) : <span className="panel-note">Próximamente se publicarán las lecciones de este módulo.</span>}</div></article>; })}</div> : <EmptyState title="Contenido en preparación" text="Este curso todavía no tiene módulos publicados." />}</section>;
}

function DownloadRow({ download, onOpen }) {
  return <article className="download-row"><span className="download-icon"><BookOpen size={19} /></span><div className="download-info"><strong>{download.title}</strong><span>{download.category} · {download.format}</span></div><button className="download-action" onClick={onOpen} aria-label={`Abrir ${download.title}`}><Download size={17} /></button></article>;
}

function EmptyState({ title, text }) {
  return <div className="empty-state"><PlayCircle size={28} /><h3>{title}</h3><p>{text}</p></div>;
}

function AdminView({ context, sessions, downloads, events, courses, courseModules, courseLessons, facilitators, members, invitations, onContentSaved, onOrganizationSaved, onArchived, onMemberChanged, onInvitationCreated, onTenantCreated }) {
  const organization = context?.organization;
  const [editing, setEditing] = useState(null);
  return <CollectionView title="Administración" eyebrow="ESPACIO DE OPERACIÓN" description="Gestiona el contenido de tu organización desde un solo lugar." icon={Users}>
    {context?.user?.role === "superadmin" && <TenantManager organizations={context?.organizations || []} onCreated={onTenantCreated} />}
    {context?.user?.role === "superadmin" && <PlanManager organization={organization} onSaved={onOrganizationSaved} />}
    {context?.permissions?.can_manage_organization && <BillingPanel organization={organization} />}
    <div className="admin-intro"><div><span className="eyebrow">ORGANIZACIÓN ACTIVA</span><h2>{organization?.display_name || organization?.name || "Academy"}</h2><p>Rol: <strong>{context?.user?.role || "administrador"}</strong>. Los permisos se validan en backend por membresía.</p></div><span className="admin-status">{organization?.status === "active" ? "Activa" : "Revisar estado"}</span></div>
    <OnboardingChecklist onboarding={context?.onboarding} />
    <AnalyticsPanel organization={organization} />
    <div className="admin-stats"><AdminStat label="Sesiones" value={sessions.length} /><AdminStat label="Descargables" value={downloads.length} /><AdminStat label="Eventos" value={events.length} /></div>
    <div className="admin-workspace">{context?.permissions?.can_manage_organization && <OrganizationSettings organization={organization} onSaved={onOrganizationSaved} />}<ContentCreator organization={organization} canManageEvents={context?.permissions?.can_manage_events} facilitators={facilitators} editingItem={editing?.item} editingType={editing?.type} onClearEdit={() => setEditing(null)} onSaved={(type, item, mode) => { onContentSaved(type, item, mode); setEditing(null); }} /><CourseBuilder organization={organization} courses={courses} modules={courseModules} lessons={courseLessons} onSaved={onContentSaved} onArchived={onArchived} />{context?.permissions?.can_manage_organization && <MemberManager organization={organization} members={members} invitations={invitations} canManageOrganization={context?.permissions?.can_manage_organization} onMemberChanged={onMemberChanged} onInvitationCreated={onInvitationCreated} />}<AdminContentList title="Sesiones" type="session" items={sessions} onArchived={onArchived} onEdit={(type, item) => setEditing({ type, item })} /><AdminContentList title="Cursos" type="course" items={courses} onArchived={onArchived} onEdit={(type, item) => setEditing({ type, item })} /><AdminContentList title="Eventos" type="event" items={events} onArchived={onArchived} onEdit={(type, item) => setEditing({ type, item })} /><AdminContentList title="Descargables" type="download" items={downloads} onArchived={onArchived} onEdit={(type, item) => setEditing({ type, item })} /><FacilitatorList facilitators={facilitators} onArchived={onArchived} onEdit={(type, item) => setEditing({ type, item })} /></div>
  </CollectionView>;
}

function PlanManager({ organization, onSaved }) {
  const [plans, setPlans] = useState([]);
  const [selected, setSelected] = useState(organization?.plan_key || "sessions");
  const [status, setStatus] = useState("loading");
  useEffect(() => { setSelected(organization?.plan_key || "sessions"); }, [organization?.id, organization?.plan_key]);
  useEffect(() => { let alive = true; base44.functions.invoke("academyPlanMutation", { action: "templates" }).then((result) => { if (alive) { setPlans((result?.data || result)?.plans || []); setStatus("ready"); } }).catch(() => { if (alive) setStatus("error"); }); return () => { alive = false; }; }, []);
  async function assign() {
    setStatus("saving");
    try { const result = await base44.functions.invoke("academyPlanMutation", { action: "assign", organization_id: organization?.id, plan_key: selected }); const payload = result?.data || result; if (!payload?.organization) throw new Error("plan_not_saved"); onSaved(payload.organization); setStatus("saved"); } catch { setStatus("error"); }
  }
  const currentPlan = plans.find((plan) => plan.key === selected);
  return <section className="admin-panel plan-panel"><div className="admin-panel-heading"><div><p className="eyebrow">MODELO SAAS</p><h3>Paquete de módulos</h3></div><span className="panel-note">{organization?.plan_status === "active" ? "Activo" : "Piloto"}</span></div><p className="panel-description">Asigna capacidades a la Academy activa. Esta fase no incluye cobros ni precios; solo define los módulos disponibles.</p>{status === "loading" ? <span className="panel-note">Cargando plantillas...</span> : <><div className="plan-grid">{plans.map((plan) => <button type="button" className={`plan-card ${selected === plan.key ? "selected" : ""}`} key={plan.key} onClick={() => setSelected(plan.key)}><strong>{plan.name}</strong><span>{plan.description}</span><small>{plan.modules.length} módulos</small></button>)}</div><div className="form-actions"><button className="primary-button" onClick={assign} disabled={status === "saving" || !currentPlan}>{status === "saving" ? "Guardando..." : "Asignar paquete"}</button>{status === "saved" && <span className="form-success">Paquete asignado</span>}{status === "error" && <span className="form-error">No se pudo asignar</span>}</div></>}</section>;
}

function BillingPanel({ organization }) {
  const [catalog, setCatalog] = useState(null);
  const [billing, setBilling] = useState(null);
  const [status, setStatus] = useState("loading");
  useEffect(() => {
    let alive = true;
    async function load() {
      setStatus("loading");
      try {
        const [catalogResult, billingResult] = await Promise.all([
          base44.functions.invoke("academyBillingMutation", { action: "catalog" }),
          base44.functions.invoke("academyBillingMutation", { action: "status", organization_id: organization?.id }),
        ]);
        if (!alive) return;
        setCatalog(catalogResult?.data || catalogResult);
        setBilling((billingResult?.data || billingResult)?.billing || null);
        setStatus("ready");
      } catch { if (alive) setStatus("error"); }
    }
    if (organization?.id) load();
    return () => { alive = false; };
  }, [organization?.id]);
  if (status === "loading") return <section className="admin-panel billing-panel"><div className="admin-panel-heading"><div><p className="eyebrow">FACTURACIÓN</p><h3>Stripe Billing</h3></div><span className="panel-note">Cargando...</span></div></section>;
  if (status === "error" || !catalog || !billing) return <section className="admin-panel billing-panel"><div className="admin-panel-heading"><div><p className="eyebrow">FACTURACIÓN</p><h3>Stripe Billing</h3></div><span className="form-error">No disponible</span></div></section>;
  const currentPlan = catalog.plans?.find((plan) => plan.key === billing.plan_key);
  return <section className="admin-panel billing-panel"><div className="admin-panel-heading"><div><p className="eyebrow">FACTURACIÓN SAAS</p><h3>Suscripción de la Academy</h3></div><span className={`billing-badge ${billing.subscription_status === "active" ? "active" : ""}`}>{billing.subscription_status || billing.plan_status || "Sin suscripción"}</span></div><p className="panel-description">Stripe será el motor de suscripciones recurrentes por organización. El acceso al checkout permanecerá suspendido hasta configurar productos, precios, claves y webhooks en el entorno seguro.</p><div className="billing-summary"><div><span>Paquete</span><strong>{currentPlan?.key || billing.plan_key}</strong></div><div><span>Customer</span><strong>{billing.customer_id ? "Configurado" : "Pendiente"}</strong></div><div><span>Checkout</span><strong>{catalog.checkout_enabled ? "Disponible" : "Suspendido"}</strong></div></div><div className="billing-checklist">{catalog.plans?.map((plan) => <div key={plan.key}><span className={`billing-dot ${plan.price_configured ? "ready" : ""}`} />{plan.key}: {plan.price_configured ? "price configurado" : "price pendiente"}</div>)}</div><div className="form-actions"><button type="button" className="secondary-button" disabled>Checkout pendiente de activación</button><span className="panel-note">No se realizan cargos en esta fase.</span></div></section>;
}

function AnalyticsPanel({ organization }) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading");
  useEffect(() => {
    let alive = true;
    async function load() {
      setStatus("loading");
      try {
        const result = await base44.functions.invoke("academyAnalytics", { organization_id: organization?.id });
        const payload = result?.data || result;
        if (!alive) return;
        setData(payload);
        setStatus("ready");
      } catch { if (alive) setStatus("error"); }
    }
    if (organization?.id) load();
    return () => { alive = false; };
  }, [organization?.id]);
  if (status === "loading") return <section className="admin-panel analytics-panel"><div className="admin-panel-heading"><div><p className="eyebrow">OPERACIÓN SAAS</p><h3>Métricas de uso</h3></div><span className="panel-note">Cargando...</span></div></section>;
  if (status === "error" || !data) return <section className="admin-panel analytics-panel"><div className="admin-panel-heading"><div><p className="eyebrow">OPERACIÓN SAAS</p><h3>Métricas de uso</h3></div><span className="form-error">No disponibles</span></div></section>;
  return <section className="admin-panel analytics-panel"><div className="admin-panel-heading"><div><p className="eyebrow">OPERACIÓN SAAS</p><h3>Métricas de uso</h3></div><span className="panel-note">Base para planes por módulo</span></div><div className="analytics-summary"><div><strong>{data.summary?.active_members || 0}</strong><span>Miembros activos</span></div><div><strong>{data.summary?.published_resources || 0}</strong><span>Recursos publicados</span></div><div><strong>{data.summary?.facilitators || 0}</strong><span>Facilitadores</span></div><div><strong>{data.summary?.pending_invitations || 0}</strong><span>Invitaciones pendientes</span></div></div><div className="analytics-columns"><div><h4><BarChart3 size={16} /> Uso por módulo</h4><div className="module-usage-list">{(data.module_usage || []).map((module) => <div className="module-usage-row" key={module.key}><span>{module.label}</span><strong>{module.published}</strong><small>{module.total} registros</small></div>)}</div></div><div><h4><Activity size={16} /> Actividad reciente</h4>{data.recent_activity?.length ? <div className="activity-list">{data.recent_activity.slice(0, 6).map((event) => <div className="activity-row" key={event.id}><span>{event.action || "Actividad"}</span><small>{event.actor_email || "Usuario"} · {formatDate(event.created_at)}</small></div>)}</div> : <div className="activity-empty">Aún no hay actividad registrada.</div>}</div></div></section>;
}

function OnboardingChecklist({ onboarding }) {
  if (!onboarding) return null;
  const labels = { branding: "Subir el logo", welcome: "Escribir bienvenida", modules: "Elegir módulos", responsible: "Asignar responsable", facilitator: "Crear facilitador", first_resource: "Publicar primer recurso", custom_domain: "Conectar dominio" };
  return <section className="admin-panel onboarding-panel"><div className="admin-panel-heading"><div><p className="eyebrow">ONBOARDING</p><h3>Lista para entregar</h3></div><span className="onboarding-progress">{onboarding.completed}/{onboarding.total} completados · {onboarding.percentage}%</span></div><div className="onboarding-track"><span style={{ width: `${onboarding.percentage}%` }} /></div><div className="onboarding-list">{Object.entries(labels).map(([key, label]) => <div className={`onboarding-item ${onboarding.items[key] ? "done" : ""}`} key={key}><span className="onboarding-check">{onboarding.items[key] ? "✓" : ""}</span><span>{label}</span>{!onboarding.items[key] && <small>Pendiente</small>}</div>)}</div></section>;
}

function TenantManager({ organizations, onCreated }) {
  const [form, setForm] = useState({ slug: "", name: "", display_name: "", primary_color: "#6B4EFF", welcome_message: "", admin_email: "", admin_display_name: "" });
  const [status, setStatus] = useState("idle");
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  async function createTenant(event) {
    event.preventDefault();
    setStatus("saving");
    try {
      const result = await base44.functions.invoke("academyTenantMutation", { action: "create", ...form });
      const payload = result?.data || result;
      if (!payload?.organization) throw new Error("tenant_not_created");
      onCreated(payload.organization);
      setForm({ slug: "", name: "", display_name: "", primary_color: "#6B4EFF", welcome_message: "", admin_email: "", admin_display_name: "" });
      setStatus("saved");
    } catch { setStatus("error"); }
  }
  return <section className="admin-panel tenant-manager"><div className="admin-panel-heading"><div><p className="eyebrow">PLATAFORMA</p><h3>Academies y clientes</h3></div><span className="panel-note">{organizations.length} organizaciones activas</span></div><p className="panel-description">Crea el espacio inicial de cada escuela, academia o empresa. Después podrás personalizar su marca, módulos, facilitadores y alumnos.</p><form className="admin-form" onSubmit={createTenant}><label>Identificador único<input value={form.slug} onChange={(event) => update("slug", event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder="mi-academy" pattern="^[a-z0-9-]{2,80}$" required /><span className="field-help">Solo minúsculas, números y guiones.</span></label><label>Nombre interno<input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Mi Academy" maxLength={160} required /></label><label>Nombre visible<input value={form.display_name} onChange={(event) => update("display_name", event.target.value)} placeholder="Mi Academy" maxLength={160} required /></label><label>Color principal<div className="color-input"><input type="color" value={form.primary_color} onChange={(event) => update("primary_color", event.target.value)} /><input value={form.primary_color} onChange={(event) => update("primary_color", event.target.value)} pattern="^#[0-9a-fA-F]{6}$" required /></div></label><label>Responsable de la Academy<input type="text" value={form.admin_display_name} onChange={(event) => update("admin_display_name", event.target.value)} placeholder="Nombre del responsable" maxLength={160} required /></label><label>Correo del responsable<input type="email" value={form.admin_email} onChange={(event) => update("admin_email", event.target.value)} placeholder="responsable@cliente.com" required /><span className="field-help">Recibirá la invitación y será administrador de esta Academy.</span></label><label>Mensaje de bienvenida<textarea value={form.welcome_message} onChange={(event) => update("welcome_message", event.target.value)} rows="2" maxLength={1000} placeholder="Bienvenido a tu espacio de aprendizaje." /></label><div className="form-actions"><button className="primary-button" disabled={status === "saving"}>{status === "saving" ? "Creando..." : "Crear Academy e invitar responsable"}</button>{status === "saved" && <span className="form-success">Academy creada y responsable invitado</span>}{status === "error" && <span className="form-error">No se pudo crear. Revisa los datos e inténtalo nuevamente.</span>}</div></form></section>;
}

function AdminStat({ label, value }) {
  return <div className="admin-stat"><strong>{value}</strong><span>{label}</span></div>;
}

function OrganizationSettings({ organization, onSaved }) {
  const [form, setForm] = useState({ display_name: organization?.display_name || "Academy", primary_color: organization?.primary_color || "#0091D1", logo_url: organization?.logo_url || "", welcome_message: organization?.welcome_message || "", custom_domain: organization?.custom_domain || "" });
  const [status, setStatus] = useState("idle");
  const [domainStatus, setDomainStatus] = useState(organization?.custom_domain_status || "not_configured");
  useEffect(() => { setForm({ display_name: organization?.display_name || "Academy", primary_color: organization?.primary_color || "#0091D1", logo_url: organization?.logo_url || "", welcome_message: organization?.welcome_message || "", custom_domain: organization?.custom_domain || "" }); setDomainStatus(organization?.custom_domain_status || "not_configured"); setStatus("idle"); }, [organization?.id]);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  async function uploadLogo(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) { setStatus("logo_error"); return; }
    setStatus("uploading");
    try {
      const uploaded = await base44.integrations.Core.UploadFile({ file });
      if (!uploaded?.file_url) throw new Error("logo_upload_failed");
      update("logo_url", uploaded.file_url);
      setStatus("logo_uploaded");
    } catch { setStatus("logo_error"); }
  }
  async function submit(event) {
    event.preventDefault();
    setStatus("saving");
    try {
      const result = await base44.functions.invoke("academyOrganizationMutation", { organization_id: organization?.id, ...form });
      const payload = result?.data || result;
      onSaved(payload.organization);
      setStatus("saved");
    } catch { setStatus("error"); }
  }
  async function verifyDomain() {
    if (!form.custom_domain) { setDomainStatus("not_configured"); return; }
    setDomainStatus("checking");
    try {
      const result = await base44.functions.invoke("academyDomainVerification", { organization_id: organization?.id });
      const payload = result?.data || result;
      if (!payload?.organization) throw new Error("domain_check_failed");
      setDomainStatus(payload.status);
      onSaved(payload.organization);
    } catch { setDomainStatus("check_error"); }
  }
  const domainMessage = { not_configured: "Guarda un dominio para iniciar la verificación.", pending_dns: "No se encontraron registros DNS todavía.", dns_found: "Se encontraron registros DNS. Confirma la conexión en el proveedor de hosting.", checking: "Consultando DNS...", check_error: "No se pudo consultar DNS; inténtalo nuevamente." }[domainStatus];
  return <section className="admin-panel"><div className="admin-panel-heading"><div><p className="eyebrow">MARCA DEL CLIENTE</p><h3>Personalización de organización</h3></div><span className="panel-note">Se aplicará al tenant activo</span></div><form className="admin-form" onSubmit={submit}><label>Nombre visible<input value={form.display_name} onChange={(event) => update("display_name", event.target.value)} maxLength={160} required /></label><label>Color principal<div className="color-input"><input type="color" value={form.primary_color} onChange={(event) => update("primary_color", event.target.value)} /><input value={form.primary_color} onChange={(event) => update("primary_color", event.target.value)} pattern="^#[0-9a-fA-F]{6}$" required /></div></label><label>Logo de la Academy<input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadLogo} disabled={status === "uploading"} /><span className="field-help">PNG, JPG o WebP · máximo 2 MB. {status === "uploading" ? "Subiendo..." : status === "logo_uploaded" ? "Logo cargado; guarda la configuración." : ""}</span></label><label>URL pública del logo<input value={form.logo_url} onChange={(event) => update("logo_url", event.target.value)} placeholder="https://..." type="url" /></label><label>Mensaje de bienvenida<textarea value={form.welcome_message} onChange={(event) => update("welcome_message", event.target.value)} rows="2" maxLength={1000} /></label><label>Dominio personalizado<input value={form.custom_domain} onChange={(event) => { update("custom_domain", event.target.value.toLowerCase().trim()); setDomainStatus("not_configured"); }} placeholder="academy.tuempresa.com" /><span className="field-help">Guárdalo primero y después verifica si ya existen registros DNS.</span><span className={`domain-status ${domainStatus}`}>{domainMessage}</span><button type="button" className="secondary-button domain-check-button" onClick={verifyDomain} disabled={domainStatus === "checking" || !form.custom_domain}>{domainStatus === "checking" ? "Verificando..." : "Verificar DNS"}</button></label><div className="form-actions"><button className="primary-button" disabled={status === "saving" || status === "uploading"}>{status === "saving" ? "Guardando..." : "Guardar configuración"}</button>{status === "saved" && <span className="form-success">Guardado</span>}{status === "error" && <span className="form-error">No se pudo guardar</span>}{status === "logo_error" && <span className="form-error">El logo debe ser PNG, JPG o WebP de máximo 2 MB.</span>}</div></form></section>;
}

function ContentCreator({ organization, canManageEvents, facilitators, editingItem, editingType, onClearEdit, onSaved }) {
  const [type, setType] = useState("session");
  const [form, setForm] = useState({ title: "", description: "", start_at: "", duration_minutes: "60", session_type: "workshop", teacher_name: "", category: "Guías", file_type: "pdf", file_uri: "", expertise: "", full_name: "", headline: "", bio: "", background: "", facilitator_ids: [] });
  const [status, setStatus] = useState("idle");
  const isFacilitator = type === "facilitator";
  const isDownload = type === "download";
  const isEvent = type === "event";
  const isCourse = type === "course";

  useEffect(() => {
    if (!editingItem) return;
    setType(editingType || "session");
    setForm((current) => ({ ...current, ...editingItem, expertise: Array.isArray(editingItem.expertise) ? editingItem.expertise.join(", ") : "", facilitator_ids: editingItem.facilitator_ids || [], start_at: editingItem.start_at ? editingItem.start_at.slice(0, 16) : "" }));
    setStatus("idle");
  }, [editingItem, editingType]);

  function update(key, value) { setForm((current) => ({ ...current, [key]: value })); }
  function toggleFacilitator(id) { setForm((current) => ({ ...current, facilitator_ids: current.facilitator_ids.includes(id) ? current.facilitator_ids.filter((item) => item !== id) : [...current.facilitator_ids, id] })); }
  async function submit(event) {
    event.preventDefault();
    setStatus("saving");
    const data = isFacilitator ? { full_name: form.full_name, headline: form.headline, bio: form.bio, background: form.background, expertise: form.expertise.split(",").map((item) => item.trim()).filter(Boolean), status: "published", visibility: "members" } : isCourse ? { title: form.title, description: form.description, category: form.category, level: form.level, estimated_minutes: Number(form.duration_minutes), facilitator_ids: form.facilitator_ids, status: "published", access: "all_members" } : isDownload ? { title: form.title, description: form.description, category: form.category, file_type: form.file_type, file_uri: form.file_uri, status: "published", access: "all_members" } : isEvent ? { title: form.title, description: form.description, start_at: form.start_at, facilitator_ids: form.facilitator_ids, status: "published", access: "free" } : { title: form.title, description: form.description, session_type: form.session_type, start_at: form.start_at, duration_minutes: Number(form.duration_minutes), teacher_name: form.teacher_name, facilitator_ids: form.facilitator_ids, status: "published", access: "all_members" };
    try {
      const action = editingItem ? "update" : "create";
      const result = await base44.functions.invoke("academyContentMutation", { action, type, organization_id: organization?.id, id: editingItem?.id, data });
      const payload = result?.data || result;
      onSaved(type, payload.item, action === "update" ? "update" : "create");
      setForm((current) => ({ ...current, title: "", description: "", start_at: "", file_uri: "", full_name: "", headline: "", bio: "", background: "", expertise: "", facilitator_ids: [] }));
      setStatus("saved");
    } catch { setStatus("error"); }
  }
  return <section className="admin-panel"><div className="admin-panel-heading"><div><p className="eyebrow">CONTENIDO</p><h3>{editingItem ? "Editar contenido" : "Publicar en Academy"}</h3></div><span className="panel-note">{editingItem ? "Edición" : "Alta rápida"}</span></div><div className="content-type-tabs"><button type="button" className={type === "session" ? "selected" : ""} onClick={() => setType("session")}>Sesión</button><button type="button" className={type === "course" ? "selected" : ""} onClick={() => setType("course")}>Curso</button><button type="button" className={type === "event" ? "selected" : ""} onClick={() => setType("event")} disabled={!canManageEvents}>Evento</button><button type="button" className={type === "download" ? "selected" : ""} onClick={() => setType("download")}>Descargable</button><button type="button" className={type === "facilitator" ? "selected" : ""} onClick={() => setType("facilitator")} disabled={!canManageEvents}>Facilitador</button></div><form className="admin-form" onSubmit={submit}>{isFacilitator ? <><label>Nombre completo<input value={form.full_name} onChange={(event) => update("full_name", event.target.value)} required /></label><label>Título profesional<input value={form.headline} onChange={(event) => update("headline", event.target.value)} placeholder="Especialista en..." /></label><label>Expertise<input value={form.expertise} onChange={(event) => update("expertise", event.target.value)} placeholder="Finanzas, liderazgo, ventas" /></label><label>Biografía<textarea value={form.bio} onChange={(event) => update("bio", event.target.value)} rows="3" /></label><label>Background<textarea value={form.background} onChange={(event) => update("background", event.target.value)} rows="3" /></label></> : <><label>Título<input value={form.title} onChange={(event) => update("title", event.target.value)} required /></label><label>Descripción<textarea value={form.description} onChange={(event) => update("description", event.target.value)} rows="3" /></label>{!isDownload && !isCourse && <label>Fecha y hora<input type="datetime-local" value={form.start_at} onChange={(event) => update("start_at", event.target.value)} required /></label>}{type === "session" && <div className="form-row"><label>Tipo<select value={form.session_type} onChange={(event) => update("session_type", event.target.value)}><option value="workshop">Taller</option><option value="class">Clase</option><option value="mentoring">Mentoría</option><option value="masterclass">Masterclass</option></select></label><label>Duración (minutos)<input type="number" min="1" max="1440" value={form.duration_minutes} onChange={(event) => update("duration_minutes", event.target.value)} /></label></div>}{isCourse && <div className="form-row"><label>Categoría<input value={form.category} onChange={(event) => update("category", event.target.value)} /></label><label>Nivel<select value={form.level || "introductory"} onChange={(event) => update("level", event.target.value)}><option value="introductory">Introductorio</option><option value="intermediate">Intermedio</option><option value="advanced">Avanzado</option></select></label></div>}{isCourse && <label>Duración estimada (minutos)<input type="number" min="1" value={form.duration_minutes} onChange={(event) => update("duration_minutes", event.target.value)} /></label>}{type === "session" && <label>Facilitador principal<input value={form.teacher_name} onChange={(event) => update("teacher_name", event.target.value)} placeholder="Nombre visible" /></label>}{(type === "session" || type === "event" || type === "course") && <fieldset className="facilitator-picker"><legend>Facilitadores asignados</legend>{facilitators.length ? facilitators.map((facilitator) => <label key={facilitator.id}><input type="checkbox" checked={form.facilitator_ids.includes(facilitator.id)} onChange={() => toggleFacilitator(facilitator.id)} />{facilitator.full_name}</label>) : <span>No hay perfiles disponibles todavía.</span>}</fieldset>}{isDownload && <div className="form-row"><label>Categoría<input value={form.category} onChange={(event) => update("category", event.target.value)} /></label><label>Formato<select value={form.file_type} onChange={(event) => update("file_type", event.target.value)}><option value="pdf">PDF</option><option value="xlsx">Excel</option><option value="docx">Word</option><option value="link">Enlace</option><option value="video">Video</option></select></label></div>}{isDownload && <label>Archivo o enlace<input value={form.file_uri} onChange={(event) => update("file_uri", event.target.value)} placeholder="La carga segura se habilitará en el siguiente bloque" /></label>}</>}<div className="form-actions"><button className="primary-button" disabled={status === "saving"}>{status === "saving" ? "Guardando..." : editingItem ? "Guardar cambios" : "Publicar"}</button>{editingItem && <button type="button" className="secondary-button" onClick={onClearEdit}>Cancelar edición</button>}{status === "saved" && <span className="form-success">Guardado</span>}{status === "error" && <span className="form-error">No se pudo guardar</span>}</div></form></section>;
}

function CourseBuilder({ organization, courses, modules, lessons, onSaved, onArchived }) {
  const [courseId, setCourseId] = useState(courses[0]?.id || "");
  const [moduleForm, setModuleForm] = useState({ title: "", description: "" });
  const [lessonForm, setLessonForm] = useState({ module_id: "", title: "", description: "", lesson_type: "reading", duration_minutes: "", resource_url: "", content: "", video_provider: "none", video_id: "", video_url: "" });
  const [questionForm, setQuestionForm] = useState({ prompt: "", options: "", correct_option: "0", explanation: "" });
  const [status, setStatus] = useState("idle");
  useEffect(() => { if (!courseId && courses[0]?.id) setCourseId(courses[0].id); }, [courses, courseId]);
  const courseModules = modules.filter((module) => module.course_id === courseId).sort((a, b) => a.order - b.order);
  const selectedModuleId = lessonForm.module_id || courseModules[0]?.id || "";
  async function saveContent(type, data) {
    setStatus("saving");
    try {
      const result = await base44.functions.invoke("academyContentMutation", { action: "create", type, organization_id: organization?.id, data });
      const payload = result?.data || result;
      onSaved(type, payload.item, "create");
      setStatus("saved");
      return payload.item;
    } catch { setStatus("error"); return null; }
  }
  async function createModule(event) {
    event.preventDefault();
    if (!courseId) return;
    const created = await saveContent("course_module", { course_id: courseId, title: moduleForm.title, description: moduleForm.description, order: courseModules.length, status: "published", lesson_count: 0 });
    if (created) setModuleForm({ title: "", description: "" });
  }
  async function createLesson(event) {
    event.preventDefault();
    if (!courseId || !selectedModuleId) return;
    const created = await saveContent("course_lesson", { course_id: courseId, module_id: selectedModuleId, title: lessonForm.title, description: lessonForm.description, lesson_type: lessonForm.lesson_type, duration_minutes: Number(lessonForm.duration_minutes) || 0, resource_url: lessonForm.resource_url, content: lessonForm.content, video_provider: lessonForm.lesson_type === "video" ? lessonForm.video_provider : "none", video_id: lessonForm.video_id, video_url: lessonForm.video_url, order: lessons.filter((lesson) => lesson.module_id === selectedModuleId).length, status: "published" });
    if (created && lessonForm.lesson_type === "quiz" && questionForm.prompt) {
      const response = await base44.functions.invoke("academyQuizMutation", { action: "create_question", organization_id: organization?.id, data: { lesson_id: created.id, prompt: questionForm.prompt, options: questionForm.options.split(",").map((item) => item.trim()).filter(Boolean), correct_option: Number(questionForm.correct_option), explanation: questionForm.explanation } });
      if (response?.error || response?.data?.error) setStatus("error");
    }
    if (created) setLessonForm((current) => ({ ...current, title: "", description: "", duration_minutes: "", resource_url: "", content: "" }));
    if (created) setQuestionForm({ prompt: "", options: "", correct_option: "0", explanation: "" });
  }
  return <section className="admin-panel"><div className="admin-panel-heading"><div><p className="eyebrow">ESTRUCTURA EDUCATIVA</p><h3>Constructor de cursos</h3></div><span className="panel-note">Módulos y lecciones</span></div>{courses.length ? <><label className="course-selector">Curso activo<select value={courseId} onChange={(event) => { setCourseId(event.target.value); setLessonForm((current) => ({ ...current, module_id: "" })); }}>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label><div className="builder-grid"><form className="builder-form" onSubmit={createModule}><h4>Agregar módulo</h4><input value={moduleForm.title} onChange={(event) => setModuleForm((current) => ({ ...current, title: event.target.value }))} placeholder="Nombre del módulo" required /><textarea value={moduleForm.description} onChange={(event) => setModuleForm((current) => ({ ...current, description: event.target.value }))} placeholder="Descripción breve" rows="2" /><button className="primary-button" disabled={status === "saving"}>Crear módulo</button></form><form className="builder-form" onSubmit={createLesson}><h4>Agregar lección</h4><select value={selectedModuleId} onChange={(event) => setLessonForm((current) => ({ ...current, module_id: event.target.value }))} required><option value="">Selecciona un módulo</option>{courseModules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}</select><input value={lessonForm.title} onChange={(event) => setLessonForm((current) => ({ ...current, title: event.target.value }))} placeholder="Título de la lección" required /><div className="form-row"><select value={lessonForm.lesson_type} onChange={(event) => setLessonForm((current) => ({ ...current, lesson_type: event.target.value }))}><option value="reading">Lectura</option><option value="video">Video</option><option value="download">Descargable</option><option value="live">Sesión en vivo</option><option value="quiz">Evaluación</option></select><input type="number" min="0" value={lessonForm.duration_minutes} onChange={(event) => setLessonForm((current) => ({ ...current, duration_minutes: event.target.value }))} placeholder="Minutos" /></div><textarea value={lessonForm.content} onChange={(event) => setLessonForm((current) => ({ ...current, content: event.target.value }))} placeholder="Contenido o instrucciones" rows="3" />{lessonForm.lesson_type === "video" && <div className="video-source-fields"><label>Proveedor<select value={lessonForm.video_provider} onChange={(event) => setLessonForm((current) => ({ ...current, video_provider: event.target.value }))}><option value="youtube">YouTube no listado</option><option value="vimeo">Vimeo</option></select></label><label>ID del video<input value={lessonForm.video_id} onChange={(event) => setLessonForm((current) => ({ ...current, video_id: event.target.value }))} placeholder="Ej. dQw4w9WgXcQ o 123456789" required /></label></div>}{lessonForm.lesson_type === "quiz" && <div className="quiz-authoring"><label>Pregunta<input value={questionForm.prompt} onChange={(event) => setQuestionForm((current) => ({ ...current, prompt: event.target.value }))} placeholder="¿Cuál es la respuesta correcta?" /></label><label>Opciones separadas por coma<input value={questionForm.options} onChange={(event) => setQuestionForm((current) => ({ ...current, options: event.target.value }))} placeholder="Opción A, Opción B, Opción C" /></label><div className="form-row"><label>Índice correcto<input type="number" min="0" value={questionForm.correct_option} onChange={(event) => setQuestionForm((current) => ({ ...current, correct_option: event.target.value }))} /></label><label>Explicación<input value={questionForm.explanation} onChange={(event) => setQuestionForm((current) => ({ ...current, explanation: event.target.value }))} /></label></div></div>}{lessonForm.lesson_type !== "video" && <input value={lessonForm.resource_url} onChange={(event) => setLessonForm((current) => ({ ...current, resource_url: event.target.value }))} placeholder="URL de recurso (opcional)" />}<button className="primary-button" disabled={status === "saving" || !courseModules.length}>Crear lección</button></form></div><div className="builder-outline">{courseModules.length ? courseModules.map((module) => <article className="builder-module" key={module.id}><div className="builder-module-heading"><div><strong>{module.title}</strong><span>{lessons.filter((lesson) => lesson.module_id === module.id).length} lecciones</span></div><button className="archive-button" onClick={() => onArchived("course_module", module.id)}>Archivar</button></div>{lessons.filter((lesson) => lesson.module_id === module.id).sort((a, b) => a.order - b.order).map((lesson) => <div className="builder-lesson" key={lesson.id}><span><PlayCircle size={14} />{lesson.title}{lesson.video_provider && lesson.video_provider !== "none" ? ` · ${lesson.video_provider}` : ""}</span><button className="archive-button" onClick={() => onArchived("course_lesson", lesson.id)}>Archivar</button></div>)}</article>) : <div className="empty-state compact-empty"><BookOpen size={24} /><p>Crea el primer módulo para comenzar.</p></div>}</div>{status === "saved" && <span className="form-success">Contenido guardado</span>}{status === "error" && <span className="form-error">No se pudo guardar el contenido</span>}</> : <div className="empty-state compact-empty"><BookOpen size={24} /><p>Primero crea un curso para agregar módulos y lecciones.</p></div>}</section>;
}

function MemberManager({ organization, members, invitations, canManageOrganization, onMemberChanged, onInvitationCreated }) {
  const [form, setForm] = useState({ email: "", display_name: "", role: "student" });
  const [status, setStatus] = useState("idle");
  async function invite(event) {
    event.preventDefault();
    setStatus("saving");
    try {
      const result = await base44.functions.invoke("academyInvitationMutation", { organization_id: organization?.id, ...form });
      const payload = result?.data || result;
      onInvitationCreated(payload.invitation);
      setForm({ email: "", display_name: "", role: "student" });
      setStatus("saved");
    } catch { setStatus("error"); }
  }
  async function changeStatus(member) {
    const nextStatus = member.status === "active" ? "suspended" : "active";
    try {
      const result = await base44.functions.invoke("academyMemberMutation", { organization_id: organization?.id, membership_id: member.id, status: nextStatus });
      const payload = result?.data || result;
      onMemberChanged(payload.membership);
    } catch { setStatus("error"); }
  }
  return <section className="admin-panel"><div className="admin-panel-heading"><div><p className="eyebrow">COMUNIDAD</p><h3>Alumnos y miembros</h3></div><span className="panel-note">{members.length} miembros · {invitations.length} invitaciones</span></div><form className="member-invite-form" onSubmit={invite}><input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="correo@ejemplo.com" required /><input value={form.display_name} onChange={(event) => setForm((current) => ({ ...current, display_name: event.target.value }))} placeholder="Nombre (opcional)" /><select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}><option value="student">Alumno</option><option value="teacher">Facilitador</option>{canManageOrganization && <option value="organization_admin">Administrador del cliente</option>}</select><button className="primary-button" disabled={status === "saving"}>{status === "saving" ? "Enviando..." : "Invitar"}</button></form>{status === "saved" && <span className="form-success">Invitación enviada</span>}{status === "error" && <span className="form-error">No se pudo completar la operación</span>}{members.length ? <div className="member-list">{members.map((member) => <article className="member-row" key={member.id}><div className="avatar">{member.display_name?.slice(0, 1) || member.email?.slice(0, 1) || "A"}</div><div><strong>{member.display_name || member.email}</strong><span>{member.email} · {member.role === "student" ? "Alumno" : member.role === "teacher" ? "Facilitador" : "Administrador del cliente"}</span></div><button className="archive-button" onClick={() => changeStatus(member)}>{member.status === "active" ? "Suspender" : "Reactivar"}</button></article>)}</div> : <div className="empty-state compact-empty"><Users size={24} /><p>Aún no hay miembros activos.</p></div>}{invitations.length > 0 && <div className="pending-invitations"><span className="eyebrow">INVITACIONES PENDIENTES</span>{invitations.map((invitation) => <span key={invitation.id}>{invitation.email} · {invitation.role === "student" ? "Alumno" : invitation.role === "teacher" ? "Facilitador" : "Administrador del cliente"}</span>)}</div>}</section>;
}

function AdminContentList({ title, type, items, onArchived, onEdit }) {
  return <section className="admin-panel"><div className="admin-panel-heading"><div><p className="eyebrow">CONTENIDO PUBLICADO</p><h3>{title}</h3></div><span className="panel-note">{items.length} registros</span></div>{items.length ? <div className="operation-list">{items.map((item) => <article className="operation-row" key={item.id}><div><strong>{item.title || item.name}</strong><span>{item.status || "Publicado"}</span></div><div className="operation-actions"><button className="edit-button" onClick={() => onEdit(type, item)}>Editar</button><button className="archive-button" onClick={() => onArchived(type, item.id)}>Archivar</button></div></article>)}</div> : <div className="empty-state compact-empty"><p>Aún no hay registros publicados.</p></div>}</section>;
}

function FacilitatorList({ facilitators, onArchived, onEdit }) {
  return <section className="admin-panel"><div className="admin-panel-heading"><div><p className="eyebrow">EQUIPO</p><h3>Facilitadores</h3></div><span className="panel-note">{facilitators.length} perfiles</span></div>{facilitators.length ? <div className="facilitator-list">{facilitators.map((facilitator) => <article className="facilitator-row" key={facilitator.id}><div className="avatar facilitator-avatar">{facilitator.full_name?.slice(0, 1) || "F"}</div><div><strong>{facilitator.full_name}</strong><span>{facilitator.headline || "Facilitador"}</span><small>{Array.isArray(facilitator.expertise) ? facilitator.expertise.join(" · ") : "Expertise por completar"}</small></div><div className="operation-actions"><button className="edit-button" onClick={() => onEdit("facilitator", facilitator)}>Editar</button><button className="archive-button" onClick={() => onArchived("facilitator", facilitator.id)}>Archivar</button></div></article>)}</div> : <div className="empty-state compact-empty"><Users size={24} /><p>Aún no hay perfiles. Usa el formulario de contenido para agregar el primero.</p></div>}</section>;
}
