
# LKG Discord Bot

A Discord bot for monitoring specific users and forwarding their attachments to a designated channel, with logging capabilities.

---

## Features

- Add or remove users from a watchlist using slash commands (`/follow`, `/unfollow`).
- List all currently followed users (`/listfollows`).
- Automatically forwards attachments from followed users to a target channel.
- Logs forwarded messages with detailed metadata in a log channel.
- Lightweight and simple to configure.

---

## Requirements

- Node.js v18+  
- Discord bot with the following intents enabled:
  - `Guilds`
  - `Guild Messages`
  - `Message Content`

---

## Installation

1. Clone this repository:

```bash
git clone https://github.com/your-username/LKG-Discord-Bot.git
cd LKG-Discord-Bot
````

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory with the following content:

```env
BOT_TOKEN=your_discord_bot_token_here
```

> Replace `your_discord_bot_token_here` with your actual Discord bot token.
> **Do not commit your `.env` file to GitHub.**

4. Create a `config.json` file in the root directory with the following structure:

```json
{
  "watchedUsers": [],
  "targetChannelId": "channel_id_where_attachments_are_sent",
  "logChannelId": "channel_id_for_logging"
}
```

* `watchedUsers`: Array of Discord user IDs to monitor.
* `targetChannelId`: The channel where attachments will be forwarded.
* `logChannelId`: Optional. The channel where log messages will be sent.

> Make sure to add your bot to the server with proper permissions to read messages and send messages in the target channels.

---

## Usage

1. Start the bot:

```bash
node index.js
```

2. Use the slash commands in your server:

| Command        | Description                       |
| -------------- | --------------------------------- |
| `/follow`      | Add a user to the watch list      |
| `/unfollow`    | Remove a user from the watch list |
| `/listfollows` | List all watched users            |

> Only the server owner or the member with the highest role can use these commands.

---

## Notes

* Attachments from followed users are temporarily saved locally before being forwarded. They are deleted immediately after sending.
* Ensure the bot has permission to access the channels and send files.

---

