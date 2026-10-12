# Quán Cháo Đầu Hẻm — frontend

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

## Cấu trúc

- `src/game.js`: bộ luật local và catalog, độc lập React.
- `src/App.jsx`: giao diện, minh họa SVG, modal và tương tác.
- `src/index.css`: responsive và phong cách quán Việt.
- `src/game.test.js`: kiểm thử kinh tế, nấu, giao món và vòng ca.

Ảnh nhân vật/tô được vẽ bằng SVG trong code, không lấy asset game tham chiếu. Font Google có fallback hệ thống khi mất mạng. Giai đoạn tiếp theo: cân bằng gameplay, lưu backup/xuất nhập, rồi adapter backend như kế hoạch.
