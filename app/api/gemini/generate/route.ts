import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { apiKey, prompt, images } = await request.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'API 키가 필요합니다' }, { status: 400 });
    }

    if (!prompt) {
      return NextResponse.json({ error: '프롬프트가 필요합니다' }, { status: 400 });
    }

    const contents: { parts: unknown[] }[] = [{
      parts: [{ text: prompt }]
    }];

    // Add images if present
    if (images && images.length > 0) {
      images.forEach((img: { mimeType: string; data: string }) => {
        contents[0].parts.push({
          inline_data: {
            mime_type: img.mimeType,
            data: img.data
          }
        });
      });
    }

    // Free tier: v1beta only, use flash models with better quota
    const apiVersions = ['v1beta'];
    const models = [
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-2.0-flash-lite'
    ];
    let lastError = '';

    for (const apiVersion of apiVersions) {
      for (const model of models) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents,
                generationConfig: {
                  temperature: 0.8,
                  maxOutputTokens: 8192
                }
              })
            }
          );

          const data = await response.json();

          if (data.error) {
            lastError = data.error.message || JSON.stringify(data.error);
            // Don't log quota errors repeatedly
            if (!lastError.includes('quota')) {
              console.error(`Gemini ${apiVersion}/${model} error:`, lastError);
            }
            continue; // Try next model/version
          }

          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (text) {
            console.log(`Success with ${apiVersion}/${model}`);
            return NextResponse.json({ content: text });
          }
        } catch (modelError) {
          console.error(`Gemini ${apiVersion}/${model} fetch error:`, modelError);
          continue;
        }
      }
    }

    return NextResponse.json({ error: `생성 실패: ${lastError}` }, { status: 400 });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Gemini API error:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
