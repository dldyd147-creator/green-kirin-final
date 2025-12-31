import os
from supabase import create_client, Client

# ==========================================
# 1. 설정 정보 (주소 뒤에 슬래시 / 필수!)
# ==========================================
SUPABASE_URL = "https://gljyohpldaulgcyhdken.supabase.co/"  # 👈 끝에 / 꼭 있어야 함
SUPABASE_KEY = "sb_secret_DFWJ49bwDwei5s6LVU-1HQ_rtHzl1-j"
BUCKET_NAME = "webtoons"

# ==========================================
# 2. Supabase 연결
# ==========================================
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    print(f"❌ 연결 실패: {e}")
    exit()

def debug_storage_paths(target_path):
    """경로를 못 찾을 때, 실제로 뭐가 있는지 탐색해서 알려주는 함수"""
    print(f"\n🕵️ 'webtoons' 버킷의 최상위 폴더를 검색합니다...")
    try:
        # 루트 폴더 검색
        root_files = supabase.storage.from_(BUCKET_NAME).list()
        folders = [f['name'] for f in root_files if f.get('id') is None] # 폴더만 골라내기
        
        print(f"   👉 발견된 최상위 폴더 목록: {folders}")
        
        # 만약 타겟 경로의 첫 부분(예: 005)이 목록에 있다면 그 안도 검색
        first_folder = target_path.split("/")[0]
        if first_folder in folders:
            print(f"   📂 '{first_folder}' 폴더 안을 더 들여다봅니다...")
            sub_files = supabase.storage.from_(BUCKET_NAME).list(first_folder)
            sub_names = [f['name'] for f in sub_files]
            print(f"   👉 '{first_folder}' 안의 내용물: {sub_names}")
        else:
            print(f"   ⚠️ '{first_folder}' 폴더 자체가 안 보입니다. 폴더명을 확인해주세요.")
            
    except Exception as e:
        print(f"   ❌ 검색 중 에러 발생: {e}")

def register_episode(work_id, episode_num, episode_title, folder_path_in_storage):
    print(f"\n🚀 [작품ID: {work_id}] {episode_num}화 등록 시작... (경로: {folder_path_in_storage})")

    # 1. 파일 목록 가져오기
    try:
        files = supabase.storage.from_(BUCKET_NAME).list(folder_path_in_storage)
    except Exception as e:
        print(f"❌ 스토리지 접근 에러: {e}")
        return

    # 이미지 필터링
    image_files = [f for f in files if f['name'].lower().endswith(('.jpg', '.png', '.jpeg'))]
    image_files.sort(key=lambda x: x['name'])

    # 🚨 이미지가 없으면 디버깅 시작
    if not image_files:
        print(f"⚠️ 폴더 '{folder_path_in_storage}'에서 이미지를 못 찾았습니다.")
        debug_storage_paths(folder_path_in_storage) # 길 찾기 실행
        return

    print(f"📸 이미지 {len(image_files)}장 발견! DB 등록을 진행합니다.")

    # 2. 회차 ID 확보 (없으면 생성)
    res = supabase.table("episodes").select("*").eq("work_id", work_id).eq("episode_number", episode_num).execute()
    if len(res.data) > 0:
        episode_id = res.data[0]['id']
    else:
        new_ep = {"work_id": work_id, "episode_number": episode_num, "title": episode_title}
        res = supabase.table("episodes").insert(new_ep).execute()
        episode_id = res.data[0]['id']

    # 3. 기존 데이터 삭제 후 재등록
    supabase.table("images").delete().eq("episode_id", episode_id).execute()

    images_data = []
    for idx, file in enumerate(image_files):
        full_path = f"{folder_path_in_storage}/{file['name']}"
        public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(full_path)
        images_data.append({
            "episode_id": episode_id,
            "sequence": idx + 1,
            "image_url": public_url
        })

    if images_data:
        supabase.table("images").insert(images_data).execute()
        print(f"🎉 성공! {len(images_data)}장 등록 완료. 웹사이트를 새로고침 하세요!")

# ==========================================
# 실행
# ==========================================
register_episode(
    work_id=1,
    episode_num=1,
    episode_title="1화 - 테스트 업로드",
    folder_path_in_storage="AKS/001" 
)