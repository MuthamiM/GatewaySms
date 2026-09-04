// GSM 7-bit default alphabet set
const GSM_7BIT_CHARS =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1bÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?" +
  "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ`¿abcdefghijklmnopqrstuvwxyzäöñüà";

// Extended GSM 7-bit characters (count as 2 characters in GSM-7)
const GSM_7BIT_EXTENDED = "|^€{}[]~\\";

export interface SmsEncodingAnalysis {
  encoding: 'GSM-7' | 'UCS-2';
  characterCount: number;
  segments: number;
  remainingInSegment: number;
}

export function isGsm7Compliant(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (!GSM_7BIT_CHARS.includes(char) && !GSM_7BIT_EXTENDED.includes(char)) {
      return false;
    }
  }
  return true;
}

export function analyzeSms(text: string): SmsEncodingAnalysis {
  const isGsm = isGsm7Compliant(text);

  if (isGsm) {
    // Calculate total character count considering extended GSM chars count as 2
    let effectiveLength = 0;
    for (let i = 0; i < text.length; i++) {
      effectiveLength += GSM_7BIT_EXTENDED.includes(text[i]) ? 2 : 1;
    }

    if (effectiveLength <= 160) {
      return {
        encoding: 'GSM-7',
        characterCount: effectiveLength,
        segments: effectiveLength === 0 ? 0 : 1,
        remainingInSegment: 160 - effectiveLength,
      };
    }

    const segments = Math.ceil(effectiveLength / 153);
    const remainder = effectiveLength % 153;
    return {
      encoding: 'GSM-7',
      characterCount: effectiveLength,
      segments,
      remainingInSegment: remainder === 0 ? 0 : 153 - remainder,
    };
  }

  // UCS-2 (Unicode) encoding
  const length = text.length;
  if (length <= 70) {
    return {
      encoding: 'UCS-2',
      characterCount: length,
      segments: length === 0 ? 0 : 1,
      remainingInSegment: 70 - length,
    };
  }

  const segments = Math.ceil(length / 67);
  const remainder = length % 67;
  return {
    encoding: 'UCS-2',
    characterCount: length,
    segments,
    remainingInSegment: remainder === 0 ? 0 : 67 - remainder,
  };
}
