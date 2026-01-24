/**
 * VNPay Payment Helper
 * Adapted from payment.html logic
 */

// Configuration - VNPAY Sandbox Environment
const vnp_TmnCode = "EQ14MGSD";
const vnp_HashSecret = "O96H0H94BWKO5XMN0WEGIKHPKAQKFSUZ";
const vnp_Url = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";

// Return URL determination
let vnp_ReturnUrl = "";
if (window.location.origin && window.location.origin !== "null") {
    // Redirect back to Checkout.html to handle result
    vnp_ReturnUrl = window.location.origin + "/Checkout.html"; 
} else {
    vnp_ReturnUrl = "http://localhost:5500/Checkout.html";
}

/**
 * Tạo URL thanh toán VNPay
 * @param {number} amount - Số tiền thanh toán (VND)
 * @param {string} orderInfo - Thông tin đơn hàng
 * @returns {string} - URL thanh toán
 */
export function createPaymentUrl(amount, orderInfo) {
    // Generate Order ID / TxnRef
    const date = new Date();
    const createDate = dateFormat(date);
    const orderId = date.getTime(); 
    const txnRef = String(orderId).slice(-8).toUpperCase(); // Using logic similar to payment.html (slice 8 chars) or full timestamp

    const vnp_Params = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: vnp_TmnCode,
        vnp_Locale: 'vn',
        vnp_CurrCode: 'VND',
        vnp_TxnRef: String(orderId),
        vnp_OrderInfo: orderInfo,
        vnp_OrderType: 'other',
        vnp_Amount: Math.round(amount * 100),
        vnp_ReturnUrl: vnp_ReturnUrl,
        vnp_IpAddr: '13.160.92.202',
        vnp_CreateDate: createDate
    };

    // 1. Sort parameters alphabetically
    // payment.html logic:
    const sortedParams = {};
    Object.keys(vnp_Params).sort().forEach(key => {
        if (vnp_Params[key] !== '' && vnp_Params[key] !== null && vnp_Params[key] !== undefined) {
             sortedParams[key] = vnp_Params[key];
        }
    });

    // 2. Create sign data string - RAW VALUES (không encode cho checksum)
    const signData = Object.keys(sortedParams)
        .map(key => `${key}=${sortedParams[key]}`)
        .join('&');

    // 2b. Create query string - ENCODED VALUES (dùng cho URL)
    const queryString = Object.keys(sortedParams)
        .map(key => {
            const value = sortedParams[key];
            return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
        })
        .join('&');

    // Debug
    console.log("---------------- VNPay Debug ----------------");
    console.log("vnp_TmnCode:", vnp_TmnCode);
    console.log("vnp_ReturnUrl:", vnp_ReturnUrl);
    console.log("vnp_Amount:", sortedParams.vnp_Amount);
    console.log("vnp_TxnRef:", sortedParams.vnp_TxnRef);
    console.log("signData:", signData);
    console.log("vnp_HashSecret:", vnp_HashSecret);

    // 3. Create Secure Hash
    if (typeof CryptoJS === 'undefined') {
        console.error("CryptoJS chưa được load!");
        alert("Lỗi: Thiếu thư viện CryptoJS");
        return null;
    }

    const secureHash = CryptoJS.HmacSHA512(signData, vnp_HashSecret).toString();
    console.log("secureHash:", secureHash);
    console.log("---------------------------------------------");

    // 4. Create Final URL - Dùng queryString đã encode
    const paymentUrl = `${vnp_Url}?${queryString}&vnp_SecureHash=${secureHash}`;

    return paymentUrl;
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
