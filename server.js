const express = require("express");
const session = require("express-session");
const path = require("path");
const bot = require("./bot");

const app = express();
const PORT = 3000;

// Cấu hình Session
app.use(session({
    secret: 'zalo-bot-secret-key-2026',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.use(express.json());

// --- THAY ĐỔI Ở ĐÂY ---
// Trả file index.html khi truy cập trang chủ
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});
// ----------------------

// Middleware kiểm tra đăng nhập
const requireLogin = (req, res, next) => {
    if (req.session.loggedIn) next();
    else res.status(401).json({ error: "Chưa đăng nhập" });
};

// API Đăng nhập
app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    if (username === "admin" && password === "admin123") {
        req.session.loggedIn = true;
        res.json({ success: true });
    } else {
        res.status(400).json({ error: "Sai tài khoản hoặc mật khẩu" });
    }
});

// API Lấy trạng thái Bot
app.get("/api/status", requireLogin, (req, res) => {
    res.json({
        status: bot.getStatus(),
        qr: bot.getQR()
    });
});

// API Khởi động Bot
app.post("/api/start", requireLogin, (req, res) => {
    if (bot.getStatus() === "offline") {
        bot.startBot();
        res.json({ success: true, message: "Đang khởi động bot..." });
    } else {
        res.json({ success: false, message: "Bot đang chạy hoặc chờ QR rồi!" });
    }
});

// Khởi động Web Server
app.listen(PORT, () => {
    console.log(`🌐 Web Dashboard đang chạy tại: http://localhost:${PORT}`);
    bot.startBot();
});