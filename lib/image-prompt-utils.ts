// Korean to English prompt translation - detailed keyword mappings
export const detailedPromptMap: Record<string, string> = {
  // 시설/공간
  '외관': 'modern building exterior with glass facade, clean architectural design, professional signage, welcoming entrance',
  '건물': 'contemporary fitness center building, well-maintained exterior, attractive storefront, urban setting',
  '입구': 'welcoming gym entrance, automatic glass doors, clean reception area, professional atmosphere',
  '로비': 'spacious gym lobby with modern furniture, reception desk, comfortable waiting area, ambient lighting',
  '접수': 'professional reception counter with friendly staff, organized check-in area, digital screens',

  // 운동 공간
  '유산소': 'rows of premium cardio machines, treadmills and ellipticals, large windows with natural light, spacious cardio zone',
  '러닝머신': 'high-end treadmills with individual screens, multiple running machines in a row, clean modern design',
  '사이클': 'professional spin bikes, indoor cycling area, motivational environment, group cycling setup',
  '프리웨이트': 'extensive free weight section with dumbbells and barbells, weight racks, rubber flooring, mirrors',
  '덤벨': 'organized dumbbell rack with various weights, chrome dumbbells, professional weight training area',
  '바벨': 'olympic barbell stations, squat racks, deadlift platforms, powerlifting area',
  '머신': 'state-of-the-art weight machines, cable crossover station, leg press, professional gym equipment',
  '스트레칭': 'dedicated stretching zone with mats, foam rollers, flexibility training area, calm atmosphere',

  // 수업/프로그램
  'GX': 'group exercise studio with mirror wall, wooden floor, sound system, group fitness class in progress',
  '그룹': 'energetic group fitness class, diverse participants, instructor leading workout, motivational environment',
  '수업': 'fitness class in session, participants following instructor, organized workout space, high energy',
  'PT': 'personal training session, trainer guiding client through exercise, one-on-one instruction, focused workout',
  '1:1': 'private personal training, individualized attention, trainer correcting form, premium service',

  // 트레이너/강사
  '트레이너': 'professional certified personal trainer, athletic physique, confident posture, wearing branded uniform',
  '강사': 'experienced fitness instructor, leading class with enthusiasm, professional attire, motivating pose',
  '전문가': 'fitness expert with certifications displayed, professional headshot, trustworthy appearance',
  '코치': 'dedicated fitness coach, supportive demeanor, guiding client, hands-on instruction',
  '자격증': 'framed fitness certifications on wall, professional credentials, training certificates display',
  '수료증': 'official fitness certification documents, professional training completion, framed credentials',

  // 고객/후기
  '회원': 'satisfied gym member smiling, healthy appearance, workout attire, positive energy',
  '고객': 'happy fitness client, achieving workout goals, motivated expression, healthy lifestyle',
  '후기': 'real client testimonial photo, genuine smile, fitness transformation success',
  '비포애프터': 'dramatic body transformation comparison, before and after side by side, visible results, inspiring change',
  '변화': 'fitness journey progress photos, body composition improvement, muscle gain or weight loss results',

  // 가격/프로모션
  '가격': 'clear pricing board, membership options displayed, transparent cost information, value packages',
  '가격표': 'detailed price list with various membership tiers, promotional offers, easy to read format',
  '할인': 'special promotional banner, discount offer display, limited time deal, attractive pricing',
  '이용권': 'membership cards and packages, various subscription options, premium membership display',
  '등록': 'membership registration desk, sign-up process, welcoming new member experience',

  // 편의시설
  '주차': 'spacious parking lot, underground parking garage, convenient parking access, ample parking spaces',
  '주차장': 'well-lit parking facility, multiple parking spots, easy access, security cameras',
  '샤워실': 'clean modern shower facilities, private shower stalls, premium toiletries, spa-like atmosphere',
  '락커': 'secure personal lockers, locker room facilities, clean changing area, organized space',
  '탈의실': 'private changing rooms, clean and well-maintained, mirror and bench, comfortable environment',

  // 분위기/인테리어
  '인테리어': 'modern gym interior design, stylish decor, professional ambiance, motivating environment',
  '분위기': 'energetic gym atmosphere, motivational quotes on walls, dynamic lighting, inspiring environment',
  '조명': 'professional gym lighting, bright and energizing, LED fixtures, well-illuminated workout space',
  '거울': 'full-length mirror walls, reflection of gym equipment, clean mirrors, professional setup',

  // 업종별
  '헬스장': 'comprehensive fitness center with cardio and weight areas, modern gym interior, full-service facility',
  '필라테스': 'elegant pilates studio with reformer machines, barrel and cadillac equipment, serene atmosphere, wooden floors',
  '요가': 'peaceful yoga studio with bamboo decor, meditation corner, natural lighting, zen atmosphere, yoga mats arranged',
  '크로스핏': 'functional fitness gym with pull-up rigs, kettlebells, medicine balls, plyometric boxes, industrial design',
  '복싱': 'boxing gym with heavy bags, speed bags, boxing ring, training area, combat sports atmosphere',
  '스피닝': 'dedicated spinning studio, rows of spin bikes, dramatic lighting, motivational screens',
  '수영': 'indoor swimming pool, lap lanes, aqua fitness area, clean pool facility, professional lifeguard',

  // 동작/포즈
  '스쿼트': 'athlete performing squat exercise, proper form demonstration, weight training technique',
  '데드리프트': 'deadlift exercise demonstration, barbell lifting, proper technique, strength training',
  '벤치프레스': 'bench press exercise, chest workout, spotter assisting, weight training form',
  '런지': 'lunge exercise demonstration, leg workout, proper form, functional training',
  '플랭크': 'plank hold exercise, core workout, proper alignment, bodyweight training',
};

