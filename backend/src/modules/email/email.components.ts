/**
 * DIU Investment Club - Reusable Professional Email Components
 *
 * Implements standard, rock-solid table-based layouts compatible with:
 * - Gmail (Web & Mobile)
 * - Microsoft Outlook (Desktop & Web)
 * - Apple Mail
 * - Generic Android / iOS Mail Clients
 * - Mobile viewports (320px, 360px, 375px, 390px, 414px)
 */

import { EMAIL_BRAND } from './email.brand';
import { escapeHtml, sanitizeUrl } from './email.security';

export interface InfoCardItem {
  label: string;
  value: string;
  highlight?: boolean;
}

export interface StatusBadgeOptions {
  status: string;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}

/**
 * 1. Email Header Component
 * Optimized for desktop and mobile viewports (320px-414px)
 * Fluid layout without overflowing badges or rigid columns
 */
export function renderHeader(options?: { subtitle?: string }): string {
  const logoHtml = EMAIL_BRAND.logoUrl
    ? `<div style="margin-bottom: 8px;">
         <img src="${sanitizeUrl(EMAIL_BRAND.logoUrl)}" alt="${escapeHtml(EMAIL_BRAND.name)}" style="max-height: 38px; max-width: 120px; height: auto; border: 0;" />
       </div>`
    : '';

  const subtitleHtml = options?.subtitle
    ? `<div style="font-size: 11px; color: ${EMAIL_BRAND.colors.textSecondary}; margin-top: 3px; letter-spacing: 0.02em;">
         ${escapeHtml(options.subtitle)}
       </div>`
    : '';

  return `
    <tr>
      <td class="header-cell" style="padding: 24px 28px; background: linear-gradient(135deg, #022c22 0%, #0f172a 100%); border-bottom: 1px solid ${EMAIL_BRAND.colors.border};">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td valign="middle" align="left">
              ${logoHtml}
              <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: ${EMAIL_BRAND.colors.primaryLight}; text-transform: uppercase; margin-bottom: 3px; word-break: break-word;">
                ${escapeHtml(EMAIL_BRAND.university)}
              </div>
              <div style="font-size: 18px; font-weight: 700; color: #ffffff; letter-spacing: -0.01em; line-height: 1.3; word-break: break-word;">
                ${escapeHtml(EMAIL_BRAND.name)}
              </div>
              ${subtitleHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

/**
 * 2. Email Footer Component
 * Section 10 Recommended Hierarchy:
 * - DIU Investment Club
 * - Daffodil International University
 * - Official club communication (compact, non-overflowing)
 * - Campus Address
 * - Automated notification notice
 * - Recipient & Copyright notes
 */
export function renderFooter(options?: { recipientEmail?: string; showUnsubscribe?: boolean }): string {
  const currentYear = new Date().getFullYear();
  const recipientNote = options?.recipientEmail
    ? `<div style="margin: 6px 0; font-size: 11px; color: ${EMAIL_BRAND.colors.textMuted}; word-break: break-all;">Sent to ${escapeHtml(options.recipientEmail)}</div>`
    : '';

  const unsubscribeHtml = options?.showUnsubscribe
    ? `<div style="margin: 10px 0 0 0; font-size: 11px; color: ${EMAIL_BRAND.colors.textMuted};">
         To manage your notification preferences, visit your 
         <a href="${sanitizeUrl(EMAIL_BRAND.portalUrl + '/settings')}" style="color: ${EMAIL_BRAND.colors.primaryLight}; text-decoration: underline;">Profile Settings</a>.
       </div>`
    : '';

  return `
    <tr>
      <td class="footer-cell" style="padding: 24px 28px; background-color: #0b1120; border-top: 1px solid ${EMAIL_BRAND.colors.border}; font-size: 12px; color: ${EMAIL_BRAND.colors.textMuted}; line-height: 1.5; text-align: center;">
        
        <!-- 1. Club Name -->
        <div style="font-size: 13px; font-weight: 700; color: #cbd5e1; margin-bottom: 3px; word-break: break-word;">
          ${escapeHtml(EMAIL_BRAND.name)}
        </div>
        
        <!-- 2. University Affiliation -->
        <div style="font-size: 12px; color: #94a3b8; margin-bottom: 8px; word-break: break-word;">
          ${escapeHtml(EMAIL_BRAND.university)}
        </div>

        <!-- 3. Official Club Communication Label (Compact, Mobile-Optimized) -->
        <div style="display: inline-block; font-size: 11px; font-weight: 600; color: ${EMAIL_BRAND.colors.primaryLight}; letter-spacing: 0.04em; margin-bottom: 8px;">
          ${escapeHtml(EMAIL_BRAND.officialCommLabel || 'Official club communication')}
        </div>

        <!-- 4. Contact & Campus Address -->
        <div style="font-size: 11px; color: #64748b; line-height: 1.4; margin-bottom: 6px; word-break: break-word;">
          ${escapeHtml(EMAIL_BRAND.address)}
        </div>

        <!-- 5. Automated Email Notice -->
        <div style="font-size: 11px; color: #64748b; line-height: 1.4; margin-bottom: 6px; word-break: break-word;">
          ${escapeHtml(EMAIL_BRAND.footerNotice || 'This is an automated message. Please do not reply directly unless reply support is configured.')}
        </div>

        ${recipientNote}
        ${unsubscribeHtml}

        <!-- 6. Copyright -->
        <div style="margin-top: 10px; font-size: 11px; color: #475569;">
          &copy; ${currentYear} ${escapeHtml(EMAIL_BRAND.name)}. All rights reserved.
        </div>
      </td>
    </tr>
  `;
}

/**
 * 3. Greeting Section
 */
export function renderGreeting(name: string): string {
  return `
    <p style="margin: 0 0 16px 0; font-size: 15px; color: ${EMAIL_BRAND.colors.textPrimary}; font-weight: 500; word-break: break-word;">
      Hello <strong>${escapeHtml(name)}</strong>,
    </p>
  `;
}

/**
 * 4. Content Section / Paragraph
 */
export function renderParagraph(text: string): string {
  return `
    <p style="margin: 0 0 14px 0; font-size: 15px; line-height: 1.6; color: ${EMAIL_BRAND.colors.textSecondary}; word-break: break-word;">
      ${text}
    </p>
  `;
}

/**
 * 5. Information Card Component (Responsive, Fixed-layout, No Overflow)
 */
export function renderInfoCard(options: { title?: string; items: InfoCardItem[] }): string {
  const rows = options.items.map((item, index) => {
    const isLast = index === options.items.length - 1;
    const borderBottom = isLast ? '' : `border-bottom: 1px solid ${EMAIL_BRAND.colors.border};`;
    const valueColor = item.highlight ? EMAIL_BRAND.colors.primaryLight : '#ffffff';
    const valueWeight = item.highlight ? '700' : '500';

    return `
      <tr>
        <td style="padding: 10px 14px; ${borderBottom} color: ${EMAIL_BRAND.colors.textSecondary}; font-size: 13px; width: 38%; vertical-align: top; word-break: break-word;">
          ${escapeHtml(item.label)}
        </td>
        <td style="padding: 10px 14px; ${borderBottom} color: ${valueColor}; font-weight: ${valueWeight}; font-size: 13px; width: 62%; vertical-align: top; word-break: break-word;">
          ${escapeHtml(item.value)}
        </td>
      </tr>
    `;
  }).join('');

  const titleHtml = options.title
    ? `<div style="padding: 10px 14px; background-color: #172338; border-bottom: 1px solid ${EMAIL_BRAND.colors.border}; font-size: 12px; font-weight: 700; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.05em; word-break: break-word;">
         ${escapeHtml(options.title)}
       </div>`
    : '';

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 18px 0; background-color: ${EMAIL_BRAND.colors.surface}; border-radius: 8px; overflow: hidden; border: 1px solid ${EMAIL_BRAND.colors.border}; table-layout: fixed; width: 100%;">
      ${titleHtml ? `<tr><td colspan="2">${titleHtml}</td></tr>` : ''}
      ${rows}
    </table>
  `;
}

