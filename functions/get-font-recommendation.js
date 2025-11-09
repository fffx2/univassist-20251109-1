const OpenAI = require('openai');

// OpenAI API 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Netlify Functions 핸들러
exports.handler = async (event) => {
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // OPTIONS 요청 처리 (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // POST 요청만 허용
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // 요청 본문에서 데이터 추출
    const { service, keyword, platform, mood } = JSON.parse(event.body);

    // AI 프롬프트 생성
    const systemPrompt = `You are an expert typography designer specializing in Google Fonts. Your task is to recommend 3 Google Fonts that work perfectly together for a design system.

Context:
- Service Type: ${service}
- Mood/Keyword: ${keyword}
- Platform: ${platform}
- Design Mood: Soft(${mood.soft}), Static(${mood.static})

Requirements:
1. Heading Font: Choose a serif or display font from Google Fonts for titles and headings
2. Body Font: Choose a clean sans-serif font from Google Fonts for body text
3. Korean Font: Choose a Korean-compatible Google Font (must be actually available on Google Fonts)

IMPORTANT: Only recommend fonts that are actually available on Google Fonts.
Korean fonts available on Google Fonts include: Noto Sans KR, Noto Serif KR, Nanum Gothic, Nanum Myeongjo, Jua, Black Han Sans, Do Hyeon, Gamja Flower, Gowun Batang, Stylish, East Sea Dokdo, Hi Melody, Poor Story, Single Day, Sunflower, Yeon Sung, etc.

Return ONLY valid JSON in this exact format:
{
  "heading": "Font Name",
  "body": "Font Name",
  "korean": "Korean Font Name",
  "reasoning": "2-3 sentences in Korean explaining why these fonts work well together for this specific service type and mood"
}`;

    // OpenAI API 호출
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // 빠르고 저렴한 모델
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Recommend the perfect font combination for this project. Return only JSON." }
      ],
      temperature: 0.8,
      max_tokens: 500,
      response_format: { type: "json_object" } // JSON 형식 강제
    });

    // AI 응답 파싱
    const aiResponse = completion.choices[0].message.content;
    const fontsData = JSON.parse(aiResponse);

    // 성공 응답 반환
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        heading: fontsData.heading,
        body: fontsData.body,
        korean: fontsData.korean,
        reasoning: fontsData.reasoning
      })
    };

  } catch (error) {
    console.error('OpenAI API Error:', error);

    // 에러 발생 시 Fallback 데이터 반환
    const fallbackFonts = getFallbackFonts(event.body);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(fallbackFonts)
    };
  }
};

// Fallback 폰트 추천 (AI 실패 시)
function getFallbackFonts(requestBody) {
  try {
    const { service } = JSON.parse(requestBody);
    
    const fallbackDatabase = {
      '포트폴리오': {
        heading: 'Playfair Display',
        body: 'Inter',
        korean: 'Noto Serif KR',
        reasoning: '포트폴리오에 최적화된 우아하고 전문적인 조합입니다. Playfair Display는 세련된 느낌을, Inter는 뛰어난 가독성을 제공합니다.'
      },
      '브랜드 홍보': {
        heading: 'Montserrat',
        body: 'Open Sans',
        korean: 'Noto Sans KR',
        reasoning: '브랜드 홍보에 적합한 현대적이고 깔끔한 조합입니다. Montserrat는 강한 인상을, Open Sans는 친근한 느낌을 전달합니다.'
      },
      '제품 판매': {
        heading: 'Oswald',
        body: 'Roboto',
        korean: 'Black Han Sans',
        reasoning: '제품 판매에 효과적인 강렬하고 주목도 높은 조합입니다. Oswald는 임팩트를, Roboto는 신뢰감을 제공합니다.'
      },
      '정보 전달': {
        heading: 'Roboto Slab',
        body: 'Noto Sans',
        korean: 'Noto Sans KR',
        reasoning: '정보 전달에 최적화된 읽기 쉽고 명확한 조합입니다. 두 폰트 모두 뛰어난 가독성으로 장시간 읽기에 적합합니다.'
      },
      '학습': {
        heading: 'Bitter',
        body: 'Lora',
        korean: 'Nanum Myeongjo',
        reasoning: '학습 콘텐츠에 적합한 편안하고 집중하기 좋은 조합입니다. 세리프 폰트들이 신뢰감과 전문성을 전달합니다.'
      },
      '엔터테인먼트': {
        heading: 'Righteous',
        body: 'Quicksand',
        korean: 'Jua',
        reasoning: '엔터테인먼트에 어울리는 재미있고 활기찬 조합입니다. 둥글고 친근한 형태가 즐거운 분위기를 조성합니다.'
      }
    };

    return fallbackDatabase[service] || fallbackDatabase['포트폴리오'];
  } catch (e) {
    return {
      heading: 'Inter',
      body: 'Roboto',
      korean: 'Noto Sans KR',
      reasoning: '범용적으로 사용하기 좋은 안정적인 폰트 조합입니다.'
    };
  }
}