// 카테고리별 기본 스타일
export const categoryStyles: Record<string, string> = {
  '헬스장': 'modern fitness gym, industrial chic design, high ceilings, professional equipment, motivating atmosphere',
  '필라테스': 'elegant pilates studio, minimalist design, natural wood elements, soft lighting, peaceful environment',
  'PT샵': 'boutique personal training facility, premium equipment, private workout spaces, exclusive atmosphere',
  '요가': 'serene yoga studio, zen minimalist design, natural materials, calming colors, peaceful sanctuary',
  '크로스핏': 'industrial crossfit box, functional fitness setup, raw concrete floors, chalk and sweat atmosphere',
  '복싱': 'authentic boxing gym, boxing ring centerpiece, heavy bags, competitive training environment',
};

export function generateEnglishPrompt(koreanDescription: string, category: string = ''): string {
  const parts: string[] = [];

  // 1. 사진 품질 기본 설정
  parts.push('professional photography');
  parts.push('ultra high quality');
  parts.push('sharp focus');
  parts.push('natural lighting');

  // 2. 카테고리 스타일 추가
  if (category && categoryStyles[category]) {
    parts.push(categoryStyles[category]);
  }

  // 3. 한글 설명에서 키워드 매칭하여 상세 프롬프트 추가
  const matchedDetails: string[] = [];
  for (const [korean, english] of Object.entries(detailedPromptMap)) {
    if (koreanDescription.includes(korean)) {
      matchedDetails.push(english);
    }
  }

  if (matchedDetails.length > 0) {
    parts.push(...matchedDetails);
  }

  // 4. 숫자 정보 추출 및 반영 (예: "20대", "50평")
  const numberMatch = koreanDescription.match(/(\d+)(대|평|개|명|시간|분)/g);
  if (numberMatch) {
    numberMatch.forEach(match => {
      const num = match.match(/\d+/)?.[0];
      if (match.includes('대')) {
        parts.push(`${num} units of equipment visible`);
      } else if (match.includes('평')) {
        parts.push(`spacious ${num} pyeong area`);
      } else if (match.includes('명')) {
        parts.push(`group of ${num} people`);
      }
    });
  }

  // 5. 매칭되지 않은 경우 기본 프롬프트
  if (matchedDetails.length === 0) {
    parts.push('clean modern fitness interior');
    parts.push('professional gym atmosphere');
    parts.push('well-organized workout space');
  }

  // 6. 공통 마무리 품질 태그
  parts.push('realistic');
  parts.push('detailed');
  parts.push('8k resolution');
  parts.push('commercial photography style');

  return parts.join(', ');
}

