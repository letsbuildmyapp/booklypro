import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { initializeApp } from 'firebase-admin/app';
import { Resend } from 'resend';

initializeApp();

interface BookingEmailPayload {
  bookingId: string;
  customerName: string;
  customerEmail: string;
  serviceName: string;
  staffName: string;
  locationName: string;
  locationAddress: string;
  startAt: number; // ms
  durationMin: number;
  priceCents: number;
  type?: 'confirmation' | 'cancellation' | 'reschedule';
}

function fmtDate(ms: number) {
  return new Date(ms).toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function buildHtml(p: BookingEmailPayload, headline: string, bodyMsg: string) {
  const price = `$${(p.priceCents / 100).toFixed(0)}`;
  return `<!doctype html>
<html><body style="font-family: 'DM Sans', system-ui, sans-serif; background:#fbf8f3; margin:0; padding:24px; color:#1a1814;">
  <div style="max-width:560px; margin:0 auto; background:#fff; border-radius:24px; padding:36px; border:1px solid #e7e5e1;">
    <p style="font-family:'DM Serif Display', Georgia, serif; font-size:28px; line-height:1.2; margin:0 0 8px; color:#2e724d;">${headline}</p>
    <p style="font-size:16px; line-height:1.5; color:#46443e; margin:0 0 24px;">${bodyMsg}</p>
    <div style="background:#f1f8f4; border-radius:18px; padding:20px; margin:0 0 20px;">
      <p style="font-size:13px; text-transform:uppercase; letter-spacing:0.08em; color:#5a574f; margin:0 0 8px; font-weight:600;">Your booking</p>
      <p style="font-size:20px; font-family:'DM Serif Display', Georgia, serif; margin:0 0 4px;">${p.serviceName}</p>
      <p style="font-size:15px; color:#46443e; margin:0 0 12px;">with ${p.staffName}</p>
      <table style="width:100%; font-size:15px; color:#46443e;">
        <tr><td style="padding:4px 0; color:#7d796f;">When</td><td style="padding:4px 0; text-align:right;">${fmtDate(p.startAt)}</td></tr>
        <tr><td style="padding:4px 0; color:#7d796f;">Duration</td><td style="padding:4px 0; text-align:right;">${p.durationMin} minutes</td></tr>
        <tr><td style="padding:4px 0; color:#7d796f;">Where</td><td style="padding:4px 0; text-align:right;">${p.locationName}</td></tr>
        <tr><td style="padding:4px 0; color:#7d796f;">Address</td><td style="padding:4px 0; text-align:right;">${p.locationAddress}</td></tr>
        <tr><td style="padding:4px 0; color:#7d796f;">Price</td><td style="padding:4px 0; text-align:right;">${price}</td></tr>
      </table>
    </div>
    <p style="font-size:14px; color:#7d796f; margin:0;">Need to reschedule? Sign in to BooklyPro to make changes.</p>
    <hr style="border:none; border-top:1px solid #e7e5e1; margin:24px 0;" />
    <p style="font-size:12px; color:#a9a59c; margin:0;">Sent by BooklyPro · A demo booking platform built by <a href="https://letsbuildmyapp.com" style="color:#2e724d;">letsbuildmyapp.com</a>.</p>
  </div>
</body></html>`;
}

export const sendBookingEmail = onCall<BookingEmailPayload>({ cors: true }, async (req) => {
  const data = req.data;
  if (!data?.customerEmail || !data?.bookingId) {
    throw new HttpsError('invalid-argument', 'Missing customerEmail or bookingId');
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.BOOKING_FROM_EMAIL ?? 'BooklyPro <onboarding@resend.dev>';

  const type = data.type ?? 'confirmation';
  const headline =
    type === 'cancellation' ? "Your booking is canceled"
    : type === 'reschedule' ? "Your booking has been moved"
    : `See you, ${data.customerName.split(' ')[0]}`;
  const bodyMsg =
    type === 'cancellation' ? "We're sorry you can't make it. The slot has been freed up. Book another anytime."
    : type === 'reschedule' ? "Your appointment has been moved. Updated details are below."
    : "Your appointment is confirmed. We'll send a friendly reminder the day before.";

  const subjectPrefix =
    type === 'cancellation' ? 'Canceled · ' : type === 'reschedule' ? 'Updated · ' : 'Confirmed · ';
  const subject = `${subjectPrefix}${data.serviceName} with ${data.staffName} — ${fmtDate(data.startAt)}`;

  const html = buildHtml(data, headline, bodyMsg);

  if (!apiKey) {
    logger.warn('[sendBookingEmail] RESEND_API_KEY not set — fixture mode (logging preview).');
    logger.info('Email preview', { to: data.customerEmail, subject, type, htmlLength: html.length });
    return { delivered: false, mocked: true, subject };
  }

  try {
    const resend = new Resend(apiKey);
    const sent = await resend.emails.send({
      from: fromEmail,
      to: data.customerEmail,
      subject,
      html,
    });
    logger.info('[sendBookingEmail] sent', sent);
    return { delivered: true, id: sent.data?.id ?? null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'send failed';
    logger.error('[sendBookingEmail] failed', e);
    throw new HttpsError('internal', msg);
  }
});
