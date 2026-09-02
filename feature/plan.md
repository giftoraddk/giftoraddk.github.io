# Product Plan — Part-time Talent Marketplace

## 1. Mục tiêu sản phẩm

Xây dựng marketplace kết nối:

* **Người thuê (Employer/Client)**: tìm và thuê người làm bán thời gian.
* **Người làm (Talent/User)**: cung cấp kỹ năng, nhận việc và xây dựng uy tín.
* **Nền tảng**: xác thực chuyên môn, quản lý giao dịch, đánh giá, xu và bảo vệ thông tin liên hệ.

### Giá trị cốt lõi

> Tìm đúng người → kiểm chứng năng lực → thương lượng → thanh toán → hoàn thành → đánh giá → tích lũy uy tín.

---

# 2. Mô hình User

Mỗi tài khoản có thể hoạt động ở một hoặc cả hai vai trò:

| Role     | Chức năng                    |
| -------- | ---------------------------- |
| Talent   | Cung cấp dịch vụ / nhận việc |
| Employer | Tìm kiếm / thuê Talent       |
| Both     | Vừa thuê vừa nhận việc       |

---

# 3. Talent Card

Card phải đủ thông tin để Employer quyết định nhanh mà không cần mở hồ sơ.

```md
## 👨‍💻 Nguyễn Minh An
**Backend Developer · Mid-level · 4 năm**

🛠️ `Node.js` `Python` `PostgreSQL` `AWS`

🏢 **Professional Verified**
⭐ **4.9/5** · 28 đánh giá · 23 khách đã thuê

> Backend/API, SaaS, tích hợp hệ thống.

⏱️ 15–20h/tuần · 🌐 Remote
💰 300K–450K/giờ
🟢 Đang nhận việc

**[ Xem hồ sơ ] [ Đề nghị thuê ]**
```

---

# 4. Các loại xác thực

## 4.1. Business Verified

Talent được tổ chức/công ty xác nhận chuyên môn.

Ví dụ:

```text
🏢 Professional Verified
Được xác thực bởi Công ty ABC
```

Có thể xác thực:

* Chức danh
* Thời gian làm việc
* Bộ phận
* Kỹ năng
* Chứng chỉ
* Kinh nghiệm chuyên môn

Không nhất thiết công khai toàn bộ thông tin nội bộ của công ty.

---

## 4.2. Transaction Verified

Talent không có công ty xác nhận nhưng đã có giao dịch thật trên nền tảng.

```text
👤 Transaction Verified
31 giao dịch hoàn tất
```

Điều kiện:

```text
Job được tạo
      ↓
Talent nhận job
      ↓
Thanh toán
      ↓
Job hoàn thành
      ↓
Employer xác nhận
      ↓
Review
      ↓
Transaction Verified
```

---

## 4.3. Rating Verified

Chỉ tính đánh giá phát sinh từ giao dịch thực tế.

Không cho phép:

* Tự tạo review
* Review từ người chưa thuê
* Import review không xác minh
* Một giao dịch tạo nhiều review

---

# 5. Rating System

## Talent Rating

```text
⭐ Overall: 4.9/5

Quality       ⭐ 4.9
Communication ⭐ 5.0
Deadline      ⭐ 4.8
Professional  ⭐ 4.9
Value         ⭐ 4.8
```

## Review

Mỗi review gồm:

* Rating
* Comment
* Job đã thuê
* Thời gian
* Client
* Trạng thái giao dịch

Ví dụ:

```text
⭐ 5.0

"Hoàn thành đúng deadline, giao tiếp tốt và
xử lý yêu cầu phát sinh rất nhanh."

— Minh T.
Backend API Development
Verified Transaction · 08/2026
```

---

# 6. Profile Detail

Khi bấm **Xem hồ sơ**, mở Professional Profile.

## Header

* Avatar
* Name
* Professional title
* Experience
* Availability
* Location
* Rate
* Verification
* Rating

## Skills

```text
Node.js
Python
PostgreSQL
AWS
Docker
REST API
```

## Work History

Hiển thị:

* Số dự án
* Số giao dịch hoàn thành
* Tỷ lệ hoàn thành
* Tỷ lệ đúng hạn
* Tổng số khách hàng

