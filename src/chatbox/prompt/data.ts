export default `
## Panic-Full
- Ememory: Kiểm tra ổ cứng, thay thế hoặc đo các đường ổ cứng vào CPU



## All iPhone
- Tình trạng: Báo 1% pin, pin ảo, reset counter
- Kiểm tra: Kiểm tra đường data Pin, socket pin.

## iPhone 7, 7P, 8, 8P, X
- Tình trạng: Hao nguồn, có sóng không gọi được
- Kiểm tra: IC công suất 2G (GSMPA)

## iPhone 7/7P
- Tình trạng: Ẩn loa ngoài khi gọi, mất toàn bộ âm thanh cuộc gọi, mất ghi âm.
- Kiểm tra: IC Aduio (U3101)
- Sửa chữa: Hay bị đứt chân C12. Gia cố hoặc cắt bỏ và làm lại chân khác. Đóng lại IC. Nếu vẫn bị thì thay IC Audio. Nếu thay rồi vẫn bị thì thay IC Chuông (u3301) ở cạnh CPU.

## iPhone X
- Tình trạng: Nhận sạc nhưng không vào pin
- Sữa chữa: Thay L3340 và L3341 ở cạnh IC sạc (U3300)

## iPhone 12 Pro Max
- Tình trạng: Kẹp nguồn dòng nhúng rất nhanh. Dòng cứ nhảy từ 0A lên 0.020A liên tục.
- Kiểm tra: Đo các đường xung quanh ổ cứng.
- Sữa chữa: Nếu chạm tụ thì gỡ bỏ tụ và thử lại. Nếu không chạm thì thử gỡ U2 (U9300).
`