/**
 * 6. Financial Summary Card Component (Responsive, Scaled Typography)
 */
export function renderFinancialCard(options: {
  title: string;
  amount: number | string;
  currency?: string;
  statusText?: string;
  statusVariant?: 'success' | 'warning' | 'danger' | 'info';
  items?: InfoCardItem[];
}): string {
  const currency = options.currency || 'BDT (৳)';
  const formattedAmount = typeof options.amount === 'number' ? options.amount.toLocaleString() : options.amount;
  const statusBadge = options.statusText
    ? renderStatusBadge(options.statusText, options.statusVariant || 'success')
    : '';

  const detailsTable = options.items && options.items.length > 0
    ? renderInfoCard({ items: options.items })
    : '';

  return `
    <div style="margin: 18px 0; padding: 18px 14px; background: linear-gradient(180deg, #132238 0%, #0f172a 100%); border-radius: 10px; border: 1px solid #1e3a5f; text-align: center; box-sizing: border-box; max-width: 100%;">
      <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: ${EMAIL_BRAND.colors.textSecondary}; margin-bottom: 6px; word-break: break-word;">
        ${escapeHtml(options.title)}
      </div>
      <div style="font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em; margin-bottom: 4px; word-break: break-word;">
        ${escapeHtml(formattedAmount)} <span style="font-size: 14px; font-weight: 500; color: ${EMAIL_BRAND.colors.primaryLight};">${escapeHtml(currency)}</span>
      </div>
      ${statusBadge ? `<div style="margin-top: 10px;">${statusBadge}</div>` : ''}
    </div>
    ${detailsTable}
  `;
}

