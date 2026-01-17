"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";
import Link from "next/link"; // 👈 페이지 이동을 위한 도구 추가

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 업로드 관련 상태들
  const [title, setTitle] = useState("");
  const [episodeNumber, setEpisodeNumber] = useState("");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [works, setWorks] = useState<any[]>([]);
  const [selectedWorkId, setSelectedWorkId] = useState<string>("");

  // 작품 목록 불러오기
  useEffect(() => {
    const fetchWorks = async () => {
      const { data } = await supabase.from("works").select("*");
      if (data) setWorks(data);
    };
    fetchWorks();
  }, []);

  // 🔐 1. 로그인 처리 (비밀번호 1004)
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "1004") { // 👈 대표님이 원하신 비밀번호!
      setIsLoggedIn(true);
    } else {
      alert("비밀번호가 틀렸습니다.");
    }
  };

  // 📤 2. 파일 업로드 처리
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !selectedWorkId || !title || !episodeNumber) {
      alert("모든 항목을 입력해주세요.");
      return;
    }

    setIsUploading(true);

    try {
      const fileName = `${Date.now()}_${file.name}`;
      const { data: fileData, error: fileError } = await supabase.storage
        .from("webtoon-images")
        .upload(fileName, file);

      if (fileError) throw fileError;

      const imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/webtoon-images/${fileName}`;

      const { error: dbError } = await supabase.from("episodes").insert([
        {
          work_id: parseInt(selectedWorkId),
          title: title,
          episode_number: parseInt(episodeNumber),
          image_url: imageUrl,
          tags: tags,
        },
      ]);

      if (dbError) throw dbError;

      alert("업로드 성공! 🎉");
      setTitle("");
      setTags("");
      setFile(null);
    } catch (error: any) {
      console.error(error);
      alert(`업로드 실패: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // 🖥️ 화면 렌더링
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 relative">
        {/* 🏠 뷰어로 돌아가기 버튼 (로그인 전) */}
        <Link href="/" className="absolute top-6 left-6 text-gray-400 hover:text-[#00D560] flex items-center gap-2 transition-colors">
          <span>← 뷰어로 돌아가기</span>
        </Link>

        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm border border-gray-100">
          <h1 className="text-2xl font-bold text-center mb-6 text-[#00D560]">관리자 로그인</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="비밀번호 입력"
              className="w-full p-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00D560]/20 focus:border-[#00D560]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="submit"
              className="w-full bg-[#00D560] text-white p-4 rounded-xl font-bold hover:bg-[#00b550] transition-colors"
            >
              접속하기
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 p-6 max-w-2xl mx-auto">
      {/* 상단 헤더 영역 */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-[#00D560]">에피소드 업로드</h1>
        
        {/* 🏠 뷰어로 돌아가기 버튼 (로그인 후) */}
        <Link 
          href="/" 
          className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors"
        >
          🏠 뷰어로 이동
        </Link>
      </div>

      <form onSubmit={handleUpload} className="space-y-6">
        {/* 작품 선택 */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">작품 선택</label>
          <select 
            className="w-full p-3 border border-gray-200 rounded-xl focus:border-[#00D560] outline-none"
            value={selectedWorkId}
            onChange={(e) => setSelectedWorkId(e.target.value)}
          >
            <option value="">작품을 선택하세요</option>
            {works.map((work) => (
              <option key={work.id} value={work.id}>{work.title}</option>
            ))}
          </select>
        </div>

        {/* 컷 제목 */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">컷 제목 (내용)</label>
          <input
            type="text"
            placeholder="예: 주인공 각성 장면"
            className="w-full p-3 border border-gray-200 rounded-xl focus:border-[#00D560] outline-none"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* 화수 */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">화수 (숫자만)</label>
          <input
            type="number"
            placeholder="예: 15"
            className="w-full p-3 border border-gray-200 rounded-xl focus:border-[#00D560] outline-none"
            value={episodeNumber}
            onChange={(e) => setEpisodeNumber(e.target.value)}
          />
        </div>

        {/* 태그 */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">태그 (띄어쓰기로 구분)</label>
          <input
            type="text"
            placeholder="예: 액션 로판 먼치킨"
            className="w-full p-3 border border-gray-200 rounded-xl focus:border-[#00D560] outline-none"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>

        {/* 이미지 파일 */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">이미지 파일</label>
          <input
            type="file"
            accept="image/*"
            className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#00D560]/10 file:text-[#00D560] hover:file:bg-[#00D560]/20"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>

        <button
          type="submit"
          disabled={isUploading}
          className={`w-full p-4 rounded-xl font-bold text-white transition-all ${
            isUploading ? "bg-gray-400 cursor-not-allowed" : "bg-[#00D560] hover:bg-[#00b550] shadow-lg hover:shadow-xl"
          }`}
        >
          {isUploading ? "업로드 중..." : "업로드 하기 ✨"}
        </button>
      </form>
    </div>
  );
}