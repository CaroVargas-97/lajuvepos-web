export function formatMoney(value: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value)
}

export function formatDateTime(value: string): string {
  return new Date(value.replace(' ', 'T') + 'Z').toLocaleString('es-AR')
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}
