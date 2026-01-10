'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { loadPresets, loadApiSettings, saveApiSettings } from '@/lib/firestore-service';
import { getMyTeamMembership, getTeamOwnerApiSettings, TeamMembership } from '@/lib/team-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Eye, EyeOff, Sparkles, Zap, ArrowRight, Cloud, Loader2, ExternalLink, HelpCircle, Users, Key } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Preset } from '@/types';

export function StepApiSetup() {
  const { user } = useAuth();
  const { apiProvider, apiKey, setApiProvider, setApiKey, setCurrentStep, setBusinessInfo, setCategory, setSubKeywords, setTailKeywords, setCustomAttributes, setAttributes, setHiddenAttributes, setAttributeLabels } = useAppStore();
  const [showKey, setShowKey] = useState(false);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showApiGuide, setShowApiGuide] = useState(false);

  // 팀 관련 상태
  const [teamMembership, setTeamMembership] = useState<TeamMembership | null>(null);
  const [usingTeamApi, setUsingTeamApi] = useState(false);
  const [useOwnApi, setUseOwnApi] = useState(false);

  // Load presets and API settings
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        if (user) {
          // 팀 멤버십 확인
          const membership = await getMyTeamMembership(user.uid);
          setTeamMembership(membership);

          // 팀 멤버인 경우 팀 소유자의 API 설정 우선 로드
          if (membership && !useOwnApi) {
            const teamApiSettings = await getTeamOwnerApiSettings(membership.ownerId);
            if (teamApiSettings && teamApiSettings.apiKey) {
              setApiProvider(teamApiSettings.apiProvider as 'gemini' | 'openai');
              setApiKey(teamApiSettings.apiKey);
              setUsingTeamApi(true);
            }
          }

          // 로그인 사용자: Firestore에서 API 키와 프리셋 불러옴
          const [firestorePresets, apiSettings] = await Promise.all([
            loadPresets(user.uid),
            loadApiSettings(user.uid),
          ]);
          setPresets(firestorePresets as unknown as Preset[]);

          // 팀 API를 사용하지 않거나 본인 API 사용 선택시
          if ((!membership || useOwnApi) && apiSettings) {
            setApiProvider(apiSettings.apiProvider as 'gemini' | 'openai');
            setApiKey(apiSettings.apiKey);
            setUsingTeamApi(false);
          }

          // 마지막 사용 프리셋 자동 로드
          const lastPresetId = localStorage.getItem('blogbooster_last_preset');
          if (lastPresetId && firestorePresets.length > 0) {
            const lastPreset = firestorePresets.find((p: Preset) => p.id === lastPresetId);
            if (lastPreset) {
              setSelectedPreset(lastPresetId);
              setCategory(lastPreset.category);
              setBusinessInfo({
                businessName: lastPreset.businessName,
                mainKeyword: lastPreset.mainKeyword,
                subKeywords: lastPreset.subKeywords,
                targetAudience: lastPreset.targetAudience,
                uniquePoint: lastPreset.uniquePoint,
                attributes: lastPreset.attributes,
              });
              if (lastPreset.tailKeywords) setTailKeywords(lastPreset.tailKeywords);
              if (lastPreset.customAttributes) setCustomAttributes(lastPreset.customAttributes);
              if (lastPreset.hiddenAttributes) setHiddenAttributes(lastPreset.hiddenAttributes);
              if (lastPreset.attributeLabels) setAttributeLabels(lastPreset.attributeLabels);
            }
          }
        } else {
          // 비로그인 사용자: localStorage에서 불러옴
          const savedPresets = localStorage.getItem('blogbooster_presets');
          if (savedPresets) {
            setPresets(JSON.parse(savedPresets));
          }

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
  }, [user, setApiProvider, setApiKey, useOwnApi]);

  const handleNext = async () => {
    if (!apiKey.trim()) {
      toast.error('API 키를 입력해주세요');
      return;
    }

    // Firestore에 API 설정 저장 (팀 API 사용 중이 아닌 경우에만)
    if (user && !usingTeamApi) {
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
        // 마지막 사용 프리셋 ID 저장
        localStorage.setItem('blogbooster_last_preset', presetId);

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
        if (preset.hiddenAttributes) setHiddenAttributes(preset.hiddenAttributes);
        if (preset.attributeLabels) setAttributeLabels(preset.attributeLabels);
        toast.success('"' + preset.name + '" 프리셋을 불러왔습니다');
      }
    }
  };

  // 본인 API로 전환
  const handleSwitchToOwnApi = async () => {
    setUseOwnApi(true);
    setUsingTeamApi(false);

    // 본인 API 설정 로드
    if (user) {
      const apiSettings = await loadApiSettings(user.uid);
      if (apiSettings) {
        setApiProvider(apiSettings.apiProvider as 'gemini' | 'openai');
        setApiKey(apiSettings.apiKey);
      } else {
        setApiKey('');
      }
    }
  };

  // 팀 API로 전환
  const handleSwitchToTeamApi = async () => {
    if (!teamMembership) return;

    setUseOwnApi(false);
    const teamApiSettings = await getTeamOwnerApiSettings(teamMembership.ownerId);
    if (teamApiSettings && teamApiSettings.apiKey) {
      setApiProvider(teamApiSettings.apiProvider as 'gemini' | 'openai');
      setApiKey(teamApiSettings.apiKey);
      setUsingTeamApi(true);
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
        {/* 팀 API 사용 안내 */}
        {teamMembership && (
          <div className={`p-4 rounded-xl border-2 ${usingTeamApi ? 'border-[#10b981] bg-[#10b981]/5' : 'border-[#eeeeee] bg-[#f9fafb]'}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg ${usingTeamApi ? 'bg-[#10b981]/20' : 'bg-[#6b7280]/10'}`}>
                <Users className={`w-5 h-5 ${usingTeamApi ? 'text-[#10b981]' : 'text-[#6b7280]'}`} />
              </div>
              <div>
                <p className={`font-medium ${usingTeamApi ? 'text-[#10b981]' : 'text-[#6b7280]'}`}>
                  {usingTeamApi ? '팀 API 사용 중' : '팀 API 사용 가능'}
                </p>
                <p className="text-sm text-[#6b7280]">
                  {teamMembership.ownerName || teamMembership.ownerEmail}님의 API
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {usingTeamApi ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSwitchToOwnApi}
                  className="border-[#eeeeee] text-[#6b7280] hover:bg-[#f5f5f5]"
                >
                  <Key className="w-4 h-4 mr-1" />
                  내 API 사용하기
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleSwitchToTeamApi}
                  className="bg-[#10b981] hover:bg-[#059669] text-white"
                >
                  <Users className="w-4 h-4 mr-1" />
                  팀 API 사용하기
                </Button>
              )}
            </div>
          </div>
        )}

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
              onClick={() => !usingTeamApi && setApiProvider('gemini')}
              disabled={usingTeamApi}
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
              onClick={() => !usingTeamApi && setApiProvider('openai')}
              disabled={usingTeamApi}
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
              placeholder={usingTeamApi ? '팀 API 키 사용 중' : 'API 키를 입력하세요'}
              value={apiKey}
              onChange={(e) => !usingTeamApi && setApiKey(e.target.value)}
              disabled={usingTeamApi}
              className="pr-12 h-12 bg-white border-[#eeeeee] focus:border-[#f72c5b] focus:ring-[#f72c5b]/20 text-[#111111] disabled:bg-[#f5f5f5]"
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
              {usingTeamApi
                ? '팀 소유자의 API 키를 사용합니다'
                : apiProvider === 'gemini'
                ? 'Google AI Studio에서 무료 API 키 발급 가능'
                : 'OpenAI Platform에서 API 키 발급 필요 (유료)'}
            </p>
            {apiKey && (
              <span className="text-xs text-[#10b981] flex items-center gap-1">
                {usingTeamApi ? (
                  <>
                    <Users className="w-3 h-3" />
                    팀 API
                  </>
                ) : user ? (
                  <>
                    <Cloud className="w-3 h-3" />
                    클라우드 저장
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    이 기기에만 저장됨
                  </>
                )}
              </span>
            )}
          </div>

          {/* API 키 발급 버튼 - 팀 API 사용 중이 아닐 때만 표시 */}
          {!usingTeamApi && (
            <div className="flex gap-2 mt-3">
              <a
                href={apiProvider === 'gemini' ? 'https://aistudio.google.com/apikey' : 'https://platform.openai.com/api-keys'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-10 border-[#f72c5b] text-[#f72c5b] hover:bg-[#f72c5b]/10"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  API 키 발급하기
                </Button>
              </a>
              <Dialog open={showApiGuide} onOpenChange={setShowApiGuide}>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 px-3 border-[#eeeeee] text-[#6b7280] hover:bg-[#f5f5f5]"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-bold text-[#111111] flex items-center gap-2">
                      <HelpCircle className="w-5 h-5 text-[#f72c5b]" />
                      {apiProvider === 'gemini' ? 'Google Gemini API 키 발급 방법' : 'OpenAI API 키 발급 방법'}
                    </DialogTitle>
                  </DialogHeader>

                  {apiProvider === 'gemini' ? (
                    <div className="space-y-4 text-sm text-[#374151]">
                      <div className="p-3 bg-[#10b981]/10 rounded-lg text-[#10b981] font-medium">
                        Gemini API는 무료로 사용 가능합니다!
                      </div>

                      <div className="space-y-3">
                        <div className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#f72c5b] text-white text-xs flex items-center justify-center font-bold">1</span>
                          <div>
                            <p className="font-medium text-[#111111]">Google AI Studio 접속</p>
                            <p className="text-[#6b7280]">aistudio.google.com 에 접속합니다</p>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#f72c5b] text-white text-xs flex items-center justify-center font-bold">2</span>
                          <div>
                            <p className="font-medium text-[#111111]">Google 계정 로그인</p>
                            <p className="text-[#6b7280]">Google 계정으로 로그인합니다</p>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#f72c5b] text-white text-xs flex items-center justify-center font-bold">3</span>
                          <div>
                            <p className="font-medium text-[#111111]">Get API Key 클릭</p>
                            <p className="text-[#6b7280]">좌측 메뉴 또는 상단의 &quot;Get API Key&quot; 버튼을 클릭합니다</p>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#f72c5b] text-white text-xs flex items-center justify-center font-bold">4</span>
                          <div>
                            <p className="font-medium text-[#111111]">API 키 생성</p>
                            <p className="text-[#6b7280]">&quot;Create API Key&quot; 버튼을 클릭하여 새 키를 생성합니다</p>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#f72c5b] text-white text-xs flex items-center justify-center font-bold">5</span>
                          <div>
                            <p className="font-medium text-[#111111]">API 키 복사</p>
                            <p className="text-[#6b7280]">생성된 API 키를 복사하여 위 입력란에 붙여넣기합니다</p>
                          </div>
                        </div>
                      </div>

                      <a
                        href="https://aistudio.google.com/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <Button className="w-full bg-[#f72c5b] hover:bg-[#e0264f] text-white">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Google AI Studio 바로가기
                        </Button>
                      </a>
                    </div>
                  ) : (
                    <div className="space-y-4 text-sm text-[#374151]">
                      <div className="p-3 bg-[#f59e0b]/10 rounded-lg text-[#f59e0b] font-medium">
                        OpenAI API는 유료입니다 (사용량 기반 과금)
                      </div>

                      <div className="space-y-3">
                        <div className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#f72c5b] text-white text-xs flex items-center justify-center font-bold">1</span>
                          <div>
                            <p className="font-medium text-[#111111]">OpenAI Platform 접속</p>
                            <p className="text-[#6b7280]">platform.openai.com 에 접속합니다</p>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#f72c5b] text-white text-xs flex items-center justify-center font-bold">2</span>
                          <div>
                            <p className="font-medium text-[#111111]">계정 생성 또는 로그인</p>
                            <p className="text-[#6b7280]">OpenAI 계정으로 로그인합니다</p>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#f72c5b] text-white text-xs flex items-center justify-center font-bold">3</span>
                          <div>
                            <p className="font-medium text-[#111111]">API Keys 메뉴 이동</p>
                            <p className="text-[#6b7280]">좌측 메뉴에서 &quot;API Keys&quot;를 클릭합니다</p>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#f72c5b] text-white text-xs flex items-center justify-center font-bold">4</span>
                          <div>
                            <p className="font-medium text-[#111111]">새 API 키 생성</p>
                            <p className="text-[#6b7280]">&quot;Create new secret key&quot; 버튼을 클릭합니다</p>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#f72c5b] text-white text-xs flex items-center justify-center font-bold">5</span>
                          <div>
                            <p className="font-medium text-[#111111]">API 키 복사</p>
                            <p className="text-[#6b7280]">생성된 API 키를 복사하여 위 입력란에 붙여넣기합니다</p>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#f59e0b] text-white text-xs flex items-center justify-center font-bold">!</span>
                          <div>
                            <p className="font-medium text-[#111111]">결제 설정 필요</p>
                            <p className="text-[#6b7280]">Billing 메뉴에서 결제 수단을 등록해야 API를 사용할 수 있습니다</p>
                          </div>
                        </div>
                      </div>

                      <a
                        href="https://platform.openai.com/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <Button className="w-full bg-[#f72c5b] hover:bg-[#e0264f] text-white">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          OpenAI Platform 바로가기
                        </Button>
                      </a>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          )}
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
