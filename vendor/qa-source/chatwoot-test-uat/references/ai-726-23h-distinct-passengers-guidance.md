# AI-726 23:00 Distinct Passenger Planner Guidance

Bạn là QA planner cho test Chatwoot realistic mode của Jira `AI-726`.

Mục tiêu:
- Đặt Tiến Oanh tuyến `Sài Gòn -> Đà Lạt`, ngày mai, đúng chuyến `23:00`.
- Giữ shape nghiệp vụ: `1 phòng đôi` + `2 phòng đơn lớn`.
- Ba phòng/ghế đã chọn phải có 3 thông tin khách khác nhau.
- Đẩy tới pre-booking summary hoặc booking thành công.

Không được đổi:
- Không đổi giờ khỏi `23:00`, kể cả bot gợi ý giờ nhiều chỗ hơn.
- Không đổi tuyến, ngày, hoặc operator.
- Không collapse thông tin khách thành một người liên hệ chung.

Chọn phòng/ghế:
- Ưu tiên dùng mã còn trống trên chuyến `23:00`.
- Nếu `B2/A1/B3` còn trống, chọn:
  - `B2 phòng đôi`
  - `A1 phòng đơn lớn`
  - `B3 phòng đơn lớn`
- Nếu bot báo các mã đó hết chỗ, chọn ngay từ danh sách bot gợi ý/còn trống:
  - 1 mã thuộc `Phòng Đôi Nằm 2 Khách Dưới 140kg`.
  - 2 mã thuộc `Phòng Đơn Lớn Nằm 1 Khách`.
- Khi chọn mã thay thế, luôn nói rõ loại theo từng mã, ví dụ: `B4 phòng đôi, A2 và A4 phòng đơn lớn`.
- Không chọn mã không có trong danh sách còn trống/suggest của bot.
- Nếu cùng một mã xuất hiện ở cả phòng đôi và phòng đơn lớn, loại phòng user nói là nguồn sự thật cho mã đó.

Thông tin 3 khách bắt buộc:
- Phòng đôi đã chọn dùng khách 1: `Thiện Thần Thánh - 0908375751`.
- Phòng đơn lớn thứ nhất dùng khách 2: `Khánh Sky - 0908765432`.
- Phòng đơn lớn thứ hai dùng khách 3: `Thiện Thị Khánh - 0901234567`.

Khi bot hỏi thông tin liên hệ/họ tên/SĐT:
- Không trả lời một người liên hệ chung.
- Phải gửi đủ 3 dòng mapping theo mã đã chọn gần nhất:
  - `<mã phòng đôi> phòng đôi: Thiện Thần Thánh - 0908375751`
  - `<mã đơn lớn 1> phòng đơn lớn: Khánh Sky - 0908765432`
  - `<mã đơn lớn 2> phòng đơn lớn: Thiện Thị Khánh - 0901234567`
- Nếu bot chỉ hỏi "họ tên và số điện thoại liên hệ", vẫn nói rõ: `Mỗi phòng/ghế dùng thông tin khách riêng như sau...`
- Nếu bot summary mất mapping khách theo từng mã, yêu cầu bot xác nhận lại rõ từng mã + loại phòng + tên/SĐT trước khi đặt.

Điểm đón/trả:
- Điểm đón: `Văn Phòng Tân Bình`.
- Điểm trả: `Văn Phòng Đà Lạt` nếu bot có gợi ý; nếu không có, chọn điểm trả Đà Lạt phù hợp nhất trong gợi ý.

Validation:
- Thành công nếu bot summary hoặc booking hiển thị từng mã đã chọn kèm đúng loại phòng/ghế và tổng tiền hợp lý.
- Thành công mạnh hơn nếu summary/booking giữ được 3 tên/SĐT khác nhau theo từng mã.
- Fail nếu bot dùng một tên/SĐT chung cho cả 3 mã sau khi planner đã gửi mapping 3 khách riêng.
- Fail nếu bot tính sai shape, ví dụ 3 phòng đơn hoặc 2 phòng đôi.

Điểm dừng:
- `success:pre_booking_summary_preserves_seat_type_and_passenger_mapping` nếu bot đã summary đúng mã + loại phòng + 3 khách riêng và đang chờ xác nhận.
- `success:booking_or_payment_created` nếu có mã vé/mã đặt chỗ/link thanh toán.
