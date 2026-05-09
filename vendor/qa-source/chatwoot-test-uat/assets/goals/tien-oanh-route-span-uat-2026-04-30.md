# Goal

Plan a local Chatwoot adaptive route-span booking suite for Tiến Oanh on UAT.

## Scope

- operator: Tiến Oanh
- company_id: 2
- environment: local `/webhook/chatwoot` with real Chatwoot polling
- planner mode: autonomous via Codex at runtime
- max_user_turns: 15

## Hard Requirements

- one fresh conversation per case
- all turns inside one case stay in the same conversation
- suite size must be at least 50 cases
- cover every live passenger trip schedule returned for 01-05-2026
- prefer pickup/dropoff different from route endpoint when available
- mix 1-ticket and 2-ticket bookings
- for 2-ticket bookings, seed distinct passenger name/phone for each ticket

## Live Inventory Summary

- Sài Gòn - Đà Lạt | base_trip_id=10613349 | schedules=7 | pickup=Bến Xe Miền Đông Mới | dropoff=Ngã 3 Madagui
- Sài Gòn - Đăk Lăk (BXMĐ) | base_trip_id=32628284 | schedules=2 | pickup=Văn Phòng Thủ Đức | dropoff=Chợ Hoà Phú
- Sài Gòn - Đăk Lăk (TB - BXMĐ) | base_trip_id=32643669 | schedules=8 | pickup=Văn Phòng Thủ Đức | dropoff=Cây Xăng Kiến Tạo Đắk Song
- Sài Gòn - Đăk Lăk (TB - NTG) | base_trip_id=32644647 | schedules=13 | pickup=Ngã Tư Chợ Đình | dropoff=Cây Xăng Kiến Tạo Đắk Song
- Đà Lạt - Sài Gòn | base_trip_id=10613491 | schedules=2 | pickup=Ngã 3 Tượng Phật | dropoff=Bưu điện Trảng Bom
- Đà Lạt - Sài Gòn (N) | base_trip_id=16801395 | schedules=5 | pickup=Vòng xoay Liên Khương | dropoff=Bến xe Ngã 4 Ga
- Đăk Lăk - Sài Gòn (BXMĐ - TB) | base_trip_id=32643682 | schedules=7 | pickup=Hồ Tây Đắk Mil | dropoff=Phí Tân Lập
- Đăk Lăk - Sài Gòn (NTG - TB) | base_trip_id=32644662 | schedules=11 | pickup=Hồ Tây Đắk Mil | dropoff=Phí Lái Thiêu

## Output Policy

- suite should be safe for adaptive multi-turn execution through `interactive_chatwoot_loop.py`
- stop evidence should prefer payment link or booking/ticket code in bot replies
- suite was generated from live tool output to avoid route hallucination and ensure full trip coverage
