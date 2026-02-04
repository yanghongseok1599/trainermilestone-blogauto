'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Users,
  Loader2,
  Search,
  Mail,
  Calendar,
  Shield,
  Key,
  RefreshCw,
  X,
  Crown,
  Ban,
  Trash2,
  ChevronRight,
  Clock,
  Activity,
  LogIn,
  FileText,
  ImagePlus,
  Zap,
} from 'lucide-react';
import { collection, getDocs, query, orderBy, Timestamp, doc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getUserSubscription, updateUserSubscription } from '@/lib/payment-service';
import { PLANS, SubscriptionPlan } from '@/types/payment';
import { getActivityLog, ActivityRecord, ACTIVITY_LABELS, ActivityType } from '@/lib/activity-log';

interface UserData {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Date | null;
  lastLoginAt: Date | null;
  loginHistory: Date[];
  isBlocked?: boolean;
  currentPlan?: SubscriptionPlan;
}

const PLAN_BADGE_COLORS: Record<SubscriptionPlan, string> = {
  FREE: 'bg-gray-100 text-gray-700',
  STARTER: 'bg-blue-100 text-blue-700',
  PRO: 'bg-[#f72c5b]/10 text-[#f72c5b]',
  BUSINESS: 'bg-purple-100 text-purple-700',
  BETA: 'bg-green-100 text-green-700',
};

