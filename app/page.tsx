import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/utils/supabase";

export default async function Home() {
  const { data: works, error } = await supabase
    .from("works")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <p>오류가 발생했습니다: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">웹툰 목록</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {works?.map((work) => (
            <Link
              key={work.id}
              href={`/work/${work.id}`}
              className="block bg-gray-900 rounded-lg overflow-hidden hover:bg-gray-800 transition-colors"
            >
              <div className="aspect-[3/4] relative bg-gray-800">
                {work.thumbnail_url && (
                  <Image
                    src={work.thumbnail_url}
                    alt={work.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                  />
                )}
              </div>
              <div className="p-3">
                <h2 className="text-sm font-medium line-clamp-2">{work.title}</h2>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
