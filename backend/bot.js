import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const miniAppUrl = process.env.MINI_APP_URL;
const menuButtonText = process.env.MENU_BUTTON_TEXT || "Open Real Holat";

if (!token) {
  console.error("Missing TELEGRAM_BOT_TOKEN in .env");
  process.exit(1);
}

if (!miniAppUrl) {
  console.error("Missing MINI_APP_URL in .env");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

const webAppKeyboard = {
  reply_markup: {
    inline_keyboard: [
      [
        {
          text: menuButtonText,
          web_app: { url: miniAppUrl }
        }
      ]
    ]
  }
};

async function configureMenuButton() {
  try {
    await bot.setChatMenuButton({
      menu_button: {
        type: "web_app",
        text: menuButtonText,
        web_app: { url: miniAppUrl }
      }
    });
    console.log("Menu button configured.");
  } catch (error) {
    console.warn("Could not set menu button automatically. Configure in BotFather if needed.");
    console.warn(error.message);
  }
}

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const fullName = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(" ") || "Citizen";

  await bot.sendMessage(
    chatId,
    `Welcome, ${fullName}.\n\nReal Holat is a public transparency platform where reports are visible to everyone.\nTap below to open the app.`,
    webAppKeyboard
  );
});

bot.onText(/\/open/, async (msg) => {
  await bot.sendMessage(msg.chat.id, "Open Real Holat:", webAppKeyboard);
});

bot.on("polling_error", (error) => {
  console.error("Polling error:", error.message);
});

configureMenuButton().finally(() => {
  console.log("Real Holat bot backend is running.");
  console.log(`Mini App URL: ${miniAppUrl}`);
});
