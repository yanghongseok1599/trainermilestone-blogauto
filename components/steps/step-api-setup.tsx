'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { loadPresets, loadApiSettings, saveApiSettings } from '@/lib/firestore-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Eye, EyeOff, Sparkles, Zap, ArrowRight, Cloud, Loader2 } from 'lucide-react';
import { Preset } from '@/types';

export function StepApiSetup() {
  const { user } = useAuth();
  const { apiProvider, apiKey, setApiProvider, setApiKey, setCurrentStep, setBusinessInfo, setCategory, setSubKeywords, setTailKeywords, setCustomAttributes, setAttributes } = useAppStore();
  const [showKey, setShowKey] = useState(false);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Load presets and API settings
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        if (user) {
          // Load from Firestore
          const [firestorePresets, apiSettings] = await Promise.all([
            loadPresets(user.uid),
            loadApiSettings(user.uid),
          ]);
          setPresets(firestorePresets as unknown as Preset[]);
          if (apiSettings) {
            setApiProvider(apiSettings.apiProvider as 'gemini' | 'openai');
            setApiKey(apiSettings.apiKey);
          }
        } else {
          // Load from localStorage (비로그인 사용자)
          const savedPresets = localStorage.getItem('blogbooster_presets');
          if (savedPresets) {
            setPresets(JSON.parse(savedPresets));
          }

          // API 키 로드 (localStorage)
          const savedApiKey = localStorage.getItem('blogbooster_api_key');
          const savedApiProvider = localStorage.getItem('blogbooster_api_provider');

          if (savedApiKey) {
            setApiKey(savedApiKey);
          }
          if (savedApiProvider === 'openai' || savedApiProvider === 'gemini') {
            setApiProvider(savedApiProvider);
          }
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      }
      setIsLoading(false);
    };
    loadData();
  }, [user, setApiProvider, setApiKey]);

  const handleNext = async () => {
    if (!apiKey.trim()) {
      toast.error('API 키를 입력해주세요');
      return;
    }

    // Save API settings to Firestore if logged in
    if (user) {
      try {
        await saveApiSettings(user.uid, apiProvider, apiKey);
      } catch (error) {
        console.error('Failed to save API settings:', error);
      }
    }

    setCurrentStep(1);
  };

  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    if (presetId) {
      const preset = presets.find(p => p.id === presetId);
      if (preset) {
        setCategory(preset.category);
        setBusinessInfo({
          businessName: preset.businessName,
          mainKeyword: preset.mainKeyword,
          subKeywords: preset.subKeywords,
          targetAudience: preset.targetAudience,
          uniquePoint: preset.uniquePoint,
          attributes: preset.attributes,
        });
        if (preset.tailKeywords) setTailKeywords(preset.tailKeywords);
        if (preset.customAttributes) setCustomAttributes(preset.customAttributes);
        toast.success('"' + preset.name + '" 프리셋을 불러왔습니다');
      }
    }
  };

  return (
    <Card className="border border-[#eeeeee] shadow-lg bg-white">
      <CardHeader className="space-y-1 pb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[#f72c5b]/10 text-[#f72c5b]">
            <Zap className="w-5 h-5" />
          </div>
          <CardTitle className="text-xl text-[#111111]">API 설정</CardTitle>
        </div>
        <CardDescription className="text-base text-[#6b7280]">AI API 제공자를 선택하고 API 키를 입력하세요</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* API Provider */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-[#111111]">API 제공자</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              className={'relative p-4 rounded-xl border-2 transition-all duration-300 ' + (
                apiProvider === 'gemini'
                  ? 'border-[#f72c5b] bg-[#f72c5b]/5'
                  : 'border-[#eeeeee] bg-[#f9fafb] hover:border-[#d1d5db]'
              )}
              onClick={() => setApiProvider('gemini')}
            >
              <div className="flex flex-col items-center gap-2">
                <div className={'text-2xl font-bold ' + (apiProvider === 'gemini' ? 'text-[#f72c5b]' : 'text-[#6b7280]')}>
                  G
                </div>
                <span className={'text-sm font-medium ' + (apiProvider === 'gemini' ? 'text-[#f72c5b]' : 'text-[#6b7280]')}>
                  Google Gemini
                </span>
              </div>
              {apiProvider === 'gemini' && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#f72c5b]" />
              )}
            </button>
            <button
              className={'relative p-4 rounded-xl border-2 transition-all duration-300 ' + (
                apiProvider === 'openai'
                  ? 'border-[#f72c5b] bg-[#f72c5b]/5'
                  : 'border-[#eeeeee] bg-[#f9fafb] hover:border-[#d1d5db]'
              )}
              onClick={() => setApiProvider('openai')}
            >
              <div className="flex flex-col items-center gap-2">
                <div className={'text-2xl font-bold ' + (apiProvider === 'openai' ? 'text-[#f72c5b]' : 'text-[#6b7280]')}>
                  O
                </div>
                <span className={'text-sm font-medium ' + (apiProvider === 'openai' ? 'text-[#f72c5b]' : 'text-[#6b7280]')}>
                  OpenAI ChatGPT
                </span>
              </div>
              {apiProvider === 'openai' && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#f72c5b]" />
              )}
            </button>
          </div>
        </div>

        {/* API Key */}
        <div className="space-y-3">
          <Label htmlFor="apiKey" className="text-sm font-medium text-[#111111]">API Key</Label>
          <div className="relative">
            <Input
              id="apiKey"
              type={showKey ? 'text' : 'password'}
              placeholder="API 키를 입력하세요"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="pr-12 h-12 bg-white border-[#eeeeee] focus:border-[#f72c5b] focus:ring-[#f72c5b]/20 text-[#111111]"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-10 hover:bg-[#f5f5f5]"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <EyeOff className="h-4 w-4 text-[#6b7280]" /> : <Eye className="h-4 w-4 text-[#6b7280]" />}
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#9ca3af]">
              {apiProvider === 'gemini'
                ? 'Google AI Studio (aistudio.google.com)에서 무료 API 키 발급 가능'
                : 'OpenAI Platform (platform.openai.com)에서 API 키 발급 필요 (유료)'}
            </p>
            {apiKey && (
              <span className="text-xs text-[#10b981] flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                자동 저장됨
              </span>
            )}
          </div>
        </div>

        {/* Preset Select */}
        {(presets.length > 0 || isLoading) && (
          <div className="space-y-3">
            <Label className="text-sm font-medium text-[#111111] flex items-center gap-2">
              프리셋 불러오기 (선택)
              {user && (
                <span className="text-xs text-[#10b981] bg-[#10b981]/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Cloud className="w-3 h-3" />
                  클라우드
                </span>
              )}
            </Label>
            {isLoading ? (
              <div className="h-12 flex items-center justify-center border border-[#eeeeee] rounded-lg bg-[#f9fafb]">
                <Loader2 className="w-5 h-5 animate-spin text-[#6b7280]" />
              </div>
            ) : (
              <Select value={selectedPreset} onValueChange={handlePresetChange}>
                <SelectTrigger className="h-12 bg-white border-[#eeeeee]">
                  <SelectValue placeholder="저장된 프리셋 선택" />
                </SelectTrigger>
                <SelectContent>
                  {presets.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#f72c5b]" />
                        {preset.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {/* Next Button */}
        <Button
          className="w-full h-12 text-base font-semibold bg-[#111111] hover:bg-[#333333] text-white transition-all duration-300 shadow-lg"
          onClick={handleNext}
        >
          다음 단계
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}
