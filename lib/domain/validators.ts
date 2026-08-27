// Ported from cfd/lib/core/utils/validators.dart.

const EMAIL_RE = /^[\w.\-]+@[\w.\-]+\.\w+$/;
const PHONE_RE = /^(03\d{9}|\+923\d{9})$/;
const ROOM_RE = /^\d+$/;
const OTP_RE = /^\d{6}$/;

export function validateEmail(value: string, domainSuffix?: string): string | null {
  const v = value.trim().toLowerCase();
  if (!v) return "Email is required";
  if (!EMAIL_RE.test(v)) return "Enter a valid email";
  if (domainSuffix && !v.endsWith(domainSuffix.toLowerCase())) {
    return `Email must end with ${domainSuffix}`;
  }
  return null;
}

export function validatePhone(value: string): string | null {
  const v = value.replace(/[\s-]/g, "");
  if (!v) return "Phone is required";
  if (!PHONE_RE.test(v)) return "Enter a valid Pakistani number (03XXXXXXXXX)";
  return null;
}

export function validateRoom(value: string): string | null {
  const v = value.trim();
  if (!v) return "Room number is required";
  if (!ROOM_RE.test(v)) return "Room number must be digits only";
  return null;
}

export function validateOtp(value: string): string | null {
  if (!OTP_RE.test(value.trim())) return "Enter the 6-digit code";
  return null;
}
