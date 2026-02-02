# Tính Năng Chi Tiết Sản Phẩm - X-Sneaker

## 📋 Tổng Quan

Đã thiết kế và triển khai đầy đủ chức năng chọn màu sắc, size giày và hiển thị giới tính phù hợp với cấu trúc dữ liệu Firebase.

## 🎨 Các Tính Năng Đã Triển Khai

### 1. **Chọn Màu Sắc (Color Selection)**
- ✅ Hiển thị động các màu sắc từ Firebase
- ✅ Button màu với preview trực quan
- ✅ Hỗ trợ màu đơn và màu gradient (ví dụ: Đen/Trắng, Đỏ/Đen)
- ✅ Highlight màu đang chọn với border primary
- ✅ Hiển thị tên màu đang chọn

**Màu sắc được hỗ trợ:**
- Đen, Trắng, Đỏ, Đỏ Thẫm
- Xanh Dương, Xanh Lá, Xanh Navy
- Vàng, Hồng, Xám, Nâu, Cam, Tím, Be
- Các màu kết hợp: Đen/Trắng, Đen/Đỏ, Trắng/Xanh, v.v.

### 2. **Chọn Size Giày (Size Selection)**
- ✅ Hiển thị động các size từ Firebase
- ✅ Hỗ trợ size theo số (37, 38, 39, ..., 45)
- ✅ Highlight size đang chọn
- ✅ Disable các size hết hàng (nếu có)
- ✅ Responsive grid layout (4 cột)

### 3. **Hiển Thị Giới Tính (Gender Display)**
- ✅ Hiển thị thông tin giới tính của sản phẩm
- ✅ Hỗ trợ 3 loại: Nam, Nữ, Unisex
- ✅ Icon và style đẹp mắt
- ✅ Dữ liệu lấy từ Firebase

### 4. **Tích Hợp Firebase**
- ✅ Tải dữ liệu sản phẩm từ Firebase Realtime Database
- ✅ Cấu trúc dữ liệu chuẩn
- ✅ Xử lý lỗi khi không tìm thấy sản phẩm

## 📂 Cấu Trúc Dữ Liệu Firebase

### Sản Phẩm (Product Object)

```json
{
  "prod_001": {
    "brand": "Nike",
    "category": "basketball",
    "colors": ["Đỏ Thẫm", "Đen/Đỏ", "Trắng/Đỏ"],
    "gender": "unisex",  // "male", "female", "unisex"
    "sizes": [38, 39, 40, 41, 42, 43, 44, 45],
    "name": "Nike Air Jordan 1 Retro High OG",
    "description": "Mô tả sản phẩm...",
    "price": 4500000,
    "originalPrice": 4500000,
    "discount": 0,
    "images": ["url1", "url2"],
    "rating": 4.9,
    "reviews": 524,
    "stock": 48,
    "sold": 412,
    "isBestSeller": true,
    "isNew": false,
    "featured": true,
    "createdAt": 1735689600000,
    "updatedAt": 1737331200000
  }
}
```

### Các Trường Quan Trọng

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `colors` | Array<string> | Danh sách màu sắc có sẵn |
| `sizes` | Array<number> | Danh sách size giày (số) |
| `gender` | string | Giới tính: "male", "female", "unisex" |
| `images` | Array<string> | Danh sách URL hình ảnh |
| `price` | number | Giá bán (VNĐ) |
| `originalPrice` | number | Giá gốc (VNĐ) |

## 🎯 Cách Sử Dụng

### Truy cập trang chi tiết sản phẩm:
```
Product-detail.html?id=prod_001
```

### Tương tác:
1. **Chọn màu**: Click vào button màu muốn chọn
2. **Chọn size**: Click vào size giày phù hợp
3. **Xem giới tính**: Tự động hiển thị ở trên phần chọn màu
4. **Thêm vào giỏ**: Click "Thêm Vào Giỏ" với màu và size đã chọn

## 📦 8 Sản Phẩm Mẫu

Đã tạo 8 sản phẩm mẫu đầy đủ trong Firebase:

1. **prod_001** - Nike Air Jordan 1 Retro High OG (Unisex)
   - Màu: Đỏ Thẫm, Đen/Đỏ, Trắng/Đỏ
   - Size: 38-45

2. **prod_002** - Adidas Superstar Classic (Unisex)
   - Màu: Trắng, Đen, Xanh Navy
   - Size: 36-43

3. **prod_003** - Nike Air Zoom Pegasus 40 (Nam)
   - Màu: Đen, Xanh Dương, Trắng/Xám
   - Size: 39-45

4. **prod_004** - New Balance 550 White Green (Unisex)
   - Màu: Trắng/Xanh Lá, Xám/Xanh Navy, Be/Nâu
   - Size: 37-44

5. **prod_005** - Adidas Ultraboost 23 (Nữ)
   - Màu: Đen/Trắng, Trắng, Xanh Dương
   - Size: 36-42

