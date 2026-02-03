# Hướng Dẫn Sử Dụng Thanh Toán QR Code

## 🎯 Tổng Quan

Hệ thống thanh toán QR Code đã được tích hợp vào X-Sneaker để giả lập thanh toán chuyển khoản qua ngân hàng. Khi khách hàng thanh toán thành công qua QR, đơn hàng sẽ được tạo với trạng thái **"Chờ xử lý"** (pending) và hiển thị ở cả trang Admin và Account.

---

## 📋 Tính Năng Đã Thêm

### 1. **Module QR Payment** (`js/qr-payment.js`)
- Generate QR code sử dụng VietQR API (https://vietqr.io/)
- Hiển thị modal với QR code và thông tin thanh toán
- Giả lập xác nhận thanh toán (cho môi trường demo)
- Hỗ trợ callback khi thanh toán thành công/hủy

### 2. **Trang Checkout** (`Checkout.html` & `js/checkout.js`)
- Thêm phương thức thanh toán "Chuyển khoản QR Code"
- Xử lý logic thanh toán QR
- Tạo đơn hàng với status `pending` khi thanh toán QR thành công
- Tạo đơn hàng với status `processing` khi thanh toán COD

### 3. **Trang Admin** (`admin.html` & `js/admin/orders.js`)
- Thêm filter "Chờ xử lý" để lọc đơn hàng pending
- Thêm stat card hiển thị số lượng đơn hàng chờ xử lý
- Cập nhật dropdown status để có thể chuyển đơn từ pending sang processing/shipped/delivered/cancelled
- Badge màu cam cho status pending

### 4. **Trang Account** (`js/account.js`)
- Hiển thị đơn hàng pending trong lịch sử đơn hàng
- Badge màu cam cho status "Chờ xử lý"

---

## 🚀 Cách Sử Dụng

### **Bước 1: Đặt hàng với QR Code**

1. Thêm sản phẩm vào giỏ hàng
2. Vào trang Checkout
3. Chọn phương thức thanh toán: **"Chuyển khoản QR Code"**
4. Điền đầy đủ thông tin giao hàng
5. Click **"ĐẶT HÀNG"**

### **Bước 2: Thanh toán**

1. Modal QR Code sẽ hiển thị với:
   - Mã QR để quét
   - Thông tin ngân hàng (MB Bank)
   - Số tài khoản: 0123456789
   - Chủ TK: CONG TY X-SNEAKER
   - Số tiền cần thanh toán
   - Nội dung chuyển khoản

2. **Trong môi trường demo:**
   - Click nút **"Giả lập thanh toán"** để mô phỏng thanh toán thành công
   - Hệ thống sẽ tự động xác nhận sau 2 giây

3. **Trong production thực tế:**
   - Khách hàng quét QR bằng app ngân hàng
   - Hệ thống backend sẽ nhận webhook từ ngân hàng
   - Tự động xác nhận đơn hàng

### **Bước 3: Xác nhận đơn hàng**

Sau khi thanh toán thành công:
- Đơn hàng được lưu vào Firebase với status `pending`
- Giỏ hàng được xóa
- Redirect đến trang Account/Orders
- Hiển thị thông báo thành công

---

## 👨‍💼 Quản Lý Đơn Hàng (Admin)

### **Dashboard Orders**

1. Đăng nhập trang Admin
2. Vào section **"Quản Lý Đơn Hàng"**
3. Sẽ thấy:
   - Stat card **"CHỜ XỬ LÝ"** hiển thị số đơn hàng pending
   - Filter button **"Chờ xử lý"** để lọc đơn pending
   - Đơn hàng QR có badge màu cam "Chờ xử lý"

### **Xử Lý Đơn Hàng Pending**

1. Click vào icon **Edit (✏️)** ở cột Actions
2. Dropdown menu sẽ hiển thị các trạng thái:
   - **Chờ xử lý** (pending) - Màu cam
   - **Đang xử lý** (processing) - Màu vàng
   - **Đang giao** (shipped) - Màu xanh dương
   - **Đã giao** (delivered) - Màu xanh lá
   - **Đã hủy** (cancelled) - Màu đỏ

3. Chọn status mới để cập nhật

### **Workflow Xử Lý**

```
pending → processing → shipped → delivered
   ↓           ↓          ↓
cancelled  cancelled  cancelled
```

---

## 👤 Lịch Sử Đơn Hàng (User Account)

1. Vào trang **Account.html**
2. Tab **"Đơn Hàng"**
3. Xem danh sách đơn hàng với status:
   - **Chờ xử lý** - Đơn QR vừa thanh toán
   - **Đang xử lý** - Admin đã xác nhận
   - **Đang giao** - Đơn hàng đang vận chuyển
   - **Đã giao** - Hoàn thành
   - **Đã hủy** - Bị hủy

---

## ⚙️ Cấu Hình Ngân Hàng

Mở file `js/qr-payment.js` và chỉnh sửa:

```javascript
const BANK_CONFIG = {
    bankId: '970422',          // Mã ngân hàng (MB Bank)
    accountNo: '0123456789',   // Số tài khoản nhận tiền
    accountName: 'CONG TY X-SNEAKER',
    template: 'compact2'       // Template QR code
};
```

### **Các ngân hàng hỗ trợ:**

- **MB Bank**: `970422`
- **Vietcombank**: `970436`
- **Techcombank**: `970407`
- **VPBank**: `970432`
- **ACB**: `970416`
- **Sacombank**: `970403`

Xem danh sách đầy đủ tại: https://vietqr.io/danh-sach-ngan-hang

---

## 🔧 Tích Hợp Production

Để sử dụng thật trong môi trường production:

### 1. **Backend Webhook**

Cần tạo API endpoint nhận webhook từ ngân hàng:

```javascript
// Ví dụ: /api/payment/webhook
app.post('/api/payment/webhook', async (req, res) => {
    const { orderId, amount, transactionId, status } = req.body;
    
    // Verify webhook signature
    if (!verifyWebhookSignature(req)) {
        return res.status(401).send('Unauthorized');
    }
    
    // Update order status
    if (status === 'SUCCESS') {
        await updateOrderStatus(orderId, 'pending');
        await sendOrderConfirmationEmail(orderId);
    }
    
    res.status(200).send('OK');
});
```

### 2. **Polling Payment Status**

Thay thế hàm giả lập trong `qr-payment.js`:

```javascript
export async function checkPaymentStatus(orderId) {
    const response = await fetch(`/api/payment/check/${orderId}`);
    const data = await response.json();
    return data.paid;
}
```

### 3. **Tự động polling từ frontend:**

```javascript
let checkInterval = setInterval(async () => {
    const isPaid = await checkPaymentStatus(orderId);
    if (isPaid) {
        clearInterval(checkInterval);
        onSuccess();
    }
}, 3000); // Check mỗi 3 giây
```

---

## 📊 Cấu Trúc Dữ Liệu

### **Order Object trong Firebase**

```javascript
{
  orderId: "ORD-1707048923456",
  userId: "user123",
  customerInfo: {
    fullname: "Nguyễn Văn A",
    email: "user@example.com",
    phone: "0901234567",
    address: "123 Đường ABC",
    city: "TP.HCM"
  },
  customerName: "Nguyễn Văn A",
  customerPhone: "0901234567",
  items: [...],
  total: 2160000,
  subtotal: 2000000,
  tax: 160000,
  paymentMethod: "QR Transfer",  // hoặc "COD"
  status: "pending",              // pending | processing | shipped | delivered | cancelled
  createdAt: 1707048923456,
  updatedAt: 1707048923456
}
```

---

## 🎨 UI/UX Features

### **Modal QR Payment**
- Animation fade-in khi mở
- Responsive design
- Dark mode support
- Thông tin chi tiết rõ ràng
- Hướng dẫn thanh toán từng bước
- Nút "Giả lập thanh toán" cho testing

### **Status Colors**
- **Pending** (Chờ xử lý): Màu cam `#f97316`
- **Processing** (Đang xử lý): Màu vàng `#eab308`
- **Shipped** (Đang giao): Màu xanh dương `#3b82f6`
- **Delivered** (Đã giao): Màu xanh lá `#10b981`
- **Cancelled** (Đã hủy): Màu đỏ `#ef4444`

---

## 🐛 Troubleshooting

### **Lỗi: QR code không hiển thị**
- Kiểm tra kết nối internet
- Verify URL VietQR API
- Kiểm tra console log

### **Lỗi: Đơn hàng không lưu vào Firebase**
- Kiểm tra Firebase configuration
- Verify user authentication
- Check Firebase Rules

### **Lỗi: Modal không đóng**
- Clear browser cache
- Check JavaScript errors in console
- Verify event listeners

---

## 📝 Notes

- **Demo Mode**: Tính năng "Giả lập thanh toán" chỉ dùng cho testing
- **Security**: Trong production, cần implement webhook verification và HTTPS
- **Performance**: QR image được cache bởi VietQR API
- **Browser Support**: Compatible với tất cả modern browsers

---

## 🔐 Security Considerations

1. **Webhook Verification**: Always verify webhook signatures
2. **HTTPS Only**: QR payment chỉ hoạt động trên HTTPS
3. **Amount Validation**: Validate transaction amount on backend
4. **Idempotency**: Handle duplicate webhook callbacks
5. **Timeout**: Set timeout cho QR code (ví dụ: 15 phút)

---

## 📞 Support

Nếu gặp vấn đề, vui lòng tạo issue trên GitHub hoặc liên hệ team development.

---

**Version**: 1.0.0  
**Last Updated**: February 2026  
**Author**: X-Sneaker Development Team
