# imageResize.ts

Redimensiona una imagen en el cliente usando el API de Canvas del navegador antes de enviarla al servidor. Produce un Blob JPEG de tamaño acotado (~50-150 KB) sin dependencias externas.

- **Source:** [src/utils/imageResize.ts](../../../src/utils/imageResize.ts)

## Exports públicos

### `resizeImageFile(file, maxDim?, quality?): Promise<Blob>`

Redimensiona un `File` de imagen manteniendo la proporción y lo convierte a JPEG.

```ts
async function resizeImageFile(
  file: File,
  maxDim = 512,
  quality = 0.85,
): Promise<Blob>
```

**Algoritmo:**

1. Lee el `File` como data-URL con `FileReader.readAsDataURL`.
2. Crea un `HTMLImageElement` y carga el data-URL.
3. Calcula el factor de escala: `scale = min(1, maxDim / max(img.width, img.height))`. Si la imagen cabe dentro de `maxDim × maxDim`, se usa a escala 1 (sin ampliar).
4. Crea un `<canvas>` de las dimensiones resultantes, rellena fondo blanco (`#ffffff`) y dibuja la imagen escalada. El fondo blanco aplana la transparencia de PNGs (los avatares se muestran en recorte circular vía CSS, así que no se aprecia).
5. Serializa el canvas a `image/jpeg` con `quality = 0.85` mediante `canvas.toBlob()`.

**Casos de borde:**

- Si `FileReader` falla → `reject(new Error('No se pudo leer el archivo.'))`.
- Si la imagen no se puede parsear → `reject(new Error('El archivo no es una imagen válida.'))`.
- Si `canvas.getContext('2d')` retorna `null` (navegador sin soporte de canvas 2D) → `throw new Error('Tu navegador no soporta el procesamiento de imágenes.')`.
- Si `canvas.toBlob` retorna `null` → `reject(new Error('No se pudo procesar la imagen.'))`.
- Dimensión mínima garantizada: `Math.max(1, Math.round(...))` para evitar canvas de 0×0.

**Restricción:** sólo se puede llamar desde el cliente (usa `document`, `FileReader`, `Image`, `canvas`). No importar en código server-side ni en endpoints.

## Quién lo usa

- [CuentaSection](../secciones/cuenta.md) — `ProfileBlock.onFile` antes de `POST /api/me/avatar`.
- [AdminUserSection](../secciones/admin.md) — `ProfileCard.onAvatarFile` antes de `POST /api/admin/avatar`.

## Detalles no obvios

- El resultado siempre es `image/jpeg`, independientemente del formato de entrada (PNG, WebP, JPEG). Se eligió JPEG porque los avatares se recortan en círculo (transparencia irrelevante) y la compresión JPEG es suficiente a calidad 0.85.
- `maxDim = 512` produce imágenes de máximo 512×512 px. Con calidad 0.85 el resultado típico es 30-100 KB, muy por debajo del límite `MAX_AVATAR_BYTES = 2 MB` validado en el servidor.
- La validación de tipo real ocurre en el servidor ([src/lib/avatarBlob.ts](../../../src/lib/avatarBlob.ts)) mediante firma binaria (magic bytes), no en este módulo. Este módulo no valida el formato de entrada; si se pasa un archivo no-imagen, el rechazo llega al paso de carga del `HTMLImageElement`.
