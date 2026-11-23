// deploy-commands.js — Chạy 1 lần để đăng ký slash commands
require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Hỏi AI bất cứ điều gì')
    .addStringOption((opt) =>
      opt.setName('question').setDescription('Câu hỏi của bạn').setRequired(true),
    ),

  new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Quản lý thông tin server cho AI biết')
    .addSubcommand((s) => s.setName('view').setDescription('Xem thông tin hiện tại'))
    .addSubcommand((s) =>
      s
        .setName('set')
        .setDescription('Ghi đè toàn bộ thông tin (admin)')
        .addStringOption((o) =>
          o.setName('content').setDescription('Nội dung (Markdown OK)').setRequired(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName('append')
        .setDescription('Thêm vào thông tin (admin)')
        .addStringOption((o) =>
          o.setName('content').setDescription('Nội dung thêm vào').setRequired(true),
        ),
    ),

  new SlashCommandBuilder()
    .setName('personality')
    .setDescription('Xem / đổi tính cách trả lời của bot')
    .addSubcommand((s) => s.setName('view').setDescription('Xem personality hiện tại'))
    .addSubcommand((s) =>
      s
        .setName('set')
        .setDescription('Đặt personality riêng cho server (admin)')
        .addStringOption((o) =>
          o
            .setName('text')
            .setDescription('Mô tả tính cách — gõ "default" để về tsundere mặc định')
            .setRequired(true),
        ),
    )
    .addSubcommand((s) =>
      s.setName('reset').setDescription('Về personality mặc định (admin)'),
    ),
].map((c) => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    if (!process.env.DISCORD_CLIENT_ID) {
      throw new Error('Thiếu DISCORD_CLIENT_ID trong .env');
    }
    console.log('🔄 Đang đăng ký slash commands...');
    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands },
    );
    console.log('✅ Đăng ký thành công!');
  } catch (err) {
    console.error('❌ Lỗi:', err);
    process.exit(1);
  }
})();
