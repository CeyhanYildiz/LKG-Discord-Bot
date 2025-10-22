require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, Partials } = require('discord.js');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);

const CONFIG_PATH = path.join(__dirname, 'config.json');
function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return { watchedUsers: [], targetChannelId: '', logChannelId: '' };
  }
}
let config = loadConfig();

// === Discord client ===
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel],
});

// === Slash commands ===
const commands = [
  new SlashCommandBuilder()
    .setName('follow')
    .setDescription('Add a user to the watch list')
    .addStringOption(opt => opt.setName('userid').setDescription('User ID to follow').setRequired(true)),
  new SlashCommandBuilder()
    .setName('unfollow')
    .setDescription('Remove a user from the watch list')
    .addStringOption(opt => opt.setName('userid').setDescription('User ID to unfollow').setRequired(true)),
  new SlashCommandBuilder()
    .setName('listfollows')
    .setDescription('Show all watched users'),
].map(cmd => cmd.toJSON());

// === Register commands globally (runs once at startup) ===
client.once('ready', async () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
  try {
    const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('✅ Slash commands registered');
  } catch (err) {
    console.error('Failed to register commands:', err);
  }
});

// === Handle slash commands ===
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const guild = interaction.guild;
  const member = interaction.member;
  const guildOwnerId = guild?.ownerId;
  const highestRole = guild?.roles?.highest;

  // Only allow highest-role users or owner
  const isAllowed = guildOwnerId === member.id || member.roles.highest?.id === highestRole?.id;
  if (!isAllowed) {
    return interaction.reply({ content: '🚫 Only the server owner or highest role may use this command.', ephemeral: true });
  }

  config = loadConfig();
  const cmd = interaction.commandName;

  if (cmd === 'follow') {
    const userId = interaction.options.getString('userid');
    if (config.watchedUsers.includes(userId)) {
      return interaction.reply({ content: `👀 Already following <@${userId}>.`, ephemeral: true });
    }
    config.watchedUsers.push(userId);
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    return interaction.reply({ content: `✅ Now following <@${userId}>.`, ephemeral: true });
  }

  if (cmd === 'unfollow') {
    const userId = interaction.options.getString('userid');
    config.watchedUsers = config.watchedUsers.filter(id => id !== userId);
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    return interaction.reply({ content: `❎ Stopped following <@${userId}>.`, ephemeral: true });
  }

  if (cmd === 'listfollows') {
    if (config.watchedUsers.length === 0) return interaction.reply({ content: '👁️ No users are being followed.', ephemeral: true });
    const list = config.watchedUsers.map(id => `<@${id}>`).join('\n');
    return interaction.reply({ content: `👁️ Currently following:\n${list}`, ephemeral: true });
  }
});

// === Watch messages from followed users ===
client.on('messageCreate', async message => {
  try {
    if (!message || message.author.bot) return;
    if (!config.watchedUsers.includes(message.author.id)) return;
    if (!message.attachments || message.attachments.size === 0) return;

    const targetChannel = await client.channels.fetch(config.targetChannelId).catch(() => null);
    const logChannel = await client.channels.fetch(config.logChannelId).catch(() => null);
    if (!targetChannel || !targetChannel.isTextBased()) return;

    const files = [];
    for (const att of message.attachments.values()) {
      const url = att.url;
      const name = att.name ? att.name : path.basename(url).split('?')[0] || 'file';
      try {
        const res = await fetch(url);
        if (!res.ok) {
          files.push(url);
          continue;
        }
        const tmp = path.join(__dirname, 'tmp_' + Date.now() + '_' + name);
        const dest = fs.createWriteStream(tmp);
        await streamPipeline(res.body, dest);
        files.push({ attachment: tmp, name });
      } catch {
        files.push(url);
      }
    }

    await targetChannel.send({ files });

    if (logChannel && logChannel.isTextBased()) {
      const embed = new EmbedBuilder()
        .setTitle('Copied attachment')
        .setDescription(`Message from watched user <@${message.author.id}>`)
        .addFields(
          { name: 'From channel', value: `${message.channel?.name ?? 'unknown'} (${message.channel?.id})`, inline: true },
          { name: 'Time', value: `<t:${Math.floor(message.createdTimestamp / 1000)}:F>`, inline: true }
        )
        .setFooter({ text: `Message ID: ${message.id}` })
        .setTimestamp();
      await logChannel.send({ embeds: [embed] });
    }

    for (const f of files) {
      if (typeof f === 'object' && f.attachment && fs.existsSync(f.attachment)) {
        try { fs.unlinkSync(f.attachment); } catch {}
      }
    }
  } catch (err) {
    console.error('Error handling message:', err);
  }
});

client.login(process.env.BOT_TOKEN);
