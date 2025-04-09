# Hướng dẫn triển khai mạng xã hội với Netlify, Supabase và Railway

Tài liệu này hướng dẫn cách triển khai ứng dụng mạng xã hội của bạn sử dụng:
- **Netlify** cho frontend Next.js
- **Supabase** cho cơ sở dữ liệu
- **Railway** cho máy chủ Socket.IO

## Bước 1: Cài đặt cơ sở dữ liệu Supabase

1. Đăng nhập vào Supabase
   - Truy cập https://app.supabase.com/
   - Đăng nhập hoặc đăng ký tài khoản mới

2. Tạo dự án mới
   - Nhấn "New Project"
   - Đặt tên dự án (ví dụ: "social-network")
   - Đặt mật khẩu cho cơ sở dữ liệu
   - Chọn region gần vị trí của bạn
   - Nhấn "Create new project"

3. Thực thi script SQL để tạo bảng
   - Vào "SQL Editor" trong menu bên trái
   - Nhấn "New Query"
   - Dán nội dung từ file `migrations/0001_initial.sql`
   - Nhấn "Run" để thực thi

4. Lấy thông tin kết nối
   - Vào "Project Settings" > "API"
   - Lưu lại các thông tin sau:
     - URL: `https://rcdshlqlypmykrvrjmpd.supabase.co`
     - anon key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjZHNobHFseXBteWtydnJqbXBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzMTM0NjQsImV4cCI6MjA1Nzg4OTQ2NH0.lMi-BM9scyVMlAuHgreccvO0x8QRzjFEcs-c8n1-VJk`

## Bước 2: Triển khai máy chủ Socket.IO trên Railway

1. Đăng ký tài khoản Railway
   - Truy cập https://railway.app/
   - Đăng nhập bằng GitHub hoặc tạo tài khoản mới

2. Tạo dự án mới
   - Nhấn "New Project"
   - Chọn "Deploy from GitHub repo"
   - Kết nối với GitHub repository của bạn
   - Chọn repository chứa mã nguồn

3. Cấu hình triển khai
   - Railway sẽ tự động phát hiện file `socket-server.js`
   - Cấu hình các biến môi trường:
     - `JWT_SECRET`: Một chuỗi ngẫu nhiên dùng để mã hóa JWT (phải giống với Netlify)
     - `PORT`: 3001 (hoặc để Railway tự động cấu hình)

4. Triển khai
   - Railway sẽ tự động triển khai khi phát hiện thay đổi trong repository
   - Sau khi triển khai, lưu lại URL của dịch vụ (ví dụ: `https://your-app-name.up.railway.app`)

## Bước 3: Triển khai frontend trên Netlify

1. Đăng nhập vào Netlify
   - Truy cập https://app.netlify.com/
   - Đăng nhập bằng tài khoản GitHub của bạn

2. Tạo site mới từ GitHub
   - Nhấn "Add new site" > "Import an existing project"
   - Chọn "GitHub" làm nguồn triển khai
   - Cấp quyền truy cập cho Netlify nếu được yêu cầu
   - Chọn repository của bạn

3. Cấu hình triển khai
   - Netlify sẽ tự động phát hiện cấu hình từ file `netlify.toml`
   - Kiểm tra các cài đặt:
     - Build command: `npm run build`
     - Publish directory: `.next`
   - Nhấn "Deploy site"

4. Cấu hình biến môi trường
   - Sau khi site được tạo, vào "Site settings" > "Environment variables"
   - Thêm các biến môi trường sau:
     - `JWT_SECRET`: Một chuỗi ngẫu nhiên dùng để mã hóa JWT (phải giống với Railway)
     - `NEXT_PUBLIC_SOCKET_URL`: URL của máy chủ Socket.IO trên Railway
     - `NEXT_PUBLIC_SUPABASE_URL`: `https://rcdshlqlypmykrvrjmpd.supabase.co`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjZHNobHFseXBteWtydnJqbXBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzMTM0NjQsImV4cCI6MjA1Nzg4OTQ2NH0.lMi-BM9scyVMlAuHgreccvO0x8QRzjFEcs-c8n1-VJk`

## Bước 4: Cấu hình CORS và bảo mật

1. Cấu hình CORS trên Railway
   - Mở file `socket-server.js`
   - Cập nhật cấu hình CORS để chấp nhận domain của Netlify:
     ```javascript
     const io = new Server(server, {
       cors: {
         origin: 'https://your-netlify-app.netlify.app',
         methods: ['GET', 'POST']
       }
     });
     ```

2. Cấu hình CORS trên Supabase
   - Vào "Project Settings" > "API" > "CORS"
   - Thêm domain của Netlify vào danh sách "Allowed origins"

## Bước 5: Kiểm tra và xử lý lỗi

1. Kiểm tra kết nối Supabase
   - Đăng ký tài khoản mới trên ứng dụng
   - Kiểm tra xem dữ liệu có được lưu vào Supabase không
   - Nếu có lỗi, kiểm tra console và logs

2. Kiểm tra kết nối Socket.IO
   - Đăng nhập và mở trang tin nhắn
   - Kiểm tra xem kết nối Socket.IO có thành công không
   - Gửi tin nhắn giữa hai tài khoản để kiểm tra tính năng realtime

3. Xử lý lỗi phổ biến
   - CORS: Kiểm tra cấu hình CORS trên cả Railway và Supabase
   - Kết nối: Kiểm tra URL và khóa API của Supabase
   - Xác thực: Kiểm tra JWT_SECRET giống nhau trên cả Netlify và Railway

## Cấu trúc mã nguồn

- `src/lib/supabase.ts`: Cấu hình kết nối Supabase
- `src/lib/socket.ts`: Client Socket.IO kết nối với Railway
- `socket-server.js`: Máy chủ Socket.IO để triển khai trên Railway
- `migrations/0001_initial.sql`: Script SQL để tạo bảng trong Supabase

## Lưu ý quan trọng

1. **Bảo mật**
   - Không chia sẻ khóa API Supabase hoặc JWT_SECRET
   - Sử dụng biến môi trường cho các thông tin nhạy cảm

2. **Hiệu suất**
   - Railway có giới hạn về tài nguyên trong gói miễn phí
   - Supabase có giới hạn về số lượng request trong gói miễn phí

3. **Triển khai liên tục**
   - Cấu hình Netlify và Railway để tự động triển khai khi có thay đổi trong repository
   - Kiểm tra kỹ trước khi đẩy code lên GitHub

## Tài nguyên bổ sung

- [Tài liệu Netlify Next.js](https://docs.netlify.com/integrations/frameworks/next-js/)
- [Tài liệu Supabase](https://supabase.com/docs)
- [Tài liệu Railway](https://docs.railway.app/)
- [Tài liệu Socket.IO](https://socket.io/docs/)
