import { clsx } from 'clsx'

export function cn(...classes: Array<string | false | null | undefined>): string {
  return clsx(classes)
}
