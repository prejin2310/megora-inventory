import React, { useEffect, useMemo, useRef, useState } from 'react'
import Button from '../ui/Button'

const SKU_PREFIX = 'MJ-0'

export default function AddProductModal({ open, onClose, onCreated, createProduct }) {
  const [name, setName] = useState('')
  const [sku, setSku] = useState(SKU_PREFIX)
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [minStock, setMinStock] = useState('5')
  const [image, setImage] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [imgOk, setImgOk] = useState(null) // null=unknown, true=ok, false=bad
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const skuRef = useRef(null)

  useEffect(() => {
    if (!open) {
      setName('')
      setSku(SKU_PREFIX)
      setPrice('')
      setStock('')
      setMinStock('5')
      setImage('')
      setCategory('')
      setDescription('')
      setImgOk(null)
      setError('')
      setSaving(false)
    }
  }, [open])

  // Enforce SKU prefix and allow only suffix editing
  const handleSkuChange = (e) => {
    const input = e.target
    let val = input.value || ''
    if (!val.startsWith(SKU_PREFIX)) {
      // Force insert prefix
      val = SKU_PREFIX + val.replace(new RegExp(`^(${SKU_PREFIX})?`), '')
    }
    // Optionally restrict suffix to alphanumerics and dashes
    const suffix = val.slice(SKU_PREFIX.length).replace(/[^A-Za-z0-9-]/g, '')
    const next = SKU_PREFIX + suffix
    setSku(next)

    // Maintain caret position after prefix if user tries to place it inside prefix
    requestAnimationFrame(() => {
      if (!skuRef.current) return
      const pos = Math.max(SKU_PREFIX.length, input.selectionStart || 0)
      skuRef.current.setSelectionRange(pos, pos)
    })
  }

  const handleSkuFocus = (e) => {
    // Place caret at end if it lands within prefix
    const input = e.target
    requestAnimationFrame(() => {
      const pos = Math.max(SKU_PREFIX.length, input.selectionStart || 0)
      input.setSelectionRange(pos, pos)
    })
  }

  // Validate image URL by trying to load it
  useEffect(() => {
    if (!image) { setImgOk(null); return }
    let alive = true
    const img = new Image()
    img.onload = () => alive && setImgOk(true)
    img.onerror = () => alive && setImgOk(false)
    img.src = image
    return () => { alive = false }
  }, [image])

  const canSave = useMemo(() => {
    const n = name.trim().length > 0
    const s = sku.trim().length >= SKU_PREFIX.length // at least prefix
    const p = !Number.isNaN(Number(price)) && Number(price) >= 0
    const st = !Number.isNaN(Number(stock)) && Number(stock) >= 0
    const ms = !Number.isNaN(Number(minStock)) && Number(minStock) >= 0
    return n && s && p && st && ms && !saving
  }, [name, sku, price, stock, minStock, saving])

  const submit = async (e) => {
    e?.preventDefault?.()
    setError('')
    if (!canSave) return
    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        sku: sku.trim(),
        price: Number(price),
        stock: Number(stock),
        minStock: Number(minStock),
        image: image.trim(),
        category: category.trim(),
        description: description.trim(),
        createdAt: new Date().toISOString(),
      }
      const created = await createProduct(payload)
      onCreated?.(created)
      onClose?.()
    } catch (e2) {
      console.error('Create product error:', e2)
      setError(e2.message || 'Failed to create product')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="apm-backdrop" role="dialog" aria-modal="true">
      <div className="apm-modal">
        <div className="apm-head">
          <div className="apm-title">Add Product</div>
          <button className="apm-x" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form className="apm-body" onSubmit={submit}>
          {error && <div className="apm-error">{error}</div>}

          <div className="apm-grid">
            <div className="apm-field">
              <label>Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Elegant Gold Ring" required />
            </div>

            <div className="apm-field">
              <label>SKU</label>
              <input
                ref={skuRef}
                value={sku}
                onChange={handleSkuChange}
                onFocus={handleSkuFocus}
                placeholder={`${SKU_PREFIX}XXXX`}
                required
              />
              <div className="apm-help">Prefix enforced: {SKU_PREFIX} (only suffix is editable)</div>
            </div>

            <div className="apm-field">
              <label>Price</label>
              <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g., 4999" required />
            </div>

            <div className="apm-field">
              <label>Stock</label>
              <input type="number" value={stock} onChange={e => setStock(e.target.value)} placeholder="e.g., 10" required />
            </div>

            <div className="apm-field">
              <label>Min Stock</label>
              <input type="number" value={minStock} onChange={e => setMinStock(e.target.value)} placeholder="Default 5" />
            </div>

            <div className="apm-field">
              <label>Category</label>
              <input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g., Rings" />
            </div>

            <div className="apm-field apm-col-span">
              <label>Description</label>
              <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description" />
            </div>

            <div className="apm-field apm-col-span">
              <label>Image URL</label>
              <input
                value={image}
                onChange={e => setImage(e.target.value)}
                placeholder="https://..."
              />
              <div className="apm-preview">
                <div className={`apm-status ${imgOk === true ? 'ok' : imgOk === false ? 'bad' : ''}`}>
                  {imgOk === true ? 'Valid image ✓' : imgOk === false ? 'Invalid URL ✕' : 'Enter an image URL'}
                </div>
                <div className="apm-thumb">
                  {image ? <img src={image} alt="Preview" /> : <div className="apm-ph">Preview</div>}
                </div>
              </div>
            </div>
          </div>

          <div className="apm-foot">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!canSave}>{saving ? 'Saving…' : 'Create'}</Button>
          </div>
        </form>

        <style>{`
          .apm-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,.45); display: grid; place-items: center; z-index: 50; padding: 16px; }
          .apm-modal { width: min(760px, 96vw); background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 24px 64px rgba(0,0,0,.18); overflow: hidden; }
          .apm-head { display: flex; align-items: center; gap: 8px; padding: 12px; border-bottom: 1px solid #eef0f2; }
          .apm-title { font-weight: 800; }
          .apm-x { margin-left: auto; width: 28px; height: 28px; border: 1px solid #e2e8f0; background: #f1f5f9; border-radius: 8px; cursor: pointer; }

          .apm-body { padding: 12px; display: grid; gap: 12px; }
          .apm-grid { display: grid; gap: 12px; grid-template-columns: 1fr 1fr; }
          .apm-field { display: grid; gap: 4px; }
          .apm-field label { font-size: 12px; color: #6b7280; }
          .apm-field input, .apm-field textarea { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; font-size: 14px; outline: none; }
          .apm-field input:focus, .apm-field textarea:focus { border-color: #94a3b8; box-shadow: 0 0 0 3px rgba(14,165,233,.12); }
          .apm-col-span { grid-column: 1 / -1; }
          .apm-help { font-size: 12px; color: #9ca3af; }

          .apm-preview { display: grid; gap: 8px; grid-template-columns: 1fr 132px; align-items: start; }
          .apm-status { font-size: 12px; color: #6b7280; }
          .apm-status.ok { color: #065f46; }
          .apm-status.bad { color: #991b1b; }
          .apm-thumb { width: 132px; height: 88px; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; background: #fafafa; display: grid; place-items: center; }
          .apm-thumb img { width: 100%; height: 100%; object-fit: cover; }
          .apm-ph { color: #9ca3af; font-size: 12px; }

          .apm-foot { display: flex; justify-content: flex-end; gap: 8px; padding-top: 4px; }
          @media (max-width: 720px) { .apm-grid { grid-template-columns: 1fr; } .apm-preview { grid-template-columns: 1fr; } }
          .apm-error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; padding: 10px 12px; border-radius: 10px; }
        `}</style>
      </div>
    </div>
  )
}
