# Bảo mật Authentication và Users — Giai đoạn 1

## Tương thích dữ liệu

- `users.tokenVersion` là số nguyên không âm, mặc định `0`, không được trả trong dữ liệu người dùng. Document cũ chưa có trường này được đọc như phiên bản `0`; không cần chạy migration hoặc cập nhật hàng loạt.
- JWT mới chứa `tokenVersion`. JWT cũ không có claim này chỉ được chấp nhận khi tài khoản vẫn ở phiên bản `0` và token không được phát trước/cùng giây với `passwordChangedAt` đã có. Nếu không thỏa điều kiện, người dùng đăng nhập lại.
- Đổi mật khẩu cập nhật hash, `mustChangePassword`, `passwordChangedAt` và `$inc: { tokenVersion: 1 }` trong cùng một lệnh ghi nguyên tử. Điều kiện hash và phiên bản cũ ngăn hai lần đổi mật khẩu đồng thời ghi đè nhau. MongoDB tự tạo trường còn thiếu với giá trị `1` trong thao tác này.
- Đăng nhập/cập nhật hồ sơ không dùng `save()` trên bản sao tài khoản đã đọc, tránh ghi lại mặc định cũ khi một yêu cầu khác đang đổi mật khẩu.
- Mật khẩu **mới** phải có ít nhất 8 ký tự, không chỉ chứa khoảng trắng và tối đa 72 byte UTF-8. Không trim/cắt mật khẩu. Đăng nhập và `currentPassword` vẫn nhận tối đa 128 ký tự theo dữ liệu cũ để người dùng chuyển sang mật khẩu mới. Không tự động đổi hash hiện có.
- `mustChangePassword` chưa bằng `false` sẽ bị chặn tại API Users bằng HTTP 403 và mã `PASSWORD_CHANGE_REQUIRED`. Login, `/auth/me` và `/auth/change-password` vẫn dùng được. Module nghiệp vụ mới phải gắn cả `authenticate` và `requirePasswordChanged` trước phân quyền.
- URL API, phương thức và các trường phản hồi hiện có được giữ. Một số lỗi bổ sung trường `code`. Phân trang nhận `page` từ 1 đến 100000, `limit` từ 1 đến 100; ngoài giới hạn trả 400, mặc định 1/10.

## Bảo vệ Admin và thao tác đồng thời

Tất cả thao tác tạo/cập nhật/trạng thái/xóa mềm của Users dùng cùng một khóa trong `system_locks`, `_id: users-mutations`. Đây là collection kỹ thuật mới; mã không tạo collection khi import hoặc khởi động. Bản ghi chỉ được tạo khi một API ghi Users thực sự được gọi. Không có migration hay lệnh seed tự động.

MongoDB bảo đảm `_id` duy nhất. Chỉ tiến trình chèn được bản ghi khóa mới được đọc lại quyền người thao tác, đếm Admin hoạt động và ghi thay đổi. Các lần đọc xác thực/kiểm tra bất biến dùng primary; lệnh ghi khóa/người dùng dùng write concern `majority`. Chỉ chủ sở hữu khóa mới được giải phóng nó. Cơ chế không dựa vào mutex trong RAM và dùng được với standalone hoặc replica set. Mọi tiến trình ứng dụng phải chạy cùng phiên bản mới và mọi đường thay đổi vai trò/trạng thái/xóa người dùng phải đi qua service này; sửa trực tiếp database không được bảo vệ.

Admin hoạt động là `role=admin`, `status=active`, `isDeleted=false`. Không cho thay đổi làm số lượng này về 0. Tự khóa/ngừng hoạt động/mở khóa/xóa bị chặn bằng so sánh ObjectId chuẩn hóa. Tự hạ quyền chỉ được phép khi còn Admin hoạt động khác. Người thao tác được kiểm tra quyền lại sau khi lấy khóa.

### Giới hạn vận hành và khôi phục khóa

Khóa **không có TTL** và không bị tự cướp sau timeout. Hết hạn khóa giữa một lệnh ghi còn chạy có thể cho hai tiến trình cùng xóa Admin cuối cùng.

