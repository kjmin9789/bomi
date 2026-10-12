# Cloudflare 개인용 보미

Workers가 화면과 인증된 API를 제공하고 D1이 기록을 저장한다. Cloudflare Access 이메일 로그인과 서버의 JWT 서명·발급자·대상·만료·허용 이메일 검증을 모두 사용한다. 설정이 없으면 개인 데이터 API는 닫힌 상태로 실패한다. 개인 데이터와 키는 정적 자산·공개 Git 저장소에 포함하지 않는다.

## 준비와 검증

Node.js 22 이상에서 `npm ci`, `npm test`, `npm run cloud:check`를 실행한다. `npm start`는 기존 로컬 저장·Codex 연결 버전이다. `npm run cloud:dev`는 Workers 로컬 실행이며 인증을 우회하지 않으므로 실제 Access JWT 없이는 기록 API를 사용할 수 없다. 테스트는 임시 서명 키와 격리된 로컬 D1을 사용한다.

## 최초 배포

1. `npx wrangler login`으로 공식 브라우저 인증을 완료한다. 비밀번호·토큰은 채팅이나 명령 인자에 넣지 않는다.
2. 다른 세션의 DB 쓰기 여부를 확인한다. `cloud/schema.sql`을 로컬 검토한 뒤 전용 D1 데이터베이스 `bomi`를 만든다. 기존 DB가 있으면 내용을 확인하기 전 초기화하지 않는다.
3. `wrangler.jsonc`를 Git에서 제외된 `wrangler.private.jsonc`에 복사하고 실제 `database_id`를 지정한다. 공개 파일에 개인 설정을 적지 않는다. Workers·D1은 무료 플랜으로 유지한다.
4. `npx wrangler d1 execute bomi --remote --config wrangler.private.jsonc --file cloud/schema.sql`을 실행하고 테이블을 재조회·백업한다. 처음에는 개인 기록을 자동 이관하지 않는다.
5. `npm run cloud:deploy`로 Worker를 올린다. 아직 인증 변수가 없으면 데이터 API는 503을 반환한다. Workers 대시보드에서 해당 `workers.dev` 주소의 Cloudflare Access를 활성화하고, Allow 정책을 소유자 이메일 하나만 허용하도록 바꾼다. Preview URL은 비활성화한다. Access 무료 플랜을 선택한다.
6. 비공개 설정의 `vars`에 `ACCESS_ISSUER`(https://팀이름.cloudflareaccess.com), `ACCESS_AUD`(Access Application AUD), `ALLOWED_EMAIL`, `VAPID_SUBJECT`(mailto:소유자이메일)를 넣고 재배포한다. JWT·개인 키는 이 파일에도 적지 않는다.
7. `npm run cloud:keys`가 생성하는 `.data/cloudflare/push-secrets.json`을 `npx wrangler secret bulk .data/cloudflare/push-secrets.json --config wrangler.private.jsonc`로 등록한다. 키 원문은 출력하지 않고 파일은 보관한다. 키를 바꾸면 기존 기기 재등록이 필요하다.
8. 로그아웃 상태·다른 이메일의 API 차단을 확인한 뒤, 본인 로그인으로 저장·재조회·다른 기기 조회를 확인한다. 아이폰에서 홈 화면 추가 → 알림 권한 → 설정에서 기기 등록과 시각 저장 → 앱을 닫고 실제 수신까지 검증한다.

Access의 Zero Trust Free 가입 화면에서 카드 등록·약관·초과 사용량 청구 동의를 요구할 수 있다. 무료 기본요금이 초과요금 없음까지 뜻하지 않는다. 이 단계는 소유자가 직접 조건을 검토·활성화하며, 에이전트는 결제 정보 입력·약관 동의·유료 업그레이드를 대신하지 않는다.

## 저장과 복구

- 클라우드 저장 전에 브라우저에 이전 상태와 이번 입력을 보존한다. 서버 성공 응답 전에는 꽃이나 완료를 확정하지 않는다.
- 상태 버전이 달라지면 409로 거절하고 다른 기기 내용을 덮어쓰지 않는다. 응답 유실 시 같은 변경 ID로 재시도한다.
- 실패한 입력은 새로고침 후에도 남는다. 다시 저장하거나, 입력 백업 후 최신 기록을 불러와 필요한 내용을 다시 반영한다. 여러 탭에 대기 입력이 있으면 묶음 JSON에 각각의 `state`가 들어 있다.
- D1은 최근 10개 이전 상태를 보관한다. 브라우저 로컬 백업에는 개인 내용이 있으므로 공용 기기 사용 후에는 백업 확인 후 해당 사이트 데이터를 정리한다. 로그아웃 자체는 로컬 복구 자료를 삭제하지 않는다.
- 기존 로컬 보미 기록은 JSON 백업·가져오기로 옮긴다. 가져오기는 현재 클라우드 상태를 교체하므로 먼저 양쪽을 백업한다. 이 버전은 두 저장소를 자동 병합하지 않는다.
- Cloudflare 운영자는 DB 내용을 조회할 수 있다. 본인 이메일 하나만 허용하는 개인용이며, 운영자도 읽을 수 없는 종단간 암호화나 다중 사용자 서비스로 설명하지 않는다.

## 알림과 범위

알림은 기본 꺼짐이다. 사용자가 시각과 기기 권한을 지정하면 5분 간격으로 한국시간을 확인한다. 오늘 기록이 없고 쉬어감·미루기가 아닐 때 등록 기기마다 하루 한 번 확인 질문을 보낸다. 기록 없음은 아무것도 안 했다는 뜻으로 표현하지 않는다. 특정 테마별 알림·AI 생성 질문은 아직 없다.

푸시 전송은 검증된 Apple·Google·Mozilla HTTPS 목적지로만 허용하고 리다이렉트를 따르지 않는다. 전달 결과가 불명확한 경우 당일 자동 재전송하지 않는다. 실패 여부는 deliveries에 남지만 개인 내용·키는 로그로 출력하지 않는다. 네트워크·운영체제 정책에 따라 수신이 늦거나 누락될 수 있으므로 정확한 시각 전달을 보장하지 않는다.

Workers의 푸시 요청은 `redirect: 'manual'`로 보내고 3xx를 실패로 처리한다. `redirect: 'error'`는 현재 실행 환경에서 전송 전에 예외를 일으킨다. 알림 테스트는 Node의 모의 전송뿐 아니라 Workers 실행 환경의 정기 실행·실제 fetch·발송 결과 저장·중복 방지·리다이렉트 차단을 검증한다. 푸시 서버의 접수 성공과 기기의 실제 수신은 별도로 확인한다.

클라우드 화면의 Codex 가져오기는 현재 컴퓨터에서 실행한 `npm run bridge -- https://보미주소`에 연결한다. 브라우저가 `127.0.0.1:4174`에 직접 요청하며, Worker가 맥을 원격 실행하지 않는다. 확인한 항목만 현재 클라우드 기록에 추가·갱신한다. 컴퓨터별 연결 프로그램 실행과 최신 Chrome의 로컬 연결 권한이 필요하다. 고정 채팅 ID 없이 Codex App Server에서 새 읽기 전용 정리 세션을 시작하고 요청을 자동 전송한다. 선택한 날짜의 모든 개인 채팅과 아카이브를 조사하고 작업별로 나눈 뒤 공통 주제로 묶는다. 상세 절차는 루트 README를 따른다. 전화·음성·유료 AI·회사 자료 수집은 추가하지 않는다. 소스 변경은 PR로 제출하고 소유자가 수동 검토 후 Squash and merge 한다.

공식 참고: [Workers Access](https://developers.cloudflare.com/workers/configuration/cloudflare-access/), [JWT 검증](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/), [Cron](https://developers.cloudflare.com/workers/configuration/cron-triggers/), [아이폰 웹 푸시](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers).

브라우저 참고: [Chrome 로컬 네트워크 접근 권한](https://developer.chrome.com/blog/local-network-access?hl=en).
