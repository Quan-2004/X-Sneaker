/**
 * VNPay Payment Helper (Client-side Sandbox Demo)
 * WARNING: This implementation exposes the Secret Key and is for educational/demo purposes ONLY.
 * In a real production environment, URL creation/signing MUST be done on the backend.
 */

// VNPay Sandbox Configuration
const vnp_TmnCode = "EQ14MGSD"; // Mã Website Sandbox
const vnp_HashSecret = "F6090M14MPWE0VN8MGM7NBA8TZ4QRHUJ"; // Secret Key Sandbox
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
    // Số tiền cần nhân 100 theo quy định VNPay (VND)
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

    // 1. Sắp xếp tham số theo alphabet (bắt buộc để tạo checksum đúng)
    const sortedParams = sortObject(vnp_Params);

    // 2. Tạo chuỗi query string và chuỗi hash data
    // Dạng: key1=value1&key2=value2...
    const signData = new URLSearchParams(sortedParams).toString();

    // 3. Tạo Secure Hash (HMAC SHA512)
    // Yêu cầu thư viện crypto-js được load ở Checkout.html
    if (typeof CryptoJS === 'undefined') {
        console.error("CryptoJS chưa được load!");
        alert("Lỗi hệ thống thanh toán: Thiếu thư viện bảo mật.");
        return null;
    }
    
    // const secureHash = CryptoJS.HmacSHA512(signData, vnp_HashSecret).toString();
    const secureHash = CryptoJS.HmacSHA512(signData, vnp_HashSecret).toString();

    // 4. Tạo URL cuối cùng
    // Thêm vnp_SecureHash vào query string
    sortedParams['vnp_SecureHash'] = secureHash;
    const finalQueryString = new URLSearchParams(sortedParams).toString();

    return `${vnp_Url}?${finalQueryString}`;
}

// --- Helper Functions ---

function sortObject(obj) {
    const sorted = {};
    const keys = [];

    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            keys.push(key);
        }
    }

    keys.sort();

    for (let i = 0; i < keys.length; i++) {
        // Không encode ở đây để tránh double encoding khi dùng URLSearchParams
        // URLSearchParams sẽ tự động encode
        sorted[keys[i]] = obj[keys[i]]; 
    }

    return sorted;
}

function dateFormat(date) {
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    const hours = ('0' + date.getHours()).slice(-2);
    const minutes = ('0' + date.getMinutes()).slice(-2);
    const seconds = ('0' + date.getSeconds()).slice(-2);
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
}
