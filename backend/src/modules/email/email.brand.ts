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
  supportEmail: 'investmentclub@diu.edu.bd',
  officialWebsite: 'https://daffodilvarsity.edu.bd',
  portalUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  address: 'Daffodil Smart City, Birulia, Savar, Dhaka-1216, Bangladesh',
  officialCommLabel: 'Official club communication',
  footerNotice: 'This is an automated message. Please do not reply directly unless reply support is configured.',
  logoUrl: '',
  
  // Default Email Sender Name & Format
  senderName: 'DIU Investment Club',
  
  // Visual Identity Colors (Professional, Academic, Financially Trustworthy)
  colors: {
    background: '#090d16',      // Deep midnight slate background
    cardBackground: '#0f172a',  // Container / Card slate
    surface: '#1e293b',         // Inner highlight / tables
    border: '#273549',          // Subtle dividers
    primary: '#059669',         // Emerald green (trust, growth, financial)
    primaryHover: '#047857',
    primaryLight: '#34d399',
    accent: '#0284c7',          // Academic blue
    textPrimary: '#f8fafc',     // Crisp white / slate-50
    textSecondary: '#94a3b8',   // Subtle slate-400
    textMuted: '#64748b',       // Footer slate-500
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
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