6. **prod_006** - Nike Dunk Low Panda (Unisex)
   - Màu: Đen/Trắng, Xanh Dương/Trắng, Hồng/Trắng
   - Size: 36-44

7. **prod_007** - Vans Old Skool Black/White (Unisex)
   - Màu: Đen, Trắng, Đỏ, Xanh Navy
   - Size: 37-44

8. **prod_008** - Converse Chuck Taylor All Star (Unisex)
   - Màu: Đen, Trắng, Đỏ, Xanh Navy, Vàng
   - Size: 35-44

## 🛠️ Các File Đã Chỉnh Sửa

### 1. Product-detail.html
- ✅ Thêm container cho chọn màu (`#color-container`)
- ✅ Thêm phần hiển thị giới tính (`#product-gender`)
- ✅ Thêm label hiển thị màu đang chọn (`#selected-color-name`)
- ✅ Cải thiện UI/UX

### 2. js/product-detail.js
- ✅ Cập nhật `renderProductData()` - hiển thị gender
- ✅ Cập nhật `renderColorVariants()` - render màu động từ Firebase
- ✅ Cập nhật `renderSizes()` - render size số từ Firebase
- ✅ Cập nhật `updateSelectedColorName()` - cập nhật tên màu
- ✅ Logic chọn màu và size hoàn chỉnh

### 3. x-sneaker-default-rtdb-export.json
- ✅ Thêm 7 sản phẩm mẫu mới (prod_001 đến prod_008)
- ✅ Đầy đủ thông tin: colors, sizes, gender, images
- ✅ Đa dạng brand: Nike, Adidas, New Balance, Vans, Converse

## 🎨 Mapping Màu Sắc

Hệ thống tự động map tên màu tiếng Việt sang mã màu CSS:

```javascript
const colorMap = {
    'Đỏ': '#E30B17',
    'Đỏ Thẫm': '#E30B17',
    'Đen': '#000000',
    'Trắng': '#FFFFFF',
    'Xanh Dương': '#2563EB',
    'Xanh Lá': '#22C55E',
    'Vàng': '#FACC15',
    'Hồng': '#EC4899',
    'Xám': '#6B7280',
    'Nâu': '#92400E',
    'Cam': '#F97316',
    'Tím': '#9333EA',
    'Be': '#D4A373',
    'Navy': '#1E3A8A',
    // Gradient colors
    'Đen/Trắng': 'linear-gradient(90deg, #000000 50%, #FFFFFF 50%)',
    'Đen/Đỏ': 'linear-gradient(90deg, #000000 50%, #E30B17 50%)',
    ...
};
```

## 🔄 Flow Hoạt Động

1. **Load Product**: 
   - Lấy `id` từ URL parameter
   - Fetch dữ liệu từ Firebase `/products/{id}`

2. **Render Product**:
   - Hiển thị tên, mô tả, giá
   - Render gallery hình ảnh
   - Hiển thị gender
   - Render color buttons
   - Render size buttons

3. **User Interaction**:
   - User chọn màu → Update `selectedColor`
   - User chọn size → Update `selectedSize`
   - User click "Thêm vào giỏ" → Tạo cart item với màu & size đã chọn

4. **Add to Cart**:
   ```javascript
   {
     id: "prod_001",
     name: "Nike Air Jordan 1",
     color: "Đỏ Thẫm",
     size: 42,
     quantity: 1,
     price: 4500000,
     image: "..."
   }
   ```

## 📱 Responsive Design

- ✅ Mobile: Color grid responsive
- ✅ Tablet: Size grid 4 cột
- ✅ Desktop: Layout 2 cột (gallery + info)

## 🚀 Test & Demo

### Test trên local:
1. Mở `Product-detail.html?id=prod_001` (hoặc prod_002, prod_003, ...)
2. Kiểm tra:
   - [ ] Màu sắc hiển thị đúng
   - [ ] Size hiển thị đúng
   - [ ] Gender hiển thị đúng
   - [ ] Click chọn màu hoạt động
   - [ ] Click chọn size hoạt động
   - [ ] Thêm vào giỏ với màu + size đúng

## 📝 Ghi Chú

- Tất cả dữ liệu được lấy động từ Firebase
- Không hard-code màu, size trong HTML
- Hỗ trợ mở rộng thêm màu mới bằng cách thêm vào `colorMap`
- Size format: số thuần túy (37, 38, ...) thay vì "US 7", "US 8"

## 🎯 Kế Hoạch Tương Lai

- [ ] Thêm stock cho từng màu + size cụ thể
- [ ] Filter sản phẩm theo gender
- [ ] Quick view modal
- [ ] Zoom hình ảnh
- [ ] 360° product view
- [ ] Size recommendation AI

---

**Tác giả**: X-Sneaker Development Team  
**Ngày cập nhật**: 2026-02-02  
**Version**: 2.0.0
