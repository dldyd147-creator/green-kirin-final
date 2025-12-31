import { supabase } from "@/utils/supabase";
import Link from "next/link";

// ⚠️ 중요: Next.js 15+ 에서는 params를 Promise로 처리해야 합니다.
export default async function WorkDetail({ params }: { params: Promise<{ id: string }> }) {
  // 1. 여기서 await를 써서 id를 꺼내야 합니다.
  const { id } = await params;

  // 2. 작품 정보 가져오기
  const { data: work, error: workError } = await supabase
    .from("works")
    .select("*")
    .eq("id", id) // 꺼낸 id 사용
    .single();

  // 3. 회차 리스트 가져오기
  const { data: episodes, error: epError } = await supabase
    .from("episodes")
    .select("*")
    .eq("work_id", id) // 꺼낸 id 사용
    .order("episode_number", { ascending: false });

  // 에러 확인용 로그 (터미널에서 확인 가능)
  if (workError) console.error("작품 로딩 에러:", workError);
  if (epError) console.error("회차 로딩 에러:", epError);

  if (!work) {
    return (
      <div className="min-h-screen bg-black text-white p-10">
        <h1 className="text-xl font-bold text-red-500">작품을 찾을 수 없습니다.</h1>
        <p className="text-gray-400 mt-2">ID: {id}</p>
        <Link href="/" className="mt-4 inline-block bg-gray-700 px-4 py-2 rounded">
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      {/* 뒤로가기 & 헤더 */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/" className="text-2xl">←</Link>
        <h1 className="text-xl font-bold">{work.title}</h1>
      </div>

      {/* 회차 리스트 */}
      <div className="space-y-3">
        {episodes?.map((ep) => (
          <Link
            key={ep.id}
            href={`/viewer/${ep.id}`} // 클릭하면 뷰어로 이동
            className="block p-4 bg-gray-900 rounded-lg hover:bg-gray-800 transition border border-gray-800"
          >
            <div className="flex justify-between items-center">
              <span className="font-medium text-lg">{ep.title}</span>
              <span className="text-gray-500 text-sm">이동 &gt;</span>
            </div>
          </Link>
        ))}
        {(!episodes || episodes.length === 0) && (
          <div className="text-center text-gray-500 py-10">등록된 회차가 없습니다.</div>
        )}
      </div>
    </div>
  );
}