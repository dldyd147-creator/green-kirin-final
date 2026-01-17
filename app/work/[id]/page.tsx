import { supabase } from "@/utils/supabase";
import Link from "next/link";

// ⚠️ Next.js 15+ 호환 (params를 Promise로 처리)
export default async function WorkDetail({ params }: { params: Promise<{ id: string }> }) {
  // 1. ID 꺼내기
  const { id } = await params;

  // 2. 작품 정보 가져오기
  const { data: work, error: workError } = await supabase
    .from("works")
    .select("*")
    .eq("id", id)
    .single();

  // 3. 회차 리스트 가져오기 (태그 포함)
  const { data: episodes, error: epError } = await supabase
    .from("episodes")
    .select("*")
    .eq("work_id", id)
    .order("episode_number", { ascending: false }); // 최신화부터 정렬

  // 에러 로그
  if (workError) console.error("작품 로딩 에러:", workError);
  if (epError) console.error("회차 로딩 에러:", epError);

  // === 작품이 없을 때 (에러 화면) ===
  if (!work) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-10 text-center">
        <div className="text-4xl mb-4">😢</div>
        <h1 className="text-xl font-bold text-gray-900">작품을 찾을 수 없습니다.</h1>
        <p className="text-gray-400 mt-2 text-sm">ID: {id}</p>
        <Link href="/" className="mt-6 inline-block bg-[#00D560] text-white px-6 py-3 rounded-full font-bold hover:bg-[#00b550] transition-colors">
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  // === 메인 화면 ===
  return (
    <div className="min-h-screen bg-white text-gray-900 pb-20">
      
      {/* 🟢 고정 헤더 */}
      <div className="sticky top-0 bg-white/95 backdrop-blur z-20 px-4 py-3 border-b border-gray-100 flex items-center shadow-sm">
        <Link href="/" className="text-gray-400 hover:text-[#00D560] transition-colors p-2 -ml-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <h1 className="text-lg font-bold ml-2 truncate text-gray-800">{work.title}</h1>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-6">
        
        {/* 🖼️ 작품 정보 카드 (상단) */}
        <div className="flex gap-5 mb-10 items-start">
          <div className="w-24 h-32 bg-gray-100 rounded-lg overflow-hidden shadow-md border border-gray-100 flex-shrink-0">
             {work.thumbnail_url ? (
               <img src={work.thumbnail_url} alt={work.title} className="w-full h-full object-cover" />
             ) : (
               <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No Image</div>
             )}
          </div>
          <div className="pt-1">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">{work.title}</h2>
            <p className="text-sm text-gray-500 mb-3">GreenKirin Webtoon Archive</p>
            <div className="inline-block bg-green-50 text-[#00D560] text-xs font-bold px-3 py-1 rounded-full border border-green-100">
              총 {episodes?.length || 0}개 에피소드
            </div>
          </div>
        </div>

        {/* 📚 회차 리스트 */}
        <h3 className="font-bold text-lg mb-4 text-gray-800">회차 목록</h3>
        <div className="space-y-3">
          {episodes?.map((ep) => (
            <Link
              key={ep.id}
              href={`/viewer/${ep.id}`}
              className="block p-4 bg-white rounded-xl border border-gray-100 hover:border-[#00D560] hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-lg group-hover:text-[#00D560] transition-colors">
                      {ep.episode_number}화.
                    </span>
                    <span className="font-medium text-gray-700">{ep.title}</span>
                  </div>
                  
                  {/* 태그 표시 (있으면) */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {ep.tags ? (
                      ep.tags.split(' ').map((tag: string, i: number) => (
                        <span key={i} className="text-[10px] bg-gray-50 text-gray-500 px-2 py-0.5 rounded border border-gray-100">
                           {tag.startsWith('#') ? tag : `#${tag}`}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-300">태그 없음</span>
                    )}
                  </div>
                </div>

                {/* 화살표 아이콘 */}
                <div className="text-gray-300 group-hover:text-[#00D560] transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}

          {(!episodes || episodes.length === 0) && (
            <div className="text-center text-gray-400 py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              등록된 회차가 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}