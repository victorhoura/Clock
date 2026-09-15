import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

const HOLD_MS = 170 // how long a finger stays put before it counts as a drag
const MOVE_THRESHOLD = 6 // px a mouse travels before it counts as a drag
const EDGE_ZONE = 76 // distance from the viewport edge that auto-scrolls
const EDGE_SPEED = 16

interface DragState {
  id: string
  x: number
  y: number
  column: string | null
}

function columnAt(x: number, y: number): string | null {
  return document.elementFromPoint(x, y)?.closest('[data-column]')?.getAttribute('data-column') ?? null
}

/**
 * Drag cards between columns with either a finger or a mouse.
 *
 * The HTML5 drag events this replaces never fire on touch screens, so the board
 * could not be reordered at all on a phone. Pointer events cover mouse, touch
 * and pen alike: a touch starts dragging after a short hold — so an ordinary
 * swipe still scrolls the page — and a mouse after a few pixels of travel.
 *
 * Give each column an element with `data-column="<id>"`, spread `cardProps(id)`
 * onto each card, and drop is reported through `onDrop`.
 */
export function useDragToColumn(onDrop: (id: string, column: string) => void) {
  const [drag, setDrag] = useState<DragState | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const pending = useRef<{ id: string; x: number; y: number; touch: boolean } | null>(null)
  const holdTimer = useRef<number | null>(null)
  const scrollSpeed = useRef(0)

  const update = (next: DragState | null) => {
    dragRef.current = next
    setDrag(next)
  }

  const cancelHold = () => {
    if (holdTimer.current !== null) window.clearTimeout(holdTimer.current)
    holdTimer.current = null
  }

  const end = useCallback(
    (commit: boolean) => {
      cancelHold()
      const active = dragRef.current
      pending.current = null
      scrollSpeed.current = 0
      update(null)
      if (commit && active && active.column) onDrop(active.id, active.column)
    },
    [onDrop],
  )

  // Listening on the document keeps the gesture alive once the pointer leaves
  // the card it started on, which it always does on the way to another column.
  useEffect(() => {
    function handleMove(e: PointerEvent) {
      const waiting = pending.current
      if (waiting && !dragRef.current) {
        const moved = Math.hypot(e.clientX - waiting.x, e.clientY - waiting.y) > MOVE_THRESHOLD
        // A finger that moves before the hold elapses is scrolling, not dragging.
        if (waiting.touch) {
          if (moved) {
            cancelHold()
            pending.current = null
          }
          return
        }
        if (!moved) return
        update({ id: waiting.id, x: e.clientX, y: e.clientY, column: columnAt(e.clientX, e.clientY) })
        return
      }

      const active = dragRef.current
      if (!active) return
      update({ ...active, x: e.clientX, y: e.clientY, column: columnAt(e.clientX, e.clientY) })
      if (e.clientY < EDGE_ZONE) scrollSpeed.current = -EDGE_SPEED
      else if (e.clientY > window.innerHeight - EDGE_ZONE) scrollSpeed.current = EDGE_SPEED
      else scrollSpeed.current = 0
    }

    function handleUp() {
      if (dragRef.current) {
        end(true)
      } else {
        cancelHold()
        pending.current = null
      }
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') end(false)
    }

    function stopWhileDragging(e: Event) {
      if (dragRef.current) e.preventDefault()
    }

    document.addEventListener('pointermove', handleMove)
    document.addEventListener('pointerup', handleUp)
    document.addEventListener('pointercancel', () => end(false))
    document.addEventListener('keydown', handleKey)
    // Passive listeners cannot cancel a scroll, and the page scrolling out from
    // under a card in progress is exactly what has to be stopped here.
    document.addEventListener('touchmove', stopWhileDragging, { passive: false })
    document.addEventListener('contextmenu', stopWhileDragging)

    return () => {
      document.removeEventListener('pointermove', handleMove)
      document.removeEventListener('pointerup', handleUp)
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('touchmove', stopWhileDragging)
      document.removeEventListener('contextmenu', stopWhileDragging)
      cancelHold()
    }
  }, [end])

  // Auto-scroll while the pointer rests near the top or bottom of the screen,
  // so a card can reach a column that is off screen on a phone.
  const isDragging = drag !== null
  useEffect(() => {
    if (!isDragging) return
    let frame = 0
    const step = () => {
      const active = dragRef.current
      if (active && scrollSpeed.current !== 0) {
        window.scrollBy(0, scrollSpeed.current)
        update({ ...active, column: columnAt(active.x, active.y) })
      }
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [isDragging])

  const cardProps = useCallback(
    (id: string) => ({
      onPointerDown: (e: ReactPointerEvent) => {
        const touch = e.pointerType !== 'mouse'
        if (!touch && e.button !== 0) return
        // Leave the card's own buttons (edit, delete) alone.
        if ((e.target as HTMLElement).closest('button')) return

        const { clientX, clientY } = e
        pending.current = { id, x: clientX, y: clientY, touch }
        if (!touch) return
        cancelHold()
        holdTimer.current = window.setTimeout(() => {
          holdTimer.current = null
          if (pending.current?.id === id) {
            update({ id, x: clientX, y: clientY, column: columnAt(clientX, clientY) })
          }
        }, HOLD_MS)
      },
    }),
    [],
  )

  return {
    draggingId: drag?.id ?? null,
    overColumn: drag?.column ?? null,
    dragPosition: drag ? { x: drag.x, y: drag.y } : null,
    cardProps,
  }
}
