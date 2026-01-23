/**
 * VNPay Payment Helper (Client-side Sandbox Demo)
 * WARNING: This implementation exposes the Secret Key and is for educational/demo purposes ONLY.
 * In a real production environment, URL creation/signing MUST be done on the backend.
 */

// VNPay Sandbox Configuration
const vnp_TmnCode = "EQ14MGSD"; // Mã Website Sandbox
const vnp_HashSecret = "Q72JV4SGW41QBEGY8CKCYD8TEOLL7OYT"; // Secret Key Sandbox
const vnp_Url = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"; // URL thanh toán Sandbox
const vnp_ReturnUrl = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/')) + "/index.html";

/**
 * Tạo URL thanh toán VNPay
 * @param {number} amount - Số tiền thanh toán (VND)
 * @param {string} orderInfo - Thông tin đơn hàng
 * @returns {string} - URL thanh toán
 */
export function createPaymentUrl(amount, orderInfo) {
    const date = new Date();
    const createDate = dateFormat(date);
    const orderId = date.getTime(); // Mã đơn hàng unique theo thời gian
    
    // Các tham số bắt buộc của VNPay
    const vnp_Params = {};
    vnp_Params['vnp_Version'] = '2.1.0';
    vnp_Params['vnp_Command'] = 'pay';
    vnp_Params['vnp_TmnCode'] = vnp_TmnCode;
    vnp_Params['vnp_Locale'] = 'vn';
    vnp_Params['vnp_CurrCode'] = 'VND';
    vnp_Params['vnp_TxnRef'] = orderId;
    vnp_Params['vnp_OrderInfo'] = orderInfo;
    vnp_Params['vnp_OrderType'] = 'other';
    vnp_Params['vnp_Amount'] = amount * 100;
    vnp_Params['vnp_ReturnUrl'] = vnp_ReturnUrl;
    vnp_Params['vnp_IpAddr'] = '127.0.0.1'; // IP demo
    vnp_Params['vnp_CreateDate'] = createDate;

    // 1. Sắp xếp tham số theo alphabet
    // Mấu chốt: VNPay yêu cầu encode URI Component và nối bằng &
    const sortedKeys = Object.keys(vnp_Params).sort();
    
    let signData = "";
    let queryParams = "";

    sortedKeys.forEach((key, index) => {
        const value = vnp_Params[key];
        // Encode chính xác từng phần tử
        const encodedKey = encodeURIComponent(key);
        const encodedValue = encodeURIComponent(value);

        if (index > 0) {
            signData += "&";
            queryParams += "&";
        }

        signData += encodedKey + "=" + encodedValue;
        queryParams += encodedKey + "=" + encodedValue;
    });

    // 2. Tạo Secure Hash (HMAC SHA512)
    if (typeof CryptoJS === 'undefined') {
        console.error("CryptoJS chưa được load!");
        alert("Lỗi hệ thống thanh toán: Thiếu thư viện bảo mật.");
        return null;
    }
    
    const secureHash = CryptoJS.HmacSHA512(signData, vnp_HashSecret).toString();

    // 3. Thêm vnp_SecureHash vào URL cuối cùng
    queryParams += "&vnp_SecureHash=" + secureHash;

    return `${vnp_Url}?${queryParams}`;
}

// --- Helper Functions ---



function dateFormat(date) {
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    const hours = ('0' + date.getHours()).slice(-2);
    const minutes = ('0' + date.getMinutes()).slice(-2);
    const seconds = ('0' + date.getSeconds()).slice(-2);
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
}
