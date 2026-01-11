'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getPosts, getPostStats, getSeoSchedule, deletePost } from '@/lib/post-service';
import { getTeam, addTeamMember, removeTeamMember, getMyTeamMembership, findUserByEmail, leaveTeam, TeamInfo, TeamMember, TeamMembership } from '@/lib/team-service';
import { SavedPost, PostType, POST_TYPE_INFO, SeoSchedule, SeoAlert, calculateDaysRemaining, calculateNextDue, calculateAlertStatus } from '@/types/post';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  ArrowLeft,
  FileText,
  Calendar,
  Bell,
  Trash2,
  Copy,
  Filter,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Building2,
  Dumbbell,
  BookOpen,
  Users,
  Star,
  UserPlus,
  Mail,
  Key,
  LogOut,
  X,
} from 'lucide-react';

// 글 유형별 아이콘
const POST_TYPE_ICONS: Record<PostType, React.ReactNode> = {
  center_intro: <Building2 className="w-4 h-4" />,
  equipment: <Dumbbell className="w-4 h-4" />,
  program: <BookOpen className="w-4 h-4" />,
  trainer: <Users className="w-4 h-4" />,
  review: <Star className="w-4 h-4" />,
};

export default function MyPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<SavedPost[]>([]);
  const [stats, setStats] = useState<{
    totalPosts: number;
    thisMonthPosts: number;
    postsByType: Record<PostType, number>;
  } | null>(null);
  const [seoSchedule, setSeoSchedule] = useState<SeoSchedule | null>(null);
  const [seoAlerts, setSeoAlerts] = useState<SeoAlert[]>([]);
  const [selectedType, setSelectedType] = useState<PostType | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<SavedPost | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 팀 관련 상태
  const [teamInfo, setTeamInfo] = useState<TeamInfo | null>(null);
  const [teamMembership, setTeamMembership] = useState<TeamMembership | null>(null);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isRemovingMember, setIsRemovingMember] = useState<string | null>(null);
  const [isLeavingTeam, setIsLeavingTeam] = useState(false);

  // 인증 체크
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // 데이터 로드
  useEffect(() => {
    if (user) {
      loadData();
      loadTeamData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const [postsData, statsData, scheduleData] = await Promise.all([
        getPosts(user.uid),
        getPostStats(user.uid),
        getSeoSchedule(user.uid),
      ]);

      setPosts(postsData);
      setStats(statsData);
      setSeoSchedule(scheduleData);

      // SEO 알림 계산
      if (scheduleData) {
        const alerts: SeoAlert[] = (Object.keys(POST_TYPE_INFO) as PostType[]).map((postType) => {
          const item = scheduleData[postType];
          const cycleDays = POST_TYPE_INFO[postType].cycleDays;
          const nextDue = calculateNextDue(item.lastPublished, cycleDays);
          const daysRemaining = calculateDaysRemaining(nextDue);
          const status = calculateAlertStatus(daysRemaining);

          return {
            postType,
            status,
            daysRemaining,
            lastPublished: item.lastPublished,
          };
        });

        // 긴급한 순서로 정렬 (overdue > due_soon > ok)
        alerts.sort((a, b) => {
          const statusOrder = { overdue: 0, due_soon: 1, ok: 2 };
          return statusOrder[a.status] - statusOrder[b.status] || a.daysRemaining - b.daysRemaining;
        });

        setSeoAlerts(alerts);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('데이터를 불러오는데 실패했습니다');
    }

    setIsLoading(false);
  };

  // 팀 데이터 로드
  const loadTeamData = async () => {
    if (!user) return;

    try {
      // 내가 소유한 팀 조회
      const myTeam = await getTeam(user.uid);
      setTeamInfo(myTeam);

      // 내가 속한 팀 조회 (다른 사람 팀의 멤버인 경우)
      const membership = await getMyTeamMembership(user.uid);
      setTeamMembership(membership);
    } catch (error) {
      console.error('Failed to load team data:', error);
    }
  };

  // 팀 멤버 추가
  const handleAddMember = async () => {
    if (!user || !newMemberEmail.trim()) return;

    setIsAddingMember(true);
    try {
      // 이메일로 사용자 찾기
      const foundUser = await findUserByEmail(newMemberEmail.trim());
      if (!foundUser) {
        toast.error('해당 이메일의 사용자를 찾을 수 없습니다');
        setIsAddingMember(false);
        return;
      }

      // 자기 자신을 추가하려는 경우
      if (foundUser.uid === user.uid) {
        toast.error('자기 자신을 팀에 추가할 수 없습니다');
        setIsAddingMember(false);
        return;
      }

      // 팀 멤버 추가
      await addTeamMember(
        user.uid,
        user.email || '',
        user.displayName,
        {
          uid: foundUser.uid,
          email: foundUser.email,
          displayName: foundUser.displayName,
          photoURL: foundUser.photoURL,
        }
      );

      toast.success(`${foundUser.displayName || foundUser.email}님을 팀에 추가했습니다`);
      setNewMemberEmail('');
      loadTeamData();
    } catch (error) {
      console.error('Failed to add member:', error);
      const errorMessage = error instanceof Error ? error.message : '팀 멤버 추가에 실패했습니다';
      toast.error(errorMessage);
    }
    setIsAddingMember(false);
  };

  // 팀 멤버 삭제
  const handleRemoveMember = async (memberId: string) => {
    if (!user) return;

    setIsRemovingMember(memberId);
    try {
      await removeTeamMember(user.uid, memberId);
      toast.success('팀 멤버를 삭제했습니다');
      loadTeamData();
    } catch (error) {
      console.error('Failed to remove member:', error);
      toast.error('팀 멤버 삭제에 실패했습니다');
    }
    setIsRemovingMember(null);
  };

  // 팀 탈퇴
  const handleLeaveTeam = async () => {
    if (!user || !teamMembership) return;

    setIsLeavingTeam(true);
    try {
      await leaveTeam(user.uid, teamMembership.ownerId);
      toast.success('팀에서 탈퇴했습니다');
      setTeamMembership(null);
    } catch (error) {
      console.error('Failed to leave team:', error);
      toast.error('팀 탈퇴에 실패했습니다');
    }
    setIsLeavingTeam(false);
  };

  // 글 삭제
  const handleDelete = async (postId: string) => {
    if (!user) return;
    setIsDeleting(true);

    try {
      await deletePost(user.uid, postId);
      toast.success('글이 삭제되었습니다');
      setIsDetailOpen(false);
      loadData();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('삭제에 실패했습니다');
    }

    setIsDeleting(false);
  };

  // 클립보드 복사
  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('클립보드에 복사되었습니다');
    } catch {
      toast.error('복사에 실패했습니다');
    }
  };

  // 필터된 글 목록
  const filteredPosts = selectedType === 'all'
    ? posts
    : posts.filter(post => post.postType === selectedType);

  // 로딩 중
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#f72c5b]" />
      </div>
    );
  }

  // 미로그인
  if (!user) {
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
          <h1 className="text-3xl font-bold text-[#111111]">마이페이지</h1>
          <p className="text-[#6b7280] mt-1">작성한 글 관리 및 SEO 발행 알림</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="border-[#eeeeee]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#f72c5b]/10">
                    <FileText className="w-5 h-5 text-[#f72c5b]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#111111]">{stats.totalPosts}</p>
                    <p className="text-sm text-[#6b7280]">총 작성 글</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#eeeeee]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#10b981]/10">
                    <TrendingUp className="w-5 h-5 text-[#10b981]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#111111]">{stats.thisMonthPosts}</p>
                    <p className="text-sm text-[#6b7280]">이번 달</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#eeeeee]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#f7a600]/10">
                    <Bell className="w-5 h-5 text-[#f7a600]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#111111]">
                      {seoAlerts.filter(a => a.status === 'overdue').length}
                    </p>
                    <p className="text-sm text-[#6b7280]">발행 필요</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#eeeeee]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#6366f1]/10">
                    <Calendar className="w-5 h-5 text-[#6366f1]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#111111]">
                      {seoAlerts.filter(a => a.status === 'due_soon').length}
                    </p>
                    <p className="text-sm text-[#6b7280]">임박 알림</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 팀원이 속한 팀 정보 표시 */}
        {teamMembership && (
          <Card className="border-[#eeeeee] mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Key className="w-5 h-5 text-[#10b981]" />
                소속 팀 정보
              </CardTitle>
              <CardDescription>
                다른 사용자의 API를 공유받고 있습니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg border border-green-200 bg-green-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#10b981]/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-[#10b981]" />
                    </div>
                    <div>
                      <p className="font-medium text-[#111111]">
                        {teamMembership.ownerName || '팀 소유자'}의 팀
                      </p>
                      <p className="text-sm text-[#6b7280]">{teamMembership.ownerEmail}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLeaveTeam}
                    disabled={isLeavingTeam}
                    className="border-red-200 text-red-500 hover:bg-red-50"
                  >
                    {isLeavingTeam ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <LogOut className="w-4 h-4 mr-1" />
                        탈퇴
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-[#6b7280] mt-2">
                  가입일: {teamMembership.joinedAt.toLocaleDateString('ko-KR')}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* SEO 알림 대시보드 */}
          <Card className="lg:col-span-1 border-[#eeeeee]">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#f7a600]" />
                SEO 발행 알림
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {seoAlerts.map((alert) => (
                <div
                  key={alert.postType}
                  className={`p-3 rounded-lg border ${
                    alert.status === 'overdue'
                      ? 'bg-red-50 border-red-200'
                      : alert.status === 'due_soon'
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-green-50 border-green-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {alert.status === 'overdue' ? (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      ) : alert.status === 'due_soon' ? (
                        <Clock className="w-4 h-4 text-yellow-500" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      )}
                      <span className="font-medium text-[#111111]">
                        {POST_TYPE_INFO[alert.postType].name}
                      </span>
                    </div>
                    <Badge
                      variant={
                        alert.status === 'overdue'
                          ? 'destructive'
                          : alert.status === 'due_soon'
                          ? 'secondary'
                          : 'default'
                      }
                      className={
                        alert.status === 'ok'
                          ? 'bg-green-100 text-green-700 hover:bg-green-100'
                          : ''
                      }
                    >
                      {alert.daysRemaining < 0
                        ? `${Math.abs(alert.daysRemaining)}일 지남`
                        : alert.daysRemaining === 0
                        ? '오늘 마감'
                        : `${alert.daysRemaining}일 남음`}
                    </Badge>
                  </div>
                  <p className="text-xs text-[#6b7280] mt-1">
                    권장: {POST_TYPE_INFO[alert.postType].cycleDays}일마다 발행
                    {alert.lastPublished && (
                      <> | 마지막: {alert.lastPublished.toLocaleDateString('ko-KR')}</>
                    )}
                  </p>
                </div>
              ))}

              {seoAlerts.length === 0 && (
                <p className="text-center text-[#6b7280] py-4">
                  아직 발행 기록이 없습니다
                </p>
              )}
            </CardContent>
          </Card>

          {/* 작성 글 목록 */}
          <Card className="lg:col-span-2 border-[#eeeeee]">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#f72c5b]" />
                  작성한 글
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-[#6b7280]" />
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as PostType | 'all')}
                    className="text-sm border border-[#eeeeee] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#f72c5b]/20"
                  >
                    <option value="all">전체</option>
                    {(Object.keys(POST_TYPE_INFO) as PostType[]).map((type) => (
                      <option key={type} value={type}>
                        {POST_TYPE_INFO[type].name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredPosts.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-[#d1d5db] mx-auto mb-4" />
                  <p className="text-[#6b7280]">
                    {selectedType === 'all'
                      ? '아직 저장된 글이 없습니다'
                      : `${POST_TYPE_INFO[selectedType].name} 글이 없습니다`}
                  </p>
                  <Link href="/dashboard">
                    <Button className="mt-4 bg-[#f72c5b] hover:bg-[#e0264f]">
                      새 글 작성하기
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {filteredPosts.map((post) => (
                    <div
                      key={post.id}
                      className="p-4 border border-[#eeeeee] rounded-xl hover:border-[#f72c5b]/30 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedPost(post);
                        setIsDetailOpen(true);
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant="outline"
                              className="text-xs border-[#f72c5b]/30 text-[#f72c5b]"
                            >
                              {POST_TYPE_ICONS[post.postType]}
                              <span className="ml-1">{POST_TYPE_INFO[post.postType].name}</span>
                            </Badge>
                            <span className="text-xs text-[#6b7280]">
                              {post.createdAt.toLocaleDateString('ko-KR')}
                            </span>
                          </div>
                          <h3 className="font-medium text-[#111111] truncate">
                            {post.title || post.mainKeyword}
                          </h3>
                          <p className="text-sm text-[#6b7280] line-clamp-2 mt-1">
                            {post.content.slice(0, 100)}...
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(post.content);
                            }}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 팀 관리 섹션 */}
        <Card className="mt-6 border-[#eeeeee]">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-[#6366f1]" />
              API 공유 팀 관리
            </CardTitle>
            <CardDescription>
              내 유료 API를 팀원들과 함께 사용할 수 있습니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* 멤버 추가 폼 */}
            <div className="flex gap-2 mb-6">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
                <Input
                  type="email"
                  placeholder="팀원 이메일 주소 입력"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
                  className="pl-10 bg-white border-[#eeeeee] focus:border-[#f72c5b]"
                />
              </div>
              <Button
                onClick={handleAddMember}
                disabled={isAddingMember || !newMemberEmail.trim()}
                className="bg-[#6366f1] hover:bg-[#5558e3]"
              >
                {isAddingMember ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-1" />
                    추가
                  </>
                )}
              </Button>
            </div>

            {/* 팀 멤버 목록 */}
            {teamInfo && teamInfo.members.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-[#6b7280] mb-2">
                  팀원 {teamInfo.members.length}명
                </p>
                {teamInfo.members.map((member) => (
                  <div
                    key={member.uid}
                    className="p-3 border border-[#eeeeee] rounded-lg flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {member.photoURL ? (
                        <img
                          src={member.photoURL}
                          alt={member.displayName || ''}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#f5f5f5] flex items-center justify-center">
                          <Users className="w-5 h-5 text-[#6b7280]" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-[#111111]">
                          {member.displayName || '이름 없음'}
                        </p>
                        <p className="text-sm text-[#6b7280]">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          member.status === 'active'
                            ? 'bg-green-100 text-green-700 hover:bg-green-100'
                            : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100'
                        }
                      >
                        {member.status === 'active' ? '활성' : '대기중'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.uid)}
                        disabled={isRemovingMember === member.uid}
                        className="h-8 w-8 p-0 text-red-500 hover:bg-red-50"
                      >
                        {isRemovingMember === member.uid ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-[#d1d5db] mx-auto mb-4" />
                <p className="text-[#6b7280]">아직 팀원이 없습니다</p>
                <p className="text-sm text-[#9ca3af] mt-1">
                  이메일 주소로 팀원을 초대하세요
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 글 상세 다이얼로그 */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            {selectedPost && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      variant="outline"
                      className="border-[#f72c5b]/30 text-[#f72c5b]"
                    >
                      {POST_TYPE_INFO[selectedPost.postType].name}
                    </Badge>
                    <span className="text-sm text-[#6b7280]">
                      {selectedPost.createdAt.toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  <DialogTitle className="text-xl">
                    {selectedPost.title || selectedPost.mainKeyword}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedPost.businessName} | {selectedPost.category}
                  </DialogDescription>
                </DialogHeader>

                <div className="mt-4">
                  <div className="bg-[#f9fafb] rounded-xl border border-[#eeeeee] p-4 max-h-[400px] overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm text-[#111111] font-sans">
                      {selectedPost.content}
                    </pre>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <Button
                      className="flex-1 bg-[#f72c5b] hover:bg-[#e0264f]"
                      onClick={() => handleCopy(selectedPost.content)}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      복사하기
                    </Button>
                    <Button
                      variant="outline"
                      className="border-red-200 text-red-500 hover:bg-red-50"
                      onClick={() => handleDelete(selectedPost.id)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          삭제
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
