import { useEffect, useMemo, useState } from "react";
import {
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
  const [academyContext, setAcademyContext] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function loadAcademy() {
      const currentUser = await base44.auth.me().catch(() => null);
      const contextResponse = currentUser ? await base44.functions.invoke("getAcademyContext", {}).catch(() => null) : null;
      const context = contextResponse?.data || contextResponse;
      if (!alive) return;
      setUser(context?.user || currentUser);
      setAcademyContext(context);
      const remoteSessions = context?.content?.sessions || [];
      const remoteDownloads = context?.content?.downloads || [];
      const remoteEvents = context?.content?.events || [];
      if (remoteSessions.length) setSessions(remoteSessions.map((item) => ({ ...item, date: formatDate(item.start_at), time: item.duration_minutes ? `${item.duration_minutes} min` : "Horario por confirmar", status: item.status === "published" ? "Próxima" : item.status, type: item.session_type || "Sesión", teacher: item.teacher_name || "Academy", color: "mint" })));
      if (remoteDownloads.length) setDownloads(remoteDownloads.map((item) => ({ ...item, category: item.category || "Recursos", format: item.file_type || "Archivo" })));
      if (remoteEvents.length) setEvents(remoteEvents);
      else setEvents(demoEvents);
      setLoading(false);
    }
    loadAcademy();
    return () => { alive = false; };
  }, []);

  const firstName = user?.full_name?.split(" ")[0] || "estudiante";
  const nextSession = useMemo(() => sessions.find((session) => session.status === "Próxima"), [sessions]);

  function navigate(view) {
    setActiveView(view);
    setMobileMenu(false);
  }

  if (!user) return <PublicLanding onSignIn={() => base44.auth.redirectToLogin(window.location.href)} />;

  return (
    <div className="academy-shell">
      <header className="topbar">
        <button className="brand" onClick={() => navigate("inicio")} aria-label="Ir al inicio">
          <span className="brand-mark"><ScalariaMark /></span>
          <span><strong>Academy</strong><small>by Scalaria</small></span>
        </button>
        <nav className="desktop-nav" aria-label="Navegación principal">
          {navItems.map((item) => <NavButton key={item.id} item={item} active={activeView === item.id} onClick={navigate} />)}
          {academyContext?.permissions?.can_manage && <NavButton item={{ id: "administracion", label: "Administración", icon: Users }} active={activeView === "administracion"} onClick={navigate} />}
        </nav>
        <div className="topbar-actions">
          <span className="tenant-name">{academyContext?.organization?.display_name || "Academy"}</span>
          {user ? <div className="avatar">{firstName.slice(0, 1)}</div> : <button className="sign-in" onClick={() => base44.auth.redirectToLogin() }><LogIn size={16} /> Entrar</button>}
          <button className="mobile-menu-button" onClick={() => setMobileMenu((value) => !value)} aria-label="Abrir menú">{mobileMenu ? <X /> : <Menu />}</button>
        </div>
      </header>

      {mobileMenu && <nav className="mobile-nav">{navItems.map((item) => <NavButton key={item.id} item={item} active={activeView === item.id} onClick={navigate} />)}{academyContext?.permissions?.can_manage && <NavButton item={{ id: "administracion", label: "Administración", icon: Users }} active={activeView === "administracion"} onClick={navigate} />}</nav>}

      <main className="content">
        {activeView === "inicio" && <HomeView firstName={firstName} nextSession={nextSession} sessions={sessions} downloads={downloads} events={events} loading={loading} onNavigate={navigate} organization={academyContext?.organization} />}
        {activeView === "sesiones" && <CollectionView title="Mis sesiones" eyebrow="APRENDE A TU RITMO" description="Encuentra tus próximas sesiones, talleres y grabaciones." icon={CalendarDays}><div className="session-grid">{sessions.map((session) => <SessionCard key={session.id} session={session} />)}</div></CollectionView>}
        {activeView === "eventos" && <CollectionView title="Eventos y webinars" eyebrow="ENCUENTROS EN VIVO" description="Regístrate, participa y vuelve a la grabación cuando quieras." icon={Video}>{events.length ? <div className="session-grid">{events.map((event) => <EventCard key={event.id} event={event} />)}</div> : <EmptyState title="Próximamente" text="Aquí aparecerán los webinars y eventos de tu Academy." />}</CollectionView>}
        {activeView === "descargables" && <CollectionView title="Descargables" eyebrow="RECURSOS PARA AVANZAR" description="Materiales prácticos para llevar lo aprendido a tu día a día." icon={Download}><div className="download-list">{downloads.map((download) => <DownloadRow key={download.id} download={download} />)}</div></CollectionView>}
        {activeView === "administracion" && <AdminView context={academyContext} sessions={sessions} downloads={downloads} events={events} />}
      </main>
    </div>
  );
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

