"use client";

import { supabase } from "@/utils/supabase";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ViewerPage() {
  const params = useParams();
  const router = useRouter();
  const episodeId = params?.episode_id as string;
  
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(true); // 메뉴 보임/숨김 토글
  
  // 네비게이션 정보 (이전화/다음화/제목)
  const [navInfo, setNavInfo] = useState({
    title: "",
    workTitle: "",
    prevId: null as string | null,
    nextId: null as string | null,
  });

  useEffect(() => {
    if (!episodeId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // 1. 현재 에피소드의 이미지들 가져오기
        const { data: imgData } = await supabase
          .from("images")
          .select("*")
          .eq("episode_id", episodeId)
          .order("sequence", { ascending: true });

        if (imgData) setImages(imgData);

        // 2. 현재 에피소드 정보 + 이전화/다음화 계산하기
        // A. 현재 에피소드가 무슨 작품인지 확인
        const { data: currentEp } = await supabase
          .from("episodes")
          .select("*, works(title)") // 작품 제목도 같이 가져옴
          .eq("id", episodeId)
          .single();

        if (currentEp) {
          const workId = currentEp.work_id;

          // B. 이 작품의 '모든 에피소드'를 순서대로 가져옴 (족보 조회)
          const { data: allEps } = await supabase
            .from("episodes")
            .select("id, episode_number")
            .eq("work_id", workId)
            .order("episode_number", { ascending: true });

          if (allEps) {
            // C. 내 위치를 찾아서 앞뒤 번호 확인
            const currentIndex = allEps.findIndex(e => e.id == episodeId);
            
            setNavInfo({
              title: currentEp.title,
              workTitle: currentEp.works?.title || "",
              prevId: currentIndex > 0 ? allEps[currentIndex - 1].id : null,
              nextId: currentIndex < allEps.length - 1 ? allEps[currentIndex + 1].id : null
            });
          }
        }
      } catch (err) {
        console.error("데이터 로딩 실패:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    window.scrollTo(0, 0); // 페이지 이동 시 맨 위로
  }, [episodeId]);

  const toggleMenu = () => setShowMenu(!showMenu);

  // === 로딩 화면 ===
  if (loading) {
    return (
      <div className="h-screen bg-white flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-gray-100 border-t-[#00D560] rounded-full animate-spin"></div>
      </div>
    );
  }

  // === 메인 뷰어 ===
  return (
    <div className="min-h-screen bg-white relative">
      
      {/* 🟢 상단 메뉴바 */}
      <div className={`fixed top-0 left-0 right-0 bg-white/95 backdrop-blur shadow-sm p-3 flex items-center justify-between transition-transform duration-300 z-50 ${showMenu ? "translate-y-0" : "-translate-y-full"}`}>
        <button onClick={() => router.back()} className="text-gray-500 hover:text-[#00D560] px-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div className="text-center">
          <p className="text-xs text-[#00D560] font-bold mb-0.5">{navInfo.workTitle}</p>
          <p className="text-sm font-bold text-gray-900">{navInfo.title}</p>
        </div>
        <div className="w-8"></div> {/* 균형 맞춤용 */}
      </div>

      {/* 🖼️ 원고 영역 */}
      <div className="w-full max-w-[768px] mx-auto min-h-screen pb-20 shadow-lg bg-white" onClick={toggleMenu}>
        {images.length > 0 ? (
          images.map((img) => (
            <img 
              key={img.id}
              src={img.image_url} 
              alt="cut" 
              className="w-full h-auto block" // block으로 틈새 제거
              loading="lazy"
            />
          ))
        ) : (
          <div className="h-[50vh] flex items-center justify-center text-gray-400 text-sm">
            등록된 원고가 없습니다.
          </div>
        )}
      </div>

      {/* 🟢 하단 메뉴바 (네비게이션) */}
      <div className={`fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-100 p-4 transition-transform duration-300 z-50 ${showMenu ? "translate-y-0" : "translate-y-full"}`}>
        <div className="max-w-[768px] mx-auto flex justify-between items-center gap-3">
          
          {/* 이전화 */}
          <button 
            onClick={() => navInfo.prevId && router.push(`/viewer/${navInfo.prevId}`)}
            disabled={!navInfo.prevId}
            className={`flex-1 py-3 rounded-lg font-bold border transition-colors ${
              navInfo.prevId 
              ? "border-gray-200 text-gray-600 hover:bg-gray-50" 
              : "border-gray-100 text-gray-300 cursor-not-allowed"
            }`}
          >
            이전화
          </button>

          {/* 목록으로 (작품 홈으로 이동) */}
          <button onClick={() => router.push('/')} className="p-3 text-gray-400 hover:text-[#00D560]">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
          </button>

          {/* 다음화 (강조) */}
          <button 
            onClick={() => navInfo.nextId && router.push(`/viewer/${navInfo.nextId}`)}
            disabled={!navInfo.nextId}
            className={`flex-1 py-3 rounded-lg font-bold transition-colors shadow-sm ${
              navInfo.nextId 
              ? "bg-[#00D560] text-white hover:bg-[#00b550]" 
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            다음화
          </button>

        </div>
      </div>
    </div>
  );
}