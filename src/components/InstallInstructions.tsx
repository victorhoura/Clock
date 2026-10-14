import type { ReactNode } from 'react'
import { EllipsisVertical, Share, SquarePlus } from 'lucide-react'
import type { InstallMode } from '../hooks/useInstallPrompt'
import { Modal, ModalActions } from './ui/Modal'
import { Button } from './ui/Button'

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
        {n}
      </span>
      <span className="pt-0.5 text-sm text-slate-600 dark:text-slate-300">{children}</span>
    </li>
  )
}

/** How to add the app to the home screen where the browser has no install button. */
export function InstallInstructions({ mode, onClose }: { mode: InstallMode; onClose: () => void }) {
  return (
    <Modal
      open
      onClose={onClose}
      title="Instalar na tela de início"
      description="O app abre em tela cheia, como um aplicativo, direto do ícone."
    >
      {mode === 'ios' ? (
        <ol className="flex flex-col gap-4">
          <Step n={1}>
            Abra este site no <strong>Safari</strong> e toque em <strong>Compartilhar</strong>{' '}
            <Share size={15} className="inline -translate-y-0.5 text-indigo-500" /> na barra do navegador.
          </Step>
          <Step n={2}>
            Role a lista e toque em <strong>Adicionar à Tela de Início</strong>{' '}
            <SquarePlus size={15} className="inline -translate-y-0.5 text-indigo-500" />.
          </Step>
          <Step n={3}>
            Toque em <strong>Adicionar</strong>. O ícone do Plantão Digital aparece na sua tela de início.
          </Step>
        </ol>
      ) : (
        <ol className="flex flex-col gap-4">
          <Step n={1}>
            Toque no menu do navegador <EllipsisVertical size={15} className="inline -translate-y-0.5 text-indigo-500" />{' '}
            (os três pontinhos).
          </Step>
          <Step n={2}>
            Escolha <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.
          </Step>
          <Step n={3}>Confirme. O ícone do Plantão Digital aparece na sua tela de início.</Step>
        </ol>
      )}
      <ModalActions>
        <Button onClick={onClose}>Entendi</Button>
      </ModalActions>
    </Modal>
  )
}

