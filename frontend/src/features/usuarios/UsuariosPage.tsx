import { useEffect, useState, type FormEvent } from 'react'
import type { Usuario } from '../../lib/types'
import { api } from '../../lib/api'

export function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [form, setForm] = useState({ nombre: '', pin: '', rol: 'vendedor' as 'admin' | 'vendedor' })
  const [error, setError] = useState<string | null>(null)
  const [pinEdit, setPinEdit] = useState<{ id: number; pin: string } | null>(null)
  const [backupMensaje, setBackupMensaje] = useState<string | null>(null)

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
    <div className="panel">
      <h2>Usuarios</h2>

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

      <div className="cierre-resultado">
        <h3>Copia de seguridad</h3>
        <p className="ayuda">
          Descarga un archivo con toda la información (ventas, stock, clientes, caja) para guardar donde quieras —
          Google Drive, el escritorio, etc. Como los datos ya están en la nube (Supabase) esto es un respaldo extra,
          no imprescindible, pero conviene hacerlo cada tanto.
        </p>
        <button className="primary" onClick={hacerBackup}>
          Guardar copia de seguridad
        </button>
        {backupMensaje && <p className="mensaje">{backupMensaje}</p>}
      </div>

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
