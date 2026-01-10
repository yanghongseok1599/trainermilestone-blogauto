import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

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

// 팀 생성/업데이트 (API 소유자)
export async function saveTeam(
  ownerId: string,
  ownerEmail: string,
  ownerName: string | null,
  members: Omit<TeamMember, 'addedAt'>[]
): Promise<void> {
  if (!db) throw new Error('Firestore가 초기화되지 않았습니다');

  const teamRef = doc(db, 'teams', ownerId);
  const existingTeam = await getDoc(teamRef);

  const membersWithTimestamp: TeamMember[] = members.map((member) => ({
    ...member,
    addedAt: new Date(),
  }));

  if (existingTeam.exists()) {
    // 기존 멤버의 addedAt 유지
    const existingMembers = existingTeam.data().members || [];
    membersWithTimestamp.forEach((newMember, index) => {
      const existing = existingMembers.find((m: TeamMember) => m.uid === newMember.uid);
      if (existing) {
        membersWithTimestamp[index].addedAt = existing.addedAt instanceof Timestamp
          ? existing.addedAt.toDate()
          : existing.addedAt;
      }
    });
  }

  await setDoc(teamRef, {
    ownerId,
    ownerEmail,
    ownerName,
    members: membersWithTimestamp,
    createdAt: existingTeam.exists() ? existingTeam.data().createdAt : serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 각 멤버에게 팀 멤버십 정보 저장
  for (const member of membersWithTimestamp) {
    const membershipRef = doc(db, 'users', member.uid, 'teamMembership', ownerId);
    await setDoc(membershipRef, {
      ownerId,
      ownerEmail,
      ownerName,
      joinedAt: serverTimestamp(),
    });
  }
}

// 팀 정보 조회 (API 소유자)
export async function getTeam(ownerId: string): Promise<TeamInfo | null> {
  if (!db) return null;

  const teamRef = doc(db, 'teams', ownerId);
  const teamSnap = await getDoc(teamRef);

  if (!teamSnap.exists()) return null;

  const data = teamSnap.data();
  return {
    ownerId: data.ownerId,
    ownerEmail: data.ownerEmail,
    ownerName: data.ownerName,
    members: (data.members || []).map((m: TeamMember & { addedAt: Timestamp | Date }) => ({
      ...m,
      addedAt: m.addedAt instanceof Timestamp ? m.addedAt.toDate() : m.addedAt,
    })),
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
  };
}

// 팀 멤버 추가
export async function addTeamMember(
  ownerId: string,
  ownerEmail: string,
  ownerName: string | null,
  member: Omit<TeamMember, 'addedAt' | 'status'>
): Promise<void> {
  if (!db) throw new Error('Firestore가 초기화되지 않았습니다');

  const teamRef = doc(db, 'teams', ownerId);
  const teamSnap = await getDoc(teamRef);

  let existingMembers: TeamMember[] = [];
  if (teamSnap.exists()) {
    existingMembers = teamSnap.data().members || [];
  }

  // 이미 존재하는 멤버인지 확인
  if (existingMembers.some((m) => m.uid === member.uid)) {
    throw new Error('이미 팀에 추가된 멤버입니다');
  }

  const newMember: TeamMember = {
    ...member,
    addedAt: new Date(),
    status: 'active',
  };

  await setDoc(teamRef, {
    ownerId,
    ownerEmail,
    ownerName,
    members: [...existingMembers, newMember],
    createdAt: teamSnap.exists() ? teamSnap.data().createdAt : serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 멤버에게 팀 멤버십 정보 저장
  const membershipRef = doc(db, 'users', member.uid, 'teamMembership', ownerId);
  await setDoc(membershipRef, {
    ownerId,
    ownerEmail,
    ownerName,
    joinedAt: serverTimestamp(),
  });
}

// 팀 멤버 삭제
export async function removeTeamMember(ownerId: string, memberId: string): Promise<void> {
  if (!db) throw new Error('Firestore가 초기화되지 않았습니다');

  const teamRef = doc(db, 'teams', ownerId);
  const teamSnap = await getDoc(teamRef);

  if (!teamSnap.exists()) return;

  const data = teamSnap.data();
  const updatedMembers = (data.members || []).filter((m: TeamMember) => m.uid !== memberId);

  await setDoc(teamRef, {
    ...data,
    members: updatedMembers,
    updatedAt: serverTimestamp(),
  });

  // 멤버의 팀 멤버십 정보 삭제
  const membershipRef = doc(db, 'users', memberId, 'teamMembership', ownerId);
  await deleteDoc(membershipRef);
}

// 내가 속한 팀 조회 (팀원)
export async function getMyTeamMembership(userId: string): Promise<TeamMembership | null> {
  if (!db) return null;

  const membershipRef = collection(db, 'users', userId, 'teamMembership');
  const membershipSnap = await getDocs(membershipRef);

  if (membershipSnap.empty) return null;

  // 첫 번째 멤버십 반환 (한 팀에만 속할 수 있다고 가정)
  const firstDoc = membershipSnap.docs[0];
  const data = firstDoc.data();

  return {
    ownerId: data.ownerId,
    ownerEmail: data.ownerEmail,
    ownerName: data.ownerName,
    joinedAt: data.joinedAt instanceof Timestamp ? data.joinedAt.toDate() : new Date(),
  };
}

// 이메일로 사용자 찾기
export async function findUserByEmail(email: string): Promise<{ uid: string; email: string; displayName: string | null; photoURL: string | null } | null> {
  if (!db) return null;

  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', email));
  const querySnap = await getDocs(q);

  if (querySnap.empty) return null;

  const userDoc = querySnap.docs[0];
  const data = userDoc.data();

  return {
    uid: userDoc.id,
    email: data.email,
    displayName: data.displayName || null,
    photoURL: data.photoURL || null,
  };
}

// 팀 소유자의 API 설정 가져오기 (팀원이 사용)
export async function getTeamOwnerApiSettings(ownerId: string): Promise<{ apiProvider: string; apiKey: string } | null> {
  if (!db) return null;

  const apiRef = doc(db, 'users', ownerId, 'settings', 'api');
  const apiSnap = await getDoc(apiRef);

  if (!apiSnap.exists()) return null;

  const data = apiSnap.data();
  return {
    apiProvider: data.apiProvider || 'gemini',
    apiKey: data.apiKey || '',
  };
}

// 팀 탈퇴 (팀원이 직접)
export async function leaveTeam(userId: string, ownerId: string): Promise<void> {
  if (!db) throw new Error('Firestore가 초기화되지 않았습니다');

  // 팀에서 멤버 제거
  await removeTeamMember(ownerId, userId);
}
