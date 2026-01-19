"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";
import Link from "next/link";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"works" | "episodes">("works");

  // === 작품 관리 상태 ===
  const [workTitle, setWorkTitle] = useState("");
  const [workThumbnail, setWorkThumbnail] = useState<File | null>(null);
  const [workList, setWorkList] = useState<any[]>([]);
  const [isRegisteringWork, setIsRegisteringWork] = useState(false);

  // === 컷 업로드 상태 ===
  const [selectedWorkId, setSelectedWorkId] = useState<string>("");
  const [episodeNumber, setEpisodeNumber] = useState("");
  const [epTags, setEpTags] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [episodeList, setEpisodeList] = useState<any[]>([]);

  useEffect(() => {
    fetchWorks();
  }, []);

  useEffect(() => {
    if (selectedWorkId) {
      fetchEpisodes();
    } else {
      setEpisodeList([]);
    }
  }, [selectedWorkId]);

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
  };

  // [기능 1] 작품 등록
  const handleRegisterWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workTitle.trim()) return alert("제목을 입력하세요.");
    
    setIsRegisteringWork(true);

    try {
      let thumbnailUrl = null;
      if (workThumbnail) {
        const fileExt = workThumbnail.name.split('.').pop();
        const fileName = `thumb_${Date.now()}.${fileExt}`;
        
        // 🚨 수정됨: webtoon-images -> webtoons
        const { error } = await supabase.storage.from("webtoons").upload(fileName, workThumbnail);
        if (error) throw error;
        
        // 🚨 수정됨: URL 주소도 webtoons로 변경
        thumbnailUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/webtoons/${fileName}`;
      }

      const { error } = await supabase.from("works").insert([{ title: workTitle, thumbnail_url: thumbnailUrl }]);
      if (error) throw error;

      alert("작품 등록 완료!");
      setWorkTitle("");
      setWorkThumbnail(null);
      fetchWorks();
    } catch (err: any) {
      alert("오류 발생: " + err.message);
    } finally {
      setIsRegisteringWork(false);
    }
  };

  const handleDeleteWork = async (id: number) => {
    if (!confirm("작품을 삭제하시겠습니까?")) return;
    await supabase.from("works").delete().eq("id", id);
    fetchWorks();
  };

  // [기능 2] 컷 일괄 업로드
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files || files.length === 0 || !selectedWorkId || !episodeNumber) {
      alert("작품, 화수, 파일을 모두 선택해주세요.");
      return;
    }

    setIsUploading(true);

    try {
      const uploadPromises = Array.from(files).map(async (file, index) => {
        const fileExt = file.name.split('.').pop();
        const safeFileName = `${Date.now()}_${index}.${fileExt}`;
        
        // 🚨 수정됨: webtoon-images -> webtoons (여기가 핵심!)
        const { error: storageError } = await supabase.storage
          .from("webtoons")
          .upload(safeFileName, file);
        
        if (storageError) throw storageError;

        // 🚨 수정됨: URL 경로도 webtoons로 변경
        const imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/webtoons/${safeFileName}`;

        return supabase.from("episodes").insert([{
          work_id: parseInt(selectedWorkId),
          title: file.name,
          episode_number: parseInt(episodeNumber),
          image_url: imageUrl,
          tags: epTags,
        }]);
      });

      await Promise.all(uploadPromises);

      alert(`${files.length}장 업로드 성공! 🎉`);
      setFiles(null);
      const fileInput = document.getElementById("fileInput") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      
      fetchEpisodes();

    } catch (error: any) {
      console.error(error);
      alert(`업로드 실패: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteEpisode = async (id: number) => {
    if (!confirm("이 컷을 삭제하시겠습니까?")) return;
    await supabase.from("episodes").delete().eq("id", id);
    fetchEpisodes();
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20 font-sans">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-[#00D560]">ADMIN</h1>
          </div>
          <Link href="/" className="text-sm font-bold text-gray-500 hover:text-[#00D560] transition-colors">
            🏠 뷰어로 나가기
          </Link>
        </div>
        <div className="max-w-5xl mx-auto px-6 flex gap-6 mt-1">
          <button onClick={() => setActiveTab("works")} className={`pb-3 text-sm font-bold border-b-2 transition-all ${activeTab === "works" ? "border-[#00D560] text-[#00D560]" : "border-transparent text-gray-400"}`}>1. 작품 관리</button>
          <button onClick={() => setActiveTab("episodes")} className={`pb-3 text-sm font-bold border-b-2 transition-all ${activeTab === "episodes" ? "border-[#00D560] text-[#00D560]" : "border-transparent text-gray-400"}`}>2. 컷(원고) 업로드</button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        {activeTab === "works" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold mb-4">✨ 작품 등록</h2>
              <form onSubmit={handleRegisterWork} className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 mb-1">제목</label>
                  <input type="text" className="w-full p-3 border rounded-xl" value={workTitle} onChange={(e) => setWorkTitle(e.target.value)} placeholder="작품명" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 mb-1">썸네일 (선택)</label>
                  <input type="file" className="w-full p-2 border rounded-xl bg-gray-50 text-sm" onChange={(e) => setWorkThumbnail(e.target.files?.[0] || null)} />
                </div>
                <button type="submit" disabled={isRegisteringWork} className={`px-6 py-3 rounded-xl font-bold text-white transition-all ${isRegisteringWork ? "bg-gray-400" : "bg-[#00D560] hover:bg-[#00b550]"}`}>
                  {isRegisteringWork ? "등록 중..." : "등록"}
                </button>
              </form>
            </div>
            <div className="grid gap-3">
              {workList.map((work) => (
                <div key={work.id} className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden border border-gray-100">
                      {work.thumbnail_url ? <img src={work.thumbnail_url} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center w-full h-full text-xs text-gray-300">No Img</div>}
                    </div>
                    <span className="font-bold text-lg">{work.title}</span>
                  </div>
                  <button onClick={() => handleDeleteWork(work.id)} className="text-red-500 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg text-sm font-bold transition-colors">삭제</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "episodes" && (
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold mb-4">📤 컷 업로드</h2>
                <form onSubmit={handleUpload} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">어떤 작품인가요?</label>
                    <select className="w-full p-3 border border-gray-200 rounded-xl font-bold outline-none focus:border-[#00D560]" value={selectedWorkId} onChange={(e) => setSelectedWorkId(e.target.value)}>
                      <option value="">작품 선택</option>
                      {workList.map((w) => <option key={w.id} value={w.id}>{w.title}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">화수 (숫자)</label>
                      <input type="number" className="w-full p-3 border rounded-xl" value={episodeNumber} onChange={(e) => setEpisodeNumber(e.target.value)} placeholder="예: 1" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">태그</label>
                      <input type="text" className="w-full p-3 border rounded-xl" value={epTags} onChange={(e) => setEpTags(e.target.value)} placeholder="태그 입력" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">파일 (드래그 가능)</label>
                    <input id="fileInput" type="file" multiple accept="image/*" className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50" onChange={(e) => setFiles(e.target.files)} />
                    <p className="text-xs text-gray-400 mt-1">* 50장, 100장 한 번에 선택 가능합니다.</p>
                  </div>
                  <button 
                    type="submit" 
                    disabled={isUploading} 
                    className={`w-full py-4 rounded-xl font-bold text-white shadow-md transition-all ${
                      isUploading ? "bg-gray-400 cursor-not-allowed" : "bg-[#00D560] hover:bg-[#00b550] hover:shadow-lg"
                    }`}
                  >
                    {isUploading ? "업로드 중입니다... (기다려주세요) ⏳" : "업로드 하기 ✨"}
                  </button>
                </form>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[600px]">
              <h2 className="text-lg font-bold mb-4">📑 등록된 컷 관리</h2>
              <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {selectedWorkId ? (
                  episodeList.length > 0 ? (
                    episodeList.map((ep) => (
                      <div key={ep.id} className="flex gap-3 p-3 rounded-lg border border-gray-100 hover:border-[#00D560] bg-white group transition-all">
                        <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0 border border-gray-100">
                          {ep.image_url ? <img src={ep.image_url} className="w-full h-full object-cover" /> : <div className="text-[10px] text-gray-300 flex items-center justify-center h-full">No Img</div>}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <div className="text-sm font-bold truncate text-gray-800">{ep.title}</div>
                          <div className="text-xs text-gray-400">{ep.episode_number}화 · {ep.tags || "태그없음"}</div>
                        </div>
                        <button onClick={() => handleDeleteEpisode(ep.id)} className="opacity-0 group-hover:opacity-100 text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg text-xs font-bold transition-all">
                          삭제
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">등록된 컷이 없습니다.</div>
                  )
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">왼쪽에서 작품을 선택해주세요.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}