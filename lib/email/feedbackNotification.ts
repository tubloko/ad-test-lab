import 'server-only';
import { FEEDBACK_TYPE_LABELS, type FeedbackType } from '@/types/feedback';
import { FROM_EMAIL, TO_EMAIL, resend } from './resend';

interface FeedbackNotification {
  id: string;
  type: FeedbackType;
  message: string;
  context?: string;
  pageUrl: string;
  userEmail: string;
  userName: string | null;
  createdAt: Date;
}

export async function sendFeedbackNotification(
  feedback: FeedbackNotification,
): Promise<void> {
  if (!resend || !TO_EMAIL) {
    console.warn('[feedback] notification skipped — Resend not configured', {
      hasResend: Boolean(resend),
      hasRecipient: Boolean(TO_EMAIL),
    });
    return;
  }

  const typeLabel = FEEDBACK_TYPE_LABELS[feedback.type];
  const messagePreview = feedback.message.slice(0, 40).trim();
  const subject = `[AdTestLab] ${typeLabel}: ${messagePreview}${
    feedback.message.length > 40 ? '…' : ''
  }`;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: TO_EMAIL,
      subject,
      replyTo: feedback.userEmail,
      html: renderHtml(feedback, typeLabel),
      text: renderText(feedback, typeLabel),
    });
  } catch (err) {
    console.error('[feedback] resend send failed', { id: feedback.id, err });
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function htmlBlock(s: string): string {
  return escapeHtml(s).replace(/\r?\n/g, '<br>');
}

function renderHtml(feedback: FeedbackNotification, typeLabel: string): string {
  const fromName = feedback.userName ?? '—';
  const contextBlock = feedback.context
    ? `<p style="margin: 16px 0 4px;"><strong>Context:</strong></p>
       <p style="color: #666; margin: 0;">${htmlBlock(feedback.context)}</p>`
    : '';
  return `<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; padding: 24px;">
  <h2 style="color: #d97706; margin: 0 0 16px;">New feedback: ${escapeHtml(typeLabel)}</h2>
  <p style="margin: 4px 0;"><strong>From:</strong> ${escapeHtml(fromName)} (${escapeHtml(feedback.userEmail)})</p>
  <p style="margin: 4px 0;"><strong>Page:</strong> <a href="${escapeHtml(feedback.pageUrl)}">${escapeHtml(feedback.pageUrl)}</a></p>
  <p style="margin: 16px 0 4px;"><strong>Message:</strong></p>
  <blockquote style="border-left: 3px solid #d97706; padding-left: 12px; margin: 8px 0; color: #333;">
    ${htmlBlock(feedback.message)}
  </blockquote>
  ${contextBlock}
  <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;">
  <p style="color: #888; font-size: 12px; margin: 0;">Submitted ${feedback.createdAt.toISOString()} · ID: ${escapeHtml(feedback.id)}</p>
</div>`;
}

function renderText(feedback: FeedbackNotification, typeLabel: string): string {
  const fromName = feedback.userName ?? '—';
  const lines = [
    `New feedback: ${typeLabel}`,
    '',
    `From: ${fromName} (${feedback.userEmail})`,
    `Page: ${feedback.pageUrl}`,
    '',
    'Message:',
    feedback.message,
  ];
  if (feedback.context) {
    lines.push('', 'Context:', feedback.context);
  }
  lines.push(
    '',
    '---',
    `Submitted ${feedback.createdAt.toISOString()} · ID: ${feedback.id}`,
  );
  return lines.join('\n');
}