function PublicLanding({ onSignIn }) {
  const modules = [
    { icon: CalendarDays, title: "Sesiones", text: "Clases, talleres, mentorías y sesiones en vivo con seguimiento." },
    { icon: Video, title: "Eventos y webinars", text: "Registros, encuentros en vivo, grabaciones y materiales posteriores." },
    { icon: Download, title: "Descargables", text: "Guías, plantillas, checklists y recursos para aplicar lo aprendido." },
  ];
  return <div className="public-page">
    <header className="public-topbar"><div className="brand"><span className="brand-mark"><ScalariaMark /></span><span><strong>Academy</strong><small>by Scalaria</small></span></div><button className="sign-in" onClick={onSignIn}><LogIn size={16} /> Entrar a mi Academy</button></header>
    <main>
      <section className="public-hero"><div className="public-hero-copy"><p className="eyebrow">PLATAFORMA DE CAPACITACIÓN</p><h1>Aprende lo que necesitas para avanzar.</h1><p>Academy reúne sesiones, talleres, webinars y recursos en un espacio claro para que cada escuela, academia o empresa pueda formar a su comunidad.</p><div className="hero-actions"><button className="primary-button" onClick={onSignIn}>Entrar a mi Academy <ChevronRight size={17} /></button><a href="#modulos" className="text-link light">Conocer los módulos <ChevronRight size={16} /></a></div></div><div className="hero-card"><div className="hero-card-header"><span className="status-dot" /> Academy activa</div><div className="hero-card-title">Tu aprendizaje,<br /><strong>en un solo lugar.</strong></div><div className="hero-mini-row"><span><CalendarDays size={16} /> Sesiones</span><span><Video size={16} /> Webinars</span></div><div className="hero-mini-row"><span><Download size={16} /> Recursos</span><span><Users size={16} /> Comunidad</span></div></div></section>
      <section className="public-section" id="modulos"><div className="public-section-heading"><p className="eyebrow">TODO LO QUE NECESITAS</p><h2>Una experiencia de aprendizaje simple y práctica.</h2><p>Academy puede personalizarse para cada cliente, con su identidad, sus facilitadores y sus alumnos.</p></div><div className="module-grid">{modules.map(({ icon: Icon, title, text }) => <article className="module-card" key={title}><span className="module-icon"><Icon size={22} /></span><h3>{title}</h3><p>{text}</p><span className="module-arrow"><ChevronRight size={17} /></span></article>)}</div></section>
      <section className="public-section split-section"><div><p className="eyebrow">DISEÑADA PARA CRECER</p><h2>Tu Academy, con la identidad de tu organización.</h2><p className="public-body">Cada cliente puede tener su propia marca, módulos y comunidad dentro de la misma plataforma. Academy está preparada para coaches, consultores, escuelas, academias y empresas.</p></div><div className="steps-card"><div><span>01</span><strong>Publica</strong><small>sesiones y recursos</small></div><div><span>02</span><strong>Conecta</strong><small>con tu comunidad</small></div><div><span>03</span><strong>Acompaña</strong><small>el progreso</small></div></div></section>
      <section className="public-cta"><p className="eyebrow">ACADEMY</p><h2>El conocimiento también se construye acompañado.</h2><button className="primary-button" onClick={onSignIn}>Entrar a mi Academy <ChevronRight size={17} /></button></section>
    </main>
    <footer className="public-footer"><span>Academy by Scalaria</span><span>Plataforma de capacitación multiempresa</span></footer>
  </div>;
}

