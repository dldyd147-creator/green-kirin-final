"use client";

import { supabase } from "@/utils/supabase";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function HomePage() {
  const [keyword, setKeyword] = useState("");
  const [works, setWorks] = useState<any[]>([]);      
  const [results, setResults] = useState<any[]>([]);  
  const [isSearching, setIsSearching] = useState(false);
  const [debugMsg, setDebugMsg] = useState(""); // 🔍 디버깅용 메시지

  // 1. 초기 로딩: 작품 목록 가져오기
  useEffect(() => {
    const fetchWorks = async () => {
      const { data } = await supabase.from("works").select("*").order("id", { ascending: true });
      if (data) setWorks(data);
    };
    fetchWorks();
  }, []);

  // 2. 검색 기능 (엔터 or 버튼 클릭 시 실행)
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault(); // 새로고침 방지

    if (!keyword.trim()) {
      setIsSearching(false);
      setResults([]);
      return;
    }

    setIsSearching(true);
    setDebugMsg("검색 중...");

    try {
      // tags 컬럼에서 검색어(keyword)가 포함된 것 찾기
      const { data, error } = await supabase
        .from("episodes")
        .select("*, works(title, thumbnail_url)")
        .ilike("tags", `%${keyword}%`) 
        .order("id", { ascending: false });

      if (error) {
        throw error;
      }

      if (data) {
        setResults(data);
        setDebugMsg(data.length === 0 ? "검색 결과가 없습니다." : "");
      }
    } catch (err: any) {
      console.error(err);
      setDebugMsg(`❌ 검색 에러: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 px-4 pt-10 pb-20 max-w-3xl mx-auto">
      
      {/* 1️⃣ 로고 영역 */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-[#00D560] cursor-pointer" onClick={() => { setIsSearching(false); setKeyword(""); }}>
          GREENKIRIN
        </h1>
        <p className="text-gray-400 text-xs mt-2">Webtoon Asset Archive</p>
      </div>

      {/* 2️⃣ 검색창 영역 (Form 태그로 감싸서 엔터키 지원) */}
      <form onSubmit={handleSearch} className="relative mb-6">
        <input 
          type="text" 
          placeholder="태그 검색 (예: 프롤로그, 액션)" 
          className="w-full p-4 pl-5 pr-14 rounded-full border-2 border-[#00D560] shadow-sm text-lg outline-none focus:shadow-lg focus:ring-4 focus:ring-[#00D560]/10 transition-all placeholder-gray-400"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        {/* 검색 버튼 */}
        <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 bg-white text-[#00D560] p-2 hover:bg-gray-50 rounded-full transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </button>
      </form>

      {/* 디버그/상태 메시지 (결과가 없을 때 표시) */}
      {isSearching && debugMsg && (
        <div className="text-center text-sm text-gray-500 mb-6 bg-gray-50 p-2 rounded">
          {debugMsg}
        </div>
      )}

      {/* 3️⃣ 결과 or 목록 영역 */}
      
      {isSearching ? (
        // A. 검색 결과 리스트
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-gray-500 mb-2 ml-1">
            '<span className="text-[#00D560]">{keyword}</span>' 검색 결과 ({results.length})
          </h2>
          
          {results.length > 0 ? (
            results.map((ep) => (
              <Link key={ep.id} href={`/viewer/${ep.id}`}>
                <div className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 hover:border-[#00D560] hover:shadow-md transition-all cursor-pointer bg-white group">
                  {/* 썸네일 */}
                  <div className="w-16 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {ep.works?.thumbnail_url ? (
                      <img src={ep.works.thumbnail_url} alt="cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">No Image</div>
                    )}
                  </div>
                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-400">{ep.works?.title}</div>
                    <div className="text-base font-bold text-gray-900 truncate">
                      {ep.episode_number}화. {ep.title}
                    </div>
                    {/* 태그 (검색어 하이라이트) */}
                    <div className="mt-1 flex flex-wrap gap-1">
                      {ep.tags ? (
                        ep.tags.split(' ').map((tag: string, i: number) => (
                          <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${tag.includes(keyword) ? "bg-[#00D560] text-white" : "bg-green-50 text-[#00D560]"}`}>
                            {tag.startsWith('#') ? tag : `#${tag}`}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-300">태그 없음</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))
          ) : (
             // 결과 없음
             <div className="text-center py-20 text-gray-400">
               검색된 컷이 없습니다.<br/>
               <span className="text-xs">태그가 정확한지 확인해주세요.</span>
             </div>
          )}
        </div>

      ) : (
        // B. 평소 상태: 작품 목록
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {works.map((work) => (
            <Link key={work.id} href={`/work/${work.id}`} className="group cursor-pointer">
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 mb-2 border border-gray-100 shadow-sm group-hover:shadow-md transition-all">
                {work.thumbnail_url ? (
                  <img src={work.thumbnail_url} alt={work.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No Image</div>
                )}
              </div>
              <h4 className="font-bold text-gray-900 text-center truncate px-1 group-hover:text-[#00D560] transition-colors">
                {work.title}
              </h4>
            </Link>
          ))}
          {works.length === 0 && <div className="col-span-full text-center py-20 text-gray-400">등록된 작품이 없습니다.</div>}
        </div>
      )}

    </div>
  );
}