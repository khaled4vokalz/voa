/**
 * Tajweed rule types based on cpfair/quran-tajweed
 */
export type TajweedRuleType =
  // Ghunnah
  | 'ghunnah'
  // Idghaam variants
  | 'idghaam_ghunnah'
  | 'idghaam_no_ghunnah'
  | 'idghaam_mutajaanisain'
  | 'idghaam_mutaqaaribain'
  | 'idghaam_shafawi'
  // Ikhfa variants
  | 'ikhfa'
  | 'ikhfa_shafawi'
  // Iqlab
  | 'iqlab'
  // Madd variants
  | 'madd_2'
  | 'madd_246'
  | 'madd_muttasil'
  | 'madd_munfasil'
  | 'madd_6'
  // Qalqalah
  | 'qalqalah'
  // Other
  | 'hamzat_wasl'
  | 'lam_shamsiyyah'
  // Silent letters
  | 'silent';

/**
 * A single tajweed annotation from cpfair/quran-tajweed
 */
export interface TajweedAnnotation {
  rule: TajweedRuleType;
  /** Unicode codepoint start offset */
  start: number;
  /** Unicode codepoint end offset */
  end: number;
}

/**
 * Tajweed data for a single ayah
 */
export interface AyahTajweed {
  surah: number;
  ayah: number;
  annotations: TajweedAnnotation[];
}

/**
 * A detected tajweed violation in user's recitation
 */
export interface TajweedViolation {
  rule: TajweedRuleType;
  /** Expected behavior */
  expected: string;
  /** What was detected */
  actual: string;
  /** Position in the ayah text */
  position: {
    start: number;
    end: number;
  };
  /** Severity: minor = pronunciation slightly off, major = rule completely missed */
  severity: 'minor' | 'major';
}