// 영어 프롬프트에서 한글 키워드 추출 (역매핑)
export function extractKoreanFromEnglish(englishPrompt: string): string {
  const foundKeywords: string[] = [];
  const lowerPrompt = englishPrompt.toLowerCase();

  // detailedPromptMap에서 역매핑
  for (const [korean, english] of Object.entries(detailedPromptMap)) {
    // 영어 프롬프트의 핵심 키워드들 추출
    const englishKeywords = english.toLowerCase().split(',').map(s => s.trim());
    for (const keyword of englishKeywords) {
      if (keyword.length > 5 && lowerPrompt.includes(keyword)) {
        if (!foundKeywords.includes(korean)) {
          foundKeywords.push(korean);
        }
        break;
      }
    }
  }

  // categoryStyles에서도 매칭
  for (const [korean, english] of Object.entries(categoryStyles)) {
    const englishKeywords = english.toLowerCase().split(',').map(s => s.trim());
    for (const keyword of englishKeywords) {
      if (keyword.length > 5 && lowerPrompt.includes(keyword)) {
        if (!foundKeywords.includes(korean)) {
          foundKeywords.push(korean);
        }
        break;
      }
    }
  }

  // 매칭된 키워드가 있으면 조합하여 반환
  if (foundKeywords.length > 0) {
    // 최대 3개까지만 사용
    return foundKeywords.slice(0, 3).join(' / ');
  }

  // 매칭이 없으면 영어에서 핵심 키워드 추출 시도
  const simpleKeywordMap: Record<string, string> = {
    'entrance': '입구',
    'lobby': '로비',
    'reception': '접수처',
    'cardio': '유산소 존',
    'treadmill': '러닝머신',
    'weight': '웨이트 존',
    'dumbbell': '덤벨',
    'barbell': '바벨',
    'machine': '머신',
    'trainer': '트레이너',
    'instructor': '강사',
    'class': '수업',
    'group': '그룹 수업',
    'personal training': 'PT',
    'locker': '락커룸',
    'shower': '샤워실',
    'parking': '주차장',
    'price': '가격',
    'membership': '회원권',
    'transformation': '변화',
    'before and after': '비포애프터',
    'pilates': '필라테스',
    'yoga': '요가',
    'crossfit': '크로스핏',
    'boxing': '복싱',
    'swimming': '수영장',
    'spin': '스피닝',
    'stretching': '스트레칭',
    'squat': '스쿼트',
    'deadlift': '데드리프트',
    'bench press': '벤치프레스',
    'interior': '인테리어',
    'atmosphere': '분위기',
    'equipment': '기구',
    'facility': '시설',
    'exterior': '외관',
    'building': '건물',
  };

  const simpleMatches: string[] = [];
  for (const [eng, kor] of Object.entries(simpleKeywordMap)) {
    if (lowerPrompt.includes(eng)) {
      simpleMatches.push(kor);
    }
  }

  if (simpleMatches.length > 0) {
    return simpleMatches.slice(0, 3).join(' / ');
  }

  return '이미지';
}

export interface ParsedImagePrompt {
  id: string;
  korean: string;
  english: string;
  index: number;
}

export function parseImagePrompts(content: string, category: string = ''): ParsedImagePrompt[] {
  const matches: ParsedImagePrompt[] = [];
  let index = 0;

  // 형식 1: [이미지: 한글설명] 패턴
  const koreanRegex = /\[이미지:\s*([^\]]+)\]/g;
  let koreanMatch;

  while ((koreanMatch = koreanRegex.exec(content)) !== null) {
    const korean = koreanMatch[1].trim();
    const english = generateEnglishPrompt(korean, category);
    matches.push({
      id: `img-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      korean,
      english,
      index: index++,
    });
  }

  // 형식 1에서 매칭된 것이 있으면 반환
  if (matches.length > 0) {
    return matches;
  }

  // 형식 2: 번호. 영어프롬프트 패턴 (전체복사된 프롬프트)
  // 예: "1. professional photography, ultra high quality..."
  // 줄 단위로 분리하여 번호가 붙은 프롬프트 인식
  const lines = content.split(/\n+/).filter(line => line.trim().length > 0);

  lines.forEach((line) => {
    const numberedMatch = line.match(/^\s*(\d+)\.\s*(.+)/);
    if (numberedMatch) {
      const english = numberedMatch[2].trim();
      // 영어 프롬프트가 유효한지 확인 (최소 길이)
      if (english.length > 20) {
        // 영어 프롬프트에서 한글 설명 추출
        const koreanDesc = extractKoreanFromEnglish(english);
        matches.push({
          id: `img-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          korean: koreanDesc,
          english,
          index: index++,
        });
      }
    }
  });

  // 형식 2에서도 매칭이 없으면 영어로 시작하는 긴 줄을 프롬프트로 인식
  if (matches.length === 0) {
    const longLines = content.split(/\n+/).filter(line => line.trim().length > 30);

    longLines.forEach((line, idx) => {
      const cleanLine = line.replace(/^\d+\.\s*/, '').trim();
      if (cleanLine.length > 30 && /^[a-zA-Z]/.test(cleanLine)) {
        // 영어 프롬프트에서 한글 설명 추출
        const koreanDesc = extractKoreanFromEnglish(cleanLine);
        matches.push({
          id: `img-${idx}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          korean: koreanDesc,
          english: cleanLine,
          index: idx,
        });
      }
    });
  }

  return matches;
}
