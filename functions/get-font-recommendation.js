const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

exports.handler = async (event) => {
  // CORS 헤더 추가
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // OPTIONS 요청 처리 (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
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
    const { service, keyword, platform, mood } = JSON.parse(event.body);

    // AI 프롬프트 생성
    const systemPrompt = `You are an expert typography designer specializing in Google Fonts.

Context:
- Service Type: ${service}
- Keyword/Mood: ${keyword}
- Platform: ${platform}
- Mood Values: Soft ${mood.soft}, Static ${mood.static}

Recommend 3 Google Fonts that work well together:
1. Heading Font: For titles and headers (serif or display font)
2. Body Font: For body text (sans-serif, highly readable)
3. Korean Font: For Korean text (must support Korean characters)

IMPORTANT: 
- Only recommend fonts available on Google Fonts
- Ensure Korean font actually supports Korean (e.g., Noto Sans KR, Nanum Gothic, Gowun Batang)
- Provide a reasoning in Korean (한국어)

Return ONLY a valid JSON object with this exact structure:
{
  "heading": "Font Name",
  "body": "Font Name",
  "korean": "Font Name",
  "reasoning": "한국어로 설명 (2-3 sentences)"
}`;

    // OpenAI API 호출
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Recommend the fonts in JSON format." }
      ],
      temperature: 0.8,
      max_tokens: 300,
      response_format: { type: "json_object" }
    });

    // AI 응답 파싱
    const result = JSON.parse(completion.choices[0].message.content);

    console.log('AI Font Recommendation Success:', result);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('OpenAI API Error:', error);

    // Fallback: 기본 폰트 반환
    const fallbackFonts = {
      heading: 'Playfair Display',
      body: 'Inter',
      korean: 'Noto Sans KR',
      reasoning: 'AI 서버 연결에 실패하여 기본 폰트를 추천합니다. Playfair Display는 우아한 세리프체이며, Inter는 현대적이고 가독성이 뛰어난 산세리프체입니다.'
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(fallbackFonts)
    };
  }
};