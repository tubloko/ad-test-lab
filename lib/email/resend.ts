import 'server-only';
import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  console.warn('RESEND_API_KEY not set — feedback emails disabled');
}

export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export const FROM_EMAIL = 'AdTestLab <onboarding@resend.dev>';
export const TO_EMAIL = process.env.FEEDBACK_RECIPIENT_EMAIL ?? '';