- Khóa bận quá 2 giây: HTTP 503, `USER_MUTATION_BUSY`; không có ghi Users mới.
- Ghi thành công hoặc lỗi chắc chắn chưa ghi (ví dụ duplicate key/validation): giải phóng khóa.
- Tiến trình chết hoặc mất phản hồi ghi: có thể giữ khóa. HTTP 503 `USER_WRITE_UNCERTAIN` nếu tiến trình còn trả được lỗi; không tự retry thao tác ghi nghiệp vụ.
- Lỗi lấy/giải phóng khóa: HTTP 503 với `USER_LOCK_UNAVAILABLE` hoặc `USER_LOCK_RELEASE_FAILED`.

Nếu khóa bị giữ sau sự cố, cần người vận hành xử lý thủ công: dừng toàn bộ tiến trình ghi Users, xác nhận không còn lệnh ghi đang chạy, kiểm tra kết quả thao tác và còn ít nhất một Admin hoạt động, rồi mới giải phóng đúng bản ghi khóa theo `_id` và `owner` đã kiểm tra. Chỉ khởi động lại các tiến trình sau khi xác nhận trạng thái. Không cung cấp tác vụ tự xóa khóa và không chạy quy trình này trong đợt triển khai mã nguồn.

Đây là đánh đổi ưu tiên tính đúng đắn trên MongoDB standalone. Hệ thống có thể tạm ngừng ghi Users sau sự cố thay vì mạo hiểm mất Admin. Khi cần tự phục hồi và thông lượng cao hơn, có thể chuyển sang transaction trên replica set với bản ghi đồng bộ chung.

Lần rà soát tiếp theo giữ nguyên thuật toán khóa này. Các bài test mô phỏng khóa còn lại từ tiến trình cũ, mất phản hồi sau khi đã ghi, giải phóng khóa thất bại và owner thay đổi đều yêu cầu chặn thao tác tiếp theo. Chưa có bằng chứng kiểm thử trên replica set để thay bằng cơ chế tự phục hồi; không thêm TTL, tự xóa khóa lúc khởi động hoặc chỉ dùng mutex trong bộ nhớ.

Khi nhận `USER_WRITE_UNCERTAIN` hoặc `USER_LOCK_RELEASE_FAILED`, thay đổi trước đó **có thể đã được ghi**. Không gửi lại thao tác tạo/sửa/xóa ngay lập tức; kiểm tra kết quả trong quy trình khôi phục nói trên. Không xóa cả collection `system_locks` và không giải phóng khóa chỉ dựa vào `acquiredAt` đã cũ. Nếu database vốn đã không còn Admin hoạt động, bản vá không tự tạo tài khoản hoặc sửa dữ liệu để khôi phục.

## Lỗi và log

- Duplicate key `11000` trả 409, không trả `keyValue` hoặc message database.
- JSON lỗi, Zod/Mongoose validation và CastError trả 400 với thông báo an toàn.
- Logger chỉ ghi ngữ cảnh cố định, HTTP status, loại lỗi cho phép và mã database dạng số. Không ghi request body, Authorization, mật khẩu, stack/message/cause thô hoặc URI kết nối.
- Script seed dùng chính sách mật khẩu chung trước khi kết nối; không chạy script đó trong kiểm thử.

## Khởi động và triển khai

