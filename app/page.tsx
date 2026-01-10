'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';
import Script from 'next/script';

// 타이핑 효과 텍스트
const typingTexts = [
  '피트니스 블로그',
  'PT 센터 마케팅',
  '헬스장 홍보 콘텐츠',
  '운동 비포애프터',
];

export default function LandingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [typedText, setTypedText] = useState('');
  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // 마우스 위치 추적
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  }, []);

  // 파티클 애니메이션
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // 파티클 생성
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
      color: string;
    }> = [];

    const colors = ['#f72c5b', '#ff6b6b', '#ff8e8e', '#ffb3b3'];

    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 3 + 1,
        opacity: Math.random() * 0.5 + 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    let animationId: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle) => {
        // 마우스와의 거리 계산
        const dx = mousePosition.x - particle.x;
        const dy = mousePosition.y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // 마우스 근처에서 파티클 반응
        if (distance < 150) {
          const force = (150 - distance) / 150;
          particle.vx -= (dx / distance) * force * 0.02;
          particle.vy -= (dy / distance) * force * 0.02;
        }

        // 파티클 이동
        particle.x += particle.vx;
        particle.y += particle.vy;

        // 경계 처리
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        // 속도 감쇠
        particle.vx *= 0.99;
        particle.vy *= 0.99;

        // 파티클 그리기
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.opacity;
        ctx.fill();
      });

      // 파티클 간 연결선
      ctx.globalAlpha = 0.1;
      ctx.strokeStyle = '#f72c5b';
      ctx.lineWidth = 0.5;

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      ctx.globalAlpha = 1;
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, [mousePosition]);

  // 마우스 이벤트 리스너
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  // 타이핑 효과
  useEffect(() => {
    const currentText = typingTexts[textIndex];
    const typingSpeed = isDeleting ? 50 : 100;

    const timer = setTimeout(() => {
      if (!isDeleting) {
        if (charIndex < currentText.length) {
          setTypedText(currentText.substring(0, charIndex + 1));
          setCharIndex(charIndex + 1);
        } else {
          setTimeout(() => setIsDeleting(true), 2000);
        }
      } else {
        if (charIndex > 0) {
          setTypedText(currentText.substring(0, charIndex - 1));
          setCharIndex(charIndex - 1);
        } else {
          setIsDeleting(false);
          setTextIndex((textIndex + 1) % typingTexts.length);
        }
      }
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [charIndex, isDeleting, textIndex]);

  // 로딩 애니메이션
  useEffect(() => {
    setTimeout(() => setIsLoaded(true), 100);
  }, []);

  // 페이지 로드 시 즉시 오디오 차단 (Spline 로드 전에 실행)
  useEffect(() => {
    // Audio 생성자 오버라이드 - 모든 Audio 객체를 무음으로 생성
    const OriginalAudio = window.Audio;
    window.Audio = class extends OriginalAudio {
      constructor(src?: string) {
        super(src);
        this.muted = true;
        this.volume = 0;
      }
    } as typeof Audio;

    // AudioContext 오버라이드 - 생성 즉시 suspend
    const OriginalAudioContext = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (OriginalAudioContext) {
      window.AudioContext = class extends OriginalAudioContext {
        constructor(options?: AudioContextOptions) {
          super(options);
          this.suspend();
        }
      } as typeof AudioContext;
    }

    return () => {
      window.Audio = OriginalAudio;
      if (OriginalAudioContext) {
        window.AudioContext = OriginalAudioContext;
      }
    };
  }, []);

  // Spline 로고 제거 및 음악 끄기
  useEffect(() => {
    const removeSplineLogoAndMuteAudio = () => {
      const splineViewer = document.querySelector('spline-viewer');
      if (splineViewer?.shadowRoot) {
        const logo = splineViewer.shadowRoot.querySelector('#logo');
        if (logo) {
          (logo as HTMLElement).style.display = 'none';
        }

        // shadowRoot 내의 오디오/비디오 요소도 음소거
        const mediaElements = splineViewer.shadowRoot.querySelectorAll('audio, video');
        mediaElements.forEach((media) => {
          (media as HTMLMediaElement).muted = true;
          (media as HTMLMediaElement).volume = 0;
          (media as HTMLMediaElement).pause();
        });
      }

      // 모든 오디오 요소 음소거
      const audioElements = document.querySelectorAll('audio');
      audioElements.forEach((audio) => {
        audio.muted = true;
        audio.pause();
        audio.volume = 0;
      });

      // 모든 비디오 요소도 음소거
      const videoElements = document.querySelectorAll('video');
      videoElements.forEach((video) => {
        video.muted = true;
        video.volume = 0;
      });
    };

    const interval = setInterval(removeSplineLogoAndMuteAudio, 300);
    setTimeout(() => clearInterval(interval), 15000);

    return () => clearInterval(interval);
  }, []);

  const handleStart = () => {
    if (user) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  };


  return (
    <div
      ref={containerRef}
      className="relative min-h-screen overflow-hidden bg-black"
    >
      {/* 파티클 캔버스 */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
      />

      {/* 그라데이션 원형 효과 - Spline 영역 제외 */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full pointer-events-none transition-all duration-300 ease-out"
        style={{
          background: 'radial-gradient(circle, rgba(247, 44, 91, 0.08) 0%, transparent 70%)',
          left: mousePosition.x - 300,
          top: mousePosition.y - 300,
          display: mousePosition.y < 450 ? 'none' : 'block',
        }}
      />

      {/* 배경 장식 요소 - 하단에만 배치 */}
      <div className="absolute bottom-40 left-10 w-72 h-72 bg-[#f72c5b]/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#ff6b6b]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-60 left-1/4 w-48 h-48 bg-[#f72c5b]/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />

      {/* 메인 콘텐츠 */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        {/* Spline 3D */}
        <div
          className={`mb-8 transform transition-all duration-1000 ${
            isLoaded ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'
          }`}
        >
          <div className="relative w-[300px] h-[300px] md:w-[400px] md:h-[400px] spline-container pointer-events-none">
            <Script
              type="module"
              src="https://unpkg.com/@splinetool/viewer@1.12.28/build/spline-viewer.js"
              strategy="lazyOnload"
            />
            {/* @ts-expect-error - spline-viewer is a custom element */}
            <spline-viewer
              url="https://prod.spline.design/MUxunZjJ6-BRxORs/scene.splinecode"
              style={{ width: '100%', height: '100%', background: 'transparent', pointerEvents: 'auto' }}
              background="transparent"
              events-target="global"
            />
          </div>
        </div>

        {/* 타이틀 */}
        <div
          className={`text-center mb-6 transform transition-all duration-1000 delay-200 ${
            isLoaded ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'
          }`}
        >
          <p className="text-[#f72c5b] text-sm font-medium tracking-[0.3em] mb-4 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" />
            AI BLOG AUTOMATION
            <Sparkles className="w-4 h-4" />
          </p>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4 tracking-tight">
            BlogBooster
          </h1>
          <div className="h-16 md:h-20 flex items-center justify-center">
            <p className="text-2xl md:text-3xl lg:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-[#f72c5b] to-[#ff6b6b]">
              {typedText}
              <span className="animate-pulse">|</span>
            </p>
          </div>
          <p className="text-[#6b7280] text-lg md:text-xl max-w-xl mx-auto mt-4">
            AI가 자동으로 SEO 최적화된 블로그 콘텐츠를 생성합니다
          </p>
        </div>

        {/* CTA 버튼 */}
        <div
          className={`transform transition-all duration-1000 delay-400 ${
            isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
          }`}
        >
          <button
            onClick={handleStart}
            className="group relative px-10 py-5 overflow-hidden rounded-2xl"
          >
            {/* 애니메이션 그라데이션 보더 */}
            <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#f72c5b] via-[#ff6b6b] to-[#f72c5b] bg-[length:200%_100%] animate-gradient-x" />

            {/* 내부 배경 */}
            <span className="absolute inset-[2px] rounded-[14px] bg-black/90 backdrop-blur-sm group-hover:bg-black/70 transition-all duration-300" />

            {/* 글로우 효과 */}
            <span className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-[#f72c5b]/20 via-transparent to-[#ff6b6b]/20 blur-xl" />

            {/* 상단 하이라이트 */}
            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />

            {/* 버튼 텍스트 */}
            <span className="relative flex items-center gap-3 text-lg font-semibold text-white">
              <span className="group-hover:tracking-wider transition-all duration-300">시작하기</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
            </span>

            {/* 호버 시 빛나는 점 */}
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0 h-0 bg-white/30 rounded-full group-hover:w-32 group-hover:h-32 transition-all duration-500 opacity-0 group-hover:opacity-100 blur-2xl" />
          </button>
        </div>
      </div>

      {/* 하단 그라데이션 */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />

      {/* 스타일 */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
          }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .spline-container spline-viewer #logo,
        .spline-container spline-viewer a[href*="spline.design"] {
          display: none !important;
          opacity: 0 !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }
      `}</style>
    </div>
  );
}
