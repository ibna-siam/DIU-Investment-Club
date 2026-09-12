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
 * Institutional University Aesthetic:
 * - Top DIU Emerald Green accent bar (4px)
 * - Deep Institutional Navy background (#0b1f3a)
 * - University & Club Hierarchy
 */
export function renderHeader(options?: { subtitle?: string }): string {
  const logoHtml = EMAIL_BRAND.logoUrl
    ? `<div style="margin-bottom: 10px;">
         <img src="${sanitizeUrl(EMAIL_BRAND.logoUrl)}" alt="${escapeHtml(EMAIL_BRAND.name)}" style="max-height: 40px; max-width: 140px; height: auto; border: 0;" />
       </div>`
    : '';

  const subtitleText = options?.subtitle || 'Official Club Communication';
  const subtitleHtml = `<div style="font-size: 11px; font-weight: 500; color: #cbd5e1; margin-top: 4px; letter-spacing: 0.04em; text-transform: uppercase;">
         ${escapeHtml(subtitleText)}
       </div>`;

  return `
    <tr>
      <td class="header-cell" style="padding: 26px 32px; background-color: #0b1f3a; border-top: 4px solid #059669; border-bottom: 1px solid #e2e8f0;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td valign="middle" align="left">
              ${logoHtml}
              <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.12em; color: #34d399; text-transform: uppercase; margin-bottom: 4px; word-break: break-word;">
                ${escapeHtml(EMAIL_BRAND.university)}
              </div>
              <div style="font-size: 21px; font-weight: 800; color: #ffffff; letter-spacing: -0.01em; line-height: 1.25; word-break: break-word;">
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
 * - Official club communication pill badge
 * - Campus Address
 * - Reply-To Support & Contact Notice
 * - Official Domain (invesmentclub.top)
 * - Recipient & Copyright notes
 */
export function renderFooter(options?: { recipientEmail?: string; showUnsubscribe?: boolean }): string {
  const currentYear = new Date().getFullYear();
  const recipientNote = options?.recipientEmail
    ? `<div style="margin: 6px 0; font-size: 11px; color: #94a3b8; word-break: break-all;">Sent to ${escapeHtml(options.recipientEmail)}</div>`
    : '';

  const unsubscribeHtml = options?.showUnsubscribe
    ? `<div style="margin: 10px 0 0 0; font-size: 11px; color: #64748b;">
         To manage your notification preferences, visit your 
         <a href="${sanitizeUrl(EMAIL_BRAND.portalUrl + '/settings')}" style="color: #059669; text-decoration: underline;">Profile Settings</a>.
       </div>`
    : '';

  return `
    <tr>
      <td class="footer-cell" style="padding: 28px 32px 24px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.55; text-align: center;">
        
        <!-- 1. Club Name -->
        <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 2px; word-break: break-word;">
          ${escapeHtml(EMAIL_BRAND.name)}
        </div>
        
        <!-- 2. University Affiliation -->
        <div style="font-size: 12px; font-weight: 500; color: #475569; margin-bottom: 8px; word-break: break-word;">
          ${escapeHtml(EMAIL_BRAND.university)}
        </div>

        <!-- 3. Official Club Communication Label -->
        <div style="display: inline-block; font-size: 10px; font-weight: 700; color: #047857; background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 2px 10px; border-radius: 9999px; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 10px;">
          ${escapeHtml(EMAIL_BRAND.officialCommLabel || 'Official club communication')}
        </div>

        <!-- 4. Contact & Campus Address -->
        <div style="font-size: 11px; color: #64748b; line-height: 1.45; margin-bottom: 6px; word-break: break-word;">
          ${escapeHtml(EMAIL_BRAND.address)}
        </div>

        <!-- 5. Reply-To Support & Contact Notice -->
        <div style="font-size: 11px; color: #475569; line-height: 1.45; margin-bottom: 8px; word-break: break-word;">
          Questions or inquiries? Reply directly to this email or reach us at <a href="mailto:${escapeHtml(EMAIL_BRAND.supportEmail)}" style="color: #059669; font-weight: 600; text-decoration: underline;">${escapeHtml(EMAIL_BRAND.supportEmail)}</a>
        </div>

        <!-- 6. Official Domain Link -->
        <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">
          Official Portal: <a href="https://invesmentclub.top" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: none;">invesmentclub.top</a>
        </div>

        ${recipientNote}
        ${unsubscribeHtml}

        <!-- 7. Copyright -->
        <div style="margin-top: 12px; font-size: 11px; color: #94a3b8;">
          &copy; ${currentYear} ${escapeHtml(EMAIL_BRAND.name)} • ${escapeHtml(EMAIL_BRAND.university)}. All rights reserved.
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
    <p style="margin: 0 0 16px 0; font-size: 16px; color: #0f172a; font-weight: 600; word-break: break-word;">
      Hello <strong>${escapeHtml(name)}</strong>,
    </p>
  `;
}

/**
 * 4. Content Section / Paragraph
 */
export function renderParagraph(text: string): string {
  return `
    <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.65; color: #334155; word-break: break-word;">
      ${text}
    </p>
  `;
}

/**
 * 5. Information Card Component (Responsive, Clean Light Table, No Overflow)
 */
export function renderInfoCard(options: { title?: string; items: InfoCardItem[] }): string {
  const rows = options.items.map((item, index) => {
    const isLast = index === options.items.length - 1;
    const borderBottom = isLast ? '' : `border-bottom: 1px solid #e2e8f0;`;
    const valueColor = item.highlight ? '#059669' : '#0f172a';
    const valueWeight = item.highlight ? '700' : '600';

    return `
      <tr>
        <td style="padding: 11px 16px; ${borderBottom} color: #64748b; font-size: 13px; font-weight: 500; width: 40%; vertical-align: top; word-break: break-word;">
          ${escapeHtml(item.label)}
        </td>
        <td style="padding: 11px 16px; ${borderBottom} color: ${valueColor}; font-weight: ${valueWeight}; font-size: 13px; width: 60%; vertical-align: top; word-break: break-word;">
          ${escapeHtml(item.value)}
        </td>
      </tr>
    `;
  }).join('');

  const titleHtml = options.title
    ? `<div style="padding: 11px 16px; background-color: #f1f5f9; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em; word-break: break-word;">
         ${escapeHtml(options.title)}
       </div>`
    : '';

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 20px 0; background-color: #f8fafc; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; table-layout: fixed; width: 100%;">
      ${titleHtml ? `<tr><td colspan="2">${titleHtml}</td></tr>` : ''}
      ${rows}
    </table>
  `;
}

/**
 * 6. Financial Summary Card Component (Responsive, Light Card, Scaled Typography)
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
    <div style="margin: 22px 0; padding: 22px 18px; background-color: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; border-top: 3px solid #059669; text-align: center; box-sizing: border-box; max-width: 100%;">
      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin-bottom: 8px; word-break: break-word;">
        ${escapeHtml(options.title)}
      </div>
      <div style="font-size: 30px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; margin-bottom: 4px; line-height: 1.15; word-break: break-word;">
        ${escapeHtml(formattedAmount)} <span style="font-size: 14px; font-weight: 600; color: #059669;">${escapeHtml(currency)}</span>
      </div>
      ${statusBadge ? `<div style="margin-top: 12px;">${statusBadge}</div>` : ''}
    </div>
    ${detailsTable}
  `;
}

