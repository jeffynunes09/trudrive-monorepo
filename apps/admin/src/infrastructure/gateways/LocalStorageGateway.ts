import type { IStorageGateway } from '../../application/ports/IStorageGateway'

export class LocalStorageGateway implements IStorageGateway {
  get(key: string): string | null {
    return localStorage.getItem(key)
  }

  set(key: string, value: string): void {
    localStorage.setItem(key, value)
  }

  remove(key: string): void {
    localStorage.removeItem(key)
  }
}
