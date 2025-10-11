export default `
# Panic-Full
- Ememory: Kiểm tra ổ cứng, thay thế hoặc đo các đường ổ cứng vào CPU



# Các bệnh thường gặp
## All iPhone
- Tình trạng: Máy báo 1% pin, pin ảo, reset counter
- Kiểm tra: Kiểm tra đường data Pin, socket pin.
- Sửa chữa: Nếu socket còn tốt thì nâng các đường data pin lên, nếu socket đã hỏng thì thay socket mới.

## iPhone 7/7P, 8/8P (intel only)
- Tình trạng: Hao nguồn + có sóng không gọi được
- Kiểm tra: IC công suất 2G (GSMPA)
- Sửa chữa: Thay IC công suất 2G (GSMPA)

## iPhone 7/7P (qualcomm, intel)
- Tình trạng: Ẩn loa ngoài cuộc gọi, mất toàn bộ âm thanh cuộc gọi, mất ghi âm.
- Kiểm tra: IC Aduio (U3101)
- Sửa chữa: Nếu các chân IC còn tốt thì cạo lớp sơn từ chân C12 đến R1103 và bồi thêm chì vào đường dẫn. Sau đó phủ keo UV kín chân C12 và đường vừa bồi chì. Sau đó cạo lớp keo UV tại chân C12 rồi đóng lại IC.
- Hiếm gặp: Nếu đã làm hết nhưng vẫn bị thì thay IC Audio (U3101). Nếu đã thay vẫn lỗi thì thay thế IC Chuông trên (U3301) nằm trên CPU.

## iPhone X
- Tình trạng: Cấm sạc, báo sạc nhưng không vào pin
- Kiểm tra: Kiểm tra L3340 và L3341 ở gần IC sạc (U3300)
- Sữa chữa: Thay L3340 và L3341

## iPhone 12 Pro Max
- Tình trạng: Kẹp nguồn dòng nhúng rất nhanh. Dòng cứ nhảy từ 0A lên 0.020A liên tục.
- Kiểm tra: Đo các đường xung quanh ổ cứng.
- Sữa chữa: Nếu chạm tụ thì gỡ bỏ tụ và thử lại. Nếu không chạm thì thử gỡ U2 (U9300) ra và kiểm tra lại.
`