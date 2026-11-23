// bot.js — File chính
require('dotenv').config();
const {
  Client, GatewayIntentBits, Events, SlashCommandBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const Groq = require('groq-sdk');
const { getServerInfo, setServerInfo, appendServerInfo } = require('./knowledge');
const { DEFAULT_PERSONALITY, getPersonality, setPersonality } = require('./personality');

// ===== Khởi tạo client =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ===== Chống ping =====
function sanitizeMentions(text) {
  if (!text) return text;
  return text
    .replace(/@everyone/gi, '@\u200beveryone')
    .replace(/@here/gi, '@\u200bhere')
    .replace(/<@&\d+>/g, '[role]')
    .replace(/<@!?\d+>/g, '[user]');
}

const SAFE_MENTIONS = {
  parse: [],
  roles: [],
  users: [],
  repliedUser: false,
};

// ===== Build system prompt =====
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

// ===== Gọi Groq =====
async function askAI(guild, userMessage) {
  const systemPrompt = await buildSystemPrompt(guild);

  const chatCompletion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.8,
    max_tokens: 1024,
  });

  return chatCompletion.choices[0]?.message?.content || 'Xin lỗi, tôi chưa có câu trả lời.';
}

// ===== Gửi tin nhắn an toàn =====
async function sendSafe(target, content, isEdit = false) {
  const safe = sanitizeMentions(content).slice(0, 2000);
  const payload = { content: safe, allowedMentions: SAFE_MENTIONS };
  return isEdit ? target.edit(payload) : target.reply(payload);
}

// ===== Ready =====
client.once(Events.ClientReady, (c) => {
  console.log(`✅ Bot đã sẵn sàng: ${c.user.tag}`);
  console.log(`📊 Đang phục vụ ${c.guilds.cache.size} server`);
});

// ===== MessageCreate =====
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
    console.error('Lỗi Groq:', error);
    await message.reply({
      content: 'Đã có lỗi xảy ra khi gọi AI.',
      allowedMentions: SAFE_MENTIONS,
    });
  }
});

// ===== InteractionCreate =====
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (!interaction.guild) return;

  const { commandName, guild } = interaction;

  try {
    // ===== /ask =====
    if (commandName === 'ask') {
      await interaction.deferReply();
      const question = interaction.options.getString('question');
      const reply = sanitizeMentions(await askAI(guild, question)).slice(0, 2000);
      await interaction.editReply({ content: reply, allowedMentions: SAFE_MENTIONS });
      return;
    }

    // ===== /serverinfo =====
    if (commandName === 'serverinfo') {
      const sub = interaction.options.getSubcommand();
      const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);

      if (sub === 'view') {
        const info = await getServerInfo(guild.id);
        return interaction.reply({
          content: info
            ? `📖 **Thông tin server hiện tại:**\n\`\`\`md\n${info.slice(0, 1800)}\n\`\`\``
            : '⚠️ Chưa có thông tin nào được cấu hình.',
          ephemeral: true,
          allowedMentions: SAFE_MENTIONS,
        });
      }

      if (!isAdmin) {
        return interaction.reply({
          content: '❌ Bạn cần quyền **Manage Server**.',
          ephemeral: true,
          allowedMentions: SAFE_MENTIONS,
        });
      }

      if (sub === 'set') {
        await setServerInfo(guild.id, interaction.options.getString('content'));
        return interaction.reply({
          content: '✅ Đã cập nhật thông tin server.',
          ephemeral: true,
          allowedMentions: SAFE_MENTIONS,
        });
      }

      if (sub === 'append') {
        await appendServerInfo(guild.id, interaction.options.getString('content'));
        return interaction.reply({
          content: '✅ Đã thêm vào thông tin server.',
          ephemeral: true,
          allowedMentions: SAFE_MENTIONS,
        });
      }
    }

    // ===== /personality =====
    if (commandName === 'personality') {
      const sub = interaction.options.getSubcommand();

      if (sub === 'view') {
        const p = await getPersonality(guild.id);
        const isDefault = p === DEFAULT_PERSONALITY;
        return interaction.reply({
          content: `🎭 **Personality hiện tại** (${isDefault ? 'mặc định — tsundere' : 'tùy chỉnh'}):\n\`\`\`\n${p.slice(0, 1500)}\n\`\`\``,
          ephemeral: true,
          allowedMentions: SAFE_MENTIONS,
        });
      }

      const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);
      if (!isAdmin) {
        return interaction.reply({
          content: '❌ Cần quyền **Manage Server**.',
          ephemeral: true,
          allowedMentions: SAFE_MENTIONS,
        });
      }

      if (sub === 'set') {
        const text = interaction.options.getString('text');
        if (text.toLowerCase() === 'default') {
          await setPersonality(guild.id, null);
          return interaction.reply({
            content: '✅ Đã về personality mặc định (tsundere).',
            ephemeral: true,
            allowedMentions: SAFE_MENTIONS,
          });
        }
        await setPersonality(guild.id, text);
        return interaction.reply({
          content: '✅ Đã đặt personality riêng cho server.',
          ephemeral: true,
          allowedMentions: SAFE_MENTIONS,
        });
      }

      if (sub === 'reset') {
        await setPersonality(guild.id, null);
        return interaction.reply({
          content: '✅ Đã reset về mặc định.',
          ephemeral: true,
          allowedMentions: SAFE_MENTIONS,
        });
      }
    }
  } catch (err) {
    console.error('Lỗi interaction:', err);
    if (!interaction.replied && !interaction.deferred) {
      interaction.reply({
        content: 'Đã có lỗi xảy ra.',
        ephemeral: true,
        allowedMentions: SAFE_MENTIONS,
      }).catch(() => {});
    }
  }
});

// ===== Login =====
client.login(process.env.DISCORD_TOKEN);
