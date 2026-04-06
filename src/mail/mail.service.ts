import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { TypedConfigService } from 'src/config/typed-config.service';

@Injectable()
export class MailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly typedConfigService: TypedConfigService,
  ) {}

  async sendResetPasswordEmail(
    to: string,
    resetUrl: string,
    firstName?: string,
  ): Promise<void> {
    const safeName = firstName?.trim() || 'there';

    await this.mailerService.sendMail({
      from: this.typedConfigService.get('MAIL_FROM'),
      to,
      subject: 'Reset your Learney password',
      text: `Hi ${safeName}, open this link to reset your Learney password: ${resetUrl}`,
      html: this.buildResetPasswordHtml(safeName, resetUrl),
    });
  }

  private buildResetPasswordHtml(name: string, resetUrl: string): string {
    return `
      <div style="background:#f5f7fb;padding:24px 12px;font-family:Arial,sans-serif;color:#1f2937;">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:24px;border:1px solid #e5e7eb;">
          <h2 style="margin:0 0 12px;font-size:22px;">Reset your password</h2>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">
            Hi ${name}, we received a request to reset your Learney password.
          </p>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.6;">
            Click the button below to set a new password.
          </p>
          <a href="${resetUrl}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700;">
            Reset Password
          </a>
          <p style="margin:24px 0 0;font-size:12px;color:#6b7280;line-height:1.6;">
            If you did not request this, you can safely ignore this email.
          </p>
        </div>
      </div>
    `;
  }
}
