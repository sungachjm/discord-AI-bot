// knowledge.js — Quản lý "kiến thức server" trên Upstash Redis
const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function getServerInfo(guildId) {
  const data = await redis.get(`serverinfo:${guildId}`);
  return data || '';
}

async function setServerInfo(guildId, content) {
  await redis.set(`serverinfo:${guildId}`, content);
}

async function appendServerInfo(guildId, content) {
  const current = await getServerInfo(guildId);
  const updated = current ? `${current}\n${content}` : content;
  await redis.set(`serverinfo:${guildId}`, updated);
  return updated;
}

module.exports = { getServerInfo, setServerInfo, appendServerInfo };
