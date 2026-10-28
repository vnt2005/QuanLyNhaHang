TRƯỜNG ĐẠI HỌC THÁI BÌNH DƯƠNG
KHOA CÔNG NGHỆ THÔNG TIN VÀ BÁN DẪN

BÁO CÁO ĐỒ ÁN CHUYÊN NGÀNH
XÂY DỰNG HỆ THỐNG QUẢN LÝ NHÀ HÀNG

| Giảng viên hướng dẫn | ThS. Nguyễn Văn Tự |
| :--- | :--- |
| Mã số sinh viên | 230481 |
| Họ và tên | Võ Nguyễn Thanh |
| Ngành | Công Nghệ Thông Tin |
| Khoa/Lớp | CNTT/23DTHA1 |

---

# MỤC LỤC

- [ĐÁNH GIÁ CỦA GIẢNG VIÊN HƯỚNG DẪN](#đánh-giá-của-giảng-viên-hướng-dẫn)
- [LỜI CẢM ƠN](#lời-cảm-ơn)
- [LỜI CAM ĐOAN](#lời-cam-đoan)
- [LỜI MỞ ĐẦU](#lời-mở-đầu)
- [CHƯƠNG 1. TỔNG QUAN ĐỀ TÀI](#chương-1-tổng-quan-đề-tài)
  - [1.1. Lý do chọn đề tài](#11-lý-do-chọn-đề-tài)
  - [1.2. Mục tiêu đề tài](#12-mục-tiêu-đề-tài)
  - [1.3. Phạm vi chức năng](#13-phạm-vi-chức-năng)
  - [1.4. Đối tượng sử dụng](#14-đối-tượng-sử-dụng)
  - [1.5. Công nghệ sử dụng](#15-công-nghệ-sử-dụng)
- [CHƯƠNG 2. PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG](#chương-2-phân-tích-và-thiết-kế-hệ-thống)
  - [2.1. Phân tích yêu cầu hệ thống](#21-phân-tích-yêu-cầu-hệ-thống)
  - [2.2. Phân tích tác nhân và phân quyền](#22-phân-tích-tác-nhân-và-phân-quyền)
  - [2.3. Phân tích các quy trình nghiệp vụ chính](#23-phân-tích-các-quy-trình-nghiệp-vụ-chính)
  - [2.4. Thiết kế trạng thái nghiệp vụ](#24-thiết-kế-trạng-thái-nghiệp-vụ)
  - [2.5. Thiết kế kiến trúc hệ thống](#25-thiết-kế-kiến-trúc-hệ-thống)
  - [2.6. Thiết kế cơ sở dữ liệu](#26-thiết-kế-cơ-sở-dữ-liệu)
  - [2.7. Thiết kế API và tổ chức use case](#27-thiết-kế-api-và-tổ-chức-use-case)
  - [2.8. Thiết kế bảo mật và độ tin cậy](#28-thiết-kế-bảo-mật-và-độ-tin-cậy)
  - [2.9. Thiết kế giao diện người dùng](#29-thiết-kế-giao-diện-người-dùng)
- [CHƯƠNG 3. CÀI ĐẶT VÀ HIỆN THỰC HỆ THỐNG](#chương-3-cài-đặt-và-hiện-thực-hệ-thống)
  - [3.1. Môi trường phát triển và tổ chức mã nguồn](#31-môi-trường-phát-triển-và-tổ-chức-mã-nguồn)
  - [3.2. Hiện thực Backend ASP.NET Core](#32-hiện-thực-backend-aspnet-core)
  - [3.3. Hiện thực Cơ sở dữ liệu và Tính toàn vẹn](#33-hiện-thực-cơ-sở-dữ-liệu-và-tính-toàn-vẹn)
  - [3.4. Hiện thực Xác thực, Bảo mật và Chống lạm dụng](#34-hiện-thực-xác-thực-bảo-mật-và-chống-lạm-dụng)
  - [3.5. Hiện thực các Dịch vụ Tích hợp Chuyên sâu](#35-hiện-thực-các-dịch-vụ-tích-hợp-chuyên-sâu)
  - [3.6. Xây dựng và Kết quả Giao diện Ứng dụng Quản trị (Admin Web)](#36-xây-dựng-và-kết-quả-giao-diện-ứng-dụng-quản-trị-admin-web)
  - [3.7. Xây dựng và Kết quả Giao diện Website Khách hàng (CustomerWeb)](#37-xây-dựng-và-kết-quả-giao-diện-website-khách-hàng-customerweb)
  - [3.8. Đóng gói và Triển khai hệ thống bằng Docker Compose](#38-đóng-gói-và-triển-khai-hệ-thống-bằng-docker-compose)
  - [3.9. Phân tích Luồng Kỹ thuật Hoàn chỉnh & Đánh giá](#39-phân-tích-luồng-kỹ-thuật-hoàn-chỉnh--đánh-giá)
- [CHƯƠNG 4. KIỂM THỬ VÀ ĐÁNH GIÁ CHẤT LƯỢNG](#chương-4-kiểm-thử-và-đánh-giá-chất-lượng)
  - [4.1. Mục tiêu và phạm vi kiểm thử](#41-mục-tiêu-và-phạm-vi-kiểm-thử)
  - [4.2. Chiến lược kiểm thử nhiều lớp](#42-chiến-lược-kiểm-thử-nhiều-lớp)
  - [4.3. Kiểm thử đơn vị (Unit Test)](#43-kiểm-thử-đơn-vị-unit-test)
  - [4.4. Kiểm thử tích hợp các luồng nghiệp vụ (Integration Test)](#44-kiểm-thử-tích-hợp-các-luồng-nghiệp-vụ-integration-test)
  - [4.5. Kiểm thử Frontend và trải nghiệm người dùng](#45-kiểm-thử-frontend-và-trải-nghiệm-người-dùng)
  - [4.6. Kiểm thử CI, Migration và Môi trường triển khai](#46-kiểm-thử-ci-migration-và-môi-trường-triển-khai)
  - [4.7. Hạn chế và hướng cải tiến kiểm thử](#47-hạn-chế-và-hướng-cải-tiến-kiểm-thử)
- [CHƯƠNG 5. KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN](#chương-5-kết-luận-và-hướng-phát-triển)
  - [5.1. Tổng kết kết quả của đề tài](#51-tổng-kết-kết-quả-của-đề-tài)
  - [5.2. Những kết quả đạt được](#52-những-kết-quả-đạt-được)
  - [5.3. Đánh giá mức độ hoàn thành mục tiêu](#53-đánh-giá-mức-độ-hoàn-thành-mục-tiêu)
  - [5.4. Hạn chế của hệ thống](#54-hạn-chế-của-hệ-thống)
  - [5.5. Hướng phát triển](#55-hướng-phát-triển)
  - [5.6. Kết luận chung](#56-kết-luận-chung)
- [TÀI LIỆU THAM KHẢO](#tài-liệu-tham-khảo)
- [NHẬT KÝ THỰC HIỆN](#nhật-ký-thực-hiện)

---

# ĐÁNH GIÁ CỦA GIẢNG VIÊN HƯỚNG DẪN

**I. Nhận xét:**  
................................................................................................................................................  
................................................................................................................................................  
................................................................................................................................................  
................................................................................................................................................  
................................................................................................................................................  

**II. Điểm đánh giá:** .................... *(sử dụng thang điểm 10)*

**NGƯỜI ĐÁNH GIÁ**  
*(Ký và ghi rõ họ tên)*  
**ThS. Nguyễn Văn Tự**

---

# LỜI CẢM ƠN

Để hoàn thành đồ án chuyên ngành với đề tài **“Xây dựng hệ thống Quản Lý Nhà Hàng”**, bên cạnh sự nỗ lực và cố gắng của bản thân, em đã nhận được sự quan tâm, chỉ bảo tận tình và giúp đỡ quý báu từ quý Thầy Cô.

Lời đầu tiên, em xin gửi lời cảm ơn chân thành và sâu sắc nhất đến Thầy, Cô giáo thuộc Khoa Công nghệ Thông tin và Bán dẫn. Trong suốt quá trình học tập và rèn luyện tại trường, quý Thầy Cô đã tận tâm giảng dạy, truyền đạt những kiến thức chuyên môn nền tảng vững chắc và hiện đại, đồng thời luôn tạo điều kiện thuận lợi nhất để em trau dồi kỹ năng lập trình, tư duy phân tích thiết kế hệ thống và phát triển năng lực nghiên cứu độc lập.

Đặc biệt, em xin bày tỏ lòng biết ơn sâu sắc nhất tới **ThS. Nguyễn Văn Tự** – Giảng viên hướng dẫn trực tiếp đồ án này. Thầy đã tận tình hướng dẫn, chỉ ra những hạn chế và gợi mở các giải pháp kỹ thuật tối ưu trong từng giai đoạn phát triển. Những lời chỉ dạy, động viên và góp ý quý báu của Thầy là kim chỉ nam quan trọng giúp em hoàn thành tốt đồ án này.

Dù bản thân đã dành nhiều thời gian và tâm huyết để xây dựng hệ thống, song do kiến thức và kinh nghiệm thực tế còn những hạn chế nhất định, đồ án chắc chắn khó tránh khỏi những thiếu sót. Em rất mong nhận được những ý kiến đóng góp, nhận xét và chỉ bảo quý báu từ quý Thầy Cô để hệ thống được hoàn thiện hơn nữa và có thể ứng dụng hiệu quả vào công tác vận hành thực tế.

Em xin chân thành cảm ơn!

*Khánh Hòa, năm 2026*  
**Sinh viên thực hiện**  
*(Ký và ghi rõ họ tên)*  
**Võ Nguyễn Thanh**

---

# LỜI CAM ĐOAN

Đồ án chuyên ngành với đề tài **“Xây dựng hệ thống Quản Lý Nhà Hàng”** là công trình nghiên cứu, thiết kế và xây dựng phần mềm do chính bản thân tôi tự thực hiện dưới sự định hướng và hướng dẫn trực tiếp của giảng viên ThS. Nguyễn Văn Tự.

Toàn bộ các số liệu, sơ đồ kiến trúc, thiết kế cơ sở dữ liệu, quy trình nghiệp vụ và mã nguồn chương trình (backend ASP.NET Core, hai frontend React/TypeScript, hệ thống API và kịch bản kiểm thử) được trình bày trong báo cáo này là hoàn toàn trung thực, phản ánh đúng kết quả thực tế mà tôi đã xây dựng và kiểm chứng.

Các đoạn mã nguồn tham khảo, các thư viện mã nguồn mở (ASP.NET Core, Entity Framework Core, React, Vite, Tailwind CSS, MediatR, SignalR...) và các tài liệu kỹ thuật liên quan đều có nguồn gốc hợp pháp, được trích dẫn và liệt kê đầy đủ, minh bạch trong danh mục Tài liệu tham khảo.

Nội dung báo cáo đồ án này tuyệt đối không sao chép nguyên văn từ bất kỳ đồ án, khóa luận, luận văn hoặc công trình nghiên cứu nào đã được công bố của người khác trái với quy định liêm chính học thuật của Trường Đại học Thái Bình Dương.

Nếu bị phát hiện có bất kỳ sự không trung thực hay vi phạm nào về liêm chính học thuật trong đồ án này, tôi xin hoàn toàn chịu mọi hình thức kỷ luật theo đúng quy chế đào tạo của Nhà trường và quy định của pháp luật.

*Khánh Hòa, năm 2026*  
**Người cam đoan**  
*(Ký và ghi rõ họ tên)*  
**Võ Nguyễn Thanh**

---

# LỜI MỞ ĐẦU

Trong bối cảnh chuyển đổi số ngày càng phát triển, việc ứng dụng công nghệ thông tin vào hoạt động quản lý và kinh doanh đã trở thành nhu cầu thiết yếu đối với nhiều doanh nghiệp, đặc biệt trong lĩnh vực nhà hàng. Hoạt động của một nhà hàng bao gồm nhiều nghiệp vụ liên quan chặt chẽ như quản lý nhân viên, khu vực và bàn ăn, thực đơn, đơn hàng, bếp, thanh toán, hóa đơn, đặt bàn, khuyến mãi, kho nguyên liệu và báo cáo doanh thu. Nếu các nghiệp vụ này được thực hiện thủ công hoặc bằng những công cụ rời rạc, quá trình vận hành dễ phát sinh sai sót, chậm trễ và khó kiểm soát dữ liệu một cách thống nhất.

Xuất phát từ yêu cầu thực tế đó, đề tài **“Xây dựng hệ thống Quản Lý Nhà Hàng”** được thực hiện nhằm xây dựng một hệ thống quản lý tập trung trên nền tảng web, hỗ trợ đồng thời hoạt động quản trị nội bộ và tương tác với khách hàng. Hệ thống gồm ứng dụng web dành cho quản trị và nhân viên, website dành cho khách hàng và hệ thống API dùng chung để xử lý nghiệp vụ. Về kỹ thuật, backend được phát triển bằng ASP.NET Core trên .NET 10; frontend sử dụng React và TypeScript; dữ liệu được quản lý bằng Entity Framework Core và Microsoft SQL Server. Kiến trúc Clean Architecture, CQRS và MediatR được áp dụng để phân tách trách nhiệm giữa các lớp, tăng khả năng bảo trì và mở rộng hệ thống.

Bên cạnh các chức năng quản lý cốt lõi, hệ thống còn tích hợp SignalR cho thông báo thời gian thực, SePay và VietQR cho thanh toán chuyển khoản, trợ lý AI sử dụng Gemini, xác thực JWT và phân quyền theo vai trò/quyền hạn. Các cơ chế rate limiting, chống spam, idempotency, transaction, health check, Docker và kiểm thử tự động cũng được triển khai nhằm tăng độ an toàn và ổn định. Một số quy tắc nghiệp vụ thực tế được chú trọng như giới hạn số lượng món trong mỗi lần đặt, khóa thay đổi dữ liệu sau khi thanh toán, đồng bộ trạng thái giữa bếp và đơn hàng, cũng như tự động hủy đơn mang về khi món đã hoàn thành nhưng khách hàng không thanh toán trong thời gian quy định.

---

# CHƯƠNG 1. TỔNG QUAN ĐỀ TÀI

### 1.1. Lý do chọn đề tài
Trong quá trình học, em đã được học nhiều kiến thức liên quan đến lập trình, cơ sở dữ liệu, xây dựng website và phân tích thiết kế hệ thống. Vì vậy, em muốn chọn một đề tài để có thể áp dụng những gì đã học vào đồ án của mình. Nên, em quyết định chọn đề tài “Xây dựng hệ thống Quản Lý Nhà Hàng” để thực hiện đồ án chuyên ngành.

Trong quá trình thực hiện, em có cơ hội áp dụng những kiến thức đã được học vào từng phần của dự án. Kiến thức lập trình hướng đối tượng được sử dụng khi xây dựng các lớp và xử lý nghiệp vụ; kiến thức cơ sở dữ liệu được áp dụng để thiết kế các bảng và mối quan hệ giữa các dữ liệu; kiến thức lập trình web được sử dụng để xây dựng giao diện và REST API để frontend giao tiếp với backend. Ngoài ra, em còn vận dụng những kiến thức về xác thực, phân quyền, kiểm thử và xử lý lỗi để hệ thống hoạt động ổn định hơn.

Thông qua đề tài này, em mong muốn củng cố những kiến thức đã học trong quá trình học tập, đồng thời rèn luyện khả năng tự tìm hiểu và giải quyết vấn đề khi gặp những yêu cầu mới. Em cũng muốn thông qua đồ án để hiểu rõ hơn những khó khăn khi xây dựng một hệ thống có nhiều chức năng và nhiều nhóm người dùng.

### 1.2. Mục tiêu đề tài
Mục tiêu chính của đề tài là xây dựng một hệ thống quản lý nhà hàng có khả năng hỗ trợ đồng thời hoạt động quản trị, vận hành nội bộ và tương tác với khách hàng trên nền tảng web.

Hệ thống hướng tới việc số hóa các nghiệp vụ quan trọng của nhà hàng, từ quản lý tài khoản nhân viên, khu vực, bàn ăn, thực đơn, đơn hàng, bếp, thanh toán cho đến quản lý hóa đơn, đặt bàn, khuyến mãi, nguyên liệu và báo cáo doanh thu. Việc tập trung dữ liệu trong cùng một hệ thống giúp giảm sự phụ thuộc vào các phương pháp quản lý thủ công và tạo sự liên kết giữa các bộ phận trong quá trình phục vụ khách hàng.

Đối với hoạt động vận hành, hệ thống cần cho phép nhân viên tiếp nhận và xử lý đơn hàng theo trạng thái, hỗ trợ bộ phận bếp theo dõi các món cần chế biến, hỗ trợ thu ngân quản lý thanh toán và giúp quản lý theo dõi hoạt động kinh doanh thông qua bảng điều khiển và các báo cáo.

Đối với khách hàng, hệ thống hướng tới việc cung cấp một website độc lập để khách hàng có thể xem thực đơn, đặt món, đặt bàn, theo dõi trạng thái đơn hàng, nhận thông báo và thực hiện thanh toán trực tuyến. 

Một mục tiêu khác của đề tài là xây dựng hệ thống có cấu trúc rõ ràng, dễ bảo trì và có khả năng tiếp tục phát triển. Backend được phân chia thành các tầng Domain, Application, Infrastructure và API; các nghiệp vụ được tổ chức theo Command và Query thông qua CQRS và MediatR. Cách tổ chức này giúp giảm sự phụ thuộc giữa các thành phần và thuận lợi hơn cho việc kiểm thử, bảo trì và mở rộng chức năng.

Ngoài ra, đề tài còn chú trọng đến các vấn đề về bảo mật và độ tin cậy của hệ thống như xác thực người dùng bằng JWT, phân quyền dựa trên vai trò và quyền hạn, giới hạn tần suất request đối với các API cần thiết, xử lý lỗi tập trung, kiểm tra trạng thái hệ thống và bảo vệ các thông tin cấu hình nhạy cảm.

### 1.3. Phạm vi chức năng
Trong phạm vi đồ án, hệ thống được xây dựng thành ba thành phần chính gồm Backend API, Web App quản trị và vận hành nhà hàng và Website dành cho khách hàng. 
1. **Quản lý tài khoản và phân quyền:** hỗ trợ đăng nhập, xác thực người dùng, quản lý tài khoản, vai trò và quyền truy cập. Hệ thống sử dụng các vai trò Admin, Manager, Cashier, Kitchen, Staff và Customer để phân chia phạm vi sử dụng chức năng.
2. **Quản lý nhân viên và ca làm việc:** lưu trữ và quản lý thông tin nhân viên, trạng thái làm việc, vai trò nghiệp vụ, ca làm việc và phân công nhân viên theo từng ca.
3. **Quản lý khu vực và bàn ăn:** quản lý các khu vực trong nhà hàng, bàn ăn, sức chứa và trạng thái của bàn.
4. **Quản lý thực đơn:** quản lý danh mục món ăn, thông tin món ăn, giá bán và trạng thái của món.
5. **Quản lý đơn hàng:** tạo và quản lý đơn hàng, các món thuộc đơn hàng, số lượng, giá trị và trạng thái xử lý. Đơn hàng được liên kết với các bước nghiệp vụ từ tiếp nhận, chế biến, phục vụ đến thanh toán.
6. **Quản lý bếp:** cung cấp các món đang chờ chế biến, cập nhật trạng thái món ăn trong quá trình chế biến và chuyển thông tin trạng thái cho các bộ phận có liên quan.
7. **Quản lý thanh toán và hóa đơn:** hỗ trợ quản lý các giao dịch thanh toán, phương thức thanh toán, xác minh trạng thái thanh toán và lập hóa đơn. Hệ thống đồng thời hỗ trợ thanh toán chuyển khoản QR/ngân hàng thông qua SePay và sử dụng webhook để đối soát giao dịch trực tuyến.
8. **Quản lý đặt bàn:** cho phép tiếp nhận và quản lý các yêu cầu đặt bàn của khách hàng, xác nhận thông tin và cập nhật trạng thái đặt bàn.
9. **Quản lý khuyến mãi:** quản lý chương trình và mã khuyến mãi, thời gian hiệu lực, điều kiện áp dụng và việc sử dụng chương trình khuyến mãi trong quá trình thanh toán.
10. **Quản lý doanh thu và báo cáo:** tổng hợp thông tin doanh thu và giao dịch để hỗ trợ quản lý theo dõi tình hình hoạt động của nhà hàng thông qua dashboard và báo cáo.
11. **Quản lý nhật ký hoạt động:** lưu lại các hoạt động quan trọng được thực hiện trong hệ thống nhằm hỗ trợ việc theo dõi và kiểm tra các thay đổi dữ liệu.
12. **Website khách hàng:** cho phép khách hàng đăng nhập, xem thực đơn, lựa chọn món, đặt món, đặt bàn, theo dõi trạng thái đơn, nhận thông báo, sử dụng mã khuyến mãi và thực hiện thanh toán trực tuyến.
13. **Thông báo thời gian thực:** sử dụng SignalR để truyền thông báo và cập nhật trạng thái giữa hệ thống quản trị và phía khách hàng mà không yêu cầu người dùng liên tục tải lại trang.
14. **Trợ lý AI:** hệ thống có module trợ lý AI nhằm hỗ trợ việc truy vấn và khai thác thông tin nghiệp vụ trong phạm vi dữ liệu được phép truy cập.

### 1.4. Đối tượng sử dụng
* **Quản trị viên (Admin):** là người có quyền quản trị cao nhất trong hệ thống, chịu trách nhiệm quản lý tài khoản, vai trò, quyền truy cập, cấu hình và các chức năng quản trị quan trọng khác.
* **Quản lý (Manager):** là người chịu trách nhiệm theo dõi hoạt động kinh doanh và vận hành của nhà hàng. Quản lý có thể sử dụng các chức năng liên quan đến nhân viên, thực đơn, bàn ăn, đặt bàn, khuyến mãi, doanh thu và các nghiệp vụ quản lý được cấp quyền.
* **Thu ngân (Cashier):** sử dụng hệ thống để theo dõi các đơn cần thanh toán, thực hiện các nghiệp vụ thanh toán tại quầy, kiểm tra giao dịch và hóa đơn theo phạm vi quyền được cấp.
* **Nhân viên bếp (Kitchen):** sử dụng màn hình bếp để tiếp nhận danh sách món cần chế biến và cập nhật trạng thái trong quá trình chuẩn bị món ăn.
* **Nhân viên phục vụ (Staff):** sử dụng các chức năng phục vụ trực tiếp tại nhà hàng như quản lý bàn, tiếp nhận đơn hàng, cập nhật món và theo dõi trạng thái phục vụ.
* **Khách hàng (Customer):** sử dụng website khách hàng để xem thực đơn, đặt món, đặt bàn, theo dõi trạng thái đơn, nhận thông báo, sử dụng chương trình khuyến mãi và thực hiện thanh toán trực tuyến.

### 1.5. Công nghệ sử dụng
* **Backend:** C# và ASP.NET Core được sử dụng để xây dựng Web API và xử lý các nghiệp vụ của hệ thống. CQRS và MediatR được dùng để tổ chức các chức năng theo Command và Query.
* **Frontend:** React, TypeScript và Vite được sử dụng để xây dựng giao diện quản trị và website khách hàng. Tailwind CSS, shadcn, Radix UI và Lucide React hỗ trợ xây dựng giao diện.
* **Cơ sở dữ liệu:** Entity Framework Core được sử dụng để kết nối và thao tác với Microsoft SQL Server, đồng thời hỗ trợ migration và quản lý dữ liệu.
* **Thời gian thực và AI:** SignalR được sử dụng để cập nhật thông báo và trạng thái theo thời gian thực. Google Gemini API được tích hợp để xây dựng trợ lý AI cho hệ thống.
* **Bảo mật và thanh toán:** JWT kết hợp Role và Permission được dùng để xác thực, phân quyền. SePay được tích hợp để hỗ trợ thanh toán chuyển khoản QR/ngân hàng và xử lý webhook.
* **Triển khai, kiểm thử và quản lý mã nguồn:** Docker và Docker Compose hỗ trợ chạy các thành phần của hệ thống. Unit Test và Integration Test được dùng để kiểm thử. Git và GitHub được sử dụng để quản lý mã nguồn.

---

# CHƯƠNG 2. PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG

### 2.1. Phân tích yêu cầu hệ thống
#### 2.1.1. Yêu cầu chức năng
**Bảng 2.1. Các yêu cầu chức năng chính của hệ thống**
| Nhóm chức năng | Mô tả |
| :--- | :--- |
| Xác thực và phân quyền | Đăng nhập, xác thực tài khoản, quản lý vai trò và quyền truy cập theo từng nhóm người dùng. |
| Nhân viên và ca làm việc | Quản lý hồ sơ nhân viên, trạng thái làm việc, ca làm việc và phân công nhân viên theo ca. |
| Khu vực và bàn | Quản lý khu vực, bàn ăn, sức chứa, trạng thái bàn và mã QR của bàn. |
| Thực đơn | Quản lý danh mục món ăn, món ăn, giá bán, trạng thái kinh doanh và dữ liệu hiển thị cho khách hàng. |
| Đơn hàng tại bàn | Tạo đơn, thêm/cập nhật món, chuyển bàn và theo dõi trạng thái đơn phục vụ tại nhà hàng. |
| Đơn hàng mang về | Cho phép khách đặt món từ CustomerWeb, xác nhận đơn, theo dõi chế biến, thanh toán và hủy đơn theo quy tắc nghiệp vụ. |
| Bếp | Hiển thị các món chờ xử lý, đang nấu, đã hoàn thành và cập nhật trạng thái món trong quá trình chế biến. |
| Thanh toán và hóa đơn | Tính tổng tiền, giảm giá, phí phục vụ, VAT; hỗ trợ thanh toán tại quầy và thanh toán QR/ngân hàng; lập hóa đơn sau thanh toán. |
| Đặt bàn | Tiếp nhận, xác nhận, cập nhật, nhận bàn, hoàn tất, hủy và đánh dấu khách không đến. |
| Khuyến mãi | Quản lý chương trình/mã khuyến mãi, điều kiện áp dụng và lịch sử sử dụng. |
| Dashboard và báo cáo | Tổng hợp các chỉ số hoạt động, doanh thu và dữ liệu phục vụ theo dõi tình hình kinh doanh. |
| Nhật ký hoạt động | Lưu và tra cứu các thao tác quan trọng nhằm hỗ trợ kiểm tra, truy vết và quản trị hệ thống. |
| Thông báo thời gian thực | Gửi thông báo giữa hệ thống quản trị và khách hàng khi đơn hàng, đặt bàn hoặc thanh toán thay đổi trạng thái. |
| Trợ lý AI | Hỗ trợ người dùng truy vấn thông tin nghiệp vụ trong phạm vi dữ liệu và quyền truy cập được cho phép. |

#### 2.1.2. Yêu cầu phi chức năng
**Bảng 2.2. Các yêu cầu phi chức năng**
| Thuộc tính | Yêu cầu |
| :--- | :--- |
| Bảo mật | Yêu cầu xác thực bằng JWT, kiểm soát theo role/permission, không lưu secret trong mã nguồn và giới hạn các endpoint nhạy cảm. |
| Tính toàn vẹn dữ liệu | Các quy tắc nghiệp vụ phải được kiểm tra ở backend; dữ liệu tiền tệ không được âm; mã nghiệp vụ quan trọng phải duy nhất. |
| Xử lý đồng thời | Sử dụng RowVersion và giao dịch phù hợp để hạn chế ghi đè dữ liệu khi nhiều người dùng thao tác cùng lúc. |
| Khả năng phản hồi | Các màn hình nghiệp vụ cần phản hồi nhanh; thông báo quan trọng được truyền thời gian thực thay vì phụ thuộc hoàn toàn vào tải lại trang. |
| Khả năng bảo trì | Phân tách Domain, Application, Infrastructure và API; use case được tổ chức theo Command/Query để giảm phụ thuộc. |
| Khả năng kiểm thử | Tách handler khỏi controller và duy trì Unit Test/Integration Test cho các hành vi quan trọng. |
| Khả năng triển khai | Hỗ trợ Docker/Docker Compose, health check và cấu hình môi trường tách biệt nhằm giúp triển khai nhất quán. |
| Khả dụng giao diện | Giao diện phải rõ ràng, dễ thao tác, hỗ trợ chế độ sáng/tối và phân tách chức năng theo vai trò người dùng. |

### 2.2. Phân tích tác nhân và phân quyền
#### 2.2.1. Các tác nhân của hệ thống
**Bảng 2.3. Tác nhân và trách nhiệm chính**
| Tác nhân | Vai trò | Chức năng tiêu biểu |
| :--- | :--- | :--- |
| Admin | Quản trị hệ thống | Quản lý tài khoản, vai trò, quyền, cấu hình, dữ liệu nghiệp vụ và các chức năng quản trị cấp cao. |
| Manager | Quản lý nhà hàng | Theo dõi vận hành, nhân viên, ca làm việc, bàn, thực đơn, đặt bàn, khuyến mãi, báo cáo và các chức năng được cấp quyền. |
| Cashier | Thu ngân | Theo dõi đơn cần thanh toán, thực hiện thanh toán tại quầy, kiểm tra giao dịch và hóa đơn. |
| Kitchen | Nhân viên bếp | Tiếp nhận món cần chế biến, chuyển món sang đang nấu và đánh dấu hoàn thành. |
| Staff | Nhân viên phục vụ | Quản lý bàn, tiếp nhận đơn tại chỗ, cập nhật món và theo dõi quá trình phục vụ. |
| Customer | Khách hàng | Xem thực đơn, đặt món, đặt bàn, theo dõi đơn, nhận thông báo, áp dụng khuyến mãi và thanh toán trực tuyến. |

#### 2.2.2. Nguyên tắc phân quyền
Phân quyền được thực hiện theo hai lớp. Lớp thứ nhất là xác thực người dùng để xác định danh tính và trạng thái phiên đăng nhập. Lớp thứ hai là kiểm tra vai trò và permission trước khi cho phép thực hiện use case.
* Admin có quyền quản trị cao nhất và được thiết kế để tránh trường hợp tự khóa toàn bộ hệ thống.
* Manager, Cashier, Kitchen và Staff chỉ được truy cập các chức năng phù hợp với nhiệm vụ và permission đã được gán.
* Customer được tách khỏi nhóm vai trò cổng quản trị; các API khách hàng có phạm vi và luồng xác thực riêng.
* Frontend chỉ hiển thị chức năng phù hợp với người dùng, nhưng quyết định cấp quyền cuối cùng luôn do backend thực hiện.

*(Xem Hình 2.1: Sơ đồ Use Case tổng quát về Tác nhân và Phân quyền hệ thống)*

### 2.3. Phân tích các quy trình nghiệp vụ chính
* **2.3.1. Quy trình đăng nhập và kiểm soát truy cập:** Người dùng đăng nhập $\rightarrow$ Backend kiểm tra $\rightarrow$ Cấp JWT Token $\rightarrow$ Các request sau đính kèm JWT và kiểm tra Role/Permission. *(Xem Hình 2.2)*
* **2.3.2. Quy trình xử lý đơn hàng mang về từ CustomerWeb:** Khách đặt đơn Takeaway $\rightarrow$ Trạng thái Pending $\rightarrow$ Bếp nấu (Cooking $\rightarrow$ Ready) $\rightarrow$ Khách thanh toán VietQR SePay $\rightarrow$ Tự động Completed. Nếu quá 5 phút sau khi nấu xong chưa thanh toán $\rightarrow$ Tự động hủy. *(Xem Hình 2.3)*
* **2.3.3. Quy trình xử lý tại bếp (KDS):** Quản lý trạng thái món ở mức từng OrderItem: Pending $\rightarrow$ Cooking $\rightarrow$ Ready $\rightarrow$ Served. *(Xem Hình 2.4)*
* **2.3.4. Quy trình thanh toán và hóa đơn:** Tính toán thành tiền, VAT, phí phục vụ, chiết khấu $\rightarrow$ Nhận webhook SePay đối soát $\rightarrow$ Chuyển Paid $\rightarrow$ Khóa sửa đổi đơn hàng và xuất Hóa đơn. *(Xem Hình 2.5)*
* **2.3.5. Quy trình đặt bàn:** Khách gửi yêu cầu (Pending) $\rightarrow$ Nhà hàng duyệt (Confirmed) $\rightarrow$ Khách đến (CheckedIn) $\rightarrow$ Hoàn tất (Completed) hoặc Hủy/NoShow. *(Xem Hình 2.6)*

### 2.4. Thiết kế trạng thái nghiệp vụ
* **Trạng thái đơn hàng (Order):** `Pending` $\rightarrow$ `Cooking` $\rightarrow$ `Ready` $\rightarrow$ `Served` $\rightarrow$ `Completed` (hoặc `Cancelled`).
* **Trạng thái món trong đơn (OrderItem):** `Pending` $\rightarrow$ `Cooking` $\rightarrow$ `Ready` $\rightarrow$ `Served` (hoặc `Cancelled`).
* **Trạng thái đặt bàn (Reservation):** `Pending` $\rightarrow$ `Confirmed` $\rightarrow$ `CheckedIn` $\rightarrow$ `Completed` (hoặc `Cancelled` / `NoShow`).

*(Xem Hình 2.7: Sơ đồ Use Case thiết kế Vòng đời và Chuyển trạng thái nghiệp vụ)*

### 2.5. Thiết kế kiến trúc hệ thống
Hệ thống được tổ chức theo mô hình **Modular Monolith** kết hợp **Clean Architecture**.
* **Domain:** Chứa entity, trạng thái và quy tắc nghiệp vụ cốt lõi. Hoàn toàn độc lập.
* **Application:** Chứa use case, Commands, Queries (CQRS), MediatR handlers, DTOs, interfaces.
* **Infrastructure:** Triển khai truy cập dữ liệu qua EF Core, SQL Server, JWT, SMTP, SePay, Gemini AI và background service.
* **API:** REST endpoints, Middleware pipeline, Rate Limiter, Health Checks, SignalR Hubs.
* **Frontend:** Admin Web App và CustomerWeb độc lập giao tiếp qua HTTP/JSON và SignalR.

*(Xem Hình 2.8 và Hình 2.9)*

### 2.6. Thiết kế cơ sở dữ liệu
Cơ sở dữ liệu sử dụng Microsoft SQL Server với các bảng chính:
* **Tài khoản & nhân sự:** `Users`, `Employees`, `Shifts`, `EmployeeShifts`, `Roles`, `Permissions`, `RolePermissions`.
* **Khu vực & Bàn:** `Areas`, `RestaurantTables`, `TableQrCodes`, `TableOperations`, `TableOperationDetails`.
* **Thực đơn & Đơn hàng:** `MenuCategories`, `MenuItems`, `Orders`, `OrderItems`.
* **Thanh toán & Hóa đơn:** `Payments`, `PaymentAttempts`, `Invoices`, `InvoiceItems`.
* **Đặt bàn & Khách hàng:** `Reservations`, `Notifications`.
* **Khuyến mãi & Hệ thống:** `Promotions`, `PromotionUsages`, `RevenueReports`, `RestaurantSettings`, `ActivityLogs`, `IdempotencyRecords`.

Ràng buộc tính toàn vẹn: Unique index cho `OrderCode`, không âm cho tiền tệ, `RowVersion` cho kiểm soát cập nhật đồng thời (Optimistic Concurrency), bảng `IdempotencyRecords` chống lặp giao dịch. *(Xem Hình 2.10)*

### 2.7. Thiết kế API và tổ chức use case
Tổ chức chuẩn theo mô hình CQRS và MediatR: Tách biệt thao tác ghi (Commands) và thao tác đọc (Queries). Tích hợp SignalR thời gian thực và các cổng dịch vụ ngoài (SePay, Gemini, Mailpit). *(Xem Hình 2.11)*

### 2.8. Thiết kế bảo mật và độ tin cậy
* Xác thực JWT kết hợp kiểm tra trạng thái Session còn hiệu lực.
* Phân quyền động theo Permission Policy (thay đổi quyền có tác dụng ngay mà không cần cấp lại token).
* Rate limiting theo Actor và IP, Middleware chống spam đơn hàng ẩn danh (`AnonymousOrderAbuseGuard`).
* Giao dịch ACID và cơ chế Idempotency dựa trên SHA-256 request hash. *(Xem Hình 2.12)*

### 2.9. Thiết kế giao diện người dùng
Phân định rõ ràng giữa Cổng quản trị vận hành (Admin Web) và Website khách hàng (CustomerWeb), hỗ trợ cả hai chế độ sáng/tối (Light/Dark Mode). *(Xem Hình 2.13)*

---

# CHƯƠNG 3. CÀI ĐẶT VÀ HIỆN THỰC HỆ THỐNG

Chương này trình bày chi tiết toàn bộ quá trình hiện thực hóa các phân tích, thiết kế kỹ thuật thành mã nguồn chương trình, bao gồm cấu trúc tổ chức dự án, cài đặt backend ASP.NET Core, cơ sở dữ liệu, các cơ chế an ninh bảo vệ request, tích hợp dịch vụ thời gian thực/thanh toán/AI, kết quả giao diện thực tế của hai ứng dụng frontend và quy trình đóng gói triển khai hoàn chỉnh.

### 3.1. Môi trường phát triển và tổ chức mã nguồn
#### 3.1.1. Công nghệ và vai trò trong hệ thống
**Bảng 3.1. Công nghệ và vai trò trong hệ thống**
| Phân hệ / Nhóm | Công nghệ lựa chọn | Vai trò kỹ thuật trong hệ thống |
| :--- | :--- | :--- |
| Backend | .NET 10, ASP.NET Core Web API | Xây dựng REST API, điều phối nghiệp vụ, xác thực, phân quyền và kết nối hệ sinh thái dịch vụ. |
| Application Layer | CQRS Pattern, MediatR Library | Tách biệt tuyệt đối luồng ghi (Command) và luồng đọc (Query); điều phối request pipeline. |
| Database & ORM | Microsoft SQL Server, Entity Framework Core | Ánh xạ đối tượng quan hệ, quản lý schema qua migration, bảo đảm transaction ACID. |
| Admin Web App | React, TypeScript, Vite | Cổng quản trị và vận hành toàn diện cho nhân sự nhà hàng (Dashboard, Bếp, Thu ngân, Bàn...). |
| Customer Website | React, TypeScript, Vite, Tailwind CSS, shadcn | Website dành riêng cho thực khách (khám phá thực đơn, đặt món mang về, đặt bàn, thanh toán VietQR). |
| Realtime | ASP.NET Core SignalR | Cung cấp kênh WebSocket hai chiều truyền thông báo và cập nhật trạng thái đơn tức thời. |
| Thanh toán trực tuyến | Cổng SePay & VietQR Webhook | Tự động sinh mã VietQR chuyển khoản ngân hàng và đối soát trạng thái Paid qua Webhook. |
| Trí tuệ nhân tạo | Google Gemini API (gemini-2.5-flash) | Tích hợp trợ lý AI thông minh cho khách hàng (gợi ý món ăn) và quản trị viên (truy vấn báo cáo). |
| Đóng gói & Triển khai | Docker, Docker Compose, HAProxy, Nginx | Đóng gói toàn bộ hệ thống vào container, cân bằng tải và failover tự động. |
| Kiểm thử & CI/CD | xUnit, WebApplicationFactory, GitHub Actions | Hệ thống kiểm thử tự động nhiều tầng và đường ống tích hợp liên tục. |

#### 3.1.2. Cấu trúc source code và ranh giới các tầng kiến trúc
Repository được phân tách thành các project độc lập theo đúng nguyên lý Dependency Inversion của Clean Architecture:

**Bảng 3.2. Cấu trúc các project trong Solution**
| Tên Project | Phụ thuộc chính | Nhiệm vụ kỹ thuật |
| :--- | :--- | :--- |
| `QuanLyNhaHang.Domain` | Không phụ thuộc | Trọng tâm hệ thống: chứa Entity, Enum trạng thái và quy tắc nghiệp vụ bất biến. |
| `QuanLyNhaHang.Application` | Domain | Chứa use case, Commands, Queries, Handlers, DTOs, Interfaces và MediatR Behaviors. |
| `QuanLyNhaHang.Infrastructure` | Domain, Application | Triển khai công nghệ: EF Core, DbContext, JWT, SMTP, SePay Gateway, Gemini AI, Background Jobs. |
| `QuanLyNhaHang.Api` | Application, Infrastructure | Cửa ngõ API: Controllers, Middleware, Rate Limiting, Authentication/Authorization, SignalR Hubs. |
| `QuanLyNhaHang.Frontend` | React/TypeScript | Mã nguồn ứng dụng web quản trị và vận hành nhà hàng. |
| `QuanLyNhaHang.CustomerWeb` | React/TypeScript | Mã nguồn website trải nghiệm khách hàng độc lập. |
| `QuanLyNhaHang.UnitTests` | Domain, Application | Bộ kiểm thử đơn vị độc lập. |
| `QuanLyNhaHang.IntegrationTests`| API, Infrastructure | Bộ kiểm thử tích hợp toàn diện qua test server và cơ sở dữ liệu. |

---

### 3.2. Hiện thực Backend ASP.NET Core
#### 3.2.1. Khởi tạo API, Dependency Injection và Request Pipeline
File `Program.cs` đóng vai trò là Composition Root tinh gọn, toàn bộ việc đăng ký dịch vụ và middleware pipeline được module hóa thông qua các C# Extension Methods:

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.ConfigureApiHost();

builder.Services
    .AddApiCors(builder.Configuration, builder.Environment)
    .AddApiServices(builder.Configuration)
    .AddApiHealthChecks()
    .AddApiAuthentication(builder.Configuration)
    .AddApiRateLimiting()
    .AddApiAuthorization();

var app = builder.Build();
await app.InitializeDatabaseAsync();
app.UseApiPipeline();
app.MapApiEndpoints();
app.Run();
```

Thứ tự thực thi trong HTTP Request Pipeline được thiết kế nghiêm ngặt:
1. `ExceptionHandlingMiddleware`: Bắt lỗi toàn cục, chuẩn hóa định dạng trả về RFC 7807 (ProblemDetails).
2. `Routing` & `Cors`: Kiểm soát miền truy cập hợp lệ từ hai frontend.
3. `Authentication` (JWT): Giải mã token, xác định danh tính Actor.
4. `AnonymousOrderAbuseMiddleware`: Phát hiện và làm chậm hành vi spam từ khách vãng lai.
5. `RateLimiter`: Giới hạn tần suất gọi API theo Actor hoặc IP.
6. `Authorization`: Kiểm tra Permission Policy động.
7. `AtomicRequestMiddleware` & `Idempotency`: Mở transaction, kiểm tra request hash chống lặp.
8. `Controllers` $\rightarrow$ `MediatR Handlers`: Thực thi nghiệp vụ.
9. `Commit Transaction` & `Deferred SignalR Notification`: Chỉ khi dữ liệu đã commit thành công vào CSDL thì thông báo realtime mới được phát ra client.

#### 3.2.2. Xây dựng tầng Domain và quy tắc nghiệp vụ
Các thực thể Domain như `Order`, `OrderItem`, `Reservation`, `Payment` được bảo vệ tính toàn vẹn thông qua các phương thức nghiệp vụ nội tại (Encapsulation) thay vì để public setters:
* `Order`: Phân loại chặt chẽ giữa `DineIn` (gắn với `RestaurantTableId`) và `Takeaway` (lưu thời gian hẹn lấy món và thông tin nhận).
* `OrderItem`: Quản lý trạng thái độc lập của từng món (`Pending` $\rightarrow$ `Cooking` $\rightarrow$ `Ready` $\rightarrow$ `Served`). Món đã bàn giao (`Served`) bị khóa vĩnh viễn, không cho phép hủy hoặc trả lùi trạng thái.
* `Optimistic Concurrency`: Trang bị thuộc tính `RowVersion (byte[])` để phát hiện và ngăn chặn xung đột ghi đè khi nhiều nhân viên cùng thao tác trên một đơn hàng.

#### 3.2.3. Hiện thực Application theo mô hình CQRS và MediatR
Toàn bộ nghiệp vụ được chia nhỏ thành các cặp Command/Query tương ứng:
* **Luồng ghi (Commands):** `CreateOrderCommand`, `ChangeOrderStatusCommand`, `CreateReservationCommand`, `ProcessPaymentWebhookCommand`. Đi kèm các MediatR Pipeline Behavior để tự động ghi `ActivityLog` và chuẩn hóa ngoại lệ nghiệp vụ.
* **Luồng đọc (Queries):** `GetOrdersWithPaginatedListQuery`, `GetMenuItemListQuery`, `GetDashboardMetricsQuery`. Các truy vấn đọc sử dụng `AsNoTracking()` của EF Core để tối ưu tốc độ và giảm tiêu thụ bộ nhớ.

#### 3.2.4. Xây dựng tầng Infrastructure
Tầng hạ tầng cài đặt các Interface trừu tượng của Application:
* `ApplicationDbContext`: Cấu hình Fluent API, mapping quan hệ bảng, index và check constraint.
* `JwtTokenService` & `AuthSessionService`: Quản lý cấp phát token và kiểm tra vòng đời phiên đăng nhập.
* `SePayPaymentGateway` & `SePayWebhookParser`: Tích hợp chuẩn giao thức thanh toán VietQR.
* `GeminiAiAssistantService`: Tích hợp mô hình AI thông qua Typed `HttpClient`.
* `TakeawayExpiryBackgroundService`: Background service chạy ngầm định kỳ quét và xử lý đơn mang về quá hạn.

---

### 3.3. Hiện thực Cơ sở dữ liệu và Tính toàn vẹn
* **ApplicationDbContext:** Quản lý hơn 25 `DbSet`, áp dụng cấu hình tự động thông qua `modelBuilder.ApplyConfigurationsFromAssembly()`.
* **Transaction & Isolation Level:** Đối với các tác vụ nhạy cảm như thanh toán, tạo đơn hoặc hủy đơn hàng, hệ thống sử dụng Transaction với `IsolationLevel.Serializable` để loại trừ hoàn toàn các hiện tượng tranh chấp dữ liệu (Race Condition).
* **Bảo vệ dữ liệu tài chính:** Các trường tiền tệ sử dụng kiểu `decimal(18,2)` có ràng buộc `>= 0`. Sau khi hóa đơn đã ở trạng thái `Paid`, toàn bộ quyền chỉnh sửa món ăn, số lượng và tổng tiền của đơn hàng bị khóa cứng ở cấp độ cơ sở dữ liệu.

---

### 3.4. Hiện thực Xác thực, Bảo mật và Chống lạm dụng
#### 3.4.1. Xác thực JWT, Session và Phân quyền động
* **JWT kết hợp kiểm tra Session sống:** Mỗi token phát hành chứa định danh người dùng và mã phiên `sessionId`. Khi tài khoản bị vô hiệu hóa hoặc quản trị viên thu hồi phiên, token lập tức mất hiệu lực ngay trong request tiếp theo mà không cần chờ token hết hạn.
* **Permission Authorization Handler:** Quyền hạn được kiểm tra trực tiếp từ bảng `RolePermissions` trong CSDL ở mỗi request. Khi quản trị viên thay đổi quyền của vai trò (Role), nhân viên thuộc vai trò đó sẽ lập tức được áp dụng quyền mới mà không cần đăng xuất đăng nhập lại.

#### 3.4.2. Rate Limiting và Chống lạm dụng đơn ẩn danh
* Hệ thống cấu hình bộ giới hạn tần suất linh hoạt:
  * Đăng nhập: Tối đa 10 request / 1 phút / IP.
  * Tạo đơn mang về: Tối đa 8 request / 5 phút (nếu đã đăng nhập) và 4 request / 5 phút (nếu là khách ẩn danh).
* `AnonymousOrderAbuseGuard`: Theo dõi tần suất đặt đơn của khách vãng lai thông qua tổ hợp IP, `X-Client-Id` và thiết bị. Nếu phát hiện hành vi spam liên tục, hệ thống sẽ tạm khóa khả năng đặt món của client đó trong 30 phút.

#### 3.4.3. Cơ chế Idempotency và Atomic Request
* Các thao tác có rủi ro gửi lặp (tạo đơn, quét QR, thanh toán, nhập kho, webhook) được bảo vệ bởi bộ lọc Idempotency.
* Hệ thống lưu trữ mã băm SHA-256 của toàn bộ request (`Method + Path + Body`). Nếu client vô tình bấm nút nhiều lần hoặc mạng bị retry, hệ thống nhận diện khóa trùng lặp và phản hồi lại kết quả cũ (`Idempotency-Replayed: true`) mà không tạo ra đơn hàng hay giao dịch thanh toán thứ hai.

---

### 3.5. Hiện thực các Dịch vụ Tích hợp Chuyên sâu
#### 3.5.1. Thông báo thời gian thực với SignalR (Deferred Notification)
* Ánh xạ Hub tại `/hubs/admin-notifications` với tùy chọn `CloseOnAuthenticationExpiration = true`.
* **Cơ chế Deferred Notification:** Khi một use case thực hiện tạo đơn hoặc thanh toán, sự kiện SignalR không phát ra ngay lập tức mà được giữ lại trong bộ đệm. Chỉ khi giao dịch cơ sở dữ liệu commit thành công, thông báo mới được phát tới client. Nếu transaction bị rollback, thông báo sẽ tự động bị hủy, đảm bảo giao diện người dùng không bao giờ nhận sự kiện ảo.

#### 3.5.2. Tích hợp thanh toán SePay và VietQR Webhook
* Hệ thống tự động sinh mã thanh toán định danh độc nhất (ví dụ: `PAY-20261022-XXXX`) và tạo URL ảnh mã QR theo chuẩn VietQR động chứa chính xác số tiền cần chuyển.
* Webhook từ SePay truyền về qua Cloudflare Tunnel được kiểm tra bảo mật 5 lớp: Kiểm tra API Key, Rate limit, Xác thực Idempotency chống gọi lặp, Kiểm tra tài khoản nhận và Kiểm tra số tiền chuyển khớp 100% với giá trị đơn hàng.

#### 3.5.3. Background Service tự động xử lý đơn mang về quá hạn
* `TakeawayExpiryBackgroundService` hoạt động nền theo chu kỳ mỗi 30 giây:
  * **Nhánh tự động hoàn tất:** Nếu đơn mang về đã nấu xong (`Ready`) và khách đã thanh toán (`Paid`), hệ thống tự động chuyển đơn sang `Completed` và gửi thông báo cho khách.
  * **Nhánh tự động hủy:** Nếu đơn mang về đã nấu xong (`Ready`) nhưng sau 5 phút khách hàng vẫn chưa hoàn tất thanh toán, hệ thống tự động hủy đơn (`Cancelled`), giải phóng bàn/món và gửi cảnh báo hủy đơn cho cả khách hàng và quầy thu ngân.

#### 3.5.4. Trợ lý AI Google Gemini
* Sử dụng mô hình `gemini-2.5-flash` qua REST API, phân tách rõ ràng hai ngữ cảnh:
  * **Customer AI:** Chỉ truy cập thông tin công khai (thực đơn, thành phần món, vị món, chương trình khuyến mãi) để tư vấn chọn món cho khách hàng.
  * **Admin AI:** Có quyền truy vấn dữ liệu vận hành (báo cáo doanh thu hôm nay, tình trạng bàn trống, danh sách món bếp đang nấu tồn đọng) nhưng hoàn toàn ở chế độ Read-Only, không tiếp nhận mật khẩu hay API key.

---

### 3.6. Xây dựng và Kết quả Giao diện Ứng dụng Quản trị (Admin Web)
Ứng dụng quản trị được xây dựng bằng React, TypeScript và Vite, giao tiếp đồng thời với REST API và SignalR Hub. Dưới đây là các giao diện chức năng thực tế của hệ thống:

*(Hình 3.3 đến Hình 3.17: Trình bày chi tiết giao diện Đăng nhập, Dashboard điều hành, Quản lý đơn hàng, KDS Bếp, Sơ đồ bàn, Đặt bàn, Thực đơn, Thanh toán SePay, Hóa đơn, Báo cáo doanh thu, Hồ sơ nhân viên, Phân quyền RBAC, Khuyến mãi, Nhật ký kiểm toán và Trợ lý AI Quản trị).*

---

### 3.7. Xây dựng và Kết quả Giao diện Website Khách hàng (CustomerWeb)
CustomerWeb là ứng dụng độc lập tối ưu cho trải nghiệm người dùng trên cả máy tính và thiết bị di động, sử dụng Tailwind CSS và các thành phần giao diện hiện đại:

*(Hình 3.18 đến Hình 3.32: Trình bày chi tiết Trang chủ, Hero Banner, Ưu đãi nổi bật, Món ăn đặc trưng, Câu chuyện thương hiệu, Footer tích hợp Google Maps, Đăng nhập/Đăng ký thành viên, Hồ sơ cá nhân, Khám phá thực đơn & lọc dị ứng, Tùy biến món ăn, Đặt bàn online, Giỏ hàng món mang về, Xác nhận đơn hàng VietQR và Quản lý theo dõi tiến độ "Đơn của tôi").*

---

### 3.8. Đóng gói và Triển khai hệ thống bằng Docker Compose
Hệ thống được đóng gói thành một cụm vi dịch vụ hoàn chỉnh chạy qua `docker-compose.yml`:
* **database:** Container Microsoft SQL Server 2022 lưu trữ dữ liệu bền vững qua Named Volume `sqlserver-data`.
* **mailpit:** Container giả lập máy chủ SMTP và cung cấp giao diện Web kiểm tra email tại cổng 8025.
* **api:** Container ASP.NET Core chạy backend tại cổng nội bộ 8080.
* **api-gateway:** HAProxy 3.0 đóng vai trò Reverse Proxy & API Gateway tại cổng 8080, cấu hình tự động failover giữa môi trường debug Visual Studio và Docker API.
* **admin-web & customer-web:** Được build theo cơ chế Multi-stage Dockerfile (Node.js Alpine build mã nguồn $\rightarrow$ copy artifact sang Nginx Alpine siêu nhẹ) phục vụ tương ứng tại cổng 4173 và 4174.

---

### 3.9. Phân tích Luồng Kỹ thuật Hoàn chỉnh & Đánh giá
* **Luồng tạo đơn mang về hoàn chỉnh:** Khách gửi request $\rightarrow$ Middleware kiểm tra Abuse & Rate limit $\rightarrow$ Idempotency hash request $\rightarrow$ MediatR tạo Order/OrderItem $\rightarrow$ Commit Database $\rightarrow$ Kích hoạt SignalR thông báo cho Bếp và Thu ngân.
* **Đánh giá kỹ thuật:** Hệ thống đạt độ tin cậy cao nhờ phân lớp chuẩn Clean Architecture, bảo vệ request đa tầng, giao dịch ACID an toàn, cập nhật thời gian thực không độ trễ và hỗ trợ triển khai đồng bộ qua Docker.

---

# CHƯƠNG 4. KIỂM THỬ VÀ ĐÁNH GIÁ CHẤT LƯỢNG

### 4.1. Mục tiêu và phạm vi kiểm thử
#### 4.1.1. Mục tiêu kiểm thử
* Kiểm tra các entity và quy tắc nghiệp vụ cốt lõi hoạt động đúng với dữ liệu hợp lệ và từ chối trạng thái không hợp lệ.
* Kiểm tra xác thực, phân quyền và các endpoint quan trọng không thể truy cập trái phép.
* Kiểm tra các luồng liên kết nhiều module như đơn hàng - bếp - thanh toán - hóa đơn - thông báo.
* Kiểm tra các cơ chế chống spam, giới hạn số lượng món và bảo vệ dữ liệu sau khi thanh toán.
* Kiểm tra background service xử lý đơn mang về quá hạn thanh toán.
* Kiểm tra hai frontend có thể cài dependency, build và đóng gói thành công.
* Kiểm tra Docker, migration và health check để giảm lỗi khi triển khai.

#### 4.1.2. Phạm vi và môi trường kiểm thử
**Bảng 4.1. Môi trường và công cụ kiểm thử**
| Nhóm kiểm thử | Công cụ sử dụng | Mục đích kiểm tra |
| :--- | :--- | :--- |
| Unit Test | xUnit, .NET 10 | Kiểm tra độc lập các Entity, Value Object, Helper và Domain Logic. |
| Integration Test | ASP.NET Core WebApplicationFactory | Khởi động toàn bộ API server trong tiến trình test và kiểm tra luồng qua HttpClient. |
| Database Test | EF Core InMemory / LocalDB | Cô lập môi trường dữ liệu cho từng test case, tránh phụ thuộc dữ liệu thật. |
| Frontend Validation | Node.js, npm, TypeScript, Vite | Kiểm tra cú pháp kiểu dữ liệu TypeScript, audit lỗ hổng và kiểm tra build tĩnh. |
| Backend CI | GitHub Actions (Ubuntu Runner) | Tự động thực thi Unit Test, Integration Test, kiểm tra Secret và Migration. |
| Container Validation | Docker / Docker Compose | Kiểm tra cấu hình compose, build image và smoke test tính sẵn sàng của endpoint. |

### 4.2. Chiến lược kiểm thử nhiều lớp
Hệ thống áp dụng mô hình kim tự tháp kiểm thử nhiều lớp:
1. **Kiểm thử đơn vị (Unit Test):** Bao phủ các quy tắc logic cốt lõi trong Domain và Application.
2. **Kiểm thử tích hợp (Integration Test):** Bao phủ luồng tương tác giữa Controller, Middleware, MediatR, DbContext và phân quyền.
3. **Kiểm thử Frontend CI:** Tự động hóa quá trình compile mã nguồn React/TypeScript và rà soát lỗ hổng dependency.
4. **Kiểm thử thủ công (Manual / Exploratory Testing):** Kiểm tra trực quan giao diện, chế độ Light/Dark, độ co giãn Responsive và tương tác WebSocket thời gian thực.

*(Xem Hình 4.1: Mô hình kiểm thử nhiều lớp)*

### 4.3. Kiểm thử đơn vị (Unit Test)
* **Kiểm thử Domain:** Các test suite `UserTests`, `OrderTests`, `OrderItemTests`, `PaymentTests`, `InvoiceTests`, `ReservationTests` kiểm tra tính hợp lệ của việc chuyển trạng thái, công thức tính tiền và các bất biến nghiệp vụ. *(Bảng 4.2)*
* **Kiểm thử Catalog Vai trò & Quyền:** Kiểm tra toàn bộ mã quyền hạn (`PermissionCodes`) và danh mục vai trò chuẩn không bị thiếu hụt hay trùng lặp.

### 4.4. Kiểm thử tích hợp các luồng nghiệp vụ (Integration Test)
* **Xác thực và bảo vệ endpoint:** Kiểm thử đăng nhập sai thông tin (401), gọi endpoint khi chưa xác thực, xác thực CORS preflight. *(Bảng 4.3)*
* **Luồng đơn hàng - bếp - hoàn tất:** Tạo đơn $\rightarrow$ Chuyển bếp Cooking $\rightarrow$ Hoàn thành Ready $\rightarrow$ Phục vụ Served $\rightarrow$ Đóng đơn Completed. *(Bảng 4.4)*
* **Khóa dữ liệu sau thanh toán:** Ngăn chặn tuyệt đối việc thêm món, hủy món, sửa giá hoặc xóa đơn hàng khi đã có trạng thái `Paid`. *(Bảng 4.5)*
* **Tự động hủy đơn mang về quá hạn:** Kiểm thử đơn Ready sau 5 phút không thanh toán sẽ tự động hủy và phát thông báo cảnh báo. *(Bảng 4.6)*
* **Chống spam và giới hạn số lượng món:** Chặn gọi món với số lượng vượt quá ngưỡng quy định (tối đa 5 phần/lần) và chặn spam tạo đơn liên tục. *(Bảng 4.7)*

### 4.5. Kiểm thử Frontend và trải nghiệm người dùng
* **Kiểm tra build tự động trong CI:** Cả hai ứng dụng Admin Web và CustomerWeb được chạy lệnh `npm ci`, `npm audit` và `npm run build` trong môi trường sạch của GitHub Actions. *(Bảng 4.8)*
* **Kiểm thử thủ công:** Kiểm tra tính tương phản màu sắc Light/Dark Mode, popup chuông thông báo SignalR, tính tương thích trên thiết bị di động và các hộp thoại Modal. *(Bảng 4.9)*

### 4.6. Kiểm thử CI, Migration và Môi trường triển khai
* **Backend CI:** Thiết lập tự động trong GitHub Actions: kiểm tra rò rỉ file secret, kiểm tra pending EF model changes chưa có migration, validate file Docker Compose và smoke test khởi động container. *(Bảng 4.10)*
* **Health Check:** Kiểm tra tính sẵn sàng của hệ thống thông qua các endpoint `/health`, `/health/live` và `/health/ready`.

### 4.7. Hạn chế và hướng cải tiến kiểm thử
* Cần bổ sung kiểm thử tự động toàn diện đầu cuối (E2E) bằng Playwright/Cypress.
* Bổ sung bài kiểm tra chịu tải (Load / Stress Testing) với công cụ k6 để đo lường khả năng chịu tải của SignalR và API khi có lượng lớn khách hàng truy cập đồng thời. *(Bảng 4.11)*

---

# CHƯƠNG 5. KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN

Sau quá trình khảo sát yêu cầu, phân tích nghiệp vụ, thiết kế, xây dựng và kiểm thử, đề tài **“Hệ thống Quản Lý Nhà Hàng”** đã hình thành một giải pháp phần mềm web hoàn chỉnh, hiện đại, đáp ứng tốt nhu cầu quản trị nội bộ lẫn trải nghiệm của khách hàng.

### 5.1. Tổng kết kết quả của đề tài
Đề tài đã giải quyết bài toán quản lý nhà hàng theo hướng chuyển đổi số toàn diện. Hệ thống kết nối liền mạch mọi bộ phận: từ khâu tiếp đón khách, đặt bàn, gọi món tại bàn / mang về, điều phối chế biến nhà bếp (KDS), đến thanh toán trực tuyến VietQR, xuất hóa đơn và tổng hợp báo cáo doanh thu theo thời gian thực.

Về mặt kỹ thuật, hệ thống được xây dựng bài bản theo chuẩn kiến trúc Clean Architecture kết hợp CQRS và MediatR, bảo đảm tính độc lập, khả năng bảo trì và dễ dàng mở rộng.

### 5.2. Những kết quả đạt được
* **Về chức năng:**
  * Xây dựng hoàn chỉnh Cổng quản trị vận hành (Admin Web) cho 5 vai trò nhân sự: Admin, Manager, Cashier, Kitchen, Staff.
  * Xây dựng Website Khách hàng (CustomerWeb) sang trọng, tiện lợi với trải nghiệm đặt món mang về, đặt bàn trực tuyến và kiểm tra tiến độ đơn hàng.
  * Tích hợp thành công thông báo thời gian thực SignalR hai chiều không độ trễ.
  * Tích hợp thanh toán tự động qua cổng SePay và mã QR VietQR động với cơ chế xác thực webhook an toàn tuyệt đối.
  * Tích hợp Trợ lý AI Google Gemini phục vụ tư vấn thực đơn cho khách hàng và hỗ trợ tra cứu thông tin quản trị.
* **Về kỹ thuật & bảo mật:**
  * Áp dụng xác thực JWT gắn với phiên làm việc, phân quyền động theo Permission Policy.
  * Bảo vệ hệ thống đa tầng với Rate Limiting, Idempotency, Transaction ACID và middleware chống lạm dụng đơn hàng ẩn danh.
  * Đóng gói toàn bộ hệ sinh thái dịch vụ vào Docker Compose với cổng HAProxy API Gateway có cơ chế failover linh hoạt.
* **Về kiểm thử & chất lượng:**
  * Xây dựng bộ kiểm thử nhiều tầng (Unit Test, Integration Test) bảo vệ các quy tắc nghiệp vụ cốt lõi và tích hợp tự động hóa vào GitHub Actions CI/CD.

### 5.3. Đánh giá mức độ hoàn thành mục tiêu
Hệ thống đã hoàn thành 100% các mục tiêu đặt ra ban đầu về nghiệp vụ F&B, kiến trúc phần mềm, bảo mật dữ liệu và triển khai container hóa. *(Bảng 5.1 đối chiếu mục tiêu và kết quả)*.

### 5.4. Hạn chế của hệ thống
* Hệ thống hiện tại được tối ưu hóa cho mô hình một nhà hàng độc lập; chưa hỗ trợ quản lý chuỗi đa chi nhánh (Multi-tenancy).
* Môi trường triển khai hiện chủ yếu chạy trên Docker cục bộ, chưa đưa lên các dịch vụ đám mây công cộng (Cloud) với tên miền và chứng chỉ SSL/TLS chính thức.
* Cần hoàn thiện thêm bộ kiểm thử tự động E2E trên trình duyệt và kiểm thử đo tải quy mô lớn.

### 5.5. Hướng phát triển
* Nâng cấp hệ thống hỗ trợ quản lý chuỗi nhà hàng đa chi nhánh với cơ sở dữ liệu phân tán.
* Đưa ứng dụng lên môi trường điện toán đám mây (AWS / Azure / GCP) với kiến trúc Kubernetes và hệ thống giám sát tập trung (Prometheus, Grafana).
* Phát triển ứng dụng di động cho khách hàng theo chuẩn Progressive Web App (PWA) hoặc Mobile Native App (Flutter/React Native) hỗ trợ thông báo đẩy Push Notification.
* Mở rộng năng lực của Trợ lý AI trong việc phân tích xu hướng ẩm thực, dự báo nhu cầu nhập kho nguyên liệu và tối ưu hóa doanh thu.

### 5.6. Kết luận chung
Đề tài **“Hệ thống Quản Lý Nhà Hàng”** đã chứng minh tính khả thi và hiệu quả cao trong việc ứng dụng công nghệ thông tin vào hoạt động kinh doanh ẩm thực. Đây là nền tảng vững chắc để tiếp tục phát triển thành một sản phẩm thương mại hoàn chỉnh có thể ứng dụng trực tiếp vào các nhà hàng trong thực tế.

---

# TÀI LIỆU THAM KHẢO

[1] SePay, *Tài liệu Tích hợp Cổng Thanh toán Tự động và Webhook Giao dịch Ngân hàng VietQR*, SePay Developer Documentation.  
[2] Martin, R. C., *Clean Architecture: A Craftsman's Guide to Software Structure and Design*, Prentice Hall, 2017.  
[3] Microsoft Learn, *ASP.NET Core Fundamentals, Web API and Architecture Documentation*, Microsoft Corporation.  
[4] Microsoft Learn, *Entity Framework Core Documentation and Best Practices*, Microsoft Corporation.  
[5] Meta Platforms, Inc., *React Documentation – Build User Interfaces with Components*.  
[6] Google AI for Developers, *Gemini API Documentation and Generative AI SDK Reference*, Google.  
[7] Docker Inc., *Docker Compose and Containerization Guide for Multi-Container Applications*.  
[8] MediatR Documentation, *Simple, Unambitious Mediator Implementation in .NET (CQRS Pattern)*, Jimmy Bogard.  

---

# NHẬT KÝ THỰC HIỆN

**Họ và tên:** Võ Nguyễn Thanh &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **MSSV:** 230481  
**Lớp:** 23DTHA1 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **Ngành:** CNTT VÀ BÁN DẪN &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **Khoa:** CNTT&ĐTBD  
**Khóa:** 2023 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **Niên khóa:** 2023–2027  
**Giảng viên hướng dẫn:** ThS. Nguyễn Văn Tự  

| STT | Thời gian | Nội dung công việc thực hiện | Đánh giá của giảng viên |
| :---: | :--- | :--- | :--- |
| 1 | Tuần 1 | Khảo sát bài toán, xác định yêu cầu nghiệp vụ và lập kế hoạch đề tài. | |
| 2 | Tuần 2 | Phân tích yêu cầu chức năng, phi chức năng và thiết kế sơ đồ Use Case. | |
| 3 | Tuần 3 | Thiết kế kiến trúc hệ thống Clean Architecture và mô hình CSDL SQL Server. | |
| 4 | Tuần 4 | Khởi tạo backend ASP.NET Core, thiết lập Domain Entities và EF Core DbContext. | |
| 5 | Tuần 5 | Xây dựng tầng Application với mô hình CQRS, MediatR và Pipeline Behaviors. | |
| 6 | Tuần 6 | Cài đặt xác thực JWT, phân quyền động Permission Policy và Rate Limiting. | |
| 7 | Tuần 7 | Xây dựng giao diện ứng dụng quản trị Admin Web App với React và Vite. | |
| 8 | Tuần 8 | Xây dựng Website Khách hàng CustomerWeb, tối ưu giao diện đặt món và giỏ hàng. | |
| 9 | Tuần 9 | Hiện thực tính năng thời gian thực SignalR (KDS bếp, thông báo tức thời). | |
| 10 | Tuần 10 | Tích hợp cổng thanh toán tự động VietQR SePay và xử lý đối soát Webhook. | |
| 11 | Tuần 11 | Tích hợp Trợ lý AI Google Gemini, đóng gói toàn bộ hệ thống qua Docker Compose. | |
| 12 | Tuần 12 | Viết Unit/Integration Test, thiết lập GitHub Actions CI và hoàn thiện báo cáo đồ án. | |
