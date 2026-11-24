// bot.js — Phiên bản dùng Gemini API
require('dotenv').config();
const {
  Client, GatewayIntentBits, Events, PermissionFlagsBits,
} = require('discord.js');
const { GoogleGenAI } = require('@google/genai'); // ✅ SDK mới
const { getServerInfo, setServerInfo, appendServerInfo } = require('./knowledge');
const { DEFAULT_PERSONALITY, getPersonality, setPersonality } = require('./personality');

// ===== Khởi tạo Gemini Client =====
// SDK sẽ tự đọc biến môi trường GEMINI_API_KEY nếu không truyền apiKey
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ===== Khởi tạo Discord Client =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ===== Chống ping (giữ nguyên) =====
function sanitizeMentions(text) {
  if (!text) return text;
  return text
    .replace(/@everyone/gi, '@\u200beveryone')
    .replace(/@here/gi, '@\u200bhere')
    .replace(/<@&\d+>/g, '[role]')
    .replace(/<@!?\d+>/g, '[user]');
}

const SAFE_MENTIONS = { parse: [], roles: [], users: [], repliedUser: false };

// ===== Build system prompt (giữ nguyên) =====
async function buildSystemPrompt(guild) {
  let serverInfo = '';
  try {
    serverInfo = await getServerInfo(guild.id);
  } catch (e) {
    console.error('Không đọc được server info:', e);
  }
  if (!serverInfo) serverInfo = '(Chưa có thông tin được cấu hình cho server này.)';

  const personality = await getPersonality(guild.id);

  return `${personality}

=== THÔNG TIN VỀ SERVER "${guild.name}" ===
${serverInfo}
=== HẾT THÔNG TIN ===

QUY TẮC BỔ SUNG (bắt buộc):
- Nếu câu hỏi liên quan đến server, ƯU TIÊN dùng thông tin ở trên.
- Nếu thông tin không có trong mục trên, nói thật là không rõ thay vì bịa.
- Trả lời dưới 1500 ký tự, đúng ngôn ngữ mà người dùng đang dùng.
- TUYỆT ĐỐI KHÔNG dùng @everyone, @here, hoặc cú pháp mention <@...>, <@&...>.`;
}

// ===== GỌI GEMINI (đã thay đổi) =====
async function askAI(guild, userMessage) {
  const systemPrompt = await buildSystemPrompt(guild);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash', // Model miễn phí, phản hồi nhanh
      contents: userMessage,
      config: {
        systemInstruction: systemPrompt, // Gemini hỗ trợ system instruction riêng
        temperature: 0.8,
        maxOutputTokens: 1024,
      },
    });

    // Trích xuất text từ response của SDK mới
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || 'Xin lỗi, tôi chưa có câu trả lời.';
  } catch (error) {
    console.error('Lỗi Gemini API:', error);
    throw new Error('GEMINI_API_ERROR'); // Ném lỗi để handler bên ngoài xử lý
  }
}

// ===== sendSafe (giữ nguyên) =====
async function sendSafe(target, content, isEdit = false) {
  const safe = sanitizeMentions(content).slice(0, 2000);
  const payload = { content: safe, allowedMentions: SAFE_MENTIONS };
  return isEdit ? target.edit(payload) : target.reply(payload);
}

// ===== Các event handler (giữ nguyên logic, chỉ cần đảm bảo bắt lỗi) =====
client.once(Events.ClientReady, (c) => {
  console.log(`✅ Bot đã sẵn sàng: ${c.user.tag} (Gemini API)`);
  console.log(`📊 Đang phục vụ ${c.guilds.cache.size} server`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild) return;
  if (!message.mentions.has(client.user)) return;

  const prompt = message.content.replace(`<@${client.user.id}>`, '').trim();
  if (!prompt) {
    return message.reply({ content: 'Bạn muốn hỏi gì nào?', allowedMentions: SAFE_MENTIONS });
  }

  try {
    await message.channel.sendTyping();
    const reply = await askAI(message.guild, prompt);
    await sendSafe(message, reply);
  } catch (error) {
    console.error('Lỗi xử lý tin nhắn:', error);
    await message.reply({
      content: 'Đã có lỗi xảy ra khi gọi Gemini.',
      allowedMentions: SAFE_MENTIONS,
    });
  }
});

// Phần InteractionCreate và các lệnh /ask, /serverinfo, /personality giữ nguyên
// ... (không thay đổi gì thêm)
