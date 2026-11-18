# DevMaster — Frontend

React, TypeScript, Vite, Tailwind CSS v4, Axios, React Router và Lucide React. Giao diện tiếng Việt, dành riêng cho doanh nghiệp DevMaster.

## Chạy ứng dụng

Trong thư mục `frontend`, chạy `npm.cmd install`, sau đó `npm.cmd run dev`. Mở `http://localhost:5173`. Có thể dùng `npm` nếu shell cho phép. Môi trường kiểm thử: Node.js `v24.21.0`.

Cấu hình `.env` theo `.env.example`:

```dotenv
VITE_API_URL=http://localhost:5000/api/v1
```

`VITE_API_URL` bao gồm `/api/v1`. Axios có timeout 15 giây. Biến `VITE_*` được đưa vào bundle trình duyệt: không đặt JWT_SECRET, mật khẩu hoặc bí mật trong đó. Không commit `.env`.

Backend chạy riêng, cho phép origin Frontend qua CORS `CLIENT_URL`. Frontend/test không tự chạy seed hoặc khởi động Backend. Production cần HTTPS và máy chủ phục vụ `index.html` cho đường dẫn SPA như `/dashboard`, `/change-password`.

## Authentication

| API | Request / response |
| --- | --- |
| `POST /auth/login` | `{ email, password }` → `data.accessToken`, `data.user` |
| `GET /auth/me` | Bearer Token → `data.user`; chuẩn hóa `_id` về `id` |
| `PATCH /auth/change-password` | `{ currentPassword, newPassword }` → `success`, `message` |

- Email trim/chuyển chữ thường, mật khẩu giữ nguyên. Login/currentPassword tương thích giới hạn cũ 128 ký tự. Mật khẩu mới tối thiểu 8 ký tự, không chỉ khoảng trắng, tối đa 72 byte UTF-8, khác mật khẩu hiện tại; có ô xác nhận.
- Chưa đăng nhập không vào Dashboard. Login và tải lại trang đều xác minh bằng `/me` trước khi vào hệ thống, không tin vai trò/cờ đổi mật khẩu từ storage.
- `mustChangePassword` khác `false` bắt buộc vào `/change-password`. Đổi mật khẩu thành công xóa token và chuyển Login, không dùng JWT cũ đã bị Backend thu hồi bằng `tokenVersion`.
- 401 từ API xác thực xóa phiên; 401 khi nhập sai mật khẩu tại Login chỉ hiển thị lỗi. 403 `PASSWORD_CHANGE_REQUIRED` chuyển sang đổi mật khẩu; 403 phân quyền thông thường không xóa phiên. Xung đột đổi mật khẩu yêu cầu đăng nhập lại.
- Phản hồi của phiên cũ đến muộn không đăng xuất phiên mới; kết quả `/me` đến sau logout không khôi phục người dùng. Lỗi mạng khi khôi phục phiên có màn hình thử lại, không mở Dashboard.
- Dashboard dành cho bốn vai trò. Mục Users chỉ hiện cho Admin/Manager, khớp quyền đọc Backend, hiện chưa có giao diện nghiệp vụ. Frontend không thay thế phân quyền Backend.

## Lưu phiên và giới hạn bảo mật

Token lưu tại `sessionStorage`, khóa `devmaster.accessToken`, để giữ phiên khi tải lại cùng tab. Không lưu user, mật khẩu hoặc token trong localStorage. Nếu storage bị chặn, phiên dùng RAM và mất khi tải lại. Không ghi thông tin xác thực ra console.

Cách này tương thích Backend Bearer hiện tại, không phải cookie HttpOnly: JavaScript cùng origin và XSS vẫn có thể đọc token. Phiên tách theo tab; trình duyệt có thể phục hồi sessionStorage khi khôi phục tab hoặc sao chép sang tab được nhân bản. Không xem đóng tab là cơ chế thu hồi JWT.

Logout chỉ xóa phiên trên tab hiện tại vì Backend chưa có API logout/revoke hoặc refresh token. Token bị sao chép có thể còn hiệu lực đến khi hết hạn hoặc đổi mật khẩu. Tab khác nhận 401 ở lần gọi API tiếp theo sau đổi mật khẩu. Nếu mất phản hồi đổi mật khẩu, chưa thể biết chắc kết quả: đăng xuất và thử đăng nhập lại để xác minh.

## Bộ màu dùng chung

Tập trung tại `src/styles/tokens.css`, dùng `@theme` của Tailwind v4 và CSS variables. `App.css`/`index.css` tham chiếu token, không giữ bảng màu mint cũ.