## Reviews

Hiển thị review thật từ giao dịch trên app.

## Verification

```text
🏢 Professional Verified
👤 28 Verified Transactions
⭐ 4.9/5
🏆 Top Rated
```

---

# 7. Hệ thống Xu (Credit System)

Để thuê Talent, Employer cần sử dụng **Xu** của nền tảng.

## Mục đích

Xu được dùng cho:

* Gửi yêu cầu thuê
* Gửi proposal
* Mở thông tin liên hệ
* Tạo giao dịch
* Một số tính năng premium

## Ví dụ

```text
Ví Xu

🪙 1,250 Xu

[ + Mua Xu ]

Lịch sử:
+ 1,000 Xu     Mua gói
- 50 Xu        Gửi proposal
- 100 Xu       Mở contact
+ 20 Xu        Hoàn Xu
```

---

# 8. Không để Xu làm mất cân bằng marketplace

Nên tránh mô hình:

> Muốn xem hồ sơ → mất Xu.

Hồ sơ cơ bản nên **được xem miễn phí**.

Xu chủ yếu dùng khi Employer có ý định **thực hiện hành động có giá trị**.

Ví dụ:

| Action                           |   Xu |
| -------------------------------- | ---: |
| Xem card                         | Free |
| Xem profile                      | Free |
| Xem review                       | Free |
| Gửi proposal                     |   50 |
| Yêu cầu thuê                     |  100 |
| Mở contact sau khi Talent đồng ý |  100 |
| Featured request                 |  200 |

Các con số trên chỉ là **giả định để thiết kế UX**, cần A/B test sau này.

---

# 9. Ẩn thông tin liên hệ

Các thông tin nhạy cảm:

```text
Phone
Email
Zalo
WhatsApp
Telegram
Địa chỉ cụ thể
```

Không hiển thị trực tiếp trên card/profile.

Ví dụ:

```text
📞 +84 *** *** 123
✉️ n***@gmail.com
```

Hoặc:

```text
📞 Phone: ********
✉️ Email: ********
```

---

# 10. Contact Unlock

Thông tin liên hệ chỉ được mở khi đủ điều kiện.

### Flow đề xuất

```text
Employer
   ↓
Xem Profile
   ↓
Đề nghị thuê
   ↓
Talent chấp nhận
   ↓
Employer thanh toán / sử dụng Xu
   ↓
Contact được mở
   ↓
Phone / Email hiển thị
```

Tốt hơn nữa, trong giai đoạn trước khi thuê nên có **Chat nội bộ** để hai bên trao đổi mà không cần lộ contact.

---

# 11. Negotiation — Thương lượng giá

Talent có:

```text
Rate:
300K–450K / giờ
```

Employer có thể gửi proposal.

## Proposal

```text
Talent:
Nguyễn Minh An

Rate hiện tại:
400K/giờ

Employer đề xuất:
350K/giờ

Số giờ:
20h/tuần

Thời gian:
4 tuần

Tổng dự kiến:
28,000,000 VNĐ

Lời nhắn:
"Team cần hỗ trợ backend trong 4 tuần.
Có thể làm 20h/tuần."

[ Gửi đề nghị ]
```

---

# 12. Negotiation Flow

```text
Employer
   ↓
Đề nghị 350K/h
   ↓
Talent
   ├── Chấp nhận
   │      ↓
   │   Tạo Deal
   │
   ├── Từ chối
   │
   └── Đề xuất lại
          ↓
       380K/h
          ↓
       Employer
          ↓
       Chấp nhận
          ↓
       Tạo Deal
```

Có thể thương lượng:

* Giá/giờ
* Số giờ/tuần
* Tổng số giờ
* Thời gian dự án
* Ngày bắt đầu
* Ngày kết thúc
* Scope công việc

---

# 13. Deal

Sau khi hai bên thống nhất:

```text
DEAL #10293

Talent:
Nguyễn Minh An

Rate:
380,000 VNĐ/giờ

Expected hours:
20 giờ/tuần

Duration:
4 tuần

Estimated total:
30,400,000 VNĐ

Start:
01/09/2026

Status:
🟡 Waiting for payment
```

