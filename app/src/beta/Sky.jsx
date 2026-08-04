// beta/Sky.jsx — the field, mounted once, under everything.
//
// The beta's counterpart to production's GalaxyCanvas: the same lifecycle, the
// same props, the same imperative handle passed back through `onReady`, so the
// screens drive the sky with production's vocabulary — setMode, setSeals,
// focusStar, clearFocus, launch, onSendoffDone.

import { useEffect, useRef } from 'react'
import { BinderyField } from './sky.js'
import { C } from './tokens.js'

export function Sky({ mode = 'idle', dim = 1, origin, seals = 0, sealLabels, sealKinds, onReady, style }) {
  const ref = useRef(null)
  const field = useRef(null)

  useEffect(() => {
    const f = new BinderyField(ref.current, {})
    field.current = f
    f.setMode(mode, { dim, origin })
    if (seals) f.setSeals(seals)
    if (sealLabels) f.setSealLabels(sealLabels)
    if (sealKinds) f.setSealKinds(sealKinds)
    f.start()
    if (onReady) onReady(f)
    if (import.meta.env.DEV) window.__betaField = f
    let ro
    let roRaf = 0
    if (window.ResizeObserver && ref.current && ref.current.parentElement) {
      ro = new ResizeObserver(() => {
        if (roRaf) cancelAnimationFrame(roRaf)
        roRaf = requestAnimationFrame(() => f.resize())
      })
      ro.observe(ref.current.parentElement)
    }
    const r1 = requestAnimationFrame(() => f.resize())
    return () => {
      if (ro) ro.disconnect()
      if (roRaf) cancelAnimationFrame(roRaf)
      cancelAnimationFrame(r1)
      f.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (field.current) field.current.setMode(mode, { dim, origin })
  }, [mode, dim, origin])
  useEffect(() => {
    if (field.current) field.current.setSeals(seals)
  }, [seals])
  useEffect(() => {
    if (field.current) field.current.setSealLabels(sealLabels || [])
  }, [sealLabels])
  useEffect(() => {
    if (field.current) field.current.setSealKinds(sealKinds || [])
  }, [sealKinds])

  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', display: 'block', background: C.void, zIndex: 0, ...style }}
    />
  )
}
