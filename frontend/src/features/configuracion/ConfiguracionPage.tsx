import { useEffect, useState, type FormEvent } from 'react'
import type { Usuario, MotivoCaja } from '../../lib/types'
import { api } from '../../lib/api'

function TabUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [form, setForm] = useState({ nombre: '', pin: '', rol: 'vendedor' as 'admin' | 'vendedor' })
  const [error, setError] = useState<string | null>(null)
  const [pinEdit, setPinEdit] = useState<{ id: number; pin: string } | null>(null)

  async function cargar() {
    setUsuarios(await api.auth.listarUsuarios())
  }

  useEffect(() => {
    cargar()
  }, [])

  async function crearUsuario(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.nombre.trim() || !/^\d{4}$/.test(form.pin)) {
      setError('Completá el nombre y un PIN de 4 dígitos')
      return
    }
    const res = await api.auth.crearUsuario(form)
    if (!res.ok) {
      setError(res.error ?? 'No se pudo crear el usuario')
      return
    }
    setForm({ nombre: '', pin: '', rol: 'vendedor' })
    cargar()
  }

  async function guardarPin() {
    if (!pinEdit) return
    if (!/^\d{4}$/.test(pinEdit.pin)) {
      setError('El PIN debe tener 4 dígitos')
      return
    }
    const res = await api.auth.cambiarPin(pinEdit.id, pinEdit.pin)
    if (!res.ok) {
      setError(res.error ?? 'No se pudo cambiar el PIN')
      return
    }
    setPinEdit(null)
    setError(null)
  }

  async function toggleActivo(u: Usuario) {
    await api.auth.setActivo(u.id, !u.activo)
    cargar()
  }

  return (
    <div>
      <form className="form-inline" onSubmit={crearUsuario}>
        <input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        <input
          placeholder="PIN (4 dígitos)"
          maxLength={4}
          inputMode="numeric"
          value={form.pin}
          onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
        />
        <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value as 'admin' | 'vendedor' })}>
          <option value="vendedor">Vendedor/a</option>
          <option value="admin">Administrador</option>
        </select>
        <button className="primary" type="submit">
          Crear usuario
        </button>
      </form>
      {error && <p className="error">{error}</p>}

      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Rol</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u) => (
            <tr key={u.id}>
              <td>{u.nombre}</td>
              <td>{u.rol}</td>
              <td>{u.activo ? 'Activo' : 'Inactivo'}</td>
              <td>
                <button className="link" onClick={() => setPinEdit({ id: u.id, pin: '' })}>
                  cambiar PIN
                </button>{' '}
                <button className="link" onClick={() => toggleActivo(u)}>
                  {u.activo ? 'desactivar' : 'activar'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {pinEdit && (
        <div className="modal">
          <div className="modal-content">
            <h3>Cambiar PIN</h3>
            <label>
              Nuevo PIN (4 dígitos)
              <input
                maxLength={4}
                inputMode="numeric"
                value={pinEdit.pin}
                onChange={(e) => setPinEdit({ ...pinEdit, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
              />
            </label>
            <div className="modal-actions">
              <button onClick={() => setPinEdit(null)}>Cancelar</button>
              <button className="primary" onClick={guardarPin}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TabMotivosCaja() {
  const [motivos, setMotivos] = useState<MotivoCaja[]>([])
  const [form, setForm] = useState({ nombre: '', tipo: 'egreso' as 'ingreso' | 'egreso' })
  const [error, setError] = useState<string | null>(null)

  async function cargar() {
    setMotivos(await api.motivosCaja.listar(false))
  }

  useEffect(() => {
    cargar()
  }, [])

  async function crearMotivo(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    const res = await api.motivosCaja.crear(form)
    if (!res.ok) {
      setError(res.error ?? 'No se pudo crear el motivo')
      return
    }
    setForm({ nombre: '', tipo: 'egreso' })
    cargar()
  }

  async function toggleActivo(m: MotivoCaja) {
    await api.motivosCaja.setActivo(m.id, !m.activo)
    cargar()
  }

  const ingresos = motivos.filter((m) => m.tipo === 'ingreso')
  const egresos = motivos.filter((m) => m.tipo === 'egreso')

  return (
    <div>
      <p className="ayuda">
        Son las opciones que aparecen al registrar un ingreso o egreso en Caja (ej. "Pago a proveedor", "Retiro de efectivo").
      </p>

      <form className="form-inline" onSubmit={crearMotivo}>
        <input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as 'ingreso' | 'egreso' })}>
          <option value="egreso">Egreso</option>
          <option value="ingreso">Ingreso</option>
        </select>
        <button className="primary" type="submit">
          Agregar motivo
        </button>
      </form>
      {error && <p className="error">{error}</p>}

      <div className="ventas-layout">
        <div className="panel">
          <h3>Ingresos</h3>
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ingresos.map((m) => (
                <tr key={m.id}>
                  <td>{m.nombre}</td>
                  <td>{m.activo ? 'Activo' : 'Inactivo'}</td>
                  <td>
                    <button className="link" onClick={() => toggleActivo(m)}>
                      {m.activo ? 'desactivar' : 'activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <h3>Egresos</h3>
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {egresos.map((m) => (
                <tr key={m.id}>
                  <td>{m.nombre}</td>
                  <td>{m.activo ? 'Activo' : 'Inactivo'}</td>
                  <td>
                    <button className="link" onClick={() => toggleActivo(m)}>
                      {m.activo ? 'desactivar' : 'activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function TabBackup() {
  const [backupMensaje, setBackupMensaje] = useState<string | null>(null)

  async function hacerBackup() {
    setBackupMensaje(null)
    const res = await api.sistema.exportarBackup()
    if (!res.ok) {
      if (res.error !== 'Cancelado') setBackupMensaje(res.error ?? 'No se pudo guardar la copia de seguridad')
      return
    }
    setBackupMensaje('Copia de seguridad descargada.')
  }

  return (
    <div>
      <p className="ayuda">
        Descarga un archivo con toda la información (ventas, stock, clientes, caja) para guardar donde quieras — Google
        Drive, el escritorio, etc. Como los datos ya están en la nube (Supabase) esto es un respaldo extra, no
        imprescindible, pero conviene hacerlo cada tanto.
      </p>
      <button className="primary" onClick={hacerBackup}>
        Guardar copia de seguridad
      </button>
      {backupMensaje && <p className="mensaje">{backupMensaje}</p>}
    </div>
  )
}

export function ConfiguracionPage() {
  const [tab, setTab] = useState<'usuarios' | 'motivos' | 'backup'>('usuarios')

  return (
    <div className="panel">
      <h2>Configuración</h2>

      <div className="caja-tabs">
        <button className={tab === 'usuarios' ? 'primary' : ''} onClick={() => setTab('usuarios')}>
          Usuarios
        </button>
        <button className={tab === 'motivos' ? 'primary' : ''} onClick={() => setTab('motivos')}>
          Motivos de caja
        </button>
        <button className={tab === 'backup' ? 'primary' : ''} onClick={() => setTab('backup')}>
          Copia de seguridad
        </button>
      </div>

      <div className="caja-tab-panel">
        {tab === 'usuarios' && <TabUsuarios />}
        {tab === 'motivos' && <TabMotivosCaja />}
        {tab === 'backup' && <TabBackup />}
      </div>
    </div>
  )
}
