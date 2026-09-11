import { formatDateTime, formatMoney } from '../../lib/format'

interface NotaCredito {
  id: number
  cliente_nombre: string
  producto_nombre: string | null
  monto: number
  motivo: string
  fecha: string
  venta_id: number | null
}

export function NotaCreditoImprimible({ nota, onClose }: { nota: NotaCredito; onClose: () => void }) {
  return (
    <div className="modal">
      <div className="modal-content comprobante-modal">
        <div className="comprobante-acciones">
          <button onClick={onClose}>Cerrar</button>
          <button className="primary" onClick={() => window.print()}>
            Imprimir / Exportar PDF
          </button>
        </div>

        <div className="comprobante imprimible">
          <header className="comprobante-header">
            <h2>LaJuvePOS</h2>
            <h3>Nota de crédito #{nota.id}</h3>
            <p>{formatDateTime(nota.fecha)}</p>
          </header>

          <section>
            <table className="detalle-venta">
              <tbody>
                <tr>
                  <td>Cliente</td>
                  <td>{nota.cliente_nombre}</td>
                </tr>
                {nota.producto_nombre && (
                  <tr>
                    <td>Producto</td>
                    <td>{nota.producto_nombre}</td>
                  </tr>
                )}
                <tr>
                  <td>Monto</td>
                  <td>{formatMoney(nota.monto)}</td>
                </tr>
                <tr>
                  <td>Motivo</td>
                  <td>{nota.motivo || '-'}</td>
                </tr>
                {nota.venta_id && (
                  <tr>
                    <td>Venta asociada</td>
                    <td>#{nota.venta_id}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          <p className="ayuda">Este monto queda disponible como saldo a favor en la cuenta corriente del cliente.</p>
        </div>
      </div>
    </div>
  )
}
