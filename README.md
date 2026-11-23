# AI Discord Bot (Tsundere)

Bot AI Discord với tính cách tsundere, kiến thức server tùy chỉnh, chống ping.
Stack: **discord.js v14 + Groq (Llama 3.3 70B) + Upstash Redis**, deploy trên **Render**.

## Tính năng

- 💬 Trả lời khi được `@mention` hoặc dùng `/ask`
- 🎭 Tính cách tsundere mặc định (tùy chỉnh được theo server)
- 📖 Bot biết thông tin server (admin tự cấu hình qua `/serverinfo`)
- 🛡️ Chống ping `@everyone` / `@here` / role / user (3 lớp phòng vệ)
- 🗄️ Lưu trữ bền vững trên Upstash Redis (không mất khi redeploy)

## Yêu cầu

- Node.js >= 18
- Tài khoản [Discord Developer](https://discord.com/developers/applications)
- API key [Groq](https://console.groq.com/) (miễn phí)
- Database [Upstash Redis](https://console.upstash.com/) (miễn phí)

## Cài đặt local

```bash
# 1. Clone repo
git clone https://github.com/USERNAME/REPO.git
cd REPO

# 2. Cài dependencies
npm install

# 3. Tạo .env từ mẫu
cp .env.example .env
# → Điền token/key thật vào .env

# 4. Đăng ký slash commands (chạy 1 lần)
node deploy-commands.js

# 5. Chạy bot
npm start
```

## Deploy lên Render

1. Push code lên GitHub (nhớ `.env` KHÔNG có trong repo)
2. Render → **New +** → **Web Service** → kết nối repo
3. Cấu hình:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
4. Mở **Environment** → thêm 5 biến từ file `.env` local:
   - `DISCORD_TOKEN`
   - `DISCORD_CLIENT_ID`
   - `GROQ_API_KEY`
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
5. **Create Web Service** → đợi build xong

> ⚠️ **Render Free Tier** sẽ "ngủ" bot sau 15 phút không có request. Để giữ bot online 24/7, cân nhắc nâng cấp hoặc dùng Fly.io / Railway.

## Lệnh

| Lệnh | Quyền | Mô tả |
|---|---|---|
| `/ask <question>` | Mọi người | Hỏi AI bất cứ điều gì |
| `/serverinfo view` | Mọi người | Xem thông tin server đã cấu hình |
| `/serverinfo set <content>` | Manage Server | Ghi đè toàn bộ thông tin |
| `/serverinfo append <content>` | Manage Server | Thêm vào thông tin |
| `/personality view` | Mọi người | Xem personality hiện tại |
| `/personality set <text>` | Manage Server | Đặt personality riêng (gõ `default` để reset) |
| `/personality reset` | Manage Server | Reset về mặc định |

## Bảo mật

- ❌ **KHÔNG** commit file `.env`
- ✅ Dùng `.env.example` làm mẫu
- ✅ Nếu lỡ lộ token → **Reset ngay** trên Discord Developer Portal + tạo lại Groq key + Upstash token

## License

MIT