/**
 * 7. Status Badge Component (Clean Light Pills)
 */
export function renderStatusBadge(status: string, variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' = 'neutral'): string {
  let color = '#334155';
  let bg = '#f1f5f9';
  let border = '#cbd5e1';

  switch (variant) {
    case 'success':
      color = '#15803d';
      bg = '#dcfce7';
      border = '#bbf7d0';
      break;
    case 'warning':
      color = '#b45309';
      bg = '#fef3c7';
      border = '#fde68a';
      break;
    case 'danger':
      color = '#b91c1c';
      bg = '#fee2e2';
      border = '#fecaca';
      break;
    case 'info':
      color = '#0369a1';
      bg = '#e0f2fe';
      border = '#bae6fd';
      break;
  }

  return `
    <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; color: ${color}; background-color: ${bg}; border: 1px solid ${border}; text-transform: uppercase; letter-spacing: 0.05em; word-break: break-word;">
      ${escapeHtml(status)}
    </span>
  `;
}

/**
 * 8. Primary CTA Button Component (Tap-friendly 44px, DIU Emerald Green, Outlook MSO VML)
 */
export function renderPrimaryButton(label: string, url: string): string {
  const safeUrl = sanitizeUrl(url);
  return `
    <div style="margin: 28px 0 20px 0; text-align: center;">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeUrl}" style="height:46px;v-text-anchor:middle;width:240px;" arcsize="18%" stroke="f" fillcolor="#059669">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:sans-serif;font-size:14px;font-weight:700;">${escapeHtml(label)}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <a href="${safeUrl}" target="_blank" class="email-btn" style="display: inline-block; max-width: 100%; box-sizing: border-box; word-break: break-word; background-color: #059669; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 600; text-align: center; text-decoration: none; padding: 13px 28px; min-height: 44px; line-height: 20px; border-radius: 8px; box-shadow: 0 2px 6px rgba(5, 150, 105, 0.25);">
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
    <div style="margin: 14px 0; text-align: center;">
      <a href="${safeUrl}" target="_blank" style="font-size: 13px; color: #059669; text-decoration: underline; font-weight: 600; word-break: break-word;">
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
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
  `;
}