function HomeView({ firstName, nextSession, sessions, downloads, events, loading, onNavigate, organization }) {
  return <>
    <section className="welcome-panel">
      <div><p className="eyebrow">{organization?.display_name || "ACADEMY"}</p><h1>Hola, {firstName}.</h1><p className="welcome-copy">Aquí encontrarás tus sesiones, talleres, webinars y recursos para tomar mejores decisiones con acompañamiento profesional.</p></div>
      <div className="welcome-orbit"><GraduationCap size={54} strokeWidth={1.2} /><span>Aprender<br />transforma.</span></div>
    </section>
    <section className="section-block"><div className="section-heading"><div><p className="eyebrow">TU PRÓXIMO PASO</p><h2>Continúa aprendiendo</h2></div><button className="text-link" onClick={() => onNavigate("sesiones")}>Ver todas <ChevronRight size={16} /></button></div>{loading ? <div className="loading-card">Cargando tu Academy...</div> : <div className="session-grid"><SessionCard session={nextSession || sessions[0]} featured /></div>}</section>
    <section className="section-block"><div className="section-heading"><div><p className="eyebrow">RECURSOS</p><h2>Para llevar contigo</h2></div><button className="text-link" onClick={() => onNavigate("descargables")}>Ver biblioteca <ChevronRight size={16} /></button></div><div className="download-list compact">{downloads.slice(0, 2).map((download) => <DownloadRow key={download.id} download={download} />)}</div></section>
    <section className="section-block"><div className="section-heading"><div><p className="eyebrow">ENCUENTROS EN VIVO</p><h2>Próximos webinars</h2></div><button className="text-link" onClick={() => onNavigate("eventos")}>Ver eventos <ChevronRight size={16} /></button></div><div className="session-grid">{events.slice(0, 3).map((event) => <EventCard key={event.id} event={event} />)}</div></section>
  </>;
}

function CollectionView({ title, eyebrow, description, icon: Icon, children }) {
  return <section className="collection-view"><div className="collection-header"><span className="collection-icon"><Icon size={24} /></span><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div></div>{children}</section>;
}

function SessionCard({ session, featured }) {
  if (!session) return <EmptyState title="Sin sesiones todavía" text="Cuando tengas una sesión asignada aparecerá aquí." />;
  return <article className={`session-card ${featured ? "featured" : ""} ${session.color || "mint"}`}><div className="session-card-top"><span className="badge">{session.status}</span><span className="session-type">{session.type}</span></div><div className="session-card-body"><h3>{session.title}</h3><p className="session-meta"><CalendarDays size={15} /> {session.date} · {session.time}</p><p className="session-meta"><Users size={15} /> {session.teacher}</p></div><button className="card-action">{session.status === "Disponible" ? "Ver grabación" : "Ver sesión"} <ChevronRight size={16} /></button></article>;
}

function EventCard({ event }) {
  return <article className="event-card"><span className="badge">{event.status || "Próximo"}</span><h3>{event.title}</h3><p>{event.description || "Evento de Academy"}</p><p className="session-meta"><CalendarDays size={15} /> {formatDate(event.start_at)}</p><button className="card-action">Ver evento <ChevronRight size={16} /></button></article>;
}

function DownloadRow({ download }) {
  return <article className="download-row"><span className="download-icon"><BookOpen size={19} /></span><div className="download-info"><strong>{download.title}</strong><span>{download.category} · {download.format}</span></div><button className="download-action" aria-label={`Descargar ${download.title}`}><Download size={17} /></button></article>;
}

function EmptyState({ title, text }) {
  return <div className="empty-state"><PlayCircle size={28} /><h3>{title}</h3><p>{text}</p></div>;
}

function AdminView({ context, sessions, downloads, events }) {
  const organization = context?.organization;
  return <CollectionView title="Administración" eyebrow="ESPACIO DE OPERACIÓN" description="Gestiona el contenido de tu organización desde un solo lugar." icon={Users}>
    <div className="admin-intro"><div><span className="eyebrow">ORGANIZACIÓN ACTIVA</span><h2>{organization?.display_name || organization?.name || "Academy"}</h2><p>Rol: <strong>{context?.user?.role || "administrador"}</strong>. Los permisos se validan en backend por membresía.</p></div><span className="admin-status">{organization?.status === "active" ? "Activa" : "Revisar estado"}</span></div>
    <div className="admin-stats"><AdminStat label="Sesiones" value={sessions.length} /><AdminStat label="Descargables" value={downloads.length} /><AdminStat label="Eventos" value={events.length} /></div>
    <div className="admin-roadmap"><p className="eyebrow">SIGUIENTE BLOQUE</p><h3>Crear y editar contenido</h3><p>La estructura de permisos ya está conectada. El siguiente paso de operación será agregar formularios para publicar sesiones, recursos y webinars desde este panel.</p></div>
  </CollectionView>;
}

function AdminStat({ label, value }) {
  return <div className="admin-stat"><strong>{value}</strong><span>{label}</span></div>;
}
