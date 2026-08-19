import { Resend } from "resend";

const FROM = process.env.RESEND_FROM_EMAIL || "Matched Betting Tracker <onboarding@resend.dev>";

function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set — can't send email.");
  }
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendPasswordResetEmail(to: string, url: string) {
  const resend = getResendClient();
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Reset your password",
    html: `
      <p>Someone requested a password reset for your Matched Betting Tracker account.</p>
      <p><a href="${url}">Reset your password</a></p>
      <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
    `,
  });
}

export async function sendVerificationEmail(to: string, url: string) {
  const resend = getResendClient();
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Verify your email",
    html: `
      <p>Confirm your email address for Matched Betting Tracker.</p>
      <p><a href="${url}">Verify your email</a></p>
    `,
  });
}
