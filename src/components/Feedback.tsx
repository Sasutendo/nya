import { AlertCircle, LoaderCircle } from 'lucide-react'

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return <div className="feedback-state" role="status"><LoaderCircle className="spin" size={24} /><span>{label}</span></div>
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return <div className="empty-state"><span className="empty-icon" aria-hidden="true">N</span><h2>{title}</h2><p>{message}</p></div>
}

export function ErrorNotice({ message }: { message: string }) {
  return <div className="notice notice-error" role="alert"><AlertCircle size={18} /><span>{message}</span></div>
}
