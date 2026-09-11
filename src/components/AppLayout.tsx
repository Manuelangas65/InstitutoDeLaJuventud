import {
  useEffect,
  useState,
  type ReactNode,
} from 'react'

export type Vista =
  | 'inicio'
  | 'nueva_atencion'
  | 'buscar_registros'
  | 'estadisticas'
  | 'documentos'
  | 'historial'
  | 'administracion'
  | 'usuarios'

type Rol =
  | 'administrador'
  | 'servicio_social'

type AppLayoutProps = {
  nombre: string
  rol: Rol
  vista: Vista

  onCambiarVista: (
    vista: Vista
  ) => void

  onCerrarSesion: () => void

  children: ReactNode
}

function AppLayout({
  nombre,
  rol,
  vista,
  onCambiarVista,
  onCerrarSesion,
  children,
}: AppLayoutProps) {
  const [
    menuAbierto,
    setMenuAbierto,
  ] = useState(false)

  const [
    tema,
    setTema,
  ] = useState<
    'light' | 'dark'
  >(() => {
    const guardado =
      localStorage.getItem(
        'tema'
      )

    return guardado ===
      'dark'
      ? 'dark'
      : 'light'
  })

  useEffect(() => {
    document.documentElement
      .setAttribute(
        'data-theme',
        tema
      )

    localStorage.setItem(
      'tema',
      tema
    )
  }, [tema])

  function navegar(
    nuevaVista: Vista
  ) {
    onCambiarVista(
      nuevaVista
    )

    setMenuAbierto(false)
  }

  return (
    <div className="app-shell">
      {/* ================================================ */}
      {/* BOTÓN MÓVIL */}
      {/* ================================================ */}

      <button
        type="button"
        className="mobile-menu-button"
        onClick={() =>
          setMenuAbierto(
            !menuAbierto
          )
        }
      >
        ☰
      </button>

      {/* ================================================ */}
      {/* MENÚ LATERAL */}
      {/* ================================================ */}

      <aside
        className={
          menuAbierto
            ? 'sidebar sidebar-open'
            : 'sidebar'
        }
      >
        <div className="sidebar-brand">
          <div className="brand-icon">
            🌸
          </div>

          <div>
            <strong>
              Instituto de la Juventud
            </strong>

            <span>
              Sistema de
              Atenciones
            </span>
          </div>
        </div>

        <div className="sidebar-user">
          <div className="user-avatar">
            {nombre
              .charAt(0)
              .toUpperCase()}
          </div>

          <div>
            <strong>
              {nombre}
            </strong>

            <span>
              {rol ===
              'administrador'
                ? 'Administrador'
                : 'Servicio social'}
            </span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            type="button"
            className={
              vista ===
              'inicio'
                ? 'nav-item active'
                : 'nav-item'
            }
            onClick={() =>
              navegar(
                'inicio'
              )
            }
          >
            <span>
              🏠
            </span>

            Inicio
          </button>

          <button
            type="button"
            className={
              vista ===
              'nueva_atencion'
                ? 'nav-item active'
                : 'nav-item'
            }
            onClick={() =>
              navegar(
                'nueva_atencion'
              )
            }
          >
            <span>
              ➕
            </span>

            Nueva atención
          </button>

          <button
            type="button"
            className={
              vista ===
              'buscar_registros'
                ? 'nav-item active'
                : 'nav-item'
            }
            onClick={() =>
              navegar(
                'buscar_registros'
              )
            }
          >
            <span>
              🔎
            </span>

            Registros
          </button>

          <button
            type="button"
            className={
              vista ===
              'documentos'
                ? 'nav-item active'
                : 'nav-item'
            }
            onClick={() =>
              navegar(
                'documentos'
              )
            }
          >
            <span>
              📁
            </span>

            Documentos
          </button>

          {rol ===
            'administrador' && (
            <>
              <div className="nav-section-title">
                Administración
              </div>

              <button
                type="button"
                className={
                  vista ===
                  'estadisticas'
                    ? 'nav-item active'
                    : 'nav-item'
                }
                onClick={() =>
                  navegar(
                    'estadisticas'
                  )
                }
              >
                <span>
                  📊
                </span>

                Estadísticas
              </button>

              <button
                type="button"
                className={
                  vista ===
                  'historial'
                    ? 'nav-item active'
                    : 'nav-item'
                }
                onClick={() =>
                  navegar(
                    'historial'
                  )
                }
              >
                <span>
                  🕘
                </span>

                Historial
              </button>

              <button
                type="button"
                className={
                  vista ===
                  'administracion'
                    ? 'nav-item active'
                    : 'nav-item'
                }
                onClick={() =>
                  navegar(
                    'administracion'
                  )
                }
              >
                <span>
                  ⚙️
                </span>

                Catálogos
              </button>

              <button
                type="button"
                className={
                  vista ===
                  'usuarios'
                    ? 'nav-item active'
                    : 'nav-item'
                }
                onClick={() =>
                  navegar(
                    'usuarios'
                  )
                }
              >
                <span>
                  👥
                </span>

                Usuarios
              </button>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <button
            type="button"
            className="nav-item"
            onClick={() =>
              setTema(
                tema ===
                'light'
                  ? 'dark'
                  : 'light'
              )
            }
          >
            <span>
              {tema ===
              'light'
                ? '🌙'
                : '☀️'}
            </span>

            {tema ===
            'light'
              ? 'Modo oscuro'
              : 'Modo claro'}
          </button>

          <button
            type="button"
            className="nav-item logout-button"
            onClick={
              onCerrarSesion
            }
          >
            <span>
              ↪
            </span>

            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ================================================ */}
      {/* FONDO MÓVIL */}
      {/* ================================================ */}

      {menuAbierto && (
        <button
          type="button"
          className="sidebar-overlay"
          onClick={() =>
            setMenuAbierto(
              false
            )
          }
          aria-label="Cerrar menú"
        />
      )}

      {/* ================================================ */}
      {/* CONTENIDO */}
      {/* ================================================ */}

      <main className="app-content">
        {children}
      </main>
    </div>
  )
}

export default AppLayout