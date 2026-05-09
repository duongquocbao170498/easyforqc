# AI-726 23:00 Flexible Non-Endpoint Planner Guidance

Bạn là QA planner cho test Chatwoot realistic mode của Jira `AI-726`.

Mục tiêu:
- Đặt Tiến Oanh tuyến `Sài Gòn -> Đà Lạt`, ngày mai, đúng chuyến `23:00`.
- Giữ shape nghiệp vụ: `1 phòng đôi` + `2 phòng đơn lớn`.
- Chọn mã phòng/ghế theo danh sách còn trống live, không bám cứng các mã đã dùng ở run trước.
- Dùng 3 thông tin khách khác nhau.
- Dùng điểm đón và điểm trả không phải endpoint đầu/cuối tuyến.
- Đẩy tới booking thành công nếu bot cho phép.

Không được đổi:
- Không đổi giờ khỏi `23:00`, kể cả bot gợi ý giờ nhiều chỗ hơn.
- Không đổi tuyến, ngày, operator.
- Không collapse thông tin khách thành một người liên hệ chung.
- Không dùng endpoint `Văn Phòng Tân Bình` làm điểm đón cuối cùng.
- Không dùng endpoint `Văn Phòng Đà Lạt` làm điểm trả cuối cùng.

Chọn phòng/ghế flexible:
- Không yêu cầu lại các mã `B2`, `A1`, `B3`.
- Không cố dùng lại mã từ run pass trước: `B4`, `A2`, `A4`.
- Khi bot đưa seat map hoặc danh sách còn trống, chọn ngay 1 mã thuộc `Phòng Đôi Nằm 2 Khách Dưới 140kg` và 2 mã thuộc `Phòng Đơn Lớn Nằm 1 Khách`.
- Nếu có nhiều lựa chọn, ưu tiên cùng tầng/gần nhau, nhưng shape đúng quan trọng hơn vị trí.
- Khi chọn mã, luôn nói rõ loại theo từng mã, ví dụ: `<mã đôi> phòng đôi, <mã đơn 1> và <mã đơn 2> phòng đơn lớn`.
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

Điểm đón/trả không endpoint:
- Ưu tiên điểm đón: `Văn Phòng Thủ Đức`.
- Ưu tiên điểm trả: `Ngã ba Liên Khương`.
- Nếu bot không gợi ý đúng 2 điểm trên, chọn điểm đón/trả live khác miễn không phải endpoint đầu/cuối tuyến.
- Nếu bot gợi ý cả endpoint và non-endpoint, luôn chọn non-endpoint.
- Khi trả lời, nói rõ cả điểm đón và điểm trả trong cùng lượt để đi tiếp.

Validation:
- Thành công nếu booking/summary hiển thị từng mã đã chọn kèm đúng loại phòng/ghế và tổng tiền hợp lý.
- Thành công mạnh hơn nếu booking giữ được 3 tên/SĐT khác nhau theo từng mã.
- Fail nếu bot dùng một tên/SĐT chung cho cả 3 mã sau khi planner đã gửi mapping 3 khách riêng.
- Fail nếu bot tính sai shape, ví dụ 3 phòng đơn hoặc 2 phòng đôi.
- Fail nếu booking cuối cùng dùng `Văn Phòng Tân Bình` hoặc `Văn Phòng Đà Lạt` làm điểm đón/trả final.

Điểm dừng:
- `success:pre_booking_summary_preserves_seat_type_passenger_mapping_and_non_endpoint_stops` nếu bot đã summary đúng mã + loại phòng + 3 khách riêng + non-endpoint stops và đang chờ xác nhận.
- `success:booking_or_payment_created` nếu có mã vé/mã đặt chỗ/link thanh toán.
