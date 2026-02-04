import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const results: Record<string, unknown> = {};

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not set', envKeys: Object.keys(process.env).filter(k => k.includes('GEMINI')) });
  }

  results.keyLength = apiKey.length;
  results.keyPrefix = apiKey.slice(0, 6) + '...';
  results.keyHasWhitespace = apiKey !== process.env.GEMINI_API_KEY;

  // 1. 모델 목록 조회
  try {
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const listData = await listRes.json();
    if (listData.error) {
      results.listModelsError = listData.error;
    } else {
      const flashModels = (listData.models || [])
        .filter((m: { name: string }) => m.name.includes('flash') || m.name.includes('2.5'))
        .map((m: { name: string; displayName?: string }) => ({ name: m.name, displayName: m.displayName }));
      results.flashModels = flashModels;
      results.totalModels = listData.models?.length || 0;
    }
  } catch (e) {
    results.listModelsError = e instanceof Error ? e.message : 'fetch error';
  }

  // 2. gemini-2.5-flash 간단 텍스트 테스트
  try {
    const testRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Say hello in Korean in one word' }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 10 }
        })
      }
    );
    results.testStatus = testRes.status;
    const testData = await testRes.json();
    if (testData.error) {
      results.testError = testData.error;
    } else {
      results.testResponse = testData.candidates?.[0]?.content?.parts?.[0]?.text || 'empty';
      results.testSuccess = true;
    }
  } catch (e) {
    results.testFetchError = e instanceof Error ? e.message : 'fetch error';
  }

  return NextResponse.json(results);
}
