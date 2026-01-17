"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/utils/supabase";

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState("work"); 
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // 데이터 상태
  const [works, setWorks] = useState<any[]>([]);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [existingImages, setExistingImages] = useState<any[]>([]);

  // 1. 작품 관리
  const [newWorkTitle, setNewWorkTitle] = useState("");
  const [newWorkThumbnail, setNewWorkThumbnail] = useState<File | null>(null);
  const [editThumbnailFile, setEditThumbnailFile] = useState<File | null>(null);

  // 2. 에피소드 관리
  const [newEpisodeWorkId, setNewEpisodeWorkId] = useState("");
  const [newEpisodeNo, setNewEpisodeNo] = useState("");
  const [newEpisodeTitle, setNewEpisodeTitle] = useState("");
  const [newEpisodeTags, setNewEpisodeTags] = useState(""); 

  const [editingEpisodeId, setEditingEpisodeId] = useState<string | null>(null);
  const [editEpisodeNo, setEditEpisodeNo] = useState("");
  const [editEpisodeTitle, setEditEpisodeTitle] = useState("");
  const [editEpisodeTags, setEditEpisodeTags] = useState("");

  // 3. 원고 관리
  const [selectedWorkId, setSelectedWorkId] = useState("");
  const [selectedEpisodeId, setSelectedEpisodeId] = useState("");
  const [files, setFiles] = useState<FileList | null>(null); 
  
  const workFileInputRef = useRef<HTMLInputElement>(null);
  const uploadFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (isAdmin) fetchWorks(); }, [isAdmin]);
  useEffect(() => { if (activeTab === "upload") setExistingImages([]); }, [activeTab]);
  useEffect(() => { if (selectedWorkId) fetchEpisodes(selectedWorkId); }, [selectedWorkId]);
  useEffect(() => { if (newEpisodeWorkId) fetchEpisodes(newEpisodeWorkId); }, [newEpisodeWorkId]);
  useEffect(() => { if (selectedEpisodeId) fetchImages(selectedEpisodeId); else setExistingImages([]); }, [selectedEpisodeId]);

  const addLog = (msg: string) => setLogs((prev) => [msg, ...prev]);
  const sanitizeFileName = (originalName: string) => {
    const ext = originalName.split('.').pop();
    const safeName = originalName.replace(/[^a-zA-Z0-9]/g, '_');
    return `${Date.now()}_${safeName}.${ext}`;
  };

  const fetchWorks = async () => {
    const { data } = await supabase.from("works").select("*").order("id", { ascending: true });
    if (data) setWorks(data);
  };

  const fetchEpisodes = async (workId: string) => {
    const { data } = await supabase.from("episodes").select("*").eq("work_id", workId).order("episode_number", { ascending: true });
    if (data) setEpisodes(data);
  };

  const fetchImages = async (episodeId: string) => {
    setLoading(true);
    const { data } = await supabase.from("images").select("*").eq("episode_id", episodeId).order("sequence", { ascending: true });
    if (data) setExistingImages(data);
    setLoading(false);
  };

  const checkPassword = () => {
    if (password === "green1234") setIsAdmin(true);
    else alert("비밀번호가 틀렸습니다.");
  };

  // 1️⃣ 작품 관리
  const handleCreateWork = async () => {
    if (!newWorkTitle || !newWorkThumbnail) return alert("필수 입력 누락");
    if (!confirm(`'${newWorkTitle}' 등록?`)) return;
    setLoading(true);
    try {
      const safeName = sanitizeFileName(newWorkThumbnail.name);
      const filePath = `thumbnails/${safeName}`;
      await supabase.storage.from("webtoons").upload(filePath, newWorkThumbnail);
      const { data: { publicUrl } } = supabase.storage.from("webtoons").getPublicUrl(filePath);
      await supabase.from("works").insert({ title: newWorkTitle, thumbnail_url: publicUrl });
      alert("완료"); setNewWorkTitle(""); setNewWorkThumbnail(null); if(workFileInputRef.current) workFileInputRef.current.value=""; fetchWorks();
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };
  const handleDeleteWork = async (id: string) => { if(confirm("삭제?")) { await supabase.from("works").delete().eq("id", id); fetchWorks(); }};
  const handleUpdateThumbnail = async (id: string) => {
    if(!editThumbnailFile) return alert("파일 선택필요");
    const safeName = sanitizeFileName(editThumbnailFile.name);
    await supabase.storage.from("webtoons").upload(`thumbnails/${safeName}`, editThumbnailFile);
    const { data: { publicUrl } } = supabase.storage.from("webtoons").getPublicUrl(`thumbnails/${safeName}`);
    await supabase.from("works").update({ thumbnail_url: publicUrl }).eq("id", id);
    alert("수정완료"); setEditThumbnailFile(null); fetchWorks();
  };

  // 2️⃣ 에피소드 관리
  const handleCreateEpisode = async () => {
    if (!newEpisodeWorkId || !newEpisodeNo || !newEpisodeTitle) return alert("모두 입력해주세요.");
    setLoading(true);
    try {
      const { error } = await supabase.from("episodes").insert({
        work_id: newEpisodeWorkId,
        episode_number: Number(newEpisodeNo),
        title: newEpisodeTitle,
        tags: newEpisodeTags // 태그 저장
      });
      if (error) throw error;
      alert("에피소드 등록 완료!");
      setNewEpisodeNo(""); setNewEpisodeTitle(""); setNewEpisodeTags(""); 
      fetchEpisodes(newEpisodeWorkId);
    } catch (e: any) { alert(`에러: ${e.message}`); } finally { setLoading(false); }
  };
  const startEditEpisode = (ep: any) => {
    setEditingEpisodeId(ep.id);
    setEditEpisodeNo(String(ep.episode_number));
    setEditEpisodeTitle(ep.title);
    setEditEpisodeTags(ep.tags || ""); 
  };
  const handleUpdateEpisode = async (episodeId: string) => {
    const { error } = await supabase.from("episodes").update({ 
      episode_number: Number(editEpisodeNo), title: editEpisodeTitle, tags: editEpisodeTags 
    }).eq("id", episodeId);
    if (error) alert("실패"); 
    else { alert("수정됨"); setEditingEpisodeId(null); fetchEpisodes(newEpisodeWorkId); }
  };
  const handleDeleteEpisode = async (id: string) => { if(confirm("삭제?")) { await supabase.from("episodes").delete().eq("id", id); fetchEpisodes(newEpisodeWorkId); }};

  // 3️⃣ 원고 관리
  const handleAddImages = async () => {
    if (!selectedWorkId || !selectedEpisodeId || !files || files.length===0) return alert("선택 누락");
    setLoading(true); setLogs([]);
    try {
      const maxSeq = existingImages.length > 0 ? Math.max(...existingImages.map(i=>i.sequence)) : 0;
      const newImgs = [];
      for(let i=0; i<files.length; i++){
        const file = files[i];
        const path = `uploads/${selectedWorkId}/${selectedEpisodeId}/${sanitizeFileName(file.name)}`;
        addLog(`업로드: ${file.name}`);
        await supabase.storage.from("webtoons").upload(path, file);
        const { data: { publicUrl } } = supabase.storage.from("webtoons").getPublicUrl(path);
        newImgs.push({ episode_id: selectedEpisodeId, sequence: maxSeq+i+1, image_url: publicUrl });
      }
      await supabase.from("images").insert(newImgs);
      addLog("완료"); setFiles(null); if(uploadFileInputRef.current) uploadFileInputRef.current.value=""; fetchImages(selectedEpisodeId);
    } catch(e:any){ addLog(e.message); } finally { setLoading(false); }
  };
  const handleDeleteSingleImage = async (id:number) => { if(confirm("삭제?")) { await supabase.from("images").delete().eq("id", id); fetchImages(selectedEpisodeId); }};
  const handleSaveOrder = async () => { if(confirm("저장?")) { for(const img of existingImages) await supabase.from("images").update({sequence:img.sequence}).eq("id",img.id); alert("저장됨"); fetchImages(selectedEpisodeId); }};
  const handleSequenceChange = (idx: number, seq: string) => { const u = [...existingImages]; u[idx].sequence=Number(seq); setExistingImages(u); };

  const INPUT_STYLE = "w-full p-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-[#00D560] focus:border-[#00D560] outline-none";

  if (!isAdmin) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded border shadow-lg">
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className={INPUT_STYLE} placeholder="비밀번호" onKeyDown={e=>e.key==='Enter'&&checkPassword()}/>
        <button onClick={checkPassword} className="bg-[#00D560] text-white w-full py-3 mt-4 rounded font-bold">접속</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-extrabold mb-6">관리자 <span className="text-[#00D560]">Admin</span></h1>
        
        <div className="flex gap-2 mb-6">
          {['work', 'episode', 'upload'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-2 rounded font-bold ${activeTab === tab ? "bg-[#00D560] text-white" : "bg-white text-gray-500 border"}`}>
              {tab === 'work' ? '1. 작품' : tab === 'episode' ? '2. 에피소드' : '3. 원고'}
            </button>
          ))}
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 min-h-[600px]">
          {activeTab === "work" && (
            <div className="space-y-6">
              <div className="bg-gray-50 p-6 rounded-xl border">
                <h2 className="font-bold mb-4">✨ 작품 등록</h2>
                <div className="flex gap-4">
                  <input className={INPUT_STYLE} value={newWorkTitle} onChange={e=>setNewWorkTitle(e.target.value)} placeholder="작품 제목" />
                  <div className="relative w-full">
                     <input type="file" id="thum" className="hidden" ref={workFileInputRef} onChange={e=>setNewWorkThumbnail(e.target.files?.[0]||null)} />
                     <label htmlFor="thum" className="block w-full text-center p-3 bg-white border rounded cursor-pointer text-gray-500 hover:border-[#00D560]">{newWorkThumbnail ? "✅ 선택됨" : "📁 썸네일 선택"}</label>
                  </div>
                </div>
                <button onClick={handleCreateWork} disabled={loading} className="w-full bg-[#00D560] text-white py-3 mt-4 rounded font-bold">등록하기</button>
              </div>
              <div>
                 {works.map(w=>(
                   <div key={w.id} className="flex items-center gap-4 border p-4 rounded mb-2">
                     <img src={w.thumbnail_url} className="w-12 h-16 object-cover bg-gray-200"/>
                     <div className="flex-1 font-bold">{w.title}</div>
                     <label className="text-xs bg-gray-100 p-2 cursor-pointer rounded">교체 <input type="file" className="hidden" onChange={e=>setEditThumbnailFile(e.target.files?.[0]||null)}/></label>
                     {editThumbnailFile && <button onClick={()=>handleUpdateThumbnail(w.id)} className="text-xs bg-gray-800 text-white p-2 rounded">저장</button>}
                     <button onClick={()=>handleDeleteWork(w.id)} className="text-red-500 text-xs font-bold px-2">삭제</button>
                   </div>
                 ))}
              </div>
            </div>
          )}

          {activeTab === "episode" && (
            <div className="space-y-6">
              <div className="bg-gray-50 p-6 rounded-xl border">
                 <h2 className="font-bold mb-4">🎬 에피소드 및 태그 등록</h2>
                 <select className={INPUT_STYLE + " mb-4"} value={newEpisodeWorkId} onChange={e=>setNewEpisodeWorkId(e.target.value)}>
                    <option value="">작품 선택</option>
                    {works.map(w=><option key={w.id} value={w.id}>{w.title}</option>)}
                 </select>
                 <div className="flex gap-2 mb-4">
                   <input type="number" className={INPUT_STYLE} value={newEpisodeNo} onChange={e=>setNewEpisodeNo(e.target.value)} placeholder="회차(숫자)" />
                   <input type="text" className={INPUT_STYLE} value={newEpisodeTitle} onChange={e=>setNewEpisodeTitle(e.target.value)} placeholder="소제목" />
                 </div>
                 
                 {/* 🔥 태그 가이드 추가 */}
                 <div>
                    <label className="text-xs text-gray-500 ml-1 mb-1 block">검색용 태그 (캐릭터명, 장르, 연출 등 띄어쓰기로 구분)</label>
                    <input type="text" className={INPUT_STYLE} value={newEpisodeTags} onChange={e=>setNewEpisodeTags(e.target.value)} placeholder="예: 루시 액션신 도입부 해결편" />
                 </div>
                 
                 <button onClick={handleCreateEpisode} disabled={loading} className="w-full bg-[#00D560] text-white py-3 mt-4 rounded font-bold">추가하기</button>
              </div>

              {newEpisodeWorkId && (
                <div>
                  <h3 className="font-bold mb-2">목록</h3>
                  <ul className="border rounded divide-y">
                    {episodes.map(ep => (
                      <li key={ep.id} className="p-4">
                        {editingEpisodeId === ep.id ? (
                          <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                              <input className="border p-2 w-16" value={editEpisodeNo} onChange={e=>setEditEpisodeNo(e.target.value)}/>
                              <input className="border p-2 flex-1" value={editEpisodeTitle} onChange={e=>setEditEpisodeTitle(e.target.value)}/>
                            </div>
                            <input className="border p-2 w-full" value={editEpisodeTags} onChange={e=>setEditEpisodeTags(e.target.value)} placeholder="태그 수정"/>
                            <div className="flex gap-2">
                              <button onClick={()=>handleUpdateEpisode(ep.id)} className="bg-[#00D560] text-white p-2 rounded flex-1">저장</button>
                              <button onClick={()=>setEditingEpisodeId(null)} className="bg-gray-400 text-white p-2 rounded flex-1">취소</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-bold">{ep.episode_number}화. {ep.title}</div>
                              <div className="text-sm text-[#00D560] mt-1 font-medium">
                                {ep.tags ? `🏷️ ${ep.tags}` : "🏷️ 태그 없음"}
                              </div>
                            </div>
                            <div className="flex gap-2 text-sm">
                              <button onClick={()=>startEditEpisode(ep)} className="text-blue-500">수정</button>
                              <button onClick={()=>handleDeleteEpisode(ep.id)} className="text-red-500">삭제</button>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === "upload" && (
            <div className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                 <select className={INPUT_STYLE} value={selectedWorkId} onChange={e=>setSelectedWorkId(e.target.value)}><option>작품선택</option>{works.map(w=><option key={w.id} value={w.id}>{w.title}</option>)}</select>
                 <select className={INPUT_STYLE} value={selectedEpisodeId} onChange={e=>setSelectedEpisodeId(e.target.value)}><option>에피소드선택</option>{episodes.map(e=><option key={e.id} value={e.id}>{e.episode_number}화</option>)}</select>
               </div>
               {selectedEpisodeId && (
                 <>
                   <div className="border p-4 h-64 overflow-y-auto bg-gray-50 rounded">
                     {existingImages.map((img,i)=><div key={img.id} className="flex items-center gap-2 border-b p-2"><input value={img.sequence} onChange={e=>handleSequenceChange(i,e.target.value)} className="w-8 text-center"/><span className="flex-1 truncate text-xs">{img.image_url}</span><button onClick={()=>handleDeleteSingleImage(img.id)}>❌</button></div>)}
                   </div>
                   <button onClick={handleSaveOrder} className="w-full bg-gray-800 text-white py-2 rounded">순서 저장</button>
                   <div className="flex gap-2 mt-4"><input type="file" multiple className="hidden" id="imgs" ref={uploadFileInputRef} onChange={e=>setFiles(e.target.files)} /><label htmlFor="imgs" className="flex-1 border-2 border-dashed p-4 text-center cursor-pointer hover:border-[#00D560]">{files?`${files.length}개 선택됨`:"이미지 추가"}</label><button onClick={handleAddImages} disabled={!files} className="bg-[#00D560] text-white px-8 rounded font-bold">업로드</button></div>
                 </>
               )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}