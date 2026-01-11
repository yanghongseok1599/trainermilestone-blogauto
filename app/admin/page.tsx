'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Users,
  Settings,
  Loader2,
  Search,
  Mail,
  Calendar,
  Shield,
  Key,
  RefreshCw,
} from 'lucide-react';
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface UserData {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Date | null;
  lastLoginAt: Date | null;
}

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        userList.push({
          uid: doc.id,
          email: data.email || '',
          displayName: data.displayName || null,
          photoURL: data.photoURL || null,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null,
          lastLoginAt: data.lastLoginAt instanceof Timestamp ? data.lastLoginAt.toDate() : null,
        });
      });

      setUsers(userList);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('사용자 목록을 불러오는데 실패했습니다');
    }
    setIsLoading(false);
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
              <p className="text-[#6b7280] mt-1">시스템 설정 및 사용자 관리</p>
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
                <div className="p-2 rounded-lg bg-[#10b981]/10">
                  <Calendar className="w-5 h-5 text-[#10b981]" />
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
                <div className="p-2 rounded-lg bg-[#6366f1]/10">
                  <Key className="w-5 h-5 text-[#6366f1]" />
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 시스템 설정 */}
          <Card className="border-[#eeeeee]">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#f72c5b]" />
                시스템 설정
              </CardTitle>
              <CardDescription>주요 설정을 관리합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-lg border border-[#eeeeee] bg-[#f9fafb]">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#111111]">Firebase 상태</span>
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                    연결됨
                  </Badge>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-[#eeeeee] bg-[#f9fafb]">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#111111]">카카오 로그인</span>
                  <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
                    설정됨
                  </Badge>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-[#eeeeee] bg-[#f9fafb]">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#111111]">Google 로그인</span>
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                    설정됨
                  </Badge>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-[#eeeeee] bg-[#f9fafb]">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#111111]">결제 시스템</span>
                  <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">
                    토스 연동
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 사용자 목록 */}
          <Card className="lg:col-span-2 border-[#eeeeee]">
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
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {filteredUsers.map((userData) => (
                    <div
                      key={userData.uid}
                      className="p-4 border border-[#eeeeee] rounded-xl hover:border-[#f72c5b]/30 transition-colors"
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
                          </div>
                          <div className="flex items-center gap-1 text-sm text-[#6b7280]">
                            <Mail className="w-3 h-3" />
                            <span className="truncate">{userData.email || 'N/A'}</span>
                          </div>
                        </div>
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