/**
 * 7. Status Badge Component
 */
export function renderStatusBadge(status: string, variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' = 'neutral'): string {
  let color = '#94a3b8';
  let bg = 'rgba(148, 163, 184, 0.12)';
  let border = 'rgba(148, 163, 184, 0.3)';

  switch (variant) {
    case 'success':
      color = '#34d399';
      bg = 'rgba(16, 185, 129, 0.12)';
      border = 'rgba(16, 185, 129, 0.35)';
      break;
    case 'warning':
      color = '#fbbf24';
      bg = 'rgba(245, 158, 11, 0.12)';
      border = 'rgba(245, 158, 11, 0.35)';
      break;
    case 'danger':
      color = '#f87171';
      bg = 'rgba(239, 68, 68, 0.12)';
      border = 'rgba(239, 68, 68, 0.35)';
      break;
    case 'info':
      color = '#38bdf8';
      bg = 'rgba(56, 189, 248, 0.12)';
      border = 'rgba(56, 189, 248, 0.35)';
      break;
  }

  return `
    <span style="display: inline-block; padding: 4px 14px; border-radius: 9999px; font-size: 11px; font-weight: 700; color: ${color}; background-color: ${bg}; border: 1px solid ${border}; text-transform: uppercase; letter-spacing: 0.04em; word-break: break-word;">
      ${escapeHtml(status)}
    </span>
  `;
}

/**
 * 8. Primary CTA Button Component (Tap-friendly 44px, Responsive width)
 */
export function renderPrimaryButton(label: string, url: string): string {
  const safeUrl = sanitizeUrl(url);
  return `
    <div style="margin: 26px 0 18px 0; text-align: center;">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeUrl}" style="height:44px;v-text-anchor:middle;width:240px;" arcsize="16%" stroke="f" fillcolor="${EMAIL_BRAND.colors.primary}">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:sans-serif;font-size:14px;font-weight:600;">${escapeHtml(label)}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <a href="${safeUrl}" target="_blank" class="email-btn" style="display: inline-block; max-width: 100%; box-sizing: border-box; word-break: break-word; background-color: ${EMAIL_BRAND.colors.primary}; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 600; text-align: center; text-decoration: none; padding: 12px 24px; min-height: 44px; line-height: 20px; border-radius: 7px; box-shadow: 0 2px 5px rgba(5, 150, 105, 0.25);">
        ${escapeHtml(label)}
      </a>
      <!--<![endif]-->
    </div>
  `;
}

/**
 * 9. Secondary CTA Link Component
 */
export function renderSecondaryLink(label: string, url: string): string {
  const safeUrl = sanitizeUrl(url);
  return `
    <div style="margin: 12px 0; text-align: center;">
      <a href="${safeUrl}" target="_blank" style="font-size: 13px; color: ${EMAIL_BRAND.colors.primaryLight}; text-decoration: underline; font-weight: 500; word-break: break-word;">
        ${escapeHtml(label)} &rarr;
      </a>
    </div>
  `;
}

/**
 * 10. Professional Divider Component
 */
export function renderDivider(): string {
  return `
    <hr style="border: none; border-top: 1px solid ${EMAIL_BRAND.colors.border}; margin: 22px 0;" />
  `;
}

