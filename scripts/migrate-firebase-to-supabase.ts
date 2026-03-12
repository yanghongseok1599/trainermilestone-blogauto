/**
 * Firebase → Supabase 데이터 마이그레이션 스크립트
 *
 * 사용법:
 *   1. .env.local에 Firebase + Supabase 환경변수 설정
 *   2. npx tsx scripts/migrate-firebase-to-supabase.ts
 *
 * 주의사항:
 *   - Firebase Auth → Supabase Auth는 비밀번호 해시를 직접 마이그레이션할 수 없음
 *   - Google OAuth 사용자는 Supabase에서 다시 로그인하면 자동으로 계정 생성됨
 *   - 이메일/비밀번호 사용자는 비밀번호 재설정이 필요
 *   - 실행 전 supabase-migration.sql을 Supabase SQL Editor에서 먼저 실행할 것
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { createClient } from '@supabase/supabase-js';

// ==================== 설정 ====================

const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ==================== 초기화 ====================

const firebaseApp = initializeApp({
  credential: cert({
    projectId: FIREBASE_PROJECT_ID,
    clientEmail: FIREBASE_CLIENT_EMAIL,
    privateKey: FIREBASE_PRIVATE_KEY,
  }),
});

const fireDb = getFirestore(firebaseApp);
const fireAuth = getAuth(firebaseApp);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// UID 매핑: Firebase UID → Supabase UUID
const uidMap = new Map<string, string>();

// ==================== 유틸리티 ====================

function toISOString(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === 'object' && val !== null && 'toDate' in val) {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'string') return new Date(val).toISOString();
  return null;
}

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

// ==================== Step 1: Auth 사용자 마이그레이션 ====================

async function migrateUsers() {
  log('=== Step 1: Auth 사용자 마이그레이션 ===');

  const listResult = await fireAuth.listUsers(1000);
  log(`Firebase Auth 사용자 수: ${listResult.users.length}`);

  for (const fireUser of listResult.users) {
    try {
      const isGoogleUser = fireUser.providerData.some(p => p.providerId === 'google.com');
      const email = fireUser.email;

      if (!email) {
        log(`  SKIP: ${fireUser.uid} - 이메일 없음`);
        continue;
      }

      // Supabase에서 사용자 생성
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          full_name: fireUser.displayName || null,
          avatar_url: fireUser.photoURL || null,
          provider: isGoogleUser ? 'google' : 'email',
          firebase_uid: fireUser.uid,
        },
        // 이메일/비밀번호 사용자는 임시 비밀번호 설정 (나중에 비밀번호 재설정 필요)
        ...(isGoogleUser ? {} : { password: `temp_${Date.now()}_${Math.random().toString(36)}` }),
      });

      if (error) {
        // 이미 존재하는 사용자인 경우
        if (error.message?.includes('already been registered')) {
          const { data: existing } = await supabase.auth.admin.listUsers();
          const found = existing.users.find(u => u.email === email);
          if (found) {
            uidMap.set(fireUser.uid, found.id);
            log(`  EXISTS: ${email} (${fireUser.uid} → ${found.id})`);
            continue;
          }
        }
        log(`  ERROR: ${email} - ${error.message}`);
        continue;
      }

      if (data.user) {
        uidMap.set(fireUser.uid, data.user.id);
        log(`  OK: ${email} (${fireUser.uid} → ${data.user.id})`);
      }
    } catch (err) {
      log(`  ERROR: ${fireUser.uid} - ${err}`);
    }
  }

  log(`UID 매핑 완료: ${uidMap.size}개`);
}

// ==================== Step 2: Firestore 데이터 마이그레이션 ====================

async function migrateProfiles() {
  log('=== Step 2-1: profiles 마이그레이션 ===');

  const usersSnap = await fireDb.collection('users').get();
  let count = 0;

  for (const doc of usersSnap.docs) {
    const data = doc.data();
    const supabaseUid = uidMap.get(doc.id);
    if (!supabaseUid) {
      log(`  SKIP profile: ${doc.id} - UID 매핑 없음`);
      continue;
    }

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: supabaseUid,
        email: data.email || '',
        display_name: data.displayName || null,
        photo_url: data.photoURL || null,
        is_blocked: data.isBlocked || false,
        login_history: (data.loginHistory || []).map((ts: unknown) => toISOString(ts)).filter(Boolean),
        last_login_at: toISOString(data.lastLoginAt),
        created_at: toISOString(data.createdAt) || new Date().toISOString(),
      }, { onConflict: 'id' });

    if (error) log(`  ERROR profile ${doc.id}: ${error.message}`);
    else count++;
  }

  log(`  profiles 완료: ${count}개`);
}

async function migrateSubscriptions() {
  log('=== Step 2-2: subscriptions 마이그레이션 ===');

  const usersSnap = await fireDb.collection('users').get();
  let count = 0;

  for (const doc of usersSnap.docs) {
    const supabaseUid = uidMap.get(doc.id);
    if (!supabaseUid) continue;

    try {
      const subDoc = await fireDb.doc(`users/${doc.id}/subscription/current`).get();
      const data = subDoc.data();
      if (!data) continue;

      const { error } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: supabaseUid,
          current_plan: data.currentPlan || 'FREE',
          plan_start_date: toISOString(data.planStartDate) || new Date().toISOString(),
          plan_end_date: toISOString(data.planEndDate) || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          blog_count: data.blogCount || 0,
          image_analysis_count: data.imageAnalysisCount || 0,
          image_generation_count: data.imageGenerationCount || 0,
          daily_paid_image_generation_count: data.dailyPaidImageGenerationCount || 0,
          daily_image_generation_reset_date: toISOString(data.dailyImageGenerationResetDate),
          token_usage: data.tokenUsage || 0,
          daily_token_usage: data.dailyTokenUsage || 0,
          daily_token_reset_date: toISOString(data.dailyTokenResetDate),
          usage_reset_date: toISOString(data.usageResetDate) || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          last_payment_id: data.lastPaymentId || null,
          next_payment_date: toISOString(data.nextPaymentDate),
          is_active: data.isActive ?? true,
          auto_renew: data.autoRenew ?? false,
        }, { onConflict: 'user_id' });

      if (error) log(`  ERROR subscription ${doc.id}: ${error.message}`);
      else count++;
    } catch {
      // 구독 데이터 없으면 스킵
    }
  }

  log(`  subscriptions 완료: ${count}개`);
}

async function migrateBusinessInfo() {
  log('=== Step 2-3: business_info 마이그레이션 ===');
  let count = 0;

  for (const [fireUid, supabaseUid] of uidMap) {
    try {
      const doc = await fireDb.doc(`users/${fireUid}/businessInfo/current`).get();
      const data = doc.data();
      if (!data) continue;

      const { error } = await supabase
        .from('business_info')
        .upsert({
          user_id: supabaseUid,
          business_name: data.businessName || '',
          industry: data.industry || '',
          target_audience: data.targetAudience || '',
          main_products: data.mainProducts || '',
          brand_keywords: data.brandKeywords || '',
          unique_selling_point: data.uniqueSellingPoint || '',
          blog_purpose: data.blogPurpose || '',
          content_style: data.contentStyle || '',
        }, { onConflict: 'user_id' });

      if (error) log(`  ERROR business_info ${fireUid}: ${error.message}`);
      else count++;
    } catch {
      // 데이터 없으면 스킵
    }
  }

  log(`  business_info 완료: ${count}개`);
}

async function migratePresets() {
  log('=== Step 2-4: presets 마이그레이션 ===');
  let count = 0;

  for (const [fireUid, supabaseUid] of uidMap) {
    try {
      const presetsSnap = await fireDb.collection(`users/${fireUid}/presets`).get();

      for (const doc of presetsSnap.docs) {
        const data = doc.data();
        const { error } = await supabase
          .from('presets')
          .insert({
            user_id: supabaseUid,
            name: data.name || '무제',
            settings: data.settings || data,
          });

        if (error) log(`  ERROR preset ${doc.id}: ${error.message}`);
        else count++;
      }
    } catch {
      // 프리셋 없으면 스킵
    }
  }

  log(`  presets 완료: ${count}개`);
}

async function migratePosts() {
  log('=== Step 2-5: posts 마이그레이션 ===');
  let count = 0;

  for (const [fireUid, supabaseUid] of uidMap) {
    try {
      const postsSnap = await fireDb.collection(`users/${fireUid}/posts`).get();

      for (const doc of postsSnap.docs) {
        const data = doc.data();
        const { error } = await supabase
          .from('posts')
          .insert({
            user_id: supabaseUid,
            title: data.title || '',
            content: data.content || '',
            html_content: data.htmlContent || null,
            keyword: data.keyword || null,
            category: data.category || null,
            tags: data.tags || [],
            status: data.status || 'draft',
            post_type: data.postType || 'blog',
            seo_score: data.seoScore || null,
            meta_description: data.metaDescription || null,
            scheduled_at: toISOString(data.scheduledAt),
            published_at: toISOString(data.publishedAt),
            created_at: toISOString(data.createdAt) || new Date().toISOString(),
          });

        if (error) log(`  ERROR post ${doc.id}: ${error.message}`);
        else count++;
      }
    } catch {
      // 글 없으면 스킵
    }
  }

  log(`  posts 완료: ${count}개`);
}

async function migrateUserSettings() {
  log('=== Step 2-6: user_settings 마이그레이션 ===');
  let count = 0;

  for (const [fireUid, supabaseUid] of uidMap) {
    try {
      const apiDoc = await fireDb.doc(`users/${fireUid}/settings/api`).get();
      const apiData = apiDoc.data();

      const refDoc = await fireDb.doc(`users/${fireUid}/settings/referenceText`).get();
      const refData = refDoc.data();

      if (!apiData && !refData) continue;

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: supabaseUid,
          api_provider: apiData?.apiProvider || 'gemini',
          api_key: apiData?.apiKey || '',
          reference_text: refData?.text || '',
        }, { onConflict: 'user_id' });

      if (error) log(`  ERROR user_settings ${fireUid}: ${error.message}`);
      else count++;
    } catch {
      // 설정 없으면 스킵
    }
  }

  log(`  user_settings 완료: ${count}개`);
}

async function migrateActivityLogs() {
  log('=== Step 2-7: activity_logs 마이그레이션 ===');
  let count = 0;

  for (const [fireUid, supabaseUid] of uidMap) {
    try {
      const actDoc = await fireDb.doc(`users/${fireUid}/activity/log`).get();
      const data = actDoc.data();
      if (!data?.activities) continue;

      const activities = data.activities as Array<{
        type: string;
        description: string;
        timestamp: unknown;
        metadata?: Record<string, unknown>;
      }>;

      for (const act of activities.slice(-30)) {
        const { error } = await supabase
          .from('activity_logs')
          .insert({
            user_id: supabaseUid,
            type: act.type || 'login',
            description: act.description || '',
            metadata: act.metadata || {},
            created_at: toISOString(act.timestamp) || new Date().toISOString(),
          });

        if (error) log(`  ERROR activity ${fireUid}: ${error.message}`);
        else count++;
      }
    } catch {
      // 활동 로그 없으면 스킵
    }
  }

  log(`  activity_logs 완료: ${count}개`);
}

async function migratePayments() {
  log('=== Step 2-8: payments 마이그레이션 ===');

  const paymentsSnap = await fireDb.collection('payments').get();
  let count = 0;

  for (const doc of paymentsSnap.docs) {
    const data = doc.data();
    const supabaseUid = uidMap.get(data.userId);
    if (!supabaseUid) {
      log(`  SKIP payment ${doc.id}: UID 매핑 없음`);
      continue;
    }

    const { error } = await supabase
      .from('payments')
      .insert({
        id: doc.id,
        order_id: data.orderId || '',
        user_id: supabaseUid,
        payment_key: data.paymentKey || null,
        amount: data.amount || 0,
        method: data.method || null,
        status: data.status || 'READY',
        plan: data.plan || 'FREE',
        plan_name: data.planName || '',
        cancel_reason: data.cancelReason || null,
        cancel_amount: data.cancelAmount || null,
        toss_response: data.tossResponse || null,
        approved_at: toISOString(data.approvedAt),
        canceled_at: toISOString(data.canceledAt),
        created_at: toISOString(data.createdAt) || new Date().toISOString(),
      });

    if (error) log(`  ERROR payment ${doc.id}: ${error.message}`);
    else count++;
  }

  log(`  payments 완료: ${count}개`);
}

async function migrateTeams() {
  log('=== Step 2-9: teams 마이그레이션 ===');

  const teamsSnap = await fireDb.collection('teams').get();
  let count = 0;

  for (const doc of teamsSnap.docs) {
    const data = doc.data();
    const ownerSupabaseUid = uidMap.get(data.ownerId || doc.id);
    if (!ownerSupabaseUid) {
      log(`  SKIP team ${doc.id}: 소유자 UID 매핑 없음`);
      continue;
    }

    const { data: team, error: teamError } = await supabase
      .from('teams')
      .upsert({
        owner_id: ownerSupabaseUid,
        owner_email: data.ownerEmail || '',
        owner_name: data.ownerName || null,
      }, { onConflict: 'owner_id' })
      .select('id')
      .single();

    if (teamError || !team) {
      log(`  ERROR team ${doc.id}: ${teamError?.message}`);
      continue;
    }

    // 팀 멤버
    const members = data.members || [];
    for (const member of members) {
      const memberSupabaseUid = uidMap.get(member.uid);
      if (!memberSupabaseUid) continue;

      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: team.id,
          user_id: memberSupabaseUid,
          email: member.email || '',
          display_name: member.displayName || null,
          photo_url: member.photoURL || null,
          status: member.status || 'active',
        });

      if (memberError) log(`  ERROR team_member: ${memberError.message}`);
    }

    count++;
  }

  log(`  teams 완료: ${count}개`);
}

async function migrateSeoSchedules() {
  log('=== Step 2-10: seo_schedules 마이그레이션 ===');
  let count = 0;

  for (const [fireUid, supabaseUid] of uidMap) {
    try {
      const schedDoc = await fireDb.doc(`users/${fireUid}/seoSchedule/current`).get();
      const data = schedDoc.data();
      if (!data) continue;

      const { error } = await supabase
        .from('seo_schedules')
        .upsert({
          user_id: supabaseUid,
          post_type: data.postType || 'blog',
          is_enabled: data.isEnabled ?? false,
          schedule_time: data.scheduleTime || '09:00',
          keywords: data.keywords || [],
          last_run_at: toISOString(data.lastRunAt),
          next_run_at: toISOString(data.nextRunAt),
        }, { onConflict: 'user_id,post_type' });

      if (error) log(`  ERROR seo_schedule ${fireUid}: ${error.message}`);
      else count++;
    } catch {
      // 스케줄 없으면 스킵
    }
  }

  log(`  seo_schedules 완료: ${count}개`);
}

async function migrateKeywordUsage() {
  log('=== Step 2-11: keyword_usage 마이그레이션 ===');

  const usageSnap = await fireDb.collection('keyword_usage').get();
  let count = 0;

  for (const doc of usageSnap.docs) {
    const data = doc.data();
    // doc.id 형식: {firebaseUid}_{date}
    const parts = doc.id.split('_');
    const date = parts.pop();
    const fireUid = parts.join('_');
    const supabaseUid = uidMap.get(fireUid);

    if (!supabaseUid || !date) {
      log(`  SKIP keyword_usage ${doc.id}: UID 매핑 없음`);
      continue;
    }

    const { error } = await supabase
      .from('keyword_usage')
      .upsert({
        user_id: supabaseUid,
        date,
        count: data.count || 0,
      }, { onConflict: 'user_id,date' });

    if (error) log(`  ERROR keyword_usage ${doc.id}: ${error.message}`);
    else count++;
  }

  log(`  keyword_usage 완료: ${count}개`);
}

// ==================== Step 3: 벡터 테이블 UID 업데이트 ====================

async function updateVectorTableUids() {
  log('=== Step 3: 벡터 테이블 UID 업데이트 ===');

  const tables = ['user_posts', 'user_posts_gemini', 'blog_vectors'];

  for (const table of tables) {
    let updated = 0;
    for (const [fireUid, supabaseUid] of uidMap) {
      const { error, count } = await supabase
        .from(table)
        .update({ user_id: supabaseUid })
        .eq('user_id', fireUid);

      if (!error && count && count > 0) updated += count;
    }
    log(`  ${table}: ${updated}행 업데이트`);
  }
}

// ==================== 실행 ====================

async function main() {
  log('🔄 Firebase → Supabase 마이그레이션 시작');
  log(`Firebase Project: ${FIREBASE_PROJECT_ID}`);
  log(`Supabase URL: ${SUPABASE_URL}`);

  try {
    // Step 1: Auth 사용자
    await migrateUsers();

    // Step 2: Firestore 데이터
    await migrateProfiles();
    await migrateSubscriptions();
    await migrateBusinessInfo();
    await migratePresets();
    await migratePosts();
    await migrateUserSettings();
    await migrateActivityLogs();
    await migratePayments();
    await migrateTeams();
    await migrateSeoSchedules();
    await migrateKeywordUsage();

    // Step 3: 벡터 테이블 UID 업데이트
    await updateVectorTableUids();

    // UID 매핑 저장
    const mapObj: Record<string, string> = {};
    uidMap.forEach((v, k) => { mapObj[k] = v; });
    const fs = await import('fs');
    fs.writeFileSync('uid-mapping.json', JSON.stringify(mapObj, null, 2));
    log('UID 매핑 파일 저장: uid-mapping.json');

    log('✅ 마이그레이션 완료!');
    log(`총 ${uidMap.size}명의 사용자 마이그레이션됨`);
    log('⚠️  이메일/비밀번호 사용자는 비밀번호 재설정이 필요합니다');
  } catch (err) {
    log(`❌ 마이그레이션 실패: ${err}`);
    process.exit(1);
  }
}

main();
