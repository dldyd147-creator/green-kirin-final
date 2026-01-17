"use client";

import { supabase } from "@/utils/supabase";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function HomePage() {
  const [keyword, setKeyword] = useState("");
  const [works, setWorks] = useState<any[]>([]);      
  const [results, setResults] = useState<any[]>([]);  
  const [isSearching, setIsSearching] = useState(false);
  const [debugMsg, setDebugMsg] = useState(""); 

  // 1. 초기 로딩
  useEffect(() => {
    const fetchWorks = async () => {
      const { data } = await supabase.from("works").select("*").order("id", { ascending: true });
      if (data) setWorks(data);
    };
    fetchWorks();
  }, []);

  // 2. 검색 기능
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault(); 

    if (!keyword.trim()) {
      setIsSearching(false);
      setResults([]);
      return;
    }

    setIsSearching(true);
    setDebugMsg("검색 중...");

    try {
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
    <div className="min-h-screen bg-white text-gray-900 px-4 pt-10 pb-20 max-w-3xl mx-auto relative">
      
      {/* 1️⃣ 로고 영역 */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-[#00D560] cursor-pointer" onClick={() => { setIsSearching(false); setKeyword(""); }}>
          GreenKirin
        </h1>
        <p className="text-gray-400 text-xs mt-2">Webtoon Asset Archive</p>
      </div>

      {/* 2️⃣ 검색창 영역 */}
      <form onSubmit={handleSearch} className="relative mb-6">
        <input 
          type="text" 
          placeholder="태그 검색 (예: 프롤로그, 액션)" 
          className="w-full p-4 pl-5 pr-14 rounded-full border-2 border-[#00D560] shadow-sm text-lg outline-none focus:shadow-lg focus:ring-4 focus:ring-[#00D560]/10 transition-all placeholder-gray-400"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 bg-white text-[#00D560] p-2 hover:bg-gray-50 rounded-full transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </button>
      </form>

      {/* 상태 메시지 */}
      {isSearching && debugMsg && (
        <div className="text-center text-sm text-gray-500 mb-6 bg-gray-50 p-2 rounded">
          {debugMsg}
        </div>
      )}

      {/* 3️⃣ 결과 or 목록 영역 */}
      {isSearching ? (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-gray-500 mb-2 ml-1">
            '<span className="text-[#00D560]">{keyword}</span>' 검색 결과 ({results.length})
          </h2>
          
          {results.length > 0 ? (
            results.map((ep) => (
              <Link key={ep.id} href={`/viewer/${ep.id}`}>
                <div className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 hover:border-[#00D560] hover:shadow-md transition-all cursor-pointer bg-white group">
                  <div className="w-16 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {ep.works?.thumbnail_url ? (
                      <img src={ep.works.thumbnail_url} alt="cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">No Image</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-400">{ep.works?.title}</div>
                    <div className="text-base font-bold text-gray-900 truncate">
                      {ep.episode_number}화. {ep.title}
                    </div>
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
             <div className="text-center py-20 text-gray-400">
               검색된 컷이 없습니다.<br/>
               <span className="text-xs">태그가 정확한지 확인해주세요.</span>
             </div>
          )}
        </div>

      ) : (
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

      {/* ⚙️ 관리자 페이지 이동 버튼 (우측 하단 고정) */}
      <Link 
        href="/admin" 
        className="fixed bottom-6 right-6 bg-white text-gray-400 hover:text-[#00D560] p-3 rounded-full shadow-lg border border-gray-200 transition-all hover:scale-110 z-50"
        title="관리자 페이지"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
        </svg>
      </Link>

    </div>
  );
}