const ACTIVITY_ICONS: Record<ActivityType, typeof LogIn> = {
  login: LogIn,
  keyword_search: Search,
  blog_generate: FileText,
  image_generate: ImagePlus,
  preset_save: Key,
  plan_change: Crown,
  payment: Zap,
  seo_schedule: Calendar,
};

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [selectedUserPlan, setSelectedUserPlan] = useState<SubscriptionPlan>('FREE');
  const [isUpdating, setIsUpdating] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'block' | 'unblock' | 'delete' | null>(null);
  const [activityLog, setActivityLog] = useState<ActivityRecord[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);

  // 인증 체크 - 관리자만 접근 가능
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (!isSuperAdmin) {
        toast.error('관리자만 접근할 수 있습니다');
        router.push('/dashboard');
      }
    }
  }, [user, authLoading, isSuperAdmin, router]);

  // 사용자 목록 로드
  useEffect(() => {
    if (isSuperAdmin) {
      loadUsers();
    }
  }, [isSuperAdmin]);

  const loadUsers = async () => {
    if (!db) {
      toast.error('Firestore가 초기화되지 않았습니다');
      return;
    }

    setIsLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      const userList: UserData[] = [];
      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data();
        // 구독 정보 가져오기
        let currentPlan: SubscriptionPlan = 'FREE';
        try {
          const sub = await getUserSubscription(docSnap.id);
          if (sub) currentPlan = sub.currentPlan;
        } catch {
          // 구독 정보 없으면 FREE
        }

        // 로그인 히스토리 변환
        const loginHistory: Date[] = (data.loginHistory || []).map((ts: any) =>
          ts instanceof Timestamp ? ts.toDate() : new Date(ts)
        );

        userList.push({
          uid: docSnap.id,
          email: data.email || '',
          displayName: data.displayName || null,
          photoURL: data.photoURL || null,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null,
          lastLoginAt: data.lastLoginAt instanceof Timestamp ? data.lastLoginAt.toDate() : null,
          loginHistory,
          isBlocked: data.isBlocked || false,
          currentPlan,
        });
      }

      setUsers(userList);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('사용자 목록을 불러오는데 실패했습니다');
    }
    setIsLoading(false);
  };

  // 사용자 선택
  const handleSelectUser = async (userData: UserData) => {
    setSelectedUser(userData);
    setSelectedUserPlan(userData.currentPlan || 'FREE');
    setConfirmAction(null);

    // 활동 기록 로드
    setIsLoadingActivity(true);
    try {
      const log = await getActivityLog(userData.uid);
      setActivityLog(log);
    } catch {
      setActivityLog([]);
    }
    setIsLoadingActivity(false);
  };

  // 요금제 변경
  const handleChangePlan = async () => {
    if (!selectedUser || !db) return;
    setIsUpdating(true);
    try {
      const now = new Date();
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 1);

      await updateUserSubscription(selectedUser.uid, {
        currentPlan: selectedUserPlan,
        planStartDate: now,
        planEndDate: endDate,
        isActive: true,
      });

      // 로컬 상태 업데이트
      setUsers(prev => prev.map(u =>
        u.uid === selectedUser.uid ? { ...u, currentPlan: selectedUserPlan } : u
      ));
      setSelectedUser(prev => prev ? { ...prev, currentPlan: selectedUserPlan } : null);
      toast.success(`${selectedUser.displayName || selectedUser.email}의 요금제를 ${PLANS[selectedUserPlan].name}(으)로 변경했습니다`);
    } catch (error) {
      console.error('Failed to change plan:', error);
      toast.error('요금제 변경에 실패했습니다');
    }
    setIsUpdating(false);
  };

  // 사용자 차단/해제
  const handleToggleBlock = async () => {
    if (!selectedUser || !db) return;
    setIsUpdating(true);
    try {
      const userRef = doc(db, 'users', selectedUser.uid);
      const newBlockedState = !selectedUser.isBlocked;
      await updateDoc(userRef, { isBlocked: newBlockedState });

      setUsers(prev => prev.map(u =>
        u.uid === selectedUser.uid ? { ...u, isBlocked: newBlockedState } : u
      ));
      setSelectedUser(prev => prev ? { ...prev, isBlocked: newBlockedState } : null);
      toast.success(newBlockedState
        ? `${selectedUser.displayName || selectedUser.email}을(를) 차단했습니다`
        : `${selectedUser.displayName || selectedUser.email}의 차단을 해제했습니다`
      );
      setConfirmAction(null);
    } catch (error) {
      console.error('Failed to toggle block:', error);
      toast.error('차단 상태 변경에 실패했습니다');
    }
    setIsUpdating(false);
  };

  // 사용자 삭제
  const handleDeleteUser = async () => {
    if (!selectedUser || !db) return;
    setIsUpdating(true);
    try {
      await deleteDoc(doc(db, 'users', selectedUser.uid));
      try {
        await deleteDoc(doc(db, 'users', selectedUser.uid, 'subscription', 'current'));
      } catch {
        // 구독 정보가 없을 수 있음
      }
      try {
        await deleteDoc(doc(db, 'users', selectedUser.uid, 'activity', 'log'));
      } catch {
        // 활동 기록이 없을 수 있음
      }

      setUsers(prev => prev.filter(u => u.uid !== selectedUser.uid));
      setSelectedUser(null);
      toast.success('사용자가 삭제되었습니다');
      setConfirmAction(null);
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error('사용자 삭제에 실패했습니다');
    }
    setIsUpdating(false);
  };

  // 검색 필터링
  const filteredUsers = users.filter((u) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      u.email?.toLowerCase().includes(searchLower) ||
      u.displayName?.toLowerCase().includes(searchLower) ||
      u.uid.toLowerCase().includes(searchLower)
    );
  });

  // 날짜/시간 포맷
  const formatDateTime = (date: Date) => {
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / (1000 * 60));
    const diffHour = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDay = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMin < 1) return '방금 전';
    if (diffMin < 60) return `${diffMin}분 전`;
    if (diffHour < 24) return `${diffHour}시간 전`;
    if (diffDay < 7) return `${diffDay}일 전`;
    return date.toLocaleDateString('ko-KR');
  };

  // 로딩 중
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#f72c5b]" />
      </div>
    );
  }

  // 권한 없음
  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-[#f5f5f5] py-8 px-4">
      <div className="container mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-[#6b7280] hover:text-[#111111] mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            대시보드로 돌아가기
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-[#f72c5b] to-[#ff6b6b]">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#111111]">관리자 페이지</h1>
              <p className="text-[#6b7280] mt-1">사용자 관리</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-[#eeeeee]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#f72c5b]/10">
                  <Users className="w-5 h-5 text-[#f72c5b]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#111111]">{users.length}</p>
                  <p className="text-sm text-[#6b7280]">총 사용자</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#eeeeee]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#03C75A]/10">
                  <Calendar className="w-5 h-5 text-[#03C75A]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#111111]">
                    {users.filter((u) => {
                      if (!u.lastLoginAt) return false;
                      const today = new Date();
                      const loginDate = new Date(u.lastLoginAt);
                      return loginDate.toDateString() === today.toDateString();
                    }).length}
                  </p>
                  <p className="text-sm text-[#6b7280]">오늘 접속</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#eeeeee]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#111111]/10">
                  <Key className="w-5 h-5 text-[#111111]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#111111]">
                    {users.filter((u) => {
                      if (!u.createdAt) return false;
                      const now = new Date();
                      const createdDate = new Date(u.createdAt);
                      const diffDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
                      return diffDays <= 7;
                    }).length}
                  </p>
                  <p className="text-sm text-[#6b7280]">이번 주 신규</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 사용자 목록 */}
        <Card className="border-[#eeeeee]">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-[#f72c5b]" />
                사용자 목록
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={loadUsers}
                className="border-[#eeeeee]"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                새로고침
              </Button>
            </div>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
              <Input
                type="text"
                placeholder="이메일, 이름, UID로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white border-[#eeeeee] focus:border-[#f72c5b]"
              />
            </div>
          </CardHeader>
          <CardContent>
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-[#d1d5db] mx-auto mb-4" />
                <p className="text-[#6b7280]">
                  {searchQuery ? '검색 결과가 없습니다' : '등록된 사용자가 없습니다'}
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {filteredUsers.map((userData) => (
                  <div
                    key={userData.uid}
                    onClick={() => handleSelectUser(userData)}
                    className={`p-4 border rounded-xl cursor-pointer transition-all ${
                      selectedUser?.uid === userData.uid
                        ? 'border-[#f72c5b] bg-[#f72c5b]/5 shadow-sm'
                        : 'border-[#eeeeee] hover:border-[#f72c5b]/30'
                    } ${userData.isBlocked ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      {userData.photoURL ? (
                        <img
                          src={userData.photoURL}
                          alt={userData.displayName || ''}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#f5f5f5] flex items-center justify-center">
                          <Users className="w-5 h-5 text-[#6b7280]" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-[#111111] truncate">
                            {userData.displayName || '이름 없음'}
                          </h3>
                          <Badge className={`text-[10px] px-1.5 py-0 ${PLAN_BADGE_COLORS[userData.currentPlan || 'FREE']} hover:${PLAN_BADGE_COLORS[userData.currentPlan || 'FREE']}`}>
                            {PLANS[userData.currentPlan || 'FREE'].name}
                          </Badge>
                          {userData.isBlocked && (
                            <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-[10px] px-1.5 py-0">
                              차단됨
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-[#6b7280]">
                          <Mail className="w-3 h-3" />
                          <span className="truncate">{userData.email || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right text-xs text-[#6b7280]">
                          {userData.lastLoginAt && (
                            <p>
                              마지막 접속:{' '}
                              {userData.lastLoginAt.toLocaleDateString('ko-KR')}
                            </p>
                          )}
                          {userData.createdAt && (
                            <p>
                              가입일: {userData.createdAt.toLocaleDateString('ko-KR')}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#9ca3af]" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 사용자 관리 모달 */}
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setSelectedUser(null); setConfirmAction(null); }}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              {/* 모달 헤더 */}
              <div className="flex items-center justify-between p-6 border-b border-[#eeeeee]">
                <div className="flex items-center gap-3">
                  {selectedUser.photoURL ? (
                    <img
                      src={selectedUser.photoURL}
                      alt={selectedUser.displayName || ''}
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#f5f5f5] flex items-center justify-center">
                      <Users className="w-6 h-6 text-[#6b7280]" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-[#111111] text-lg">
                      {selectedUser.displayName || '이름 없음'}
                    </h3>
                    <p className="text-sm text-[#6b7280]">{selectedUser.email || 'N/A'}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedUser(null); setConfirmAction(null); }}
                  className="p-2 rounded-lg hover:bg-[#f5f5f5] transition-colors"
                >
                  <X className="w-5 h-5 text-[#6b7280]" />
                </button>
              </div>

              {/* 사용자 정보 */}
              <div className="p-6 space-y-6">
                {/* 기본 정보 */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-lg bg-[#f9fafb]">
                    <p className="text-[#6b7280]">UID</p>
                    <p className="font-mono text-xs text-[#111111] break-all mt-1">{selectedUser.uid}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#f9fafb]">
                    <p className="text-[#6b7280]">현재 요금제</p>
                    <Badge className={`mt-1 ${PLAN_BADGE_COLORS[selectedUser.currentPlan || 'FREE']}`}>
                      {PLANS[selectedUser.currentPlan || 'FREE'].name}
                    </Badge>
                  </div>
                  <div className="p-3 rounded-lg bg-[#f9fafb]">
                    <p className="text-[#6b7280]">가입일</p>
                    <p className="font-medium text-[#111111] mt-1">
                      {selectedUser.createdAt?.toLocaleDateString('ko-KR') || 'N/A'}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#f9fafb]">
                    <p className="text-[#6b7280]">마지막 접속</p>
                    <p className="font-medium text-[#111111] mt-1">
                      {selectedUser.lastLoginAt?.toLocaleDateString('ko-KR') || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* 차단 상태 */}
                {selectedUser.isBlocked && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                    <div className="flex items-center gap-2 text-red-700">
                      <Ban className="w-4 h-4" />
                      <span className="text-sm font-medium">이 사용자는 차단된 상태입니다</span>
                    </div>
                  </div>
                )}

                {/* 최근 5회 접속 기록 */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-[#111111] flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#03C75A]" />
                    최근 접속 기록
                  </h4>
                  {selectedUser.loginHistory.length > 0 ? (
                    <div className="space-y-1">
                      {selectedUser.loginHistory
                        .slice()
                        .reverse()
                        .map((date, idx) => (
                          <div key={idx} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-[#f9fafb] text-sm">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-[#03C75A]' : 'bg-[#d1d5db]'}`} />
                              <span className="text-[#111111]">{formatDateTime(date)}</span>
                            </div>
                            <span className="text-xs text-[#9ca3af]">{formatRelativeTime(date)}</span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#9ca3af] py-2">접속 기록이 없습니다</p>
                  )}
                </div>

                {/* 활동 기록 */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-[#111111] flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#f72c5b]" />
                    활동 기록
                  </h4>
                  {isLoadingActivity ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-[#f72c5b]" />
                    </div>
                  ) : activityLog.length > 0 ? (
                    <div className="space-y-1 max-h-[200px] overflow-y-auto">
                      {activityLog.map((record, idx) => {
                        const IconComponent = ACTIVITY_ICONS[record.type] || Activity;
                        return (
                          <div key={idx} className="flex items-start gap-2 py-1.5 px-3 rounded-lg bg-[#f9fafb] text-sm">
                            <IconComponent className="w-3.5 h-3.5 text-[#6b7280] mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[#111111] truncate">{record.description}</p>
                              <p className="text-xs text-[#9ca3af]">
                                {formatDateTime(record.timestamp)} ({formatRelativeTime(record.timestamp)})
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-[#9ca3af] py-2">활동 기록이 없습니다</p>
                  )}
                </div>

                {/* 요금제 변경 */}
                <div className="space-y-3 pt-4 border-t border-[#eeeeee]">
                  <h4 className="font-semibold text-[#111111] flex items-center gap-2">
                    <Crown className="w-4 h-4 text-[#f72c5b]" />
                    요금제 변경
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(['FREE', 'STARTER', 'PRO', 'BUSINESS', 'BETA'] as SubscriptionPlan[]).map((plan) => (
                      <button
                        key={plan}
                        onClick={() => setSelectedUserPlan(plan)}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          selectedUserPlan === plan
                            ? 'border-[#f72c5b] bg-[#f72c5b]/5'
                            : 'border-[#eeeeee] hover:border-[#f72c5b]/30'
                        }`}
                      >
                        <p className="font-medium text-sm text-[#111111]">{PLANS[plan].name}</p>
                        <p className="text-xs text-[#6b7280] mt-0.5">
                          {PLANS[plan].price === 0 ? '무료' : `₩${PLANS[plan].price.toLocaleString()}/월`}
                        </p>
                      </button>
                    ))}
                  </div>
                  <Button
                    onClick={handleChangePlan}
                    disabled={isUpdating || selectedUserPlan === selectedUser.currentPlan}
                    className="w-full bg-[#f72c5b] hover:bg-[#e0264f] text-white disabled:opacity-50"
                  >
                    {isUpdating ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Crown className="w-4 h-4 mr-1" />
                    )}
                    {selectedUserPlan === selectedUser.currentPlan
                      ? '현재 요금제와 동일합니다'
                      : `${PLANS[selectedUserPlan].name}(으)로 변경`
                    }
                  </Button>
                </div>

                {/* 차단 / 삭제 */}
                <div className="space-y-3 pt-4 border-t border-[#eeeeee]">
                  <h4 className="font-semibold text-[#111111]">계정 관리</h4>

                  {confirmAction === null ? (
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setConfirmAction(selectedUser.isBlocked ? 'unblock' : 'block')}
                        className={`flex-1 ${selectedUser.isBlocked
                          ? 'border-[#03C75A] text-[#03C75A] hover:bg-[#03C75A]/10'
                          : 'border-orange-400 text-orange-500 hover:bg-orange-50'
                        }`}
                      >
                        <Ban className="w-4 h-4 mr-1" />
                        {selectedUser.isBlocked ? '차단 해제' : '사용자 차단'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setConfirmAction('delete')}
                        className="flex-1 border-red-400 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        사용자 삭제
                      </Button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg border-2 border-red-200 bg-red-50">
                      <p className="text-sm font-medium text-red-700 mb-3">
                        {confirmAction === 'delete'
                          ? `정말로 ${selectedUser.displayName || selectedUser.email}을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`
                          : confirmAction === 'block'
                          ? `${selectedUser.displayName || selectedUser.email}을(를) 차단하시겠습니까?`
                          : `${selectedUser.displayName || selectedUser.email}의 차단을 해제하시겠습니까?`
                        }
                      </p>
                      <div className="flex gap-2">
                        <Button
                          onClick={confirmAction === 'delete' ? handleDeleteUser : handleToggleBlock}
                          disabled={isUpdating}
                          className={`flex-1 ${confirmAction === 'delete' ? 'bg-red-500 hover:bg-red-600' : confirmAction === 'unblock' ? 'bg-[#03C75A] hover:bg-[#059669]' : 'bg-orange-500 hover:bg-orange-600'} text-white`}
                        >
                          {isUpdating ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : null}
                          {confirmAction === 'delete' ? '삭제 확인' : confirmAction === 'unblock' ? '차단 해제 확인' : '차단 확인'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setConfirmAction(null)}
                          className="flex-1"
                        >
                          취소
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