| Token | Giá trị | Vai trò |
| --- | --- | --- |
| `--color-canvas` | `#0A0A0A` | Nền chính |
| `--color-primary` | `#007BA7` | Nút chính, logo, điều hướng |
| `--color-accent` | `#FF2D95` | Logo, chấm active, điểm nhấn nhỏ |
| `--color-primary-ink` | `#71C8E8` | Chữ/icon xanh và focus trên nền tối |
| `--color-primary-soft` | `#0D2028` | Nền xanh của thành phần được chọn |
| `--color-accent-ink` | `#FF8CC7` | Chữ/icon cần chú ý |
| `--color-surface` / `--color-surface-raised` | `#111111` / `#191919` | Thẻ, sidebar, input |
| `--color-foreground` / `--color-muted` | `#F4F4F5` / `#ABABB4` | Chữ chính/mô tả |

Tương phản đã tính: trắng trên nút xanh 4,78:1; chữ xanh sáng trên nền thẻ 10,01:1; chữ phụ `#94949E` trên `#191919` 5,85:1. Có focus bàn phím, skip link, label/error cho input, menu mobile bằng dialog với Escape/giới hạn focus, hỗ trợ reduced motion. Không tải font hoặc thư viện giao diện từ CDN.

Tái sử dụng `Brand`, `Alert`, `PasswordField`, `EmptyState`, `AuthLayout`, `DashboardLayout`. Login hai cột trên desktop, một cột trên mobile. Header không có nút giả; các phân hệ chưa sẵn sàng bị vô hiệu hóa và ghi “Sắp có”.

## Dashboard và dữ liệu

Bốn KPI: tổng tài sản, tổng thiết bị, cơ sở vật chất, bảo trì. Hai vùng biểu đồ: tình trạng tài sản và biến động theo thời gian. Có hoạt động gần đây và nhắc việc. Những vùng này hiển thị “Chưa có dữ liệu” do chưa có API tương ứng; không dựng số liệu, phần trăm, chuỗi biểu đồ hoặc hoạt động mẫu.

Tên, email, mã nhân viên, vai trò và trạng thái xác thực lấy từ API Authentication khi chạy ứng dụng. Ngày hiển thị là ngày trên thiết bị. Tài khoản giả trong ảnh chỉ tồn tại trong mock/test.

## Kiểm thử

```powershell
npm.cmd run build
npm.cmd run lint
npm.cmd test
npm.cmd run test:e2e
```

- Build kiểm tra TypeScript cho source và test rồi tạo `dist/`.
- Vitest + Testing Library dùng Axios adapter giả; chặn XMLHttpRequest/fetch không được mock. Không gọi Backend/MongoDB.
- Playwright chạy headless, mở Vite tại `127.0.0.1:4174`; API luôn là `/api/v1` trên server thử nghiệm và được intercept. Chặn origin bên ngoài. Đóng server bằng API Vite, tránh tiến trình npm con bị giữ trên Windows.
- Windows mặc định dùng Edge đã cài, có thể đặt `PLAYWRIGHT_CHANNEL=chrome`. Hệ điều hành khác cần Chromium (`npx playwright install chromium`). Không dùng hồ sơ hoặc tài khoản trình duyệt thật.
- Ảnh lưu tại `test-results/`, bị Git bỏ qua, chỉ có tài khoản giả.

Kết quả đã chạy ngày 18/11/2026: build đạt; lint không báo lỗi/cảnh báo; **36/36** test Vitest và **12/12** lượt Playwright đạt. Edge/Chromium: desktop 1440×1000, tablet 820×1180, mobile 390×844. Bao gồm Login → Dashboard → Logout, reload, quay lại Login, token hết hạn, đổi mật khẩu bắt buộc, 72 byte UTF-8, bàn phím/focus, màu thương hiệu và trạng thái trống. Đã xem ảnh desktop/mobile.

Chưa kiểm thử kết nối với Backend/MongoDB thật. Khi tích hợp, dùng database test riêng để kiểm tra CORS, HTTPS, hết hạn token và đổi mật khẩu. Cần kiểm tra thêm Safari/Firefox, thiết bị di động thật, trình quản lý mật khẩu và trình đọc màn hình.

## Dependency còn cần xử lý

`npm audit` báo 6 cảnh báo high trong chuỗi Vite/Vitest qua `picomatch`. Theo [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf), chưa có bản vá được công bố tại thời điểm rà soát. Không chạy `audit fix --force` vì đề xuất đổi major/hạ phiên bản công cụ. Cảnh báo này chưa được khắc phục; cần theo dõi bản vá. Không mở Vite dev server công khai hoặc dùng nó làm máy chủ production.

Đợt đổi màu không cài thêm dependency, không thay đổi Authentication, API, Backend hoặc MongoDB; không commit/push.
