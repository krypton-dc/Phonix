# Phonix Discord Bot

A Discord bot project built with **Node.js**, **discord.js v14**, MongoDB, and a Lavalink-based music stack.

> **Important security note:** Never publish Discord bot tokens, MongoDB connection strings, Spotify credentials, Groq/Gemini API keys, webhook URLs, or other secrets. The original project configuration contained hardcoded credentials. Rotate any credentials that were ever pushed or exposed, then move them into environment variables before using this repository publicly.

## Features

The repository contains command and event modules for moderation, automod, information, giveaways, music, tickets, welcome tools, and other Discord server utilities. The exact enabled features depend on the current code and configuration.

## Requirements

- Node.js **20 LTS** (recommended)
- npm (included with Node.js)
- A Discord application and bot created in the [Discord Developer Portal](https://discord.com/developers/applications)
- A MongoDB database, such as [MongoDB Atlas](https://www.mongodb.com/atlas)
- A reachable Lavalink v4 node for music features
- Optional service credentials for integrations used by enabled commands (for example Spotify, Groq, or Google Gemini)

## 1. Download the project

Clone the repository:

```bash
git clone https://github.com/krypton-dc/Phonix.git
cd Phonix
```

Or download the ZIP from GitHub and extract it.

## 2. Install dependencies

```bash
npm install
```

If installation fails, check that Node.js 20 LTS and npm are installed:

```bash
node -v
npm -v
```

## 3. Configure credentials safely

The entry point loads dotenv (`require("dotenv").config()`), and the Lavalink node settings already read environment variables such as `NODE_URL`, `NODE_NAME`, `NODE_AUTH`, and `NODE_SECURE`.

Create a local `.env` file in the project root. **Do not commit this file.**

Example:

```env
# Lavalink node
NODE_URL=your-lavalink-host:2333
NODE_NAME=phonix
NODE_AUTH=your-lavalink-password
NODE_SECURE=false

# Add the other credentials required by your configuration/code here.
# Examples: Discord token, MongoDB URI, Spotify client ID/secret,
# Groq API key, Google Gemini key, and webhook URLs.
```

### Important configuration work before first launch

The current project has a `config.js` file that supplies several settings. Before running the bot:

1. Open `config.js` and identify every credential/configuration value required by the code.
2. Replace hardcoded secrets with `process.env` variables (for example, `process.env.DISCORD_TOKEN` and `process.env.MONGODB_URI`).
3. Add the corresponding values to your local `.env` file.
4. Keep `.env` in `.gitignore`.
5. Do not paste real credentials into README files, screenshots, GitHub issues, or chat messages.

The bot will not start correctly until the required configuration values are wired to environment variables and supplied locally.

## 4. Configure Discord

In the Discord Developer Portal:

1. Open your application and create/enable its bot user.
2. Copy the bot token into your local `.env` using the variable name expected by your updated `config.js`.
3. Enable only the privileged gateway intents the code actually requires (commonly Server Members, Message Content, or Presence, depending on enabled features).
4. Invite the bot to your server with the required permissions and OAuth2 scopes (`bot`, and `applications.commands` if slash commands are used).

Never share or commit the bot token. If it was exposed, reset it in the Developer Portal.

## 5. Configure MongoDB

1. Create a MongoDB Atlas cluster or use your own MongoDB server.
2. Create a database user and allow network access from the machine running the bot.
3. Put the connection string in your local `.env`.
4. Map that environment variable into the `mongourl` setting used by `config.js`.

Do not commit a real MongoDB URI or database password.

## 6. Configure Lavalink (music)

The bot's configuration reads these environment variables:

| Variable | Purpose |
|---|---|
| `NODE_URL` | Lavalink host and port |
| `NODE_NAME` | Name/identifier for the node |
| `NODE_AUTH` | Lavalink password |
| `NODE_SECURE` | `true` for TLS, otherwise `false` |

Make sure the Lavalink node is running, reachable from the bot host, and compatible with the Lavalink/Shoukaku/Kazagumo versions used by this project. The example values above are placeholders, not a working public node.

## 7. Start the bot

For a normal run:

```bash
npm start
```

For development (if nodemon is installed):

```bash
npm run dev
```

The `start` script runs `node index.js`.

## 8. Keep the bot running on an Ubuntu VPS (PM2)

Install PM2:

```bash
npm install -g pm2
```

Start the bot:

```bash
pm2 start index.js --name phonix
pm2 save
pm2 startup
```

Run the command printed by `pm2 startup` to enable startup on reboot.

Useful commands:

```bash
pm2 status
pm2 logs phonix
pm2 restart phonix
pm2 stop phonix
pm2 delete phonix
```

## 9. Update the bot from GitHub

On the server, inside the project directory:

```bash
git pull
npm install
pm2 restart phonix
```

If you have local configuration changes, keep them in `.env` and avoid overwriting them during updates.

## Troubleshooting

- **Invalid token / login failed:** Check the Discord token in local configuration and reset it if it was exposed.
- **MongoDB connection error:** Check the URI, database user/password, Atlas IP access list, and network connectivity.
- **Lavalink connection error:** Check `NODE_URL`, `NODE_AUTH`, `NODE_SECURE`, firewall rules, and whether the Lavalink server is online.
- **Missing module:** Run `npm install` in the project directory.
- **Bot starts but commands do not work:** Check the bot's server permissions, command registration/setup, required gateway intents, and console logs.
- **Canvas/native module install errors:** Use a supported Node.js 20 LTS environment and install the platform build tools required by the dependency.

## Repository hygiene

The repository should exclude at least:

```gitignore
node_modules/
.env
.env.*
!.env.example
*.log
*.zip
```

Review the staged files before every push:

```bash
git status
git diff --cached
```

If a secret was committed, deleting it in a later commit is not enough: remove it from Git history and rotate/revoke the exposed credential.

## Disclaimer

This repository is provided as-is. You are responsible for configuring third-party services, Discord permissions, hosting, and credentials securely.
## License

Copyright (c) 2026 krypton-dc

This project is licensed under the MIT License.
See the [LICENSE](LICENSE) file for details.
