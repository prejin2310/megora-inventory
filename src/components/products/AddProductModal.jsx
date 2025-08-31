import React, { useEffect, useMemo, useRef, useState } from "react";
import Button from "../ui/Button";

const SKU_PREFIX = "MJ-0";

export default function AddProductModal({
  open,
  onClose,
  onCreated,
  createProduct,
  products = [],
}) {
  const [name, setName] = useState("");
  const [sku, setSku] = useState(SKU_PREFIX);
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [minStock, setMinStock] = useState("5");
  const [image, setImage] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [imgOk, setImgOk] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const skuRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setName("");
      setSku(SKU_PREFIX);
      setPrice("");
      setStock("");
      setMinStock("5");
      setImage("");
      setCategory("");
      setDescription("");
      setImgOk(null);
      setError("");
      setSaving(false);
    }
  }, [open]);

  const handleSkuChange = (e) => {
    const input = e.target;
    let val = input.value || "";
    if (!val.startsWith(SKU_PREFIX)) {
      val = SKU_PREFIX + val.replace(new RegExp(`^(${SKU_PREFIX})?`), "");
    }
    const suffix = val.slice(SKU_PREFIX.length).replace(/[^A-Za-z0-9-]/g, "");
    const next = SKU_PREFIX + suffix;
    setSku(next);

    requestAnimationFrame(() => {
      if (!skuRef.current) return;
      const pos = Math.max(SKU_PREFIX.length, input.selectionStart || 0);
      skuRef.current.setSelectionRange(pos, pos);
    });
  };

  const handleSkuFocus = (e) => {
    const input = e.target;
    requestAnimationFrame(() => {
      const pos = Math.max(SKU_PREFIX.length, input.selectionStart || 0);
      input.setSelectionRange(pos, pos);
    });
  };

  useEffect(() => {
    if (!image) {
      setImgOk(null);
      return;
    }
    let alive = true;
    const img = new Image();
    img.onload = () => alive && setImgOk(true);
    img.onerror = () => alive && setImgOk(false);
    img.src = image;
    return () => {
      alive = false;
    };
  }, [image]);

  const canSave = useMemo(() => {
    const n = name.trim().length > 0;
    const s = sku.trim().length >= SKU_PREFIX.length;
    const p = !Number.isNaN(Number(price)) && Number(price) >= 0;
    const st = !Number.isNaN(Number(stock)) && Number(stock) >= 0;
    const ms = !Number.isNaN(Number(minStock)) && Number(minStock) >= 0;
    return n && s && p && st && ms && !saving;
  }, [name, sku, price, stock, minStock, saving]);

  const submit = async (e) => {
    e?.preventDefault?.();
    setError("");
    if (!canSave) return;
    setSaving(true);
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
      };
      const created = await createProduct(payload);
      onCreated?.(created);
      onClose?.();
    } catch (e2) {
      console.error("Create product error:", e2);
      setError(e2.message || "Failed to create product");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2 sm:p-4">
      <div className="w-full h-full md:h-auto max-w-3xl flex flex-col rounded-none md:rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-bold text-gray-800">Add Product</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
          >
            ×
          </button>
        </div>

        {/* Form (scrollable body) */}
        <form onSubmit={submit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {products.length > 0 && (
              <div className="col-span-full grid gap-1">
                <label className="text-xs font-medium text-gray-600">
                  Select Existing Product
                </label>
                <select
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-400 focus:ring focus:ring-sky-200"
                  onChange={(e) => {
                    const prod = products.find((p) => p.id === e.target.value);
                    if (!prod) return;
                    setName(prod.name || "");
                    setSku(prod.sku || SKU_PREFIX);
                    setPrice(prod.price != null ? String(prod.price) : "");
                    setCategory(prod.category || "");
                    setDescription(prod.description || "");
                    setImage(prod.image || "");
                  }}
                >
                  <option value="">-- Select a product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.sku ? `(${p.sku})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Fields */}
            <div className="grid gap-1">
              <label className="text-xs font-medium text-gray-600">Name</label>
              <input
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-400 focus:ring focus:ring-sky-200"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Elegant Gold Ring"
                required
              />
            </div>

            <div className="grid gap-1">
              <label className="text-xs font-medium text-gray-600">SKU</label>
              <input
                ref={skuRef}
                value={sku}
                onChange={handleSkuChange}
                onFocus={handleSkuFocus}
                placeholder={`${SKU_PREFIX}XXXX`}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-400 focus:ring focus:ring-sky-200"
                required
              />
              <p className="text-xs text-gray-400">
                Prefix enforced: {SKU_PREFIX}
              </p>
            </div>

            <div className="grid gap-1">
              <label className="text-xs font-medium text-gray-600">Price</label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g., 4999"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-400 focus:ring focus:ring-sky-200"
                required
              />
            </div>

            <div className="grid gap-1">
              <label className="text-xs font-medium text-gray-600">
                Total Stock
              </label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="e.g., 10"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-400 focus:ring focus:ring-sky-200"
                required
              />
            </div>

            <div className="grid gap-1">
              <label className="text-xs font-medium text-gray-600">
                Min Stock (Low stock alert)
              </label>
              <input
                type="number"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                placeholder="Default 5"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-400 focus:ring focus:ring-sky-200"
              />
            </div>

            <div className="grid gap-1">
              <label className="text-xs font-medium text-gray-600">
                Category
              </label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Rings"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-400 focus:ring focus:ring-sky-200"
              />
            </div>

            <div className="col-span-full grid gap-1">
              <label className="text-xs font-medium text-gray-600">
                Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-400 focus:ring focus:ring-sky-200"
              />
            </div>

            <div className="col-span-full grid gap-1">
              <label className="text-xs font-medium text-gray-600">
                Image URL
              </label>
              <input
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://..."
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-400 focus:ring focus:ring-sky-200"
              />

              <div className="mt-2 grid gap-2 md:grid-cols-[1fr_132px]">
                <div
                  className={`text-xs ${
                    imgOk === true
                      ? "text-green-700"
                      : imgOk === false
                      ? "text-red-700"
                      : "text-gray-500"
                  }`}
                >
                  {imgOk === true
                    ? "Valid image ✓"
                    : imgOk === false
                    ? "Invalid URL ✕"
                    : "Enter an image URL"}
                </div>
                <div className="flex h-24 w-32 items-center justify-center overflow-hidden rounded-lg border border-gray-300 bg-gray-50">
                  {image ? (
                    <img
                      src={image}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="text-xs text-gray-400">Preview</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Sticky Footer */}
        <div className="flex justify-end gap-2 border-t bg-white px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!canSave}
            className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-900 disabled:opacity-50"
            onClick={submit}
          >
            {saving ? "Saving…" : "Create"}
          </Button>
        </div>
      </div>
    </div>
  );
}
