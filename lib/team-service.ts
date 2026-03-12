import { createSupabaseBrowserClient } from './supabase-client';

const supabase = createSupabaseBrowserClient();

export interface TeamMember {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  addedAt: Date;
  status: 'pending' | 'active';
}

export interface TeamInfo {
  ownerId: string;
  ownerEmail: string;
  ownerName: string | null;
  members: TeamMember[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMembership {
  ownerId: string;
  ownerEmail: string;
  ownerName: string | null;
  joinedAt: Date;
}

// 팀 생성/업데이트
export async function saveTeam(
  ownerId: string,
  ownerEmail: string,
  ownerName: string | null,
  members: Omit<TeamMember, 'addedAt'>[]
): Promise<void> {
  // 팀 upsert
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .upsert({
      owner_id: ownerId,
      owner_email: ownerEmail,
      owner_name: ownerName,
    }, { onConflict: 'owner_id' })
    .select('id')
    .single();

  if (teamError || !team) throw new Error(`팀 저장 실패: ${teamError?.message}`);

  // 기존 멤버 삭제 후 재삽입
  await supabase
    .from('team_members')
    .delete()
    .eq('team_id', team.id);

  if (members.length > 0) {
    const { error: membersError } = await supabase
      .from('team_members')
      .insert(members.map((m) => ({
        team_id: team.id,
        user_id: m.uid,
        email: m.email,
        display_name: m.displayName,
        photo_url: m.photoURL,
        status: m.status || 'active',
      })));

    if (membersError) throw new Error(`멤버 저장 실패: ${membersError.message}`);
  }
}

// 팀 정보 조회
export async function getTeam(ownerId: string): Promise<TeamInfo | null> {
  const { data: team, error } = await supabase
    .from('teams')
    .select('*, team_members(*)')
    .eq('owner_id', ownerId)
    .single();

  if (error || !team) return null;

  return {
    ownerId: team.owner_id,
    ownerEmail: team.owner_email,
    ownerName: team.owner_name,
    members: (team.team_members || []).map((m: Record<string, unknown>) => ({
      uid: m.user_id as string,
      email: m.email as string,
      displayName: m.display_name as string | null,
      photoURL: m.photo_url as string | null,
      addedAt: new Date(m.added_at as string),
      status: (m.status as 'pending' | 'active') || 'active',
    })),
    createdAt: new Date(team.created_at),
    updatedAt: new Date(team.updated_at),
  };
}

// 팀 멤버 추가
export async function addTeamMember(
  ownerId: string,
  ownerEmail: string,
  ownerName: string | null,
  member: Omit<TeamMember, 'addedAt' | 'status'>
): Promise<void> {
  // 팀 가져오기 또는 생성
  let { data: team } = await supabase
    .from('teams')
    .select('id')
    .eq('owner_id', ownerId)
    .single();

  if (!team) {
    const { data: newTeam, error: createError } = await supabase
      .from('teams')
      .insert({
        owner_id: ownerId,
        owner_email: ownerEmail,
        owner_name: ownerName,
      })
      .select('id')
      .single();

    if (createError || !newTeam) throw new Error(`팀 생성 실패: ${createError?.message}`);
    team = newTeam;
  }

  // 중복 체크
  const { data: existing } = await supabase
    .from('team_members')
    .select('id')
    .eq('team_id', team.id)
    .eq('user_id', member.uid)
    .single();

  if (existing) throw new Error('이미 팀에 추가된 멤버입니다');

  const { error } = await supabase
    .from('team_members')
    .insert({
      team_id: team.id,
      user_id: member.uid,
      email: member.email,
      display_name: member.displayName,
      photo_url: member.photoURL,
      status: 'active',
    });

  if (error) throw new Error(`멤버 추가 실패: ${error.message}`);
}

// 팀 멤버 삭제
export async function removeTeamMember(ownerId: string, memberId: string): Promise<void> {
  const { data: team } = await supabase
    .from('teams')
    .select('id')
    .eq('owner_id', ownerId)
    .single();

  if (!team) return;

  await supabase
    .from('team_members')
    .delete()
    .eq('team_id', team.id)
    .eq('user_id', memberId);
}

// 내가 속한 팀 조회
export async function getMyTeamMembership(userId: string): Promise<TeamMembership | null> {
  const { data, error } = await supabase
    .from('team_members')
    .select('*, teams(*)')
    .eq('user_id', userId)
    .limit(1)
    .single();

  if (error || !data || !data.teams) return null;

  const team = data.teams as Record<string, unknown>;
  return {
    ownerId: team.owner_id as string,
    ownerEmail: team.owner_email as string,
    ownerName: team.owner_name as string | null,
    joinedAt: new Date(data.added_at),
  };
}

// 이메일로 사용자 찾기
export async function findUserByEmail(email: string): Promise<{ uid: string; email: string; displayName: string | null; photoURL: string | null } | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, display_name, photo_url')
    .eq('email', email)
    .single();

  if (error || !data) return null;

  return {
    uid: data.id,
    email: data.email,
    displayName: data.display_name || null,
    photoURL: data.photo_url || null,
  };
}

// 팀 소유자의 API 설정 가져오기
export async function getTeamOwnerApiSettings(ownerId: string): Promise<{ apiProvider: string; apiKey: string } | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('api_provider, api_key')
    .eq('user_id', ownerId)
    .single();

  if (error || !data) return null;

  return {
    apiProvider: data.api_provider || 'gemini',
    apiKey: data.api_key || '',
  };
}

// 팀 탈퇴
export async function leaveTeam(userId: string, ownerId: string): Promise<void> {
  await removeTeamMember(ownerId, userId);
}
