import { DomainError } from './DomainError'

export class NotFoundError extends DomainError {
  constructor(resource: string, id?: string) {
    super(id ? `${resource} '${id}' não encontrado.` : `${resource} não encontrado.`)
    this.name = 'NotFoundError'
  }
}
