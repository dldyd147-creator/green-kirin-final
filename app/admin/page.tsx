"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";
import Link from "next/link";

export default function AdminPage() {
  // 탭 상태: works(작품) / episodes(회차) / images(원고)
  const [activeTab, setActiveTab] = useState<"works" | "episodes" | "images">("works");

  // ==============================
  // 1️⃣ [작품 관리] 상태
  // ==============================
  const [workTitle, setWorkTitle] = useState("");
  const [workThumbnail, setWorkThumbnail] = useState<File | null>(null);
  const [workList, setWorkList] = useState<any[]>([]);
  const [isRegisteringWork, setIsRegisteringWork] = useState(false);

  // ==============================
  // 2️⃣ [에피소드 관리] 상태
  // ==============================
  const [epWorkId, setEpWorkId] = useState(""); // 선택된 작품 ID
  const [epNum, setEpNum] = useState("");       // 회차 번호
  const [epTitle, setEpTitle] = useState("");   // 회차 제목
  const [epList, setEpList] = useState<any[]>([]); // 회차 목록

  // ==============================
  // 3️⃣ [원고(이미지) 관리] 상태
  // ==============================
  const [imgWorkId, setImgWorkId] = useState("");   // 원고 올릴 작품
  const [imgEpId, setImgEpId] = useState("");       // 원고 올릴 회차
  const [imgFiles, setImgFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imgList, setImgList] = useState<any[]>([]); // 등록된 이미지 리스트
  
  // 에피소드 선택 목록 (원고 탭용)
  const [epOptions, setEpOptions] = useState<any[]>([]);

  // 초기 로딩
  useEffect(() => {
    fetchWorks();
  }, []);

  // 탭 변경 시 데이터 리셋 (꼬임 방지)
  useEffect(() => {
    if (activeTab === "episodes" && epWorkId) fetchEpisodes(epWorkId, setEpList);
    if (activeTab === "images") {
      if (imgWorkId) fetchEpisodes(imgWorkId, setEpOptions);
      if (imgEpId) fetchImages(imgEpId);
    }
  }, [activeTab]);

  // 🔄 데이터 가져오기 함수들
  const fetchWorks = async () => {
    const { data } = await supabase.from("works").select("*").order("id", { ascending: true });
    if (data) setWorkList(data);
  };

  const fetchEpisodes = async (workId: string, setList: any) => {
    const { data } = await supabase
      .from("episodes")
      .select("*")
      .eq("work_id", workId)
      .order("episode_number", { ascending: false }); // 최신화가 위로
    if (data) setList(data);
    else setList([]);
  };

  // 🚨 수정됨: images 테이블에서 가져오기
  const fetchImages = async (episodeId: string) => {
    const { data } = await supabase
      .from("images") // 기존 테이블 사용
      .select("*")
      .eq("episode_id", episodeId)
      .order("image_url", { ascending: true }); // 파일명 순 정렬
    if (data) setImgList(data);
    else setImgList([]);
  };

  // ----------------------------------------------------------------
  // 1️⃣ [작품] 기능
  // ----------------------------------------------------------------
  const handleRegisterWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workTitle.trim()) return alert("작품 제목을 입력하세요.");
    setIsRegisteringWork(true);
    try {
      let thumbnailUrl = null;
      if (workThumbnail) {
        const fileExt = workThumbnail.name.split('.').pop();
        const fileName = `thumb_${Date.now()}.${fileExt}`;
        const { error } = await supabase.storage.from("webtoons").upload(fileName, workThumbnail);
        if (error) throw error;
        thumbnailUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/webtoons/${fileName}`;
      }
      const { error } = await supabase.from("works").insert([{ title: workTitle, thumbnail_url: thumbnailUrl }]);
      if (error) throw error;
      alert("작품 등록 완료!");
      setWorkTitle("");
      setWorkThumbnail(null);
      fetchWorks();
    } catch (err: any) {
      alert("오류: " + err.message);
    } finally {
      setIsRegisteringWork(false);
    }
  };

  const handleDeleteWork = async (id: number) => {
    if (!confirm("작품을 삭제하면 포함된 에피소드와 원고가 모두 삭제됩니다!")) return;
    await supabase.from("works").delete().eq("id", id);
    fetchWorks();
  };

  // ----------------------------------------------------------------
  // 2️⃣ [에피소드] 기능
  // ----------------------------------------------------------------
  const handleRegisterEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!epWorkId || !epNum) return alert("작품과 회차 번호는 필수입니다.");

    try {
      const { error } = await supabase.from("episodes").insert([
        {
          work_id: parseInt(epWorkId),
          episode_number: parseInt(epNum),
          title: epTitle || `${epNum}화`,
        }
      ]);
      if (error) throw error;
      alert(`${epNum}화 생성 완료!`);
      setEpNum("");
      setEpTitle("");
      fetchEpisodes(epWorkId, setEpList);
    } catch (err: any) {
      alert("오류: " + err.message);
    }
  };

  const handleDeleteEpisode = async (id: number) => {
    if (!confirm("이 회차를 삭제하시겠습니까?")) return;
    await supabase.from("episodes").delete().eq("id", id);
    fetchEpisodes(epWorkId, setEpList);
  };

  // ----------------------------------------------------------------
  // 3️⃣ [원고(이미지)] 기능 - images 테이블 사용
  // ----------------------------------------------------------------
  const handleUploadImages = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imgFiles || imgFiles.length === 0 || !imgEpId) return alert("회차 선택 및 파일을 선택해주세요.");

    setIsUploading(true); // 버튼 잠금
    try {
      const uploadPromises = Array.from(imgFiles).map(async (file, index) => {
        const fileExt = file.name.split('.').pop();
        // 파일명 중복 방지
        const safeFileName = `img_${imgEpId}_${Date.now()}_${index}.${fileExt}`;
        
        // 1. 스토리지 업로드 (webtoons 버킷)
        const { error: storageError } = await supabase.storage
          .from("webtoons")
          .upload(safeFileName, file);
        if (storageError) throw storageError;

        const imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/webtoons/${safeFileName}`;

        // 2. 🚨 images 테이블에 저장 (cuts 아님!)
        return supabase.from("images").insert([{
          episode_id: parseInt(imgEpId),
          image_url: imageUrl,
        }]);
      });

      await Promise.all(uploadPromises);
      alert(`${imgFiles.length}장 업로드 성공!`);
      setImgFiles(null);
      const fileInput = document.getElementById("imgFileInput") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      fetchImages(imgEpId); // 리스트 갱신
    } catch (err: any) {
      alert("업로드 실패: " + err.message);
    } finally {
      setIsUploading(false); // 버튼 잠금 해제
    }
  };

  const handleDeleteImage = async (id: number) => {
    if (!confirm("이 컷을 삭제하시겠습니까?")) return;
    // 🚨 images 테이블에서 삭제
    await supabase.from("images").delete().eq("id", id);
    fetchImages(imgEpId);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20 font-sans">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-[#00D560]">ADMIN</h1>
          <Link href="/" className="text-sm font-bold text-gray-500 hover:text-[#00D560]">🏠 뷰어로 나가기</Link>
        </div>
        
        {/* 3단 탭 메뉴 */}
        <div className="max-w-5xl mx-auto px-6 flex gap-1 mt-2">
          {["works", "episodes", "images"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex-1 pb-3 text-sm font-bold border-b-4 transition-all ${
                activeTab === tab 
                  ? "border-[#00D560] text-[#00D560] bg-green-50/50" 
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {tab === "works" && "1. 작품 관리"}
              {tab === "episodes" && "2. 에피소드 관리"}
              {tab === "images" && "3. 원고(이미지) 관리"}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        
        {/* === 1. 작품 관리 === */}
        {activeTab === "works" && (
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
              <h2 className="text-lg font-bold mb-4">✨ 작품 등록</h2>
              <form onSubmit={handleRegisterWork} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">작품 제목</label>
                  <input type="text" className="w-full p-3 border rounded-xl" value={workTitle} onChange={(e) => setWorkTitle(e.target.value)} placeholder="작품명 입력" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">썸네일 (선택)</label>
                  <input type="file" className="w-full p-2 border rounded-xl bg-gray-50 text-sm" onChange={(e) => setWorkThumbnail(e.target.files?.[0] || null)} />
                </div>
                <button type="submit" disabled={isRegisteringWork} className="w-full bg-[#00D560] text-white font-bold py-3 rounded-xl hover:bg-[#00b550]">
                  {isRegisteringWork ? "등록 중..." : "작품 등록"}
                </button>
              </form>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold mb-4">목록 ({workList.length})</h2>
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {workList.map((work) => (
                  <div key={work.id} className="flex items-center justify-between p-3 border rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden">
                        {work.thumbnail_url ? <img src={work.thumbnail_url} className="w-full h-full object-cover" /> : null}
                      </div>
                      <span className="font-bold">{work.title}</span>
                    </div>
                    <button onClick={() => handleDeleteWork(work.id)} className="text-red-500 text-xs font-bold px-3 py-1 bg-red-50 rounded">삭제</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* === 2. 에피소드 관리 === */}
        {activeTab === "episodes" && (
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
              <h2 className="text-lg font-bold mb-4">📂 회차(폴더) 만들기</h2>
              <form onSubmit={handleRegisterEpisode} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">어떤 작품인가요?</label>
                  <select className="w-full p-3 border rounded-xl font-bold" value={epWorkId} onChange={(e) => { setEpWorkId(e.target.value); fetchEpisodes(e.target.value, setEpList); }}>
                    <option value="">작품 선택</option>
                    {workList.map(w => <option key={w.id} value={w.id}>{w.title}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">회차 번호 (숫자)</label>
                    <input type="number" className="w-full p-3 border rounded-xl" value={epNum} onChange={(e) => setEpNum(e.target.value)} placeholder="1" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">제목 (선택)</label>
                    <input type="text" className="w-full p-3 border rounded-xl" value={epTitle} onChange={(e) => setEpTitle(e.target.value)} placeholder="프롤로그" />
                  </div>
                </div>
                <button type="submit" className="w-full bg-[#00D560] text-white font-bold py-3 rounded-xl hover:bg-[#00b550]">
                  회차 생성
                </button>
              </form>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold mb-4">회차 목록</h2>
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {epWorkId ? (
                  epList.length > 0 ? epList.map(ep => (
                    <div key={ep.id} className="flex justify-between items-center p-3 border rounded-lg hover:border-green-400">
                      <div>
                        <span className="text-[#00D560] font-bold mr-2">{ep.episode_number}화</span>
                        <span className="font-medium">{ep.title}</span>
                      </div>
                      <button onClick={() => handleDeleteEpisode(ep.id)} className="text-red-500 text-xs bg-red-50 px-2 py-1 rounded">삭제</button>
                    </div>
                  )) : <div className="text-gray-400 text-sm text-center py-10">등록된 회차가 없습니다.</div>
                ) : <div className="text-gray-400 text-sm text-center py-10">왼쪽에서 작품을 선택하세요.</div>}
              </div>
            </div>
          </div>
        )}

        {/* === 3. 원고(이미지) 관리 === */}
        {activeTab === "images" && (
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
              <h2 className="text-lg font-bold mb-4">📤 원고(이미지) 넣기</h2>
              <form onSubmit={handleUploadImages} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">1. 작품 선택</label>
                  <select className="w-full p-3 border rounded-xl font-bold" value={imgWorkId} 
                    onChange={(e) => { 
                      setImgWorkId(e.target.value); 
                      fetchEpisodes(e.target.value, setEpOptions); // 작품 바꾸면 에피소드 목록 갱신
                      setImgEpId(""); // 초기화
                    }}>
                    <option value="">작품을 선택하세요</option>
                    {workList.map(w => <option key={w.id} value={w.id}>{w.title}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">2. 회차 선택 (어디에 넣을까요?)</label>
                  <select className="w-full p-3 border rounded-xl font-bold" value={imgEpId} 
                    onChange={(e) => {
                      setImgEpId(e.target.value);
                      fetchImages(e.target.value); // 회차 바꾸면 이미지 목록 갱신
                    }}>
                    <option value="">회차를 선택하세요</option>
                    {epOptions.map(ep => <option key={ep.id} value={ep.id}>{ep.episode_number}화 - {ep.title}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">3. 파일 선택 (드래그 가능)</label>
                  <input id="imgFileInput" type="file" multiple accept="image/*" className="w-full p-3 border rounded-xl bg-gray-50" onChange={(e) => setImgFiles(e.target.files)} />
                  <p className="text-xs text-gray-400 mt-1">* 50장, 100장 한 번에 선택 가능</p>
                </div>

                <button type="submit" disabled={isUploading} className={`w-full py-4 rounded-xl font-bold text-white shadow-md transition-all ${isUploading ? "bg-gray-400" : "bg-[#00D560] hover:bg-[#00b550]"}`}>
                  {isUploading ? "업로드 중... ⏳" : "원고 업로드 하기 ✨"}
                </button>
              </form>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[600px]">
              <h2 className="text-lg font-bold mb-4">📑 등록된 원고 ({imgList.length}장)</h2>
              <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {imgEpId ? (
                  imgList.length > 0 ? imgList.map((img, idx) => (
                    <div key={img.id} className="flex gap-3 p-2 border rounded-lg items-center hover:border-green-400 bg-white group">
                      <span className="text-xs text-gray-400 w-6">{idx + 1}</span>
                      <div className="w-10 h-10 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                         <img src={img.image_url} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 text-xs truncate text-gray-500">{img.image_url.split('/').pop()}</div>
                      <button onClick={() => handleDeleteImage(img.id)} className="opacity-0 group-hover:opacity-100 text-red-500 text-xs border border-red-200 px-2 py-1 rounded hover:bg-red-50">삭제</button>
                    </div>
                  )) : <div className="h-full flex items-center justify-center text-gray-400 text-sm">등록된 원고가 없습니다.</div>
                ) : <div className="h-full flex items-center justify-center text-gray-400 text-sm">왼쪽에서 회차를 선택하세요.</div>}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}