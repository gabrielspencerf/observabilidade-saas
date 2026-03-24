/**
 * Utilitários para extrair mídia do payload bruto dos webhooks.
 * Evita acoplamento com um único provedor e cobre variações comuns de chaves.
 */

function getAtPath(
  obj: Record<string, unknown>,
  path: string
): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (!current || typeof current !== "object") return null;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseDataUrl(input: string): { mimeType: string | null; base64: string } | null {
  const match = input.match(/^data:([^;]+);base64,(.+)$/i);
  if (!match) return null;
  return {
    mimeType: match[1]?.trim() || null,
    base64: match[2]?.trim() || "",
  };
}

function decodeBase64ToBuffer(base64: string): Buffer | null {
  const cleaned = base64.replace(/\s+/g, "");
  if (!cleaned) return null;
  try {
    const buffer = Buffer.from(cleaned, "base64");
    return buffer.length > 0 ? buffer : null;
  } catch {
    return null;
  }
}

export function extractMediaUrlFromPayload(
  payload: Record<string, unknown>,
  contentType: "image" | "audio"
): string | null {
  const candidates =
    contentType === "image"
      ? [
          "data.message.imageMessage.url",
          "message.imageMessage.url",
          "data.image.url",
          "image.url",
        ]
      : [
          "data.message.audioMessage.url",
          "message.audioMessage.url",
          "data.audio.url",
          "audio.url",
        ];

  for (const path of candidates) {
    const value = asNonEmptyString(getAtPath(payload, path));
    if (!value) continue;
    if (value.startsWith("http://") || value.startsWith("https://")) {
      return value;
    }
    if (value.startsWith("data:")) {
      return value;
    }
  }
  return null;
}

export function extractInlineMediaBufferFromPayload(
  payload: Record<string, unknown>,
  contentType: "image" | "audio"
): { buffer: Buffer; mimeType: string | null } | null {
  const base64Candidates =
    contentType === "image"
      ? [
          "data.message.imageMessage.base64",
          "message.imageMessage.base64",
          "data.image.base64",
          "image.base64",
          "data.message.imageMessage.jpegThumbnail",
          "message.imageMessage.jpegThumbnail",
        ]
      : [
          "data.message.audioMessage.base64",
          "message.audioMessage.base64",
          "data.audio.base64",
          "audio.base64",
        ];

  const mimeCandidates =
    contentType === "image"
      ? [
          "data.message.imageMessage.mimetype",
          "message.imageMessage.mimetype",
          "data.image.mimetype",
          "image.mimetype",
        ]
      : [
          "data.message.audioMessage.mimetype",
          "message.audioMessage.mimetype",
          "data.audio.mimetype",
          "audio.mimetype",
        ];

  for (const path of base64Candidates) {
    const raw = asNonEmptyString(getAtPath(payload, path));
    if (!raw) continue;

    const parsedDataUrl = raw.startsWith("data:")
      ? parseDataUrl(raw)
      : null;
    const base64 = parsedDataUrl?.base64 ?? raw;
    const buffer = decodeBase64ToBuffer(base64);
    if (!buffer) continue;

    const mimeFromDataUrl = parsedDataUrl?.mimeType ?? null;
    const mimeFromField = mimeCandidates
      .map((mimePath) => asNonEmptyString(getAtPath(payload, mimePath)))
      .find(Boolean) ?? null;

    return {
      buffer,
      mimeType: mimeFromDataUrl ?? mimeFromField,
    };
  }

  return null;
}
