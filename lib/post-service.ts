import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  where,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { SavedPost, PostType, SeoSchedule, SeoScheduleItem, POST_TYPE_INFO } from '@/types/post';
import { FitnessCategory, SearchIntent } from '@/types';

// 글 저장 입력 타입
export interface SavePostInput {
  title: string;
  content: string;
  category: FitnessCategory;
  postType: PostType;
  searchIntent: SearchIntent;
  mainKeyword: string;
  businessName: string;
  imagePrompts: { korean: string; english: string }[];
}

// 글 저장
export async function savePost(userId: string, post: SavePostInput): Promise<string> {
  if (!db) throw new Error('Firestore가 초기화되지 않았습니다');

  const postId = crypto.randomUUID();
  const docRef = doc(db, 'users', userId, 'posts', postId);

  await setDoc(docRef, {
    ...post,
    id: postId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // SEO 스케줄 업데이트
  await updateSeoSchedule(userId, post.postType);

  return postId;
}

// 글 조회 (단일)
export async function getPost(userId: string, postId: string): Promise<SavedPost | null> {
  if (!db) return null;

  const docRef = doc(db, 'users', userId, 'posts', postId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      title: data.title,
      content: data.content,
      category: data.category,
      postType: data.postType,
      searchIntent: data.searchIntent,
      mainKeyword: data.mainKeyword,
      businessName: data.businessName,
      imagePrompts: data.imagePrompts || [],
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  }
  return null;
}

// 글 목록 조회
export async function getPosts(
  userId: string,
  options?: {
    postType?: PostType;
    limit?: number;
  }
): Promise<SavedPost[]> {
  if (!db) return [];

  const postsRef = collection(db, 'users', userId, 'posts');
  let q = query(postsRef, orderBy('createdAt', 'desc'));

  if (options?.postType) {
    q = query(postsRef, where('postType', '==', options.postType), orderBy('createdAt', 'desc'));
  }

  if (options?.limit) {
    q = query(q, limit(options.limit));
  }

  const querySnapshot = await getDocs(q);
  const posts: SavedPost[] = [];

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    posts.push({
      id: doc.id,
      title: data.title,
      content: data.content,
      category: data.category,
      postType: data.postType,
      searchIntent: data.searchIntent,
      mainKeyword: data.mainKeyword,
      businessName: data.businessName,
      imagePrompts: data.imagePrompts || [],
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    });
  });

  return posts;
}

// 최근 글 조회 (RAG용)
export async function getRecentPosts(userId: string, count: number = 3): Promise<SavedPost[]> {
  return getPosts(userId, { limit: count });
}

// 글 삭제
export async function deletePost(userId: string, postId: string): Promise<void> {
  if (!db) throw new Error('Firestore가 초기화되지 않았습니다');

  const docRef = doc(db, 'users', userId, 'posts', postId);
  await deleteDoc(docRef);
}

// 글 수정
export async function updatePost(
  userId: string,
  postId: string,
  updates: Partial<SavePostInput>
): Promise<void> {
  if (!db) throw new Error('Firestore가 초기화되지 않았습니다');

  const docRef = doc(db, 'users', userId, 'posts', postId);
  await setDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

// SEO 스케줄 조회
export async function getSeoSchedule(userId: string): Promise<SeoSchedule | null> {
  if (!db) return null;

  const docRef = doc(db, 'users', userId, 'seoSchedule', 'current');
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    const schedule: SeoSchedule = {
      center_intro: parseScheduleItem(data.center_intro),
      equipment: parseScheduleItem(data.equipment),
      program: parseScheduleItem(data.program),
      trainer: parseScheduleItem(data.trainer),
      review: parseScheduleItem(data.review),
    };
    return schedule;
  }

  // 기본값 반환
  return getDefaultSeoSchedule();
}

// 스케줄 항목 파싱
function parseScheduleItem(item: { lastPublished?: Timestamp; nextDue?: Timestamp } | undefined): SeoScheduleItem {
  return {
    lastPublished: item?.lastPublished?.toDate() || null,
    nextDue: item?.nextDue?.toDate() || null,
  };
}

// 기본 SEO 스케줄
function getDefaultSeoSchedule(): SeoSchedule {
  return {
    center_intro: { lastPublished: null, nextDue: null },
    equipment: { lastPublished: null, nextDue: null },
    program: { lastPublished: null, nextDue: null },
    trainer: { lastPublished: null, nextDue: null },
    review: { lastPublished: null, nextDue: null },
  };
}

// SEO 스케줄 업데이트
export async function updateSeoSchedule(userId: string, postType: PostType): Promise<void> {
  if (!db) throw new Error('Firestore가 초기화되지 않았습니다');

  const docRef = doc(db, 'users', userId, 'seoSchedule', 'current');
  const now = new Date();
  const cycleDays = POST_TYPE_INFO[postType].cycleDays;
  const nextDue = new Date(now);
  nextDue.setDate(nextDue.getDate() + cycleDays);

  await setDoc(docRef, {
    [postType]: {
      lastPublished: Timestamp.fromDate(now),
      nextDue: Timestamp.fromDate(nextDue),
    },
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

// 글 통계 조회
export async function getPostStats(userId: string): Promise<{
  totalPosts: number;
  thisMonthPosts: number;
  postsByType: Record<PostType, number>;
}> {
  if (!db) {
    return {
      totalPosts: 0,
      thisMonthPosts: 0,
      postsByType: {
        center_intro: 0,
        equipment: 0,
        program: 0,
        trainer: 0,
        review: 0,
      },
    };
  }

  const posts = await getPosts(userId);
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const postsByType: Record<PostType, number> = {
    center_intro: 0,
    equipment: 0,
    program: 0,
    trainer: 0,
    review: 0,
  };

  let thisMonthPosts = 0;

  posts.forEach((post) => {
    postsByType[post.postType]++;
    if (post.createdAt >= thisMonthStart) {
      thisMonthPosts++;
    }
  });

  return {
    totalPosts: posts.length,
    thisMonthPosts,
    postsByType,
  };
}

// RAG용 컨텍스트 생성
export async function generateRagContext(userId: string): Promise<string> {
  const recentPosts = await getRecentPosts(userId, 3);

  if (recentPosts.length === 0) {
    return '';
  }

  const context = recentPosts.map((post, idx) => {
    // 글 앞부분 500자만 사용
    const contentPreview = post.content.slice(0, 500);
    return `[참고 글 ${idx + 1}] - ${post.title}
카테고리: ${post.category} | 글 유형: ${POST_TYPE_INFO[post.postType].name}
---
${contentPreview}...
---`;
  }).join('\n\n');

  return `## 이전에 작성한 글 참고 (스타일 일관성 유지)

${context}

위 글들의 어조와 스타일을 참고하여 일관성 있게 작성해주세요.`;
}
