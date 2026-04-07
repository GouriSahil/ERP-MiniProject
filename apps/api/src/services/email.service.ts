import nodemailer from 'nodemailer';

/**
 * Email configuration
 */
interface EmailConfig {
  mode: 'console' | 'smtp';
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  from?: string;
}

/**
 * Email service for sending password reset emails
 * Supports console mode (development) and SMTP mode (production)
 */
class EmailService {
  private config: EmailConfig;
  private transporter?: nodemailer.Transporter;

  constructor() {
    this.config = {
      mode: (process.env.EMAIL_MODE as 'console' | 'smtp') || 'console',
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      from: process.env.EMAIL_FROM || 'noreply@erp-system.com'
    };

    if (this.config.mode === 'smtp') {
      this.initializeSmtpTransporter();
    }
  }

  /**
   * Initialize SMTP transporter
   */
  private initializeSmtpTransporter(): void {
    if (!this.config.host || !this.config.user || !this.config.pass) {
      console.warn('[EmailService] SMTP configuration incomplete, falling back to console mode');
      this.config.mode = 'console';
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.config.user,
        pass: this.config.pass
      }
    });
  }

  /**
   * Send password reset email
   * @param to - Recipient email address
   * @param token - Reset token
   * @param name - Recipient name (optional)
   */
  async sendPasswordResetEmail(to: string, token: string, name?: string): Promise<void> {
    const baseUrl = process.env.BASE_URL || 'http://localhost:4200';
    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    if (this.config.mode === 'console') {
      this.sendConsoleEmail(to, resetLink, name);
      return;
    }

    await this.sendSmtpEmail(to, resetLink, name);
  }

  /**
   * Console mode - log email to console (development)
   */
  private sendConsoleEmail(to: string, resetLink: string, name?: string): void {
    const greeting = name ? `Hello ${name},` : 'Hello,';

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                   PASSWORD RESET EMAIL                        ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║ To: ${to.padEnd(58)}║`);
    console.log(`║ From: ${this.config.from?.padEnd(56) || ''}║`);
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log('║ Subject: Password Reset Request                              ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║ ${greeting.padEnd(62)}║`);
    console.log('║                                                               ║');
    console.log('║ You requested a password reset for your ERP account.         ║');
    console.log('║                                                               ║');
    console.log('║ Click the link below to reset your password (valid for 15    ║');
    console.log('║ minutes):                                                     ║');
    console.log('║                                                               ║');
    console.log('║ ' + resetLink.padEnd(62) + '║');
    console.log('║                                                               ║');
    console.log('║ If you didn\'t request this, please ignore this email.        ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  }

  /**
   * SMTP mode - send actual email (production)
   */
  private async sendSmtpEmail(to: string, resetLink: string, name?: string): Promise<void> {
    if (!this.transporter) {
      throw new Error('SMTP transporter not initialized');
    }

    const greeting = name ? `Hello ${name},` : 'Hello,';

    const mailOptions = {
      from: this.config.from,
      to,
      subject: 'Password Reset Request',
      text: `${greeting}

You requested a password reset for your ERP account.

Click the link below to reset your password (valid for 15 minutes):
${resetLink}

If you didn't request this, please ignore this email.`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #007bff;
              color: white; text-decoration: none; border-radius: 4px; }
    .footer { margin-top: 30px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Password Reset Request</h2>
    <p>${greeting}</p>
    <p>You requested a password reset for your ERP account.</p>
    <p>Click the button below to reset your password (valid for 15 minutes):</p>
    <p><a href="${resetLink}" class="button">Reset Password</a></p>
    <p>Or copy this link to your browser:<br>${resetLink}</p>
    <p class="footer">If you didn't request this, please ignore this email.</p>
  </div>
</body>
</html>
      `
    };

    await this.transporter.sendMail(mailOptions);
    console.log(`[EmailService] Password reset email sent to ${to}`);
  }

  /**
   * Send user approval email
   * @param to - Recipient email address
   * @param name - Recipient name (optional)
   */
  async sendUserApprovalEmail(to: string, name?: string): Promise<void> {
    const baseUrl = process.env.BASE_URL || 'http://localhost:4200';
    const loginLink = `${baseUrl}/login`;

    if (this.config.mode === 'console') {
      this.sendConsoleApprovalEmail(to, loginLink, name);
      return;
    }

    await this.sendSmtpApprovalEmail(to, loginLink, name);
  }

  /**
   * Console mode - log approval email to console (development)
   */
  private sendConsoleApprovalEmail(to: string, loginLink: string, name?: string): void {
    const greeting = name ? `Hello ${name},` : 'Hello,';

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                    USER APPROVAL EMAIL                       ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║ To: ${to.padEnd(58)}║`);
    console.log(`║ From: ${this.config.from?.padEnd(56) || ''}║`);
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log('║ Subject: Your Account Has Been Approved                     ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║ ${greeting.padEnd(62)}║`);
    console.log('║                                                               ║');
    console.log('║ Good news! Your ERP account has been approved.               ║');
    console.log('║                                                               ║');
    console.log('║ You can now log in to your account:                         ║');
    console.log('║                                                               ║');
    console.log('║ ' + loginLink.padEnd(62) + '║');
    console.log('║                                                               ║');
    console.log('║ Please log in and update your password if required.          ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  }

  /**
   * SMTP mode - send actual approval email (production)
   */
  private async sendSmtpApprovalEmail(to: string, loginLink: string, name?: string): Promise<void> {
    if (!this.transporter) {
      throw new Error('SMTP transporter not initialized');
    }

    const greeting = name ? `Hello ${name},` : 'Hello,';

    const mailOptions = {
      from: this.config.from,
      to,
      subject: 'Your Account Has Been Approved',
      text: `${greeting}

Good news! Your ERP account has been approved.

You can now log in to your account:
${loginLink}

Please log in and update your password if required.`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #28a745;
              color: white; text-decoration: none; border-radius: 4px; }
    .footer { margin-top: 30px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Your Account Has Been Approved</h2>
    <p>${greeting}</p>
    <p>Good news! Your ERP account has been approved.</p>
    <p>You can now log in to your account:</p>
    <p><a href="${loginLink}" class="button">Log In</a></p>
    <p>Or copy this link to your browser:<br>${loginLink}</p>
    <p class="footer">Please log in and update your password if required.</p>
  </div>
</body>
</html>
      `
    };

    await this.transporter.sendMail(mailOptions);
    console.log(`[EmailService] User approval email sent to ${to}`);
  }

  /**
   * Send user rejection email
   * @param to - Recipient email address
   * @param reason - Rejection reason
   * @param name - Recipient name (optional)
   */
  async sendUserRejectionEmail(to: string, reason?: string, name?: string): Promise<void> {
    if (this.config.mode === 'console') {
      this.sendConsoleRejectionEmail(to, reason, name);
      return;
    }

    await this.sendSmtpRejectionEmail(to, reason, name);
  }

  private sendConsoleRejectionEmail(to: string, reason: string | undefined, name?: string): void {
    const greeting = name ? `Hello ${name},` : 'Hello,';
    const reasonText = reason ? `\n║ Reason: ${reason.padEnd(52)}║` : '';

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                    USER REJECTION EMAIL                      ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║ To: ${to.padEnd(58)}║`);
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log('║ Subject: Your Account Registration Status                   ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║ ${greeting.padEnd(62)}║`);
    console.log('║                                                               ║');
    console.log('║ We regret to inform you that your ERP account registration  ║');
    console.log('║ has been rejected.                                           ║');
    if (reason) {
      console.log(`║ Reason: ${reason.padEnd(52)}║`);
    }
    console.log('║                                                               ║');
    console.log('║ If you have questions, please contact the administrator.    ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  }

  private async sendSmtpRejectionEmail(to: string, reason: string | undefined, name?: string): Promise<void> {
    if (!this.transporter) {
      throw new Error('SMTP transporter not initialized');
    }

    const greeting = name ? `Hello ${name},` : 'Hello,';
    const reasonParagraph = reason ? `<p><strong>Reason:</strong> ${reason}</p>` : '';

    const mailOptions = {
      from: this.config.from,
      to,
      subject: 'Your Account Registration Status',
      text: `${greeting}

We regret to inform you that your ERP account registration has been rejected.
${reason || ''}

If you have questions, please contact the administrator.`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .footer { margin-top: 30px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Your Account Registration Status</h2>
    <p>${greeting}</p>
    <p>We regret to inform you that your ERP account registration has been rejected.</p>
    ${reasonParagraph}
    <p>If you have questions, please contact the administrator.</p>
  </div>
</body>
</html>
      `
    };

    await this.transporter.sendMail(mailOptions);
    console.log(`[EmailService] User rejection email sent to ${to}`);
  }

  /**
   * Verify SMTP configuration (for health checks)
   */
  async verifySmtpConnection(): Promise<boolean> {
    if (this.config.mode !== 'smtp' || !this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
