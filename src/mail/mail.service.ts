import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter!: nodemailer.Transporter;
  private fromEmail!: string;
  private fromName!: string;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const host = this.config.get<string>('SMTP_HOST');
    const port = this.config.get<number>('SMTP_PORT');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    const fromName = this.config.get<string>('SMTP_FROM_NAME') || 'PRM Admin';
    const fromEmail =
      this.config.get<string>('SMTP_FROM_EMAIL') || 'admin@prmtool.local';

    if (!host || !user || !pass) {
      this.logger.warn(
        'SMTP environment variables are missing. Creating Ethereal Email sandbox account...',
      );
      try {
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: testAccount.smtp.host,
          port: testAccount.smtp.port,
          secure: testAccount.smtp.secure,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        this.fromEmail = testAccount.user;
        this.fromName = 'PRM System (Sandbox)';

        this.logger.log('--------------------------------------------------');
        this.logger.log('🎉 Ethereal SMTP Sandbox Credentials Generated:');
        this.logger.log(`SMTP User:   ${testAccount.user}`);
        this.logger.log(`SMTP Pass:   ${testAccount.pass}`);
        this.logger.log('Inbox Portal: https://ethereal.email/login');
        this.logger.log('--------------------------------------------------');
      } catch (err) {
        this.logger.error('Failed to create Ethereal test account:', err);
      }
    } else {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(port) || 587,
        secure: Number(port) === 465,
        auth: { user, pass },
      });
      this.fromEmail = fromEmail;
      this.fromName = fromName;
      this.logger.log(
        `SMTP mailer configured successfully (Host: ${host}:${port})`,
      );
    }
  }

  async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    try {
      if (!this.transporter) {
        this.logger.error('Mailer transporter is not initialized.');
        return false;
      }
      const info = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to,
        subject,
        html,
      });

      this.logger.log(`Email successfully sent: ${info.messageId}`);
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        this.logger.log(`✉️ [Ethereal sandbox] View email at: ${previewUrl}`);
      }
      return true;
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}:`, err);
      return false;
    }
  }

  async sendWarningEmail(email: string, name: string, weekStart: string) {
    const subject = '⚠️ Action Required: Timesheet Submission Warning';
    const html = `
      <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.025em;">Timesheet Submission Warning</h1>
        </div>
        <div style="padding: 32px; background-color: #ffffff; color: #1e293b; line-height: 1.6;">
          <p style="margin-top: 0; font-size: 16px; font-weight: 500;">Hello ${name},</p>
          <p style="font-size: 15px; color: #475569;">Our records indicate that you have <strong>not submitted</strong> your weekly timesheet for the week starting on <strong style="color: #1e293b;">${weekStart}</strong>.</p>
          
          <div style="margin: 24px 0; padding: 16px; border-left: 4px solid #f59e0b; bg-color: #fffbeb; background-color: #fffbeb; border-radius: 4px; font-size: 14px; color: #78350f;">
            <strong>Important Alert:</strong> In accordance with company policy, failing to submit timesheets consecutively for 2 or more weeks will result in an <strong>immediate freeze of your user account</strong>.
          </div>

          <p style="font-size: 15px; color: #475569;">Please log in to your account and submit the pending timesheet immediately to avoid any disruption to your system access.</p>
          
          <div style="text-align: center; margin-top: 32px;">
            <a href="${this.config.get<string>('FRONTEND_URL') || 'http://localhost:3001'}/login" 
               style="background-color: #1e293b; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              Log In to Submit Timesheet
            </a>
          </div>
        </div>
        <div style="background-color: #f8fafc; padding: 16px; text-align: center; border-t: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
          PRM Automated Notification System • Do not reply directly to this email.
        </div>
      </div>
    `;
    await this.sendEmail(email, subject, html);
  }

  async sendFreezeEmail(email: string, name: string, missedWeeksCount: number) {
    const subject = '🚨 CRITICAL: Your User Account Has Been Frozen';
    const html = `
      <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.025em;">Account Access Frozen</h1>
        </div>
        <div style="padding: 32px; background-color: #ffffff; color: #1e293b; line-height: 1.6;">
          <p style="margin-top: 0; font-size: 16px; font-weight: 500;">Hello ${name},</p>
          <p style="font-size: 15px; color: #475569;">Your user login account has been <strong style="color: #ef4444;">frozen</strong> because you have missed submitting your weekly timesheets for <strong style="color: #1e293b;">${missedWeeksCount} consecutive weeks</strong>.</p>
          
          <div style="margin: 24px 0; padding: 16px; border-left: 4px solid #ef4444; background-color: #fef2f2; border-radius: 4px; font-size: 14px; color: #991b1b;">
            <strong>Access Blocked:</strong> You can no longer log in to the Project & Resource Management application or log working hours. Your active project allocations remain scheduled, but login remains restricted.
          </div>

          <p style="font-size: 15px; color: #475569;">To restore access to your account, please contact your <strong>reporting manager</strong> or the <strong>system administrator</strong> to request an unfreeze. You will be expected to submit all backlog timesheets immediately upon unfreeze.</p>
        </div>
        <div style="background-color: #f8fafc; padding: 16px; text-align: center; border-t: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
          PRM Automated Notification System • Do not reply directly to this email.
        </div>
      </div>
    `;
    await this.sendEmail(email, subject, html);
  }

  async sendUnfreezeEmail(email: string, name: string) {
    const subject = '✅ Access Restored: Your Account Has Been Unfrozen';
    const html = `
      <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.025em;">Account Reactivated</h1>
        </div>
        <div style="padding: 32px; background-color: #ffffff; color: #1e293b; line-height: 1.6;">
          <p style="margin-top: 0; font-size: 16px; font-weight: 500;">Hello ${name},</p>
          <p style="font-size: 15px; color: #475569;">Your user login account has been successfully <strong style="color: #10b981;">unfrozen</strong> by your manager or administrator. Your full system access is restored.</p>
          
          <div style="margin: 24px 0; padding: 16px; border-left: 4px solid #10b981; background-color: #ecfdf5; border-radius: 4px; font-size: 14px; color: #065f46;">
            <strong>Action Required:</strong> Please log in right away and submit all overdue weekly timesheets.
          </div>

          <div style="text-align: center; margin-top: 32px;">
            <a href="${this.config.get<string>('FRONTEND_URL') || 'http://localhost:3001'}/login" 
               style="background-color: #1e293b; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              Log In and Submit Backlog
            </a>
          </div>
        </div>
        <div style="background-color: #f8fafc; padding: 16px; text-align: center; border-t: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
          PRM Automated Notification System • Do not reply directly to this email.
        </div>
      </div>
    `;
    await this.sendEmail(email, subject, html);
  }

  async sendProjectAtRiskEmail(
    to: string,
    managerName: string,
    projectName: string,
    projectId: number,
    health: string,
    summary: string,
    milestones: Array<{ title: string; dueDate: string; status: string }>,
    suggestions: Array<{
      fullName: string;
      availableUtilizationPct: number;
      skills: string[];
      reason: string;
    }>,
  ) {
    const subject = `⚠️ Alert: Project "${projectName}" is AT_RISK`;
    const html = `
      <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #ef4444, #b91c1c); padding: 28px 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em;">⚠️ Project At-Risk Alert</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 6px 0 0 0; font-size: 14px;">Automated scheduler warning for managers</p>
        </div>
        <div style="padding: 32px 24px; color: #1e293b; line-height: 1.6;">
          <p style="margin-top: 0; font-size: 16px; font-weight: 500;">Hello ${managerName},</p>
          <p style="font-size: 15px; color: #475569; margin-bottom: 24px;">The Project Health Scheduler has marked your project <strong style="color: #ef4444;">${projectName}</strong> as <strong>AT_RISK</strong>. Please review the details below and take necessary actions.</p>
          
          <div style="margin-bottom: 24px;">
            <div style="padding: 20px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 16px;">
              <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 15px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">📋 Project Details</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 4px 0; color: #64748b; width: 120px;">Project Name:</td>
                  <td style="padding: 4px 0; font-weight: 500; color: #1e293b;">${projectName}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">Manager:</td>
                  <td style="padding: 4px 0; font-weight: 500; color: #1e293b;">${managerName}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">Health Standing:</td>
                  <td style="padding: 4px 0; font-weight: 600; color: #ef4444;">🔴 Red (${health})</td>
                </tr>
              </table>
            </div>

            <div style="padding: 20px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 15px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">📅 Key Milestones</h3>
              ${
                !milestones || milestones.length === 0
                  ? '<p style="margin: 0; font-size: 13px; color: #64748b;">No milestones defined for this project.</p>'
                  : `
                <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #334155;">
                  ${milestones
                    .map(
                      (m) => `
                    <li style="margin-bottom: 6px;">
                      <strong>${m.title}</strong> - Due: ${m.dueDate} 
                      <span style="font-size: 11px; font-weight: 600; padding: 2px 6px; border-radius: 4px; background-color: ${m.status === 'COMPLETED' ? '#dcfce7; color: #15803d;' : m.status === 'IN_PROGRESS' ? '#fef9c3; color: #a16207;' : '#fee2e2; color: #b91c1c;'}; margin-left: 8px;">
                        ${m.status}
                      </span>
                    </li>
                  `,
                    )
                    .join('')}
                </ul>
              `
              }
            </div>
          </div>

          <div style="margin-bottom: 24px; padding: 20px; background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px;">
            <h3 style="margin-top: 0; margin-bottom: 8px; font-size: 15px; font-weight: 600; color: #991b1b;">🤖 AI Risk Summary</h3>
            <p style="margin: 0; font-size: 14px; color: #7f1d1d; line-height: 1.6;">${summary}</p>
          </div>

          <div style="margin-bottom: 32px; padding: 20px; background-color: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 4px;">
            <h3 style="margin-top: 0; margin-bottom: 8px; font-size: 15px; font-weight: 600; color: #166534;">💡 Suggested Help (Available Talent)</h3>
            <p style="margin: 0 0 12px 0; font-size: 13px; color: #166534;">Below are available resources whose skills can help reduce this project's risk:</p>
            
            ${
              !suggestions || suggestions.length === 0
                ? '<p style="margin: 0; font-size: 13px; color: #64748b;">No available matching employees found at this time.</p>'
                : `
              <div style="display: grid; gap: 12px;">
                ${suggestions
                  .map(
                    (s) => `
                  <div style="background-color: #ffffff; padding: 12px; border: 1px solid #dcfce7; border-radius: 6px;">
                    <div style="font-weight: 600; color: #14532d; font-size: 14px;">
                      👤 ${s.fullName} 
                      <span style="font-weight: normal; font-size: 12px; color: #15803d; margin-left: 8px; background-color: #dcfce7; padding: 1px 6px; border-radius: 10px;">
                        ${s.availableUtilizationPct}% Available
                      </span>
                    </div>
                    <div style="font-size: 12px; color: #64748b; margin: 4px 0;">
                      <strong>Skills:</strong> ${s.skills && s.skills.length > 0 ? s.skills.join(', ') : 'None listed'}
                    </div>
                    <div style="font-size: 13px; color: #1e293b; margin-top: 4px; border-top: 1px dashed #e2e8f0; padding-top: 4px;">
                      <strong>Fit Reason:</strong> ${s.reason}
                    </div>
                  </div>
                `,
                  )
                  .join('')}
              </div>
            `
            }
          </div>

          <div style="text-align: center; margin-top: 32px;">
            <a href="${this.config.get<string>('FRONTEND_URL') || 'http://localhost:3001'}/manager/projects/${projectId}" 
               style="background-color: #ef4444; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600; display: inline-block; box-shadow: 0 4px 6px rgba(239, 68, 68, 0.15); transition: background-color 0.2s;">
              Review Project Dashboard
            </a>
          </div>
        </div>
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
          PRM Automated Health Alert System • This is a system-generated email alert.
        </div>
      </div>
    `;
    await this.sendEmail(to, subject, html);
  }
}
