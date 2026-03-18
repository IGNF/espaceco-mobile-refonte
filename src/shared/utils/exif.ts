/**
 * Minimal JPEG EXIF reader used by direct contribution document rules.
 * It lets 'dateFile()' prefer the original photo capture date over the browser file timestamp.
 */
function isJpegFile(file: File): boolean {
  const normalizedMimeType = file.type.toLowerCase()
  const normalizedName = file.name.toLowerCase()

  return (
    normalizedMimeType === 'image/jpeg' ||
    normalizedMimeType === 'image/jpg' ||
    normalizedName.endsWith('.jpg') ||
    normalizedName.endsWith('.jpeg')
  )
}

function getUint16(view: DataView, offset: number, littleEndian: boolean): number {
  return view.getUint16(offset, littleEndian)
}

function getUint32(view: DataView, offset: number, littleEndian: boolean): number {
  return view.getUint32(offset, littleEndian)
}

function readExifAsciiValue(
  view: DataView,
  tiffStartOffset: number,
  valueOffset: number,
  valueCount: number
): string | null {
  const startOffset = tiffStartOffset + valueOffset
  const endOffset = startOffset + valueCount

  if (startOffset < 0 || endOffset > view.byteLength) {
    return null
  }

  const bytes = new Uint8Array(view.buffer, view.byteOffset + startOffset, valueCount)
  const value = new TextDecoder().decode(bytes).replace(/\0+$/, '').trim()

  return value.length > 0 ? value : null
}

function getExifIfdOffset(
  view: DataView,
  tiffStartOffset: number,
  ifdOffset: number,
  littleEndian: boolean
): number | null {
  const entryCountOffset = tiffStartOffset + ifdOffset
  if (entryCountOffset + 2 > view.byteLength) {
    return null
  }

  const entryCount = getUint16(view, entryCountOffset, littleEndian)

  for (let index = 0; index < entryCount; index += 1) {
    const entryOffset = entryCountOffset + 2 + index * 12
    if (entryOffset + 12 > view.byteLength) {
      return null
    }

    const tag = getUint16(view, entryOffset, littleEndian)
    if (tag === 0x8769) {
      return getUint32(view, entryOffset + 8, littleEndian)
    }
  }

  return null
}

function getExifDateString(
  view: DataView,
  tiffStartOffset: number,
  exifIfdOffset: number,
  littleEndian: boolean
): string | null {
  const entryCountOffset = tiffStartOffset + exifIfdOffset
  if (entryCountOffset + 2 > view.byteLength) {
    return null
  }

  const entryCount = getUint16(view, entryCountOffset, littleEndian)

  for (let index = 0; index < entryCount; index += 1) {
    const entryOffset = entryCountOffset + 2 + index * 12
    if (entryOffset + 12 > view.byteLength) {
      return null
    }

    const tag = getUint16(view, entryOffset, littleEndian)
    if (tag !== 0x9003 && tag !== 0x0132) {
      continue
    }

    const type = getUint16(view, entryOffset + 2, littleEndian)
    const count = getUint32(view, entryOffset + 4, littleEndian)
    if (type !== 2 || count === 0) {
      continue
    }

    const valueOffset = getUint32(view, entryOffset + 8, littleEndian)
    return readExifAsciiValue(view, tiffStartOffset, valueOffset, count)
  }

  return null
}

function parseExifDateString(value: string): Date | null {
  const match = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(value)
  if (!match) {
    return null
  }

  const normalizedValue = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}`
  const date = new Date(normalizedValue)

  return Number.isNaN(date.getTime()) ? null : date
}

function readExifDateFromBuffer(buffer: ArrayBuffer): Date | null {
  const view = new DataView(buffer)
  if (view.byteLength < 4 || view.getUint16(0, false) !== 0xFFD8) {
    return null
  }

  let offset = 2

  while (offset + 4 <= view.byteLength) {
    const marker = view.getUint16(offset, false)
    offset += 2

    if ((marker & 0xFF00) !== 0xFF00) {
      return null
    }

    if (marker === 0xFFDA || marker === 0xFFD9) {
      break
    }

    const segmentLength = view.getUint16(offset, false)
    if (segmentLength < 2 || offset + segmentLength > view.byteLength) {
      return null
    }

    if (
      marker === 0xFFE1 &&
      offset + 8 <= view.byteLength &&
      view.getUint32(offset + 2, false) === 0x45786966 &&
      view.getUint16(offset + 6, false) === 0
    ) {
      const tiffStartOffset = offset + 8
      if (tiffStartOffset + 8 > view.byteLength) {
        return null
      }

      const byteOrder = view.getUint16(tiffStartOffset, false)
      const littleEndian = byteOrder === 0x4949
      if (!littleEndian && byteOrder !== 0x4D4D) {
        return null
      }

      if (getUint16(view, tiffStartOffset + 2, littleEndian) !== 0x002A) {
        return null
      }

      const ifdOffset = getUint32(view, tiffStartOffset + 4, littleEndian)
      const exifIfdOffset = getExifIfdOffset(
        view,
        tiffStartOffset,
        ifdOffset,
        littleEndian
      )
      if (exifIfdOffset === null) {
        return null
      }

      const exifDateString = getExifDateString(
        view,
        tiffStartOffset,
        exifIfdOffset,
        littleEndian
      )
      return exifDateString ? parseExifDateString(exifDateString) : null
    }

    offset += segmentLength
  }

  return null
}

export async function getExifOriginalDate(file: File): Promise<Date | null> {
  if (!isJpegFile(file)) {
    return null
  }

  try {
    const buffer = await file.arrayBuffer()
    return readExifDateFromBuffer(buffer)
  } catch {
    return null
  }
}
