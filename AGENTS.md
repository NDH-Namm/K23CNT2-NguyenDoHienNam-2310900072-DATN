
# DEVMaster – Đồ án tốt nghiệp

## 1. Thông tin dự án

Tên đề tài: Xây dựng website quản lý cơ sở vật chất, tài sản và thiết bị cho doanh nghiệp DevMaster.

Đây là website quản lý nội bộ dành riêng cho doanh nghiệp DevMaster, KHÔNG phải hệ thống Multi-tenant.

Mục tiêu: Hoàn thiện một website có thể chạy thực tế và trình diễn đầy đủ nghiệp vụ khi bảo vệ đồ án tốt nghiệp.

Ngôn ngữ giao diện: Tiếng Việt.
Phong cách giao diện: Dark Mode, hiện đại, chuyên nghiệp.

## 2. Công nghệ

Frontend:
- ReactJS
- TypeScript
- Vite
- Tailwind CSS v4
- Axios
- React Router
- Lucide React

Backend:
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- bcrypt
- Zod

Database: devmaster
API prefix: /api/v1

## 3. Vai trò người dùng

Hệ thống có 4 vai trò:
- admin: Quản trị toàn bộ hệ thống.
- manager: Quản lý và phê duyệt nghiệp vụ.
- warehouse: Quản lý kho, xuất nhập và bàn giao.
- employee: Xem tài sản được giao và gửi yêu cầu.

Admin tạo tài khoản. Không có đăng ký công khai.

## 4. Phạm vi nghiệp vụ

Hệ thống gồm 12 phân hệ:

1. Dashboard
2. Quản lý tài sản
3. Quản lý thiết bị
4. Quản lý cơ sở vật chất
5. Quản lý danh mục
6. Nhập kho
7. Xuất kho và bàn giao
8. Điều chuyển
9. Bảo trì và sửa chữa
10. Kiểm kê
11. Báo cáo thống kê
12. Quản lý người dùng

Quản lý:
- Một doanh nghiệp DevMaster.
- Một kho chính.
- Tòa nhà, tầng, phòng, khu vực.
- Tài sản thuộc sở hữu DevMaster.
- Cấp phát lâu dài và mượn ngắn hạn.
- Quy trình phê duyệt bởi Manager hoặc Admin.

Tính năng nâng cao:
- Thông báo sắp hết bảo hành.
- Cảnh báo hỏng và cần bảo trì.
- Lịch sử hoạt động tài sản.
- Tìm kiếm và lọc nâng cao.

Chưa cần QR Code, xuất Excel/PDF và quản lý nhiều doanh nghiệp.

## 5. Tiến độ hiện tại

Đã triển khai cơ bản:
- Frontend React + TypeScript + Tailwind.
- Backend Express.
- Kết nối MongoDB.
- User Model.
- Authentication bằng JWT.
- API đăng nhập.
- API lấy thông tin tài khoản.
- API đổi mật khẩu.
- Seed tài khoản Admin.
- Middleware xác thực và phân quyền.
- Module Users: Model, Service, Controller, Routes, Validator.

Đã kiểm thử thành công một số API:
- POST /api/v1/auth/login
- GET /api/v1/auth/me
- PATCH /api/v1/auth/change-password
- GET /api/v1/users
- GET /api/v1/users/:id
- POST /api/v1/users

Các API Users khác vẫn cần kiểm thử kỹ.

Database đã được thiết kế sơ bộ với 26 Collection, nhưng chưa triển khai tất cả.

Các phần còn lại của Backend và giao diện quản trị chưa hoàn thiện.

## 6. Quy định khi lập trình

- Đọc mã nguồn thực tế trước khi sửa.
- Không tạo lại project.
- Không xóa những chức năng đang chạy tốt.
- Giữ kiến trúc Backend theo modules.
- Tách Controller, Service, Model, Routes, Validator.
- Kiểm tra JWT và phân quyền ở Backend.
- Kiểm tra dữ liệu đầu vào bằng Zod.
- Mật khẩu phải được hash trước khi lưu.
- Không trả password hash ra API.
- Không xóa dữ liệu quan trọng khi chưa được cho phép.
- Không đưa file .env hoặc bí mật lên GitHub.
- Không tự động sửa dữ liệu MongoDB thực tế khi chưa được đồng ý.
- Kiểm thử chức năng sau khi sửa.
- Giải thích bằng tiếng Việt.
- Ưu tiên hướng dẫn và triển khai từng module hoàn chỉnh.

## 7. Phương pháp phát triển

Database → Backend API → Frontend → Kết nối → Kiểm thử.

Trước khi thay đổi lớn:
1. Đọc cấu trúc dự án.
2. Kiểm tra code hiện có.
3. Xác định phần đã hoàn thành và phần còn thiếu.
4. Đề xuất kế hoạch.
5. Chỉ triển khai những thay đổi được yêu cầu.

## 8. Công việc tiếp theo

Ưu tiên hoàn thiện Module Users:
- Kiểm tra Validator.
- Kiểm thử cập nhật, khóa, mở khóa, xóa mềm.
- Kiểm thử RBAC.
- Bảo vệ tài khoản Admin cuối cùng.
- Xử lý lỗi dữ liệu trùng.
- Kiểm tra tài khoản và dữ liệu liên kết.

Sau đó xây dựng giao diện đăng nhập và quản lý người dùng.
