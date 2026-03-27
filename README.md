# lyrics-video-ai
AI 자동 가사 영상 생성기 - LyricsVideo AI

## 개발 환경

```bash
npm install
npm run dev
```

## 환경 변수

`.env.example`을 참고해 `.env`를 생성하세요.

### 프론트엔드(Vite)

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 서버리스 API(Vercel)

- `ACR_HOST`
- `ACR_ACCESS_KEY`
- `ACR_ACCESS_SECRET`

## 추가된 기능

1. **MP3 업로드 + 자동 곡 인식**
   - 드래그앤드롭/파일 선택으로 MP3 업로드
   - `/api/acr-recognize` 호출 후 제목/아티스트 자동 입력
2. **Supabase 저장/불러오기**
   - 프로젝트 이름/아티스트/가사 데이터 저장
   - 기존 프로젝트 목록 조회 및 로드
3. **Vercel 배포 설정**
   - `vercel.json` 포함
   - ACRCloud/Supabase 환경 변수 기반 동작
4. **UI 개선**
   - MP3 드롭존
   - 저장/불러오기 버튼 및 프로젝트 목록
   - 곡 인식/저장/불러오기 로딩 상태 표시

## Supabase 테이블 예시

아래 SQL로 `lyrics_projects` 테이블을 생성할 수 있습니다.

```sql
create table if not exists public.lyrics_projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text not null,
  lyrics text not null default '',
  audio_file_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists lyrics_projects_set_updated_at on public.lyrics_projects;
create trigger lyrics_projects_set_updated_at
before update on public.lyrics_projects
for each row execute procedure public.set_updated_at();
```
