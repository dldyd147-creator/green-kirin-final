"use client";

import { supabase } from "@/utils/supabase";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ViewerPage() {
  // 1. 주소창의 ID 가져오기 (any 타입으로 유연하게 처리)
  const params = useParams();
  const router = useRouter();
  
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(true);
  const [statusMsg, setStatusMsg] = useState("초기화 중...");

  useEffect(() => {
    // ID가 제대로 들어왔는지 확인
    const id = params?.episode_id;

    if (!id) {
      setStatusMsg("주소에서 ID를 찾을 수 없습니다.");
      setLoading(false);
      return;
    }

    const fetchImages = async () => {
      setStatusMsg(`데이터 조회 시작... (ID: ${id})`);
      
      try {
        // 이미지 가져오기
        const { data, error } = await supabase
          .from("images")
          .select("*")
          .eq("episode_id", id)
          .order("sequence", { ascending: true });

        if (error) {
          throw error;
        }

        if (!data || data.length === 0) {
          setStatusMsg(`⚠️ ID '${id}'에 해당하는 이미지가 DB에 없습니다.`);
        } else {
          setStatusMsg(`✅ 성공! 이미지 ${data.length}장 로드 완료.`);
          setImages(data);
        }
      } catch (err: any) {
        console.error(err);
        setStatusMsg(`❌ 에러 발생: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [params]); // params가 변할 때마다 실행

  const toggleMenu = () => setShowMenu(!showMenu);

  // 로딩 화면
  if (loading) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center text-white gap-4">
        <div className="animate-spin text-4xl">⏳</div>
        <div className="text-xl">로딩 중...</div>
        <div className="text-sm text-yellow-400">({statusMsg})</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      
      {/* 🔍 상태 메시지 바 (테스트용) */}
      <div className="bg-gray-800 text-yellow-300 p-2 text-center text-xs z-50 relative">
        [상태] {statusMsg}
      </div>

      {/* 상단 메뉴 */}
      <div className={`fixed top-0 left-0 right-0 bg-black/80 text-white p-4 transition-transform duration-300 z-50 ${showMenu ? "translate-y-0" : "-translate-y-full"}`}>
        <button onClick={() => router.back()} className="text-lg font-bold">← 나가기</button>
      </div>

      {/* 이미지 뷰어 */}
      <div className="w-full max-w-2xl mx-auto flex flex-col min-h-screen" onClick={toggleMenu}>
        {images.length > 0 ? (
          images.map((img) => (
            <div key={img.id} className="relative w-full">
              {/* 일반 img 태그 사용 (호환성 최적화) */}
              <img 
                src={img.image_url} 
                alt={`${img.sequence}번 컷`} 
                className="w-full h-auto block"
                style={{ display: 'block', margin: 0, padding: 0 }}
              />
            </div>
          ))
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            이미지가 없습니다.<br/>위쪽 상태 메시지를 확인해주세요.
          </div>
        )}
      </div>

      {/* 하단 메뉴 */}
      <div className={`fixed bottom-0 left-0 right-0 bg-black/80 text-white p-4 flex justify-between transition-transform duration-300 z-50 ${showMenu ? "translate-y-0" : "translate-y-full"}`}>
        <button className="px-4 py-2 bg-gray-700 rounded">이전화</button>
        <button className="px-4 py-2 bg-blue-600 rounded">다음화</button>
      </div>
    </div>
  );
}