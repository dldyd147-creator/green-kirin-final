"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";
import Link from "next/link";

export default function AdminPage() {
  // 탭 상태 (works: 작품관리, episodes: 에피소드업로드)
  const [activeTab, setActiveTab] = useState<"works" | "episodes">("works");

  // ==============================
  // 1️⃣ 작품 관리 (Works) 관련 상태
  // ==============================
  const [workTitle, setWorkTitle] = useState("");
  const [workThumbnail, setWorkThumbnail] = useState<File | null>(null);
  const [workList, setWorkList] = useState<any[]>([]);
  const [isRegisteringWork, setIsRegisteringWork] = useState(false);

  // ==============================
  // 2️⃣ 에피소드 (Episodes) 관련 상태
  // ==============================
  const [selectedWorkId, setSelectedWorkId] = useState<string>("");
  const [episodeNumber, setEpisodeNumber] = useState("");
  const [episodeFiles, setEpisodeFiles] = useState<FileList | null>(null);
  const [epTitle, setEpTitle] = useState(""); // 공통 제목
  const [epTags, setEpTags] = useState("");
  const [isUploadingEp, setIsUploadingEp] = useState(false);
  const [episodeList, setEpisodeList] = useState<any[]>([]); // 일괄 삭제용 리스트
  const [selectedEpisodeIds, setSelectedEpisodeIds] = useState<Set<string>>(new Set());


  // 초기 로딩: 작품 목록 가져오기
  useEffect(() => {
    fetchWorks();
  }, []);

  // 작품 선택 변경 시 에피소드 목록 가져오기
  useEffect(() => {
    if (selectedWorkId) {
      fetchEpisodes();
    } else {
      setEpisodeList([]);
    }
  }, [selectedWorkId]);


  // 🔄 데이터 가져오기 함수들
  const fetchWorks = async () => {
    const { data } = await supabase.from("works").select("*").order("id", { ascending: true });
    if (data) setWorkList(data);
  };

  const fetchEpisodes = async () => {
    if (!selectedWorkId) return;
    const { data } = await supabase
      .from("episodes")
      .select("*")
      .eq("work_id", selectedWorkId)
      .order("id", { ascending: false });
    if (data) setEpisodeList(data);
    setSelectedEpisodeIds(new Set());
  };


  // ✨ [기능 1] 작품 등록하기 (썸네일 없어도 됨!)
  const handleRegisterWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workTitle.trim()) {
      alert("작품 제목을 입력해주세요!");
      return;
    }

    if (!confirm(`'${workTitle}' 작품을 등록하시겠습니까?`)) return;

    setIsRegisteringWork(true);

    try {
      let thumbnailUrl = null;

      // 1. 썸네일 파일이 "있을 때만" 업로드
      if (workThumbnail) {
        const fileName = `thumb_${Date.now()}_${workThumbnail.name}`;
        const { error: uploadError } = await supabase.storage
          .from("webtoon-images")
          .upload(fileName, workThumbnail);

        if (uploadError) throw uploadError;

        thumbnailUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/webtoon-images/${fileName}`;
      }

      // 2. DB에 저장 (이미지 없으면 null로 저장)
      const { error: dbError } = await supabase.from("works").insert([
        {
          title: workTitle,
          thumbnail_url: thumbnailUrl, // 없으면 null 들어감
        },
      ]);

      if (dbError) throw dbError;

      alert("작품이 등록되었습니다! 🎉");
      setWorkTitle("");
      setWorkThumbnail(null);
      // 파일 인풋 초기화
      const fileInput = document.getElementById("workThumbInput") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      
      fetchWorks(); // 목록 새로고침

    } catch (error: any) {
      console.error(error);
      alert(`등록 실패: ${error.message}`);
    } finally {
      setIsRegisteringWork(false);
    }
  };

  // 🗑️ 작품 삭제하기
  const handleDeleteWork = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까? (이 작품에 속한 에피소드도 모두 삭제될 수 있습니다)")) return;
    
    const { error } = await supabase.from("works").delete().eq("id", id);
    if (error) {
      alert("삭제 실패: " + error.message);
    } else {
      alert("삭제되었습니다.");
      fetchWorks();
    }
  };


  // ✨ [기능 2] 에피소드 대량 업로드
  const handleUploadEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!episodeFiles || episodeFiles.length === 0 || !selectedWorkId || !episodeNumber) {
      alert("작품, 화수, 파일을 모두 선택해주세요.");
      return;
    }

    setIsUploadingEp(true);

    try {
      const uploadPromises = Array.from(episodeFiles).map(async (file, index) => {
        const fileName = `${Date.now()}_${index}_${file.name}`;
        
        const { error: fileError } = await supabase.storage
          .from("webtoon-images")
          .upload(fileName, file);

        if (fileError) throw fileError;

        const imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/webtoon-images/${fileName}`;
        const finalTitle = epTitle ? `${epTitle} (${index + 1})` : file.name;

        return supabase.from("episodes").insert([{
          work_id: parseInt(selectedWorkId),
          title: finalTitle,
          episode_number: parseInt(episodeNumber),
          image_url: imageUrl,
          tags: epTags,
        }]);
      });

      await Promise.all(uploadPromises);
      alert(`${episodeFiles.length}장 업로드 완료!`);
      
      setEpTitle("");
      setEpisodeFiles(null);
      const epInput = document.getElementById("epFileInput") as HTMLInputElement;
      if (epInput) epInput.value = "";
      
      fetchEpisodes();

    } catch (error: any) {
      alert(`업로드 중 오류: ${error.message}`);
    } finally {
      setIsUploadingEp(false);
    }
  };

  // 🗑️ 에피소드 일괄 삭제
  const handleBulkDeleteEpisodes = async () => {
    if (selectedEpisodeIds.size === 0) return;
    if (!confirm(`${selectedEpisodeIds.size}개를 삭제하시겠습니까?`)) return;

    const { error } = await supabase.from("episodes").delete().in("id", Array.from(selectedEpisodeIds));
    if (error) alert("삭제 실패");
    else {
      alert("삭제 완료");
      fetchEpisodes();
    }
  };

  const toggleEpSelect = (id: string) => {
    const newSet = new Set(selectedEpisodeIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedEpisodeIds(newSet);
  };


  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* 상단 헤더 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-[#00D560]">ADMIN <span className="text-gray-300 font-light text-sm ml-2">관리자 페이지</span></h1>
          <Link href="/" className="text-sm font-bold text-gray-500 hover:text-[#00D560] transition-colors">
            🏠 뷰어로 나가기
          </Link>
        </div>
        
        {/* 탭 메뉴 */}
        <div className="max-w-5xl mx-auto px-6 flex gap-8">
          <button 
            onClick={() => setActiveTab("works")}
            className={`pb-3 text-sm font-bold border-b-2 transition-all ${activeTab === "works" ? "border-[#00D560] text-[#00D560]" : "border-transparent text-gray-400 hover:text-gray-600"}`}
          >
            1. 작품 관리
          </button>
          <button 
            onClick={() => setActiveTab("episodes")}
            className={`pb-3 text-sm font-bold border-b-2 transition-all ${activeTab === "episodes" ? "border-[#00D560] text-[#00D560]" : "border-transparent text-gray-400 hover:text-gray-600"}`}
          >
            2. 에피소드 업로드
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        
        {/* =======================
            TAB 1: 작품 관리 화면
           ======================= */}
        {activeTab === "works" && (
          <div className="space-y-8 animate-fade-in">
            {/* 등록 폼 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                ✨ 새 작품 등록 
                <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-1 rounded">썸네일 없어도 됨</span>
              </h2>
              <form onSubmit={handleRegisterWork} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">작품 제목 <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    placeholder="예: 나 혼자만 레벨업" 
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-[#00D560] outline-none transition-all font-bold"
                    value={workTitle}
                    onChange={(e) => setWorkTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">썸네일 이미지 (선택사항)</label>
                  <input 
                    id="workThumbInput"
                    type="file" 
                    accept="image/*"
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                    onChange={(e) => setWorkThumbnail(e.target.files?.[0] || null)}
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isRegisteringWork}
                  className="w-full bg-[#00D560] text-white font-bold py-4 rounded-xl hover:bg-[#00b550] transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                >
                  {isRegisteringWork ? "등록 중..." : "작품 등록하기"}
                </button>
              </form>
            </div>

            {/* 등록된 작품 리스트 */}
            <div>
              <h3 className="text-sm font-bold text-gray-500 mb-3">등록된 작품 목록 ({workList.length})</h3>
              <div className="grid gap-3">
                {workList.map((work) => (
                  <div key={work.id} className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="w-16 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100">
                      {work.thumbnail_url ? (
                        <img src={work.thumbnail_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 bg-gray-50">No Image</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-lg">{work.title}</h4>
                      <p className="text-xs text-gray-400">ID: {work.id} • 등록일: {work.created_at?.split('T')[0]}</p>
                    </div>
                    <button 
                      onClick={() => handleDeleteWork(work.id)}
                      className="px-4 py-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-bold transition-colors"
                    >
                      삭제
                    </button>
                  </div>
                ))}
                {workList.length === 0 && <div className="text-center py-10 text-gray-400">등록된 작품이 없습니다.</div>}
              </div>
            </div>
          </div>
        )}


        {/* =======================
            TAB 2: 에피소드 업로드
           ======================= */}
        {activeTab === "episodes" && (
          <div className="grid md:grid-cols-2 gap-8 animate-fade-in">
            {/* 왼쪽: 업로드 폼 */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold mb-4">📤 컷(원고) 업로드</h2>
                <form onSubmit={handleUploadEpisode} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">어떤 작품인가요?</label>
                    <select 
                      className="w-full p-3 border border-gray-200 rounded-xl focus:border-[#00D560] outline-none font-bold"
                      value={selectedWorkId}
                      onChange={(e) => setSelectedWorkId(e.target.value)}
                    >
                      <option value="">작품 선택</option>
                      {workList.map((w) => <option key={w.id} value={w.id}>{w.title}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">화수 (숫자)</label>
                      <input 
                        type="number" 
                        className="w-full p-3 border border-gray-200 rounded-xl focus:border-[#00D560] outline-none"
                        placeholder="예: 3"
                        value={episodeNumber}
                        onChange={(e) => setEpisodeNumber(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">태그</label>
                      <input 
                        type="text" 
                        className="w-full p-3 border border-gray-200 rounded-xl focus:border-[#00D560] outline-none"
                        placeholder="액션, 로맨스..."
                        value={epTags}
                        onChange={(e) => setEpTags(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">파일 선택 (여러장 드래그 가능)</label>
                    <input 
                      id="epFileInput"
                      type="file" 
                      multiple 
                      accept="image/*"
                      className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-sm"
                      onChange={(e) => setEpisodeFiles(e.target.files)}
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={isUploadingEp}
                    className="w-full bg-[#00D560] text-white font-bold py-3 rounded-xl hover:bg-[#00b550] shadow-md transition-all"
                  >
                    {isUploadingEp ? "업로드 중..." : "업로드 하기"}
                  </button>
                </form>
              </div>
            </div>

            {/* 오른쪽: 삭제 관리 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[600px]">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">🗑️ 등록된 컷 관리</h2>
                {selectedEpisodeIds.size > 0 && (
                  <button onClick={handleBulkDeleteEpisodes} className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-bold">
                    {selectedEpisodeIds.size}개 삭제
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {episodeList.length > 0 ? (
                  episodeList.map((ep) => (
                    <div 
                      key={ep.id} 
                      onClick={() => toggleEpSelect(ep.id)}
                      className={`flex gap-3 p-2 rounded-lg border cursor-pointer ${selectedEpisodeIds.has(ep.id) ? "border-red-500 bg-red-50" : "border-gray-100 hover:border-green-400"}`}
                    >
                      <div className="w-12 h-12 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                        <img src={ep.image_url} className="w-full h-full object-cover" />
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-sm font-bold truncate">{ep.title}</div>
                        <div className="text-xs text-gray-400">{ep.episode_number}화</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">작품을 선택하면 목록이 나옵니다.</div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}