---

# 14. Payment Flow

Nên thiết kế theo hướng **escrow / giữ tiền theo giao dịch** nếu mô hình pháp lý và payment provider hỗ trợ.

```text
Employer
   ↓
Thanh toán
   ↓
Platform giữ tiền
   ↓
Talent thực hiện công việc
   ↓
Employer xác nhận
   ↓
Release payment
   ↓
Talent nhận tiền
```

Mục tiêu:

> Employer yên tâm trả tiền — Talent yên tâm rằng tiền đã được đảm bảo.

---

# 15. Job Lifecycle

```text
Draft
  ↓
Published
  ↓
Proposal Received
  ↓
Negotiating
  ↓
Hired
  ↓
In Progress
  ↓
Submitted
  ↓
Completed
  ↓
Reviewed
```

Các trạng thái ngoại lệ:

```text
Cancelled
Disputed
Refunded
Expired
```

---

# 16. Employer Flow

```text
Đăng nhập
   ↓
Tìm kiếm Talent
   ↓
Filter
   ├── Skill
   ├── Rate
   ├── Rating
   ├── Experience
   ├── Location
   ├── Availability
   └── Verification
   ↓
Xem Card
   ↓
Xem Profile
   ↓
Xem Reviews
   ↓
Gửi Proposal
   ↓
Thương lượng
   ↓
Talent Accept
   ↓
Thanh toán / Xu
   ↓
Contact Unlock
   ↓
Làm việc
   ↓
Complete
   ↓
Review
```

---

# 17. Talent Flow

```text
Đăng ký
   ↓
Tạo Professional Profile
   ↓
Khai báo Skills
   ↓
Khai báo Rate
   ↓
Khai báo Availability
   ↓
Professional Verification
   ↓
Profile Published
   ↓
Nhận Proposal
   ↓
Negotiation
   ↓
Accept
   ↓
Work
   ↓
Complete
   ↓
Nhận tiền
   ↓
Nhận Review
   ↓
Tăng Reputation
```

---

# 18. Marketplace Categories

Nên thiết kế category linh hoạt để không giới hạn marketplace vào IT.

### Technology

* Frontend Developer
* Backend Developer
* Mobile Developer
* QA Tester
* DevOps
* Data Analyst
* AI/ML

### Design

* Graphic Designer
* UI/UX Designer
* Illustrator
* 3D Designer
* Video Editor

### Marketing

* Digital Marketing
* SEO
* Content Creator
* Social Media
* Ads Specialist

### Business

* Accountant
* Business Consultant
* Sales
* Customer Support
* Virtual Assistant

### Education

* English Tutor
* Math Tutor
* Programming Tutor
* Music Teacher

### Creative

* Photographer
* Videographer
* Writer
* Voice Actor
* MC

### Local Services

* Electrician
* Plumber
* Repair Technician
* Cleaner
* Event Staff

Category nên là **data-driven**, không hard-code vào UI để sau này có thể thêm ngành nghề.

---

# 19. Search & Filter

Các filter quan trọng:

```text
Category
Skill
Location
Remote / On-site
Rate
Availability
Experience
Rating
Completed Jobs
Verification
Languages
```

Ví dụ:

```text
Backend Developer
+
Remote
+
> 4.5 ⭐
+
Professional Verified
+
300K–500K/hour
+
Available this week
```

---

# 20. Reputation Score

Ngoài Rating nên có **Trust Score** riêng.

Ví dụ:

```text
TRUST SCORE: 94/100

Professional Verification    +30
Completed Jobs                +25
Rating                        +20
On-time completion            +10
Repeat clients                +5
Account history               +4
```

Không nên để Trust Score hoàn toàn phụ thuộc vào rating.

---

# 21. Badges

Các badge nhỏ trên card:

```text
🏢 Professional Verified
👤 Transaction Verified
⭐ Top Rated
🏆 Top Performer
⚡ Fast Response
🎯 High Completion
🔄 Repeat Hire
```

Mỗi badge phải có **tiêu chí rõ ràng** và có thể xem chi tiết khi click.

---

# 22. Privacy & Anti-Circumvention

Đây là phần rất quan trọng với marketplace.