- Lệnh chạy thông thường vẫn là `npm start` hoặc `npm run dev` trong thư mục `backend` (PowerShell có thể dùng `npm.cmd`). Không cần chạy seed hay migration trước khi khởi động.
- `server.js` chỉ đọc `.env` và tự khởi động khi được chạy trực tiếp. Hàm `startServer` được export để kiểm thử mà không kết nối database khi import. HTTP chỉ mở sau khi kết nối MongoDB thành công.
- Lỗi kết nối được chuyển về luồng khởi động; lỗi cổng bị chiếm được bắt qua sự kiện `error` của HTTP server. Khi khởi động trực tiếp thất bại, tiến trình ghi metadata an toàn, đóng kết nối MongoDB đã mở và kết thúc với mã lỗi `1`.
- Trước khi triển khai, kiểm tra cấu hình hiện có (`MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `CLIENT_URL`) và khả năng truy cập MongoDB. Không thay đổi `JWT_SECRET` nếu muốn giữ khả năng tương thích các phiên đăng nhập cũ; đổi mật khẩu vẫn thu hồi token bằng `tokenVersion`.
- Dừng các tiến trình chạy mã cũ trước khi khởi động phiên bản mới. Tài khoản database cần quyền đọc/ghi collection `system_locks` bên cạnh `users`; collection khóa chỉ được tạo khi có API ghi Users. Nếu chưa từng gặp sự cố giữ khóa, không có thao tác thủ công trên dữ liệu cần thực hiện.
- Sau khi người dùng đổi mật khẩu thành công, client phải bỏ JWT cũ và đăng nhập lại. Không cần thay đổi URL hay cấu trúc thành công của API. Thu hồi token chặn các lần xác thực tiếp theo; không hủy hồi tố yêu cầu đã vượt qua xác thực trước thời điểm đổi mật khẩu.

## Kiểm thử

Trong thư mục `backend`, chạy `npm test` bằng Node.js 24 hoặc mới hơn tương thích `node:test`.

Nếu PowerShell chặn `npm.ps1`, chạy `npm.cmd test`; không cần thay đổi Execution Policy.

Bộ test không đọc `.env`. Helper chặn `mongoose.connect`, `createConnection`, `openUri` và `MongoClient.connect`, đồng thời tắt buffering. Các thao tác lưu trữ của User Model và collection khóa được thay bằng kho dữ liệu trong bộ nhớ; schema Mongoose, JWT và bcrypt vẫn chạy thật. Các bài HTTP mở server loopback `127.0.0.1` với cổng ngẫu nhiên và đóng sau mỗi bài.

`startup.test.js` gọi hàm khởi động thực tế của `server.js`, thay riêng `mongoose.connect` bằng kết quả giả, kiểm tra health/login/me/users qua HTTP, thứ tự kết nối rồi mở HTTP, lỗi kết nối và lỗi cổng bị chiếm. URI trong test luôn là địa chỉ giả `mongodb://127.0.0.1:1/devmaster_test_disabled`; không kết nối MongoDB và không dùng tài khoản thật.

Kiểm thử bao gồm JWT cũ/mới, thu hồi token, mật khẩu cũ, đổi mật khẩu đồng thời, bắt buộc đổi mật khẩu, ma trận bốn vai trò, Admin cuối cùng, thao tác chéo đồng thời, ObjectId hoa/thường, dữ liệu trùng, phân trang, log nhạy cảm và tình huống giữ khóa sau mất phản hồi ghi.

Mock kiểm tra logic ứng dụng và HTTP thật, không thay thế kiểm thử failover/độ bền ghi trên MongoDB thật. Không dùng database `devmaster` trong kiểm thử; chưa xác minh khởi động với MongoDB thật hoặc thử dừng tiến trình giữa lệnh ghi thật. Cần kiểm thử các tình huống này bằng database test riêng trước khi triển khai thực tế. Kiểm tra phòng ban/chức vụ tồn tại và tài sản liên kết khi xóa người dùng vẫn thuộc phần nghiệp vụ tiếp theo.

### Kết quả đã chạy ngày 18/11/2026

Môi trường Windows, Node.js `v24.21.0`, lệnh `npm.cmd test`: **55 bài đạt, 0 lỗi, 0 bỏ qua**, thời gian khoảng 19,76 giây.

| Nhóm | Số bài |
| --- | ---: |
| Authentication/JWT/mật khẩu | 15 |
| Xử lý lỗi và log | 4 |
| HTTP Authentication/Users và ma trận phân quyền | 5 |
| Khởi động Backend với MongoDB giả | 5 |
| Users, Admin cuối cùng và khóa ghi | 21 |
| Validation | 5 |

`node --check` đạt trên 33 file JavaScript trong `src`, `scripts`, `tests`. Oxlint chạy bằng bản đã có trong workspace, không cài thêm dependency: 33 file, không có chẩn đoán lỗi. `git diff --check` không báo lỗi khoảng trắng. Không chạy seed, không kết nối database thật, không chỉnh Frontend, không commit hoặc push.