/**
 * 11. Alert / Warning Box Component (Clean Soft Light Callouts)
 */
export function renderAlertBox(message: string, type: 'info' | 'warning' | 'danger' | 'success' = 'info'): string {
  let borderColor = '#0284c7';
  let bgColor = '#f0f9ff';
  let textColor = '#0369a1';
  let icon = 'ℹ️';

  if (type === 'warning') {
    borderColor = '#d97706';
    bgColor = '#fffbeb';
    textColor = '#92400e';
    icon = '⚠️';
  } else if (type === 'danger') {
    borderColor = '#dc2626';
    bgColor = '#fef2f2';
    textColor = '#991b1b';
    icon = '🚨';
  } else if (type === 'success') {
    borderColor = '#059669';
    bgColor = '#f0fdf4';
    textColor = '#166534';
    icon = '✅';
  }

  return `
    <div style="margin: 20px 0; padding: 14px 16px; border-radius: 8px; background-color: ${bgColor}; border-left: 4px solid ${borderColor}; border-top: 1px solid ${borderColor}20; border-right: 1px solid ${borderColor}20; border-bottom: 1px solid ${borderColor}20; font-size: 13px; line-height: 1.55; color: ${textColor}; box-sizing: border-box; max-width: 100%; word-break: break-word;">
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
  headerSubtitle?: string;
  preheader?: string;
  content: string;
  actionButton?: { label: string; url: string };
  recipientEmail?: string;
  showUnsubscribe?: boolean;
}

export function renderBaseLayout(options: BaseLayoutOptions): string {
  const preheaderHtml = options.preheader
    ? `<div style="display:none;font-size:1px;color:#f1f5f9;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${escapeHtml(options.preheader)}</div>`
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
      .content-cell { padding: 24px 18px !important; font-size: 14px !important; }
      .header-cell { padding: 22px 18px !important; }
      .footer-cell { padding: 22px 16px !important; }
      .mobile-stack { display: block !important; width: 100% !important; }
      .mobile-full-width { width: 100% !important; }
      .email-btn { width: 100% !important; max-width: 280px !important; display: block !important; margin: 0 auto !important; padding: 13px 18px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; width: 100% !important; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; -webkit-font-smoothing: antialiased;">
  ${preheaderHtml}
  <table class="email-wrapper" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 32px 0; width: 100%;">
    <tr>
      <td align="center" style="padding: 0 10px;">
        
        <!-- Main Card Container (Institutional White Surface) -->
        <table class="email-container" role="presentation" width="580" cellspacing="0" cellpadding="0" border="0" style="width: 100%; max-width: 580px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06); table-layout: fixed;">
          
          ${renderHeader({ subtitle: options.headerSubtitle })}

          <!-- Main Content Cell -->
          <tr>
            <td class="content-cell" style="padding: 32px 36px; font-size: 15px; line-height: 1.65; color: #334155; word-break: break-word;">
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
