# Quán Cháo Cây Xoài — frontend

Game React/Vite chơi đơn trên trình duyệt, lấy thiết kế từ `plan.md`. Đây là bản frontend local, chưa có backend, tài khoản hoặc bảng xếp hạng.

## Chạy local

Yêu cầu Node.js 22 và npm. Trên PowerShell dùng `npm.cmd` nếu `npm.ps1` bị chặn.

```powershell
npm.cmd ci
npm.cmd run dev
```

Mở URL Vite in ra (mặc định http://127.0.0.1:3000). Không cần `.env`.

```powershell
npm.cmd test
npm.cmd run build
```

## Cách chơi

- Nhập hàng/nâng cấp trước ca. Ngày đầu có một nồi cháo được tặng.
- Chạm Mở hàng, chọn cháo nền, thịt, hành; chạm khách để giao.
- Yêu cầu không hành/thêm trứng xuất hiện khi tiến ngày. Bấm sai tô sẽ mất nguyên liệu.
- Hết cháo: bấm nồi, tiêu thụ gạo và chờ nấu.
- Ca dài 4 phút. Nút tạm dừng cho phép đóng quán sớm và tổng kết.
- Mở bảng phụ hoặc rời tab sẽ tạm dừng; bấm Tiếp tục để bán tiếp.
- Lưu tự động bằng localStorage, tải lại ca đang bán sẽ ở trạng thái tạm dừng. Chỉ mở một tab chơi để tránh ghi đè tiến trình.
- Cài đặt có hướng dẫn, bật/tắt âm thanh và xác nhận chơi lại.
- Nấu một mẻ trong 10 giây (nâng cấp bếp giảm còn tối thiểu 4 giây).
- Bánh quẩy: nhập 35.000đ / 10 bánh, khách gọi kèm trả thêm 8.000đ / bánh.
- Thuê theo ca: bếp 80.000đ tự nấu khi hết cháo; phục vụ 60.000đ tự làm và giao một đơn mỗi 5 giây nếu đủ nguyên liệu và tô người chơi đang trống.
- Marketing trả trước cho một ca: toptop 1.000.000đ (+5–7 khách), phở bò 500.000đ (+3–5 khách), truyền miệng 100.000đ/người (+1–3 khách/người). Hiệu quả cộng dồn mỗi 20 phút trong game = 20 giây chơi; tạm dừng không tính thời gian.
- Khách đông hơn khi mở hàng và khi đánh giá cao. Có 3 chỗ phục vụ; khách còn lại xếp hàng, thời gian kiên nhẫn bắt đầu khi tới lượt.
- Nhân viên và marketing hết hiệu lực cuối ca; chi phí được tính trong báo cáo. Tiến trình cũ vẫn dùng được.

## Cấu trúc

- `src/game.js`: bộ luật local và catalog, độc lập React.
- `src/App.jsx`: giao diện, minh họa SVG, modal và tương tác.
- `src/index.css`: responsive và phong cách quán Việt.
- `src/game.test.js`: kiểm thử kinh tế, nấu, giao món và vòng ca.

Ảnh nhân vật/tô được vẽ bằng SVG trong code, không lấy asset game tham chiếu. Font Google có fallback hệ thống khi mất mạng. Giai đoạn tiếp theo: cân bằng gameplay, lưu backup/xuất nhập, rồi adapter backend như kế hoạch.
