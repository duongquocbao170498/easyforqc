# AI-726 Tiến Oanh Seat Type Booking Regression

Create a reusable local Chatwoot regression suite for Jira AI-726.

Jira context:
- Key: AI-726
- Summary: Lỗi input tool `bms_create_booking_tool` chưa có thông tin loại ghế mà khách chọn dẫn đến trả ra phí sai lệch.
- Product: Tiến Oanh bus booking flow.
- Core bug: when a selected seat code belongs to multiple price/seat options, the final booking payload must preserve the exact customer-selected seat type / room type for each selected code. `bms_create_booking_tool` must not receive ambiguous seat codes without the corresponding `seat_group.name` / selected price option context.

Primary replay from Jira:
1. User: `Bạn ơi cho Mình đặt 3 vé đi Sài gòn đà lạt vào chiều tối ngày mai nha`
2. User: `23h30 nha`
3. User: `phòng đôi b2, 2 ghế đơn A1 và B3`
   - Important: at least one selected seat code may appear in multiple seat/price groups.
   - The bot must preserve that B2 is selected as a double room, and A1/B3 are selected as single large rooms/seats if tool data supports that mapping.
4. User: `Văn Phòng Tân Bình đến Công viên Đức Trọng nha`
5. User: `Ghế đôi dùng thông tin này Thiện Thần Thánh - 0908375751. Ghế đơn lớn Khánh Sky - 0908765432, Thiện Thị Khánh - 0901234567`
6. User: `oke xác nhận nha`

Expected behavior:
- Bot must not collapse selected seats into a generic `Loại ghế`, `ghế đã chọn`, or only `B2, A1, B3`.
- Every confirmation summary before final booking must show each selected seat/room with exact customer-facing type and price:
  - B2 as `Phòng Đôi...` / double room, not single room.
  - A1 and B3 as the correct single room/seat type from live `price_options`.
- Bot must keep passenger/contact mapping distinct:
  - B2 / double room -> Thiện Thần Thánh - 0908375751.
  - A1/B3 single large rooms -> Khánh Sky - 0908765432 and Thiện Thị Khánh - 0901234567, but if the mapping is ambiguous, bot must ask exactly one clarification question before final confirmation.
- Final confirmed amount must match the sum of the selected exact seat/room tuples, not a lowest-price generic fare.
- On final user confirmation, bot should call the booking flow only after the summary matches the selected seat breakdown.

Suite requirements:
- Use Vietnamese user prompts.
- Use fresh Chatwoot conversations.
- Leave `inbox_id`, `ui_inbox_id`, and `captain_assistant_id` null unless caller injects them at runtime.
- Include labels `ai`, `bus`, `booking`.
- Include one main replay case with the full Jira sequence.
- Include one focused ambiguity case where the user says `B2 phòng đôi` then later gives contact info, to ensure the bot does not remap B2 to a single-room option.
- Include one negative expectation case phrased as positive regex/contains checks because the runner only supports positive matching. The expectations should look for correct terms like `B2`, `Phòng Đôi`, `A1`, `B3`, `Phòng Đơn`, and contact names in summary steps.
- Do not require exact ticket code success in expectations because local BMS create booking may fail or be stubbed. The key validation is the pre-booking summary and handoff/tool result not contradicting the seat breakdown.
