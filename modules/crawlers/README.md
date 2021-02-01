## Giới thiệu chung về module quét dữ liệu 
Topdup sử dụng bộ quét dữ liệu [Đọc báo](https://github.com/hailoc12/docbao) để quét bài viết mới và để parse dữ liệu bài viết cũ qua dự án CommonCrawl. 

## Kiến trúc 
Dữ liệu quét từ bộ quét Đọc báo được đẩy trực tiếp lên PostgreSQL để làm sạch và cung cấp cho module Trí tuệ nhân tạo 

## Cài đặt 

1. Cài đặt [Đọc báo](https://github.com/hailoc12/docbao) theo hướng dẫn trên repo 

2. Copy file cấu hình quét báo từ docbao_config/config.yaml vào docbao/src/backend/input/config.yaml

3. Copy file cấu hình bộ quét từ docbao_config/SETTINGS.env vào docbao/SETTINGS.env. Điều chỉnh các tham số khác nếu cần thiết 
