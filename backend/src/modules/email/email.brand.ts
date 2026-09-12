/**
 * DIU Investment Club - Centralized Email Brand Configuration
 *
 * MANDATORY BRANDING RULE:
 * The official email brand name is strictly: "DIU Investment Club"
 * University Affiliation: "Daffodil International University"
 * Never use "ERP" or "Financial Management System" in outgoing member-facing communications.
 */

import { settingsRepository } from '../settings/settings.repository';

export interface EmailBrandConfig {
  name: string;
  shortName: string;
  organizationName: string;
  university: string;
  universityAffiliation?: string;
  tagline: string;
  supportEmail: string;
  replyToEmail: string;
  officialWebsite: string;
  portalUrl: string;
  address: string;
  officialCommLabel: string;
  footerNotice: string;
  logoUrl?: string;
  senderName: string;
  colors: {
    background: string;
    cardBackground: string;
    surface: string;
    border: string;
    navy: string;
    navyLight: string;
    primary: string;
    primaryHover: string;
    primaryLight: string;
    accent: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    success: string;
    warning: string;
    danger: string;
  };
  subjectSuffix: string;
}

export const DEFAULT_EMAIL_BRAND: EmailBrandConfig = {
  name: 'DIU Investment Club',
  shortName: 'DIU Investment Club',
  organizationName: 'DIU Investment Club (Daffodil International University)',
  university: 'Daffodil International University',
  universityAffiliation: 'Daffodil International University',
  tagline: 'Fostering Financial Literacy, Leadership & Strategic Investment',
  
  // Official Contact & Socials
  supportEmail: '252-58-083@diu.edu.bd',
  replyToEmail: '252-58-083@diu.edu.bd',
  officialWebsite: 'https://daffodilvarsity.edu.bd',
  portalUrl: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',')[0].trim().replace(/\/+$/, '') : 'https://invesmentclub.top',
  address: 'Daffodil Smart City, Birulia, Savar, Dhaka-1216, Bangladesh',
  officialCommLabel: 'Official club communication',
  footerNotice: 'Questions or inquiries? Reply directly to this email or contact 252-58-083@diu.edu.bd.',
  logoUrl: '',
  
  // Default Email Sender Name & Format
  senderName: 'DIU Investment Club',
  
  // Visual Identity Colors (Official Institutional Academic, Clean Light Surfaces)
  colors: {
    background: '#f1f5f9',      // Clean light neutral background (slate-100)
    cardBackground: '#ffffff',  // Pure white card container
    surface: '#f8fafc',         // Inner highlight / table surfaces (slate-50)
    border: '#e2e8f0',          // Refined light gray divider (slate-200)
    navy: '#0b1f3a',            // Deep institutional navy
    navyLight: '#1e3a5f',       // Medium navy accent
    primary: '#059669',         // DIU-inspired emerald green
    primaryHover: '#047857',
    primaryLight: '#10b981',
    accent: '#0284c7',          // Academic blue
    textPrimary: '#0f172a',     // Deep slate / charcoal (high contrast, crisp readability)
    textSecondary: '#334155',   // Medium charcoal / slate-700
    textMuted: '#64748b',       // Neutral slate-500
    success: '#059669',
    warning: '#d97706',
    danger: '#dc2626',
  },

  // Standardized Email Subject Line Suffix
  subjectSuffix: '| DIU Investment Club',
};

/**
 * Returns dynamic brand configuration from system settings cache,
 * falling back safely to DEFAULT_EMAIL_BRAND.
 */
export function getEmailBrandConfig(): EmailBrandConfig {
  try {
    const cached = typeof settingsRepository?.getAllCached === 'function' 
      ? settingsRepository.getAllCached() 
      : {};

    return {
      ...DEFAULT_EMAIL_BRAND,
      name: cached.club_name || DEFAULT_EMAIL_BRAND.name,
      shortName: cached.club_short_name || DEFAULT_EMAIL_BRAND.shortName,
      university: cached.university_name || DEFAULT_EMAIL_BRAND.university,
      universityAffiliation: cached.university_name || DEFAULT_EMAIL_BRAND.university,
      supportEmail: cached.contact_email || DEFAULT_EMAIL_BRAND.supportEmail,
      replyToEmail: cached.reply_to_email || DEFAULT_EMAIL_BRAND.replyToEmail,
      address: cached.campus_address || DEFAULT_EMAIL_BRAND.address,
      officialWebsite: cached.official_website || DEFAULT_EMAIL_BRAND.officialWebsite,
      officialCommLabel: cached.official_comm_label || DEFAULT_EMAIL_BRAND.officialCommLabel,
      footerNotice: cached.footer_text || DEFAULT_EMAIL_BRAND.footerNotice,
      logoUrl: cached.club_logo_url || DEFAULT_EMAIL_BRAND.logoUrl,
    };
  } catch {
    return DEFAULT_EMAIL_BRAND;
  }
}

/**
 * Dynamic proxy providing seamless backward compatibility for existing imports of EMAIL_BRAND.
 * Automatically resolves current branding from settings.
 */
export const EMAIL_BRAND: EmailBrandConfig = new Proxy(DEFAULT_EMAIL_BRAND, {
  get(target, prop: string | symbol) {
    if (typeof prop === 'string' && prop in target) {
      const dynamic = getEmailBrandConfig();
      return (dynamic as any)[prop] ?? (target as any)[prop];
    }
    return (target as any)[prop];
  },
});
