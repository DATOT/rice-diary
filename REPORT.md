Công nghệ và ứng dụng được sử dụng trong dự án

Dự án Nhật Ký Cây Lúa (DATOT/rice-diary) là ứng dụng ghi chép và theo dõi tình trạng cây lúa. Dựa trên cấu trúc mã nguồn, ứng dụng kết hợp giao diện viết bằng công nghệ web với phần lõi Tauri/Rust, đồng thời tích hợp cơ sở dữ liệu cục bộ và các chức năng phân tích ảnh. README cho biết dự án khởi tạo từ Next.js; tuy nhiên, các thành phần hiện có trong mã nguồn mở rộng hơn một ứng dụng Next.js mẫu.
Công nghệ phát triển
Thành phần Công nghệ trong repo Vai trò
Giao diện và điều hướng TypeScript, React 19, Next.js 16 Xây dựng các màn hình nhật ký, ghi chú, chụp ảnh, cài đặt và thống kê.
Ứng dụng đa nền tảng Tauri 2, Rust Đóng gói giao diện web thành ứng dụng máy tính/di động và cung cấp các chức năng gốc như truy cập tệp, camera, thông báo và cơ sở dữ liệu.
Lưu trữ dữ liệu SQLite, thông qua Tauri SQL plugin Lưu nhật ký cây, ghi chú theo ngày, ảnh lá và kết quả phân tích trên thiết bị. Cấu trúc dữ liệu và các bước cập nhật được quản lý bằng tệp SQL và migrations.
Giao diện và kiểu dáng Tailwind CSS 4, daisyUI 5 Xây dựng bố cục và các thành phần giao diện.
Biểu đồ và minh họa Recharts, React Icons Trình bày thống kê và các biểu tượng trong giao diện.
Phân tích ảnh thiếu hụt đạm ONNX Runtime qua Rust (ort), cùng image và ndarray Đọc, xử lý ảnh lá và chạy mô hình ONNX được đóng gói trong ứng dụng.
Nhận diện bệnh Roboflow Serverless API Gửi ảnh lá đến dịch vụ trực tuyến để nhận các dự đoán về vùng bệnh và độ tin cậy.
Chức năng thiết bị Các plugin Tauri về camera, tệp, hộp thoại, thông báo, hệ điều hành và HTTP Kết nối giao diện với các khả năng của thiết bị và hệ điều hành.

Các phiên bản và thư viện được khai báo trong package.json, còn cấu hình ứng dụng Tauri, các plugin Rust và thư viện phân tích ảnh được thể hiện trong src-tauri/Cargo.toml và src-tauri/tauri.conf.json.
Các chức năng thể hiện trong mã nguồn

Mã nguồn cho thấy ứng dụng hỗ trợ tạo và quản lý nhật ký cho cây, thêm ghi chú theo ngày, lưu suy nghĩ và ảnh, đồng thời theo dõi chuỗi ngày chăm sóc. Người dùng có thể chụp ảnh lá trực tiếp bằng camera hoặc lưu ảnh vào ứng dụng. Các chức năng này được triển khai ở những khu vực như app/diary/DiaryPage.tsx và app/camera/page.tsx.

Dự án sử dụng hai hướng xử lý ảnh khác nhau. Thứ nhất, ảnh lá được phân tích bằng mô hình ONNX được tải trong ứng dụng Rust; phần xử lý ảnh và suy luận được định nghĩa trong src-tauri/src/nitrogen.rs. Thứ hai, chức năng nhận diện bệnh gửi ảnh đến dịch vụ Roboflow qua mạng, như thể hiện trong app/lib/services/ai.ts. Vì vậy, không nên mô tả toàn bộ chức năng phân tích ảnh là chạy ngoại tuyến: phần suy luận ONNX được thực hiện trong ứng dụng, còn nhận diện bệnh phụ thuộc vào dịch vụ trực tuyến.

Dữ liệu nhật ký, ghi chú và ảnh phân tích được quản lý qua SQLite. Các thao tác truy vấn, thêm và cập nhật dữ liệu nằm trong app/lib/services/database.ts, còn lược đồ và cập nhật cơ sở dữ liệu nằm trong thư mục src-tauri/database. Ứng dụng cũng có màn hình thống kê các chỉ số như số ghi chú, số lá đã phân tích, xu hướng thiếu hụt đạm và kết quả nhận diện bệnh; phần biểu đồ được triển khai trong app/charts/page.tsx. Mã nguồn còn có chức năng gửi lời nhắc chăm sóc và mẹo chăm sóc cây qua thông báo, được thể hiện trong app/components/NotificationScheduler.tsx.
Đoạn viết tham khảo cho báo cáo

    Dự án Nhật Ký Cây Lúa được xây dựng theo mô hình kết hợp giữa giao diện web và ứng dụng đa nền tảng. Phần giao diện sử dụng TypeScript, React và Next.js; phần đóng gói ứng dụng và tích hợp chức năng thiết bị sử dụng Tauri 2 cùng Rust. Tailwind CSS và daisyUI được dùng để xây dựng giao diện, trong khi Recharts hỗ trợ trực quan hóa dữ liệu. SQLite được sử dụng để lưu trữ cục bộ thông tin nhật ký, ghi chú và kết quả phân tích. Về xử lý ảnh, dự án tích hợp mô hình ONNX chạy thông qua ONNX Runtime để phân tích tình trạng thiếu hụt đạm, đồng thời sử dụng Roboflow Serverless API cho chức năng nhận diện bệnh qua mạng. Các chức năng chính thể hiện trong mã nguồn gồm quản lý nhật ký cây theo ngày, chụp và lưu ảnh lá, theo dõi chuỗi chăm sóc, hiển thị thống kê và gửi thông báo nhắc nhở.

Lưu ý khi đưa vào báo cáo: mã nguồn tính điểm từ mô hình ONNX rồi trả về giá trị 100 - điểm tại src-tauri/src/nitrogen.rs. Do đó, cần đối chiếu cách diễn giải “điểm thiếu hụt đạm” với cách ứng dụng hiển thị trước khi mô tả ý nghĩa chính xác của thang điểm. Ngoài ra, mã nguồn nhận diện bệnh có thông tin xác thực dịch vụ; nên chuyển thông tin này sang cấu hình an toàn và không đưa khóa truy cập vào báo cáo hoặc bản phát hành công khai.
