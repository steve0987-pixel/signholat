import logging
import os
from dataclasses import dataclass

from dotenv import load_dotenv
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, MenuButtonWebApp, Update, WebAppInfo
from telegram.ext import Application, CommandHandler, ContextTypes


@dataclass
class BotConfig:
    token: str
    mini_app_url: str
    menu_button_text: str


load_dotenv()

logging.basicConfig(
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger("real-holat-bot")


def read_config() -> BotConfig:
    token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    mini_app_url = os.getenv("MINI_APP_URL", "").strip()
    menu_button_text = os.getenv("MENU_BUTTON_TEXT", "Open Real Holat").strip() or "Open Real Holat"

    if not token:
        raise ValueError("Missing TELEGRAM_BOT_TOKEN in .env")
    if not mini_app_url:
        raise ValueError("Missing MINI_APP_URL in .env")
    if not mini_app_url.startswith("https://"):
        raise ValueError("MINI_APP_URL must start with https://")

    return BotConfig(token=token, mini_app_url=mini_app_url, menu_button_text=menu_button_text)


config = read_config()


def web_app_markup() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [[InlineKeyboardButton(text=config.menu_button_text, web_app=WebAppInfo(url=config.mini_app_url))]]
    )


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    full_name = " ".join([part for part in [user.first_name if user else None, user.last_name if user else None] if part])
    full_name = full_name or "Citizen"

    message = (
        f"Welcome, {full_name}.\n\n"
        "Real Holat is a public transparency platform where reports are visible to everyone.\n"
        "Tap below to open the app."
    )

    await update.effective_chat.send_message(message, reply_markup=web_app_markup())


async def open_app(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.effective_chat.send_message("Open Real Holat:", reply_markup=web_app_markup())


async def set_menu_button(application: Application) -> None:
    try:
        await application.bot.set_chat_menu_button(
            menu_button=MenuButtonWebApp(text=config.menu_button_text, web_app=WebAppInfo(url=config.mini_app_url))
        )
        logger.info("Menu button configured.")
    except Exception as error:  # pragma: no cover
        logger.warning("Could not set menu button automatically. Configure in BotFather if needed.")
        logger.warning(str(error))


def main() -> None:
    application = Application.builder().token(config.token).build()

    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("open", open_app))

    application.post_init = set_menu_button

    logger.info("Real Holat Python bot backend is running.")
    logger.info("Mini App URL: %s", config.mini_app_url)
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