Trước khi thuê:

```text
Phone → Hidden
Email → Hidden
Zalo → Hidden
WhatsApp → Hidden
Telegram → Hidden
```

Cho phép:

```text
Platform Chat → Available
Proposal → Available
Negotiation → Available
File attachment → Available
```

Hệ thống có thể phát hiện:

* Số điện thoại trong chat
* Email
* Link website
* Zalo ID
* Telegram username

và cảnh báo hoặc che thông tin tùy policy.

Mục tiêu là giảm việc:

> User tìm thấy nhau trên app → chuyển ra ngoài → giao dịch ngoài nền tảng.

---

# 23. Profile Information Architecture

```text
PROFILE

├── Overview
│   ├── Name
│   ├── Title
│   ├── Bio
│   ├── Skills
│   └── Availability
│
├── Verification
│   ├── Professional
│   ├── Transaction
│   └── Badges
│
├── Experience
│   ├── Work History
│   ├── Portfolio
│   └── Projects
│
├── Reviews
│   ├── Overall
│   ├── Rating breakdown
│   └── Comments
│
└── Hire
    ├── Rate
    ├── Negotiation
    ├── Proposal
    └── Contact unlock
```

---

# 24. MVP — Giai đoạn 1

Ưu tiên xây:

* User authentication
* Talent profile
* Employer profile
* Talent card
* Search
* Filter
* Skills
* Availability
* Rating
* Review
* Transaction history
* Professional verification
* App transaction verification
* Internal chat
* Proposal
* Negotiation
* Xu
* Hire
* Contact masking

### Chưa cần ngay

* Trust Score phức tạp
* AI matching
* Subscription
* Advanced analytics
* Recommendation engine
* Gamification

---

# 25. Phase 2

Sau khi marketplace có giao dịch thật:

* Escrow/payment
* Dispute system
* Advanced reputation
* Repeat hire
* Favorite Talent
* Saved search
* Notification
* Calendar
* Availability synchronization
* Portfolio verification
* Company verification portal

---

# 26. Phase 3

Khi đã có đủ dữ liệu:

```text
AI Talent Matching

Employer yêu cầu:
"Backend Node.js, 20h/tuần,
budget 400K/h"

        ↓

Matching Engine

        ↓

Candidate #1 — 96%
Candidate #2 — 93%
Candidate #3 — 89%
```

Matching dựa trên:

* Skills
* Experience
* Rating
* Availability
* Rate
* Previous job similarity
* Completion rate
* Employer preference

---

# 27. Nguyên tắc UX quan trọng

### Card

> **Không cần biết mọi thứ. Chỉ cần đủ để quyết định có click hay không.**

### Profile

> **Cung cấp bằng chứng để quyết định có thuê hay không.**

### Review

> **Chỉ review từ giao dịch thật.**

### Verification

> **Luôn nói rõ ai xác minh và xác minh điều gì.**

### Contact

> **Ẩn trước khi có giao dịch/đủ điều kiện.**

### Negotiation

> **Cho phép hai bên tự thương lượng nhưng mọi thỏa thuận cuối cùng phải trở thành Deal trên nền tảng.**

### Xu

> **Thu phí cho hành động có giá trị, không chặn việc khám phá marketplace.**

---

# 28. Core Marketplace Loop

```text
Talent đăng hồ sơ
       ↓
Professional Verification
       ↓
Talent xuất hiện trong Search
       ↓
Employer xem Card
       ↓
Employer xem Profile
       ↓
Xem Verified Reviews
       ↓
Gửi Proposal bằng Xu
       ↓
Negotiation
       ↓
Hai bên đồng ý
       ↓
Create Deal
       ↓
Payment
       ↓
Contact Unlock
       ↓
Work
       ↓
Complete
       ↓
Review
       ↓
Reputation tăng
       ↓
Talent dễ được thuê hơn
       ↓
Repeat Hire
```

## North Star Metric

**Completed Paid Jobs / tháng**

Không nên lấy số user đăng ký hoặc số profile làm metric chính.

Marketplace chỉ thực sự khỏe khi:

> **Có người tìm → có người được thuê → có tiền giao dịch → công việc hoàn thành → hai bên quay lại.**
