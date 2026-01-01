import type { TajweedRuleType } from '../types/tajweed.js';

/**
 * Human-readable descriptions for each tajweed rule
 */
export const TAJWEED_RULE_INFO: Record<
  TajweedRuleType,
  {
    name: string;
    nameArabic: string;
    description: string;
    color: string;
  }
> = {
  ghunnah: {
    name: 'Ghunnah',
    nameArabic: 'غُنَّة',
    description: 'Nasalization held for 2 counts',
    color: '#FF6B6B',
  },
  idghaam_ghunnah: {
    name: 'Idghaam with Ghunnah',
    nameArabic: 'إدغام بغنة',
    description: 'Merging with nasalization into ي ن م و',
    color: '#4ECDC4',
  },
  idghaam_no_ghunnah: {
    name: 'Idghaam without Ghunnah',
    nameArabic: 'إدغام بلا غنة',
    description: 'Merging without nasalization into ل ر',
    color: '#45B7D1',
  },
  idghaam_mutajaanisain: {
    name: 'Idghaam Mutajaanisain',
    nameArabic: 'إدغام متجانسين',
    description: 'Merging of letters with same articulation point',
    color: '#96CEB4',
  },
  idghaam_mutaqaaribain: {
    name: 'Idghaam Mutaqaaribain',
    nameArabic: 'إدغام متقاربين',
    description: 'Merging of letters with close articulation points',
    color: '#FFEAA7',
  },
  idghaam_shafawi: {
    name: 'Idghaam Shafawi',
    nameArabic: 'إدغام شفوي',
    description: 'Lip merging of meem sakinah into meem',
    color: '#DDA0DD',
  },
  ikhfa: {
    name: 'Ikhfa',
    nameArabic: 'إخفاء',
    description: 'Hidden pronunciation of noon sakinah/tanween',
    color: '#98D8C8',
  },
  ikhfa_shafawi: {
    name: 'Ikhfa Shafawi',
    nameArabic: 'إخفاء شفوي',
    description: 'Hidden lip pronunciation of meem sakinah before ba',
    color: '#F7DC6F',
  },
  iqlab: {
    name: 'Iqlab',
    nameArabic: 'إقلاب',
    description: 'Converting noon sakinah/tanween to meem before ba',
    color: '#BB8FCE',
  },
  madd_2: {
    name: 'Natural Madd',
    nameArabic: 'مد طبيعي',
    description: 'Natural elongation for 2 counts',
    color: '#85C1E9',
  },
  madd_246: {
    name: 'Madd Aarid/Leen',
    nameArabic: 'مد عارض / لين',
    description: 'Elongation for 2, 4, or 6 counts when stopping',
    color: '#82E0AA',
  },
  madd_muttasil: {
    name: 'Madd Muttasil',
    nameArabic: 'مد متصل',
    description: 'Connected elongation for 4-5 counts',
    color: '#F8B500',
  },
  madd_munfasil: {
    name: 'Madd Munfasil',
    nameArabic: 'مد منفصل',
    description: 'Separated elongation for 4-5 counts',
    color: '#00CED1',
  },
  madd_6: {
    name: 'Madd Laazim',
    nameArabic: 'مد لازم',
    description: 'Obligatory elongation for 6 counts',
    color: '#FF6347',
  },
  qalqalah: {
    name: 'Qalqalah',
    nameArabic: 'قلقلة',
    description: 'Echoing sound on ق ط ب ج د when sakin',
    color: '#9B59B6',
  },
  hamzat_wasl: {
    name: 'Hamzat al-Wasl',
    nameArabic: 'همزة الوصل',
    description: 'Connecting hamza (silent when continuing)',
    color: '#1ABC9C',
  },
  lam_shamsiyyah: {
    name: 'Lam Shamsiyyah',
    nameArabic: 'لام شمسية',
    description: 'Silent lam in al- before sun letters',
    color: '#E74C3C',
  },
};
