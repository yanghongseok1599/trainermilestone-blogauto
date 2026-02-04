/**
 * 생성 결과 후처리 검증 (post-validation)
 *
 * 블로그 글 생성 후 저장 전에 품질을 검증합니다.
 * 통과/실패 기준이 명확하며, 실패 시 자동 수정 또는 재생성을 유도합니다.
 */

import { Facts } from './prompts';

// 검증 결과 타입
export interface ValidationResult {
  passed: boolean;
  score: number;           // 0~100
  issues: ValidationIssue[];
  autoFixed?: string;      // 자동 수정된 텍스트 (있으면)
}

export interface ValidationIssue {
  type: 'critical' | 'warning';
  code: string;
  message: string;
}

// ============================================================
// 1. 금지 패턴 검사
// ============================================================

function checkForbiddenPatterns(text: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // 마크다운 헤딩
  const headingCount = (text.match(/^#{1,6}\s/gm) || []).length;
  if (headingCount > 0) {
    issues.push({
      type: 'warning',
      code: 'MARKDOWN_HEADING',
      message: `마크다운 헤딩(#) ${headingCount}개 발견`,
    });
  }

  // 볼드 마크다운
  const boldCount = (text.match(/\*\*[^*]+\*\*/g) || []).length;
  if (boldCount > 0) {
    issues.push({
      type: 'warning',
      code: 'MARKDOWN_BOLD',
      message: `마크다운 볼드(**) ${boldCount}개 발견`,
    });
  }

  // 이모지 감지
  const emojiPattern = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  const emojiCount = (text.match(emojiPattern) || []).length;
  if (emojiCount > 0) {
    issues.push({
      type: 'warning',
      code: 'EMOJI_FOUND',
      message: `이모지 ${emojiCount}개 발견`,
    });
  }

  // 하이픈 목록 과다 (10줄 이상 연속 하이픈 시작)
  const hyphenListLines = text.match(/^- .+$/gm) || [];
  if (hyphenListLines.length > 10) {
    issues.push({
      type: 'warning',
      code: 'EXCESSIVE_LIST',
      message: `하이픈 목록이 ${hyphenListLines.length}줄로 과다 (네이버 블로그 스타일에 맞지 않음)`,
    });
  }

  return issues;
}

// ============================================================
// 2. 구조 검사 (구분선, 이미지 태그)
// ============================================================

function checkStructure(text: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // 구분선 개수 (────, ━━━━, ═══, --- 등)
  const dividerPattern = /^[─━═\-]{4,}$/gm;
  const dividerCount = (text.match(dividerPattern) || []).length;
  if (dividerCount < 3) {
    issues.push({
      type: 'warning',
      code: 'FEW_DIVIDERS',
      message: `구분선 ${dividerCount}개 (최소 3개 권장)`,
    });
  }

  // [이미지: ...] 태그 개수
  const imageTagCount = (text.match(/\[이미지[:\s]/g) || []).length;
  if (imageTagCount === 0) {
    issues.push({
      type: 'warning',
      code: 'NO_IMAGE_TAG',
      message: '이미지 배치 태그 없음',
    });
  }

  // CTA 존재 여부
  const ctaKeywords = ['문의', '예약', '상담', '전화', '카톡', '카카오', 'DM', '연락', '방문', '등록'];
  const hasCTA = ctaKeywords.some(kw => text.includes(kw));
  if (!hasCTA) {
    issues.push({
      type: 'warning',
      code: 'NO_CTA',
      message: 'CTA(행동유도) 표현 없음 (문의/예약/상담 등)',
    });
  }

  // 글자 수 체크
  const charCount = text.replace(/\s/g, '').length;
  if (charCount < 800) {
    issues.push({
      type: 'critical',
      code: 'TOO_SHORT',
      message: `글자 수 ${charCount}자 (최소 800자 권장)`,
    });
  }

  return issues;
}

// ============================================================
// 3. 수치 오염 탐지 (facts에 없는 숫자)
// ============================================================

function checkNumberContamination(text: string, facts: Facts): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // facts에 포함된 숫자들 수집
  const factsText = Object.values(facts).filter(Boolean).join(' ');
  const factsNumbers = new Set(
    (factsText.match(/\d[\d,.]*\d|\d/g) || []).map(n => n.replace(/,/g, ''))
  );

  // 본문에서 "구체적 수치 + 단위" 패턴 탐지
  const numberWithUnit = text.match(/\d[\d,.]*\d?\s*(?:원|만원|천원|회|개월|개|평|대|명|kg|cm|분|시간|%)/g) || [];

  const suspiciousNumbers: string[] = [];
  for (const match of numberWithUnit) {
    const num = (match.match(/\d[\d,.]*\d?/) || [''])[0].replace(/,/g, '');
    // facts에 해당 숫자가 없으면 의심
    if (num && !factsNumbers.has(num)) {
      // 일반적인 숫자(1~12 등)는 제외
      const numVal = parseInt(num);
      if (numVal > 30 || num.length >= 3) {
        suspiciousNumbers.push(match.trim());
      }
    }
  }

  if (suspiciousNumbers.length > 0) {
    issues.push({
      type: 'warning',
      code: 'SUSPICIOUS_NUMBERS',
      message: `facts에 없는 수치 발견: ${suspiciousNumbers.slice(0, 5).join(', ')}`,
    });
  }

  return issues;
}

// ============================================================
// 4. 의료 단정 표현 탐지
// ============================================================

function checkMedicalClaims(text: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const forbiddenMedical = [
    '완치', '치료됩니다', '100% 효과', '무조건 좋아',
    '반드시 낫', '확실히 치료', '완벽하게 회복',
  ];

  const found = forbiddenMedical.filter(term => text.includes(term));
  if (found.length > 0) {
    issues.push({
      type: 'critical',
      code: 'MEDICAL_CLAIM',
      message: `의료 단정 표현: ${found.join(', ')}`,
    });
  }

  return issues;
}

// ============================================================
// 5. 자동 수정 (warning 레벨만)
// ============================================================

function autoFix(text: string): string {
  let fixed = text;

  // ** 볼드 마크다운 제거
  fixed = fixed.replace(/\*\*([^*]+)\*\*/g, '$1');
  // __ 볼드 제거
  fixed = fixed.replace(/__([^_]+)__/g, '$1');
  // # 헤딩 제거
  fixed = fixed.replace(/^#{1,6}\s+/gm, '');
  // 단일 * 이탤릭 제거
  fixed = fixed.replace(/\*([^*\n]+)\*/g, '$1');

  // 이모지 제거
  fixed = fixed.replace(/[\u{1F600}-\u{1F64F}]/gu, '');
  fixed = fixed.replace(/[\u{1F300}-\u{1F5FF}]/gu, '');
  fixed = fixed.replace(/[\u{1F680}-\u{1F6FF}]/gu, '');
  fixed = fixed.replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '');
  fixed = fixed.replace(/[\u{2600}-\u{26FF}]/gu, '');
  fixed = fixed.replace(/[\u{2700}-\u{27BF}]/gu, '');

  // 영어 레이블 제거 (기존 cleanMarkdownAndForbiddenPatterns와 동일)
  fixed = fixed.replace(/\s*\((?:Fact|Interpretation|Real|Experience|F|I|R|E|R&E|F\+I)\)/gi, '');

  return fixed;
}

// ============================================================
// 메인 검증 함수
// ============================================================

export function validateGeneratedContent(
  text: string,
  facts: Facts = {},
): ValidationResult {
  const allIssues: ValidationIssue[] = [
    ...checkForbiddenPatterns(text),
    ...checkStructure(text),
    ...checkNumberContamination(text, facts),
    ...checkMedicalClaims(text),
  ];

  const criticalCount = allIssues.filter(i => i.type === 'critical').length;
  const warningCount = allIssues.filter(i => i.type === 'warning').length;

  // 점수 계산: 100점 시작, critical -20, warning -5
  const score = Math.max(0, 100 - criticalCount * 20 - warningCount * 5);

  // warning이 있으면 자동 수정 시도
  const hasFixableIssues = allIssues.some(i =>
    ['MARKDOWN_HEADING', 'MARKDOWN_BOLD', 'EMOJI_FOUND'].includes(i.code)
  );

  const result: ValidationResult = {
    passed: criticalCount === 0,
    score,
    issues: allIssues,
  };

  if (hasFixableIssues) {
    result.autoFixed = autoFix(text);
  }

  return result;
}
