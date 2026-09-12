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
 * Minimal Institutional Layout:
 * - Refined dark navy background (#0f1f38)
 * - Clean minimal typography: "DIU Investment Club" + "Daffodil International University"
 * - Avoids oversized colored blocks, loud badges, and gradients
 */
export function renderHeader(options?: { subtitle?: string }): string {
  const logoHtml = EMAIL_BRAND.logoUrl
    ? `<div style="margin-bottom: 8px;">
         <img src="${sanitizeUrl(EMAIL_BRAND.logoUrl)}" alt="${escapeHtml(EMAIL_BRAND.name)}" style="max-height: 32px; max-width: 120px; height: auto; border: 0;" />
       </div>`
    : '';

  return `
    <tr>
      <td class="header-cell" style="padding: 22px 32px; background-color: #0f1f38; border-bottom: 1px solid #e2e8f0;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td valign="middle" align="left">
              ${logoHtml}
              <div style="font-size: 18px; font-weight: 700; color: #ffffff; letter-spacing: -0.01em; line-height: 1.25; word-break: break-word;">
                ${escapeHtml(EMAIL_BRAND.name)}
              </div>
              <div style="font-size: 12px; font-weight: 400; color: #94a3b8; margin-top: 3px; letter-spacing: 0.01em;">
                ${escapeHtml(EMAIL_BRAND.university)}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

/**
 * 2. Email Footer Component
 * Minimal Professional Layout:
 * - DIU Investment Club
 * - Daffodil International University
 * - For assistance: 252-58-083@diu.edu.bd
 * - © 2026 DIU Investment Club
 * Clean, compact, and free of unnecessary badges or physical addresses.
 */
export function renderFooter(options?: { recipientEmail?: string; showUnsubscribe?: boolean }): string {
  const currentYear = new Date().getFullYear();
  const recipientNote = options?.recipientEmail
    ? `<div style="margin: 8px 0 0 0; font-size: 11px; color: #94a3b8; word-break: break-all;">Sent to ${escapeHtml(options.recipientEmail)}</div>`
    : '';

  const unsubscribeHtml = options?.showUnsubscribe
    ? `<div style="margin: 8px 0 0 0; font-size: 11px; color: #94a3b8;">
         <a href="${sanitizeUrl(EMAIL_BRAND.portalUrl + '/settings')}" style="color: #64748b; text-decoration: underline;">Notification Preferences</a>
       </div>`
    : '';

  return `
    <tr>
      <td class="footer-cell" style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.6; text-align: center;">
        <div style="font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 2px;">
          ${escapeHtml(EMAIL_BRAND.name)}
        </div>
        <div style="font-size: 12px; color: #64748b; margin-bottom: 10px;">
          ${escapeHtml(EMAIL_BRAND.university)}
        </div>
        <div style="font-size: 12px; color: #64748b; margin-bottom: 12px;">
          For assistance: <a href="mailto:${escapeHtml(EMAIL_BRAND.supportEmail)}" style="color: #0f1f38; font-weight: 600; text-decoration: underline;">${escapeHtml(EMAIL_BRAND.supportEmail)}</a>
        </div>
        <div style="font-size: 11px; color: #94a3b8;">
          &copy; ${currentYear} ${escapeHtml(EMAIL_BRAND.name)}
        </div>
        ${recipientNote}
        ${unsubscribeHtml}
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
 * 6. Financial Summary Card Component (Responsive, Clean Light Box)
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
    <div style="margin: 20px 0; padding: 20px 18px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center; box-sizing: border-box; max-width: 100%;">
      <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 6px; word-break: break-word;">
        ${escapeHtml(options.title)}
      </div>
      <div style="font-size: 26px; font-weight: 700; color: #0f172a; letter-spacing: -0.02em; margin-bottom: 4px; line-height: 1.2; word-break: break-word;">
        ${escapeHtml(formattedAmount)} <span style="font-size: 14px; font-weight: 500; color: #475569;">${escapeHtml(currency)}</span>
      </div>
      ${statusBadge ? `<div style="margin-top: 10px;">${statusBadge}</div>` : ''}
    </div>
    ${detailsTable}
  `;
}

/**
 * 6B. Dedicated Receipt Card for Payment Emails
 * Unified, clean, receipt-style layout:
 * - Payment Amount & Status badge
 * - Structured key-value items (Reference, Method, Date, Receipt #)
 * - Single cohesive container without unnecessary boxes
 */
export function renderReceiptCard(options: {
  amount: number | string;
  currency?: string;
  status?: string;
  reference: string;
  method?: string;
  date: string;
  receiptNumber?: string;
}): string {
  const currency = options.currency || 'BDT';
  const formattedAmount = typeof options.amount === 'number' ? options.amount.toLocaleString() : options.amount;
  const statusText = options.status || 'CONFIRMED';

  const rows: { label: string; value: string; isMono?: boolean }[] = [
    { label: 'Payment Reference', value: options.reference, isMono: true },
    ...(options.method ? [{ label: 'Payment Method', value: options.method }] : []),
    { label: 'Confirmation Date', value: options.date },
    ...(options.receiptNumber ? [{ label: 'Receipt Number', value: options.receiptNumber, isMono: true }] : []),
  ];

  const rowsHtml = rows.map((r, i) => {
    const isLast = i === rows.length - 1;
    const border = isLast ? '' : 'border-bottom: 1px solid #f1f5f9;';
    const fontFam = r.isMono ? 'font-family: ui-monospace, SFMono-Regular, Consolas, monospace;' : '';
    return `
      <tr>
        <td style="padding: 10px 0; ${border} color: #64748b; font-size: 13px; font-weight: 500; width: 42%; vertical-align: top;">
          ${escapeHtml(r.label)}
        </td>
        <td style="padding: 10px 0; ${border} color: #0f172a; font-size: 13px; font-weight: 600; ${fontFam} width: 58%; text-align: right; vertical-align: top; word-break: break-word;">
          ${escapeHtml(r.value)}
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div style="margin: 22px 0; padding: 22px 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; box-sizing: border-box;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td valign="middle" align="left">
            <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; margin-bottom: 4px;">
              Amount Paid
            </div>
            <div style="font-size: 26px; font-weight: 700; color: #0f172a; letter-spacing: -0.02em; line-height: 1.15;">
              ৳ ${escapeHtml(formattedAmount)} <span style="font-size: 13px; font-weight: 500; color: #64748b;">${escapeHtml(currency)}</span>
            </div>
          </td>
          <td valign="middle" align="right">
            ${renderStatusBadge(statusText, 'success')}
          </td>
        </tr>
      </table>

      <div style="border-top: 1px solid #e2e8f0; margin: 18px 0 8px 0;"></div>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        ${rowsHtml}
      </table>
    </div>
  `;
}

/**
 * 7. Status Badge Component (Professional, Muted Status Pills)
 */
export function renderStatusBadge(status: string, variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' = 'neutral'): string {
  let color = '#334155';
  let bg = '#f1f5f9';
  let border = '#e2e8f0';

  switch (variant) {
    case 'success':
      color = '#15803d';
      bg = '#ecfdf5';
      border = '#bbf7d0';
      break;
    case 'warning':
      color = '#92400e';
      bg = '#fffbeb';
      border = '#fde68a';
      break;
    case 'danger':
      color = '#991b1b';
      bg = '#fef2f2';
      border = '#fecaca';
      break;
    case 'info':
      color = '#0369a1';
      bg = '#f0f9ff';
      border = '#bae6fd';
      break;
  }

  return `
    <span style="display: inline-block; padding: 3px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; color: ${color}; background-color: ${bg}; border: 1px solid ${border}; text-transform: uppercase; letter-spacing: 0.05em; word-break: break-word;">
      ${escapeHtml(status)}
    </span>
  `;
}

/**
 * 8. Primary CTA Button Component (Elegant Institutional Navy, Outlook MSO VML, 44px min height)
 */
export function renderPrimaryButton(label: string, url: string): string {
  const safeUrl = sanitizeUrl(url);
  return `
    <div style="margin: 26px 0 16px 0; text-align: center;">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeUrl}" style="height:44px;v-text-anchor:middle;width:220px;" arcsize="14%" stroke="f" fillcolor="#0f1f38">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:sans-serif;font-size:14px;font-weight:600;">${escapeHtml(label)}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <a href="${safeUrl}" target="_blank" class="email-btn" style="display: inline-block; max-width: 100%; box-sizing: border-box; word-break: break-word; background-color: #0f1f38; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 600; text-align: center; text-decoration: none; padding: 12px 26px; min-height: 44px; line-height: 20px; border-radius: 6px;">
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
      <a href="${safeUrl}" target="_blank" style="font-size: 13px; color: #0f1f38; text-decoration: underline; font-weight: 500; word-break: break-word;">
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
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
  `;
}

/**
 * 11. Subtle Security & Information Callout Component
 * Understated, clean, and low-contrast to avoid loud colored boxes.
 */
export function renderAlertBox(message: string, type: 'info' | 'warning' | 'danger' | 'success' = 'info'): string {
  let borderColor = '#94a3b8';
  let bgColor = '#f8fafc';
  let textColor = '#334155';

  if (type === 'warning') {
    borderColor = '#d97706';
    bgColor = '#fffdfa';
    textColor = '#78350f';
  } else if (type === 'danger') {
    borderColor = '#ef4444';
    bgColor = '#fefafa';
    textColor = '#7f1d1d';
  } else if (type === 'success') {
    borderColor = '#10b981';
    bgColor = '#f9fefb';
    textColor = '#14532d';
  }

  return `
    <div style="margin: 18px 0; padding: 12px 14px; border-radius: 6px; background-color: ${bgColor}; border: 1px solid #e2e8f0; border-left: 3px solid ${borderColor}; font-size: 13px; line-height: 1.5; color: ${textColor}; box-sizing: border-box; max-width: 100%; word-break: break-word;">
      ${escapeHtml(message)}
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