/**
 * 11. Alert / Warning Box Component
 */
export function renderAlertBox(message: string, type: 'info' | 'warning' | 'danger' | 'success' = 'info'): string {
  let borderColor = '#38bdf8';
  let bgColor = 'rgba(56, 189, 248, 0.08)';
  let textColor = '#bae6fd';
  let icon = 'ℹ️';

  if (type === 'warning') {
    borderColor = '#fbbf24';
    bgColor = 'rgba(245, 158, 11, 0.08)';
    textColor = '#fde68a';
    icon = '⚠️';
  } else if (type === 'danger') {
    borderColor = '#f87171';
    bgColor = 'rgba(239, 68, 68, 0.08)';
    textColor = '#fecaca';
    icon = '🚨';
  } else if (type === 'success') {
    borderColor = '#34d399';
    bgColor = 'rgba(16, 185, 129, 0.08)';
    textColor = '#a7f3d0';
    icon = '✅';
  }

  return `
    <div style="margin: 18px 0; padding: 14px 16px; border-radius: 7px; background-color: ${bgColor}; border-left: 4px solid ${borderColor}; font-size: 13px; line-height: 1.5; color: ${textColor}; box-sizing: border-box; max-width: 100%; word-break: break-word;">
      <strong style="margin-right: 6px;">${icon}</strong> ${escapeHtml(message)}
    </div>
  `;
}

/**
 * Reusable Base Email Layout Wrapper
 * Fully mobile-safe across 320px, 360px, 375px, 390px, 414px viewports
 */
export interface BaseLayoutOptions {
  title: string;
  preheader?: string;
  content: string;
  actionButton?: { label: string; url: string };
  recipientEmail?: string;
  showUnsubscribe?: boolean;
}

export function renderBaseLayout(options: BaseLayoutOptions): string {
  const preheaderHtml = options.preheader
    ? `<div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${escapeHtml(options.preheader)}</div>`
    : '';

  const actionButtonHtml = options.actionButton
    ? renderPrimaryButton(options.actionButton.label, options.actionButton.url)
    : '';

  return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>${escapeHtml(options.title)}</title>
  <!--[if mso]>
  <style>
    * { font-family: sans-serif !important; }
  </style>
  <![endif]-->
  <style>
    /* Reset and cross-client normalization */
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    /* Mobile responsive optimizations for 320px - 414px viewports */
    @media only screen and (max-width: 620px) {
      .email-wrapper { width: 100% !important; padding: 12px 6px !important; }
      .email-container { width: 100% !important; max-width: 100% !important; border-radius: 8px !important; }
      .content-cell { padding: 22px 16px !important; font-size: 14px !important; }
      .header-cell { padding: 20px 16px !important; }
      .footer-cell { padding: 20px 14px !important; }
      .mobile-stack { display: block !important; width: 100% !important; }
      .mobile-full-width { width: 100% !important; }
      .email-btn { width: 100% !important; max-width: 280px !important; display: block !important; margin: 0 auto !important; padding: 12px 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; width: 100% !important; background-color: ${EMAIL_BRAND.colors.background}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: ${EMAIL_BRAND.colors.textPrimary}; -webkit-font-smoothing: antialiased;">
  ${preheaderHtml}
  <table class="email-wrapper" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: ${EMAIL_BRAND.colors.background}; padding: 28px 0; width: 100%;">
    <tr>
      <td align="center" style="padding: 0 8px;">
        
        <!-- Main Card Container (Responsive & Fixed-Layout Safe) -->
        <table class="email-container" role="presentation" width="580" cellspacing="0" cellpadding="0" border="0" style="width: 100%; max-width: 580px; background-color: ${EMAIL_BRAND.colors.cardBackground}; border: 1px solid ${EMAIL_BRAND.colors.border}; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45); table-layout: fixed;">
          
          ${renderHeader()}

          <!-- Main Content Cell -->
          <tr>
            <td class="content-cell" style="padding: 30px 32px; font-size: 15px; line-height: 1.6; color: ${EMAIL_BRAND.colors.textSecondary}; word-break: break-word;">
              ${options.content}
              ${actionButtonHtml}
            </td>
          </tr>

          ${renderFooter({ recipientEmail: options.recipientEmail, showUnsubscribe: options.showUnsubscribe })}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
