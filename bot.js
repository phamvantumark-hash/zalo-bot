const { Zalo, ThreadType } = require("zalo-personal-sdk");
const fs = require("fs");
const path = require("path");

const CRED_PATH = path.join(__dirname, "credentials.json");
let apiInstance = null;
let qrCodeData = null;
let botStatus = "offline"; // offline, waiting_qr, online

async function startBot() {
    const zalo = new Zalo();

    // 1. Kiểm tra xem đã có phiên đăng nhập cũ chưa
    if (fs.existsSync(CRED_PATH)) {
        try {
            console.log("🔄 Đang khôi phục phiên đăng nhập cũ...");
            const creds = JSON.parse(fs.readFileSync(CRED_PATH, "utf8"));
            apiInstance = await zalo.login(creds);
            botStatus = "online";
            console.log("✅ Khôi phục phiên thành công!");
            setupListeners();
            return;
        } catch (error) {
            console.log("⚠️ Phiên cũ hết hạn, cần đăng nhập lại bằng QR.");
            fs.unlinkSync(CRED_PATH); // Xóa phiên lỗi
        }
    }

    // 2. Nếu chưa có phiên, tạo QR Code
    botStatus = "waiting_qr";
    console.log("📱 Đang tạo mã QR...");
    try {
        apiInstance = await zalo.loginQR({
            qrPath: "base64", // Trả về chuỗi base64 để đưa lên web
            qrCallback: async (qrBase64) => {
                qrCodeData = qrBase64;
                console.log("👉 Vui lòng mở Dashboard để quét mã QR.");
            }
        });
        
        // Đăng nhập thành công -> Lưu phiên
        botStatus = "online";
        qrCodeData = null;
        console.log("✅ Đăng nhập QR thành công!");
        
        if (apiInstance.getCredentials) {
            fs.writeFileSync(CRED_PATH, JSON.stringify(apiInstance.getCredentials(), null, 2));
            console.log("💾 Đã lưu phiên đăng nhập vào credentials.json");
        }
        
        setupListeners();
    } catch (error) {
        console.error("Lỗi đăng nhập:", error);
        botStatus = "offline";
    }
}

function setupListeners() {
    if (!apiInstance) return;

    // Lắng nghe tin nhắn
    apiInstance.listener.on("message", async (message) => {
        if (message.isSelf || typeof message.data.content !== "string") return;
        
        let replyText = "Bot đang bận, sẽ phản hồi bạn sau nhé!";
        if (message.data.content.toLowerCase().includes("giá")) {
            replyText = "Bạn vui lòng để lại SĐT để được báo giá nhé!";
        }

        await apiInstance.sendMessage(
            { msg: replyText, quote: message },
            message.threadId,
            message.type
        );
    });

    // Lắng nghe kết bạn
    apiInstance.listener.on("friend_request", async (event) => {
        try {
            await apiInstance.acceptFriendRequest(event.data.from.uid);
            await apiInstance.sendMessage("Chào bạn! Cảm ơn đã kết bạn.", event.data.from.uid, ThreadType.User);
        } catch (error) {
            console.error("Lỗi kết bạn:", error);
        }
    });

    apiInstance.listener.start();
}

module.exports = {
    startBot,
    getStatus: () => botStatus,
    getQR: () => qrCodeData
};