# -*- coding: utf-8 -*-
"""
Telegram-бот для сайта "Общажня".

Что умеет:
  /start        — показывает меню с кнопками
  👤 Мой профиль — показывает профиль, созданный на основе Telegram-аккаунта
  🔍 Найти пользователя — поиск зарегистрированных на сайте пользователей по нику
  🎥 Опубликовать видео — публикация видео в общую ленту сайта от имени
                          вашего Telegram-профиля (без входа на сайт)

Публикация видео работает так:
  1. Видео скачивается из Telegram
  2. Загружается в Firebase Storage (тот же проект, что и у сайта)
  3. В Firestore создаётся документ в коллекции "messages" — точно такой же,
     какой создаёт сам сайт при публикации поста — поэтому видео сразу же
     появляется в ленте на сайте.

Как запустить — см. README.md рядом с этим файлом.
"""

import asyncio
import io
import logging
import os
import time

from aiogram import Bot, Dispatcher, F, Router
from aiogram.filters import CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import (
    Message,
    ReplyKeyboardMarkup,
    KeyboardButton,
)
from dotenv import load_dotenv

import firebase_admin
from firebase_admin import credentials, firestore, storage

# --------------------------------------------------------------------------
# НАСТРОЙКА
# --------------------------------------------------------------------------

load_dotenv()

BOT_TOKEN = os.environ["BOT_TOKEN"]                       # токен от @BotFather
FIREBASE_CREDENTIALS_PATH = os.environ["FIREBASE_CREDENTIALS_PATH"]  # путь к service-account.json
FIREBASE_STORAGE_BUCKET = os.environ["FIREBASE_STORAGE_BUCKET"]      # напр. guestbook-site-5b1ab.firebasestorage.app
SITE_URL = os.environ.get("SITE_URL", "")                 # ссылка на сайт (Mini App), необязательно

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("bot")

cred = credentials.Certificate(FIREBASE_CREDENTIALS_PATH)
firebase_admin.initialize_app(cred, {"storageBucket": FIREBASE_STORAGE_BUCKET})
db = firestore.client()
bucket = storage.bucket()

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher(storage=MemoryStorage())
router = Router()
dp.include_router(router)

MAIN_MENU = ReplyKeyboardMarkup(
    keyboard=[
        [KeyboardButton(text="👤 Мой профиль"), KeyboardButton(text="🔍 Найти пользователя")],
        [KeyboardButton(text="🎥 Опубликовать видео")],
    ],
    resize_keyboard=True,
)


class States(StatesGroup):
    waiting_search_query = State()
    waiting_video = State()


# --------------------------------------------------------------------------
# ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
# --------------------------------------------------------------------------

def tg_user_doc_id(telegram_id: int) -> str:
    """Идентификатор псевдо-профиля Telegram-пользователя в Firestore/ленте."""
    return f"tg_{telegram_id}"


async def get_or_upload_avatar(telegram_id: int) -> str:
    """
    Возвращает публичную ссылку на аватар пользователя.
    Если аватар уже когда-то загружали — берёт готовую ссылку из Firestore,
    чтобы не заливать одно и то же фото в Storage повторно.
    """
    doc_ref = db.collection("telegram_users").document(tg_user_doc_id(telegram_id))
    doc = doc_ref.get()
    if doc.exists and doc.to_dict().get("avatarUrl"):
        return doc.to_dict()["avatarUrl"]

    try:
        photos = await bot.get_user_profile_photos(telegram_id, limit=1)
        if not photos.photos:
            return ""
        file_id = photos.photos[0][-1].file_id  # самое большое разрешение
        file = await bot.get_file(file_id)
        file_bytes = await bot.download_file(file.file_path)

        blob = bucket.blob(f"telegram_avatars/{telegram_id}.jpg")
        blob.upload_from_file(io.BytesIO(file_bytes.read()), content_type="image/jpeg")
        blob.make_public()
        return blob.public_url
    except Exception as e:
        log.warning("Не удалось загрузить аватар: %s", e)
        return ""


def upsert_telegram_profile(user, avatar_url: str):
    """Создаёт/обновляет запись о Telegram-пользователе, который публикует контент через бота."""
    doc_ref = db.collection("telegram_users").document(tg_user_doc_id(user.id))
    doc = doc_ref.get()
    display_name = " ".join(filter(None, [user.first_name, user.last_name])) or (user.username or "Пользователь")

    data = {
        "telegramId": user.id,
        "username": user.username or "",
        "displayName": display_name,
        "avatarUrl": avatar_url,
        "updatedAt": firestore.SERVER_TIMESTAMP,
    }
    if not doc.exists:
        data["postCount"] = 0
        data["joinedAt"] = firestore.SERVER_TIMESTAMP
        doc_ref.set(data)
    else:
        doc_ref.update(data)
    return display_name


# --------------------------------------------------------------------------
# /start И ГЛАВНОЕ МЕНЮ
# --------------------------------------------------------------------------

@router.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext):
    await state.clear()
    await message.answer(
        "Привет! 👋 Это бот сайта «Общажня».\n\n"
        "Что хочешь сделать?",
        reply_markup=MAIN_MENU,
    )


# --------------------------------------------------------------------------
# 👤 МОЙ ПРОФИЛЬ
# --------------------------------------------------------------------------

@router.message(F.text == "👤 Мой профиль")
async def show_profile(message: Message):
    doc = db.collection("telegram_users").document(tg_user_doc_id(message.from_user.id)).get()

    if not doc.exists:
        await message.answer(
            "У вас пока нет профиля на сайте — он создаётся автоматически, "
            "как только вы опубликуете первое видео через бота.\n\n"
            "Нажмите «🎥 Опубликовать видео», чтобы создать его 🙂"
        )
        return

    data = doc.to_dict()
    text = (
        f"👤 <b>{data.get('displayName', 'Без имени')}</b>\n"
        + (f"@{data['username']}\n" if data.get("username") else "")
        + f"\n📹 Публикаций через бота: {data.get('postCount', 0)}"
    )
    await message.answer(text, parse_mode="HTML")


# --------------------------------------------------------------------------
# 🔍 ПОИСК ПОЛЬЗОВАТЕЛЯ ПО НИКУ (среди зарегистрированных на сайте)
# --------------------------------------------------------------------------

@router.message(F.text == "🔍 Найти пользователя")
async def ask_search_query(message: Message, state: FSMContext):
    await state.set_state(States.waiting_search_query)
    await message.answer("Введите никнейм (или начало никнейма) пользователя сайта для поиска:")


@router.message(States.waiting_search_query)
async def do_search(message: Message, state: FSMContext):
    query = (message.text or "").strip()
    await state.clear()

    if not query:
        await message.answer("Пустой запрос, попробуйте ещё раз через меню 🔍", reply_markup=MAIN_MENU)
        return

    # Firestore не умеет "содержит подстроку", поэтому ищем по совпадению начала ника.
    # Регистр важен: "Vasya" и "vasya" — разные запросы.
    users_ref = db.collection("users")
    results = (
        users_ref.where("username", ">=", query)
        .where("username", "<=", query + "\uf8ff")
        .limit(5)
        .stream()
    )

    found = list(results)
    if not found:
        await message.answer(
            f"Никого не нашлось по запросу «{query}».\n"
            "Подсказка: поиск учитывает регистр букв и ищет по началу ника.",
            reply_markup=MAIN_MENU,
        )
        return

    for doc in found:
        u = doc.to_dict()
        text = (
            f"👤 <b>{u.get('username', 'Без имени')}</b>\n"
            + (f"{u['bio']}\n" if u.get("bio") else "")
            + (f"🏷 {u['tags']}\n" if u.get("tags") else "")
        )
        if u.get("avatarUrl"):
            await message.answer_photo(u["avatarUrl"], caption=text, parse_mode="HTML")
        else:
            await message.answer(text, parse_mode="HTML")

    await message.answer("Готово ✅", reply_markup=MAIN_MENU)


# --------------------------------------------------------------------------
# 🎥 ПУБЛИКАЦИЯ ВИДЕО В ЛЕНТУ
# --------------------------------------------------------------------------

@router.message(F.text == "🎥 Опубликовать видео")
async def ask_video(message: Message, state: FSMContext):
    await state.set_state(States.waiting_video)
    await message.answer(
        "Отправьте видео файлом (не кружком), а в подписи к нему укажите:\n\n"
        "<b>Название публикации</b>\n"
        "Описание (необязательно, можно не писать)\n\n"
        "Первая строка подписи станет заголовком поста.",
        parse_mode="HTML",
    )


@router.message(States.waiting_video, F.video)
async def receive_video(message: Message, state: FSMContext):
    await state.clear()
    status_msg = await message.answer("⏳ Загружаю видео...")

    caption = message.caption or "Видео из Telegram"
    lines = caption.split("\n", 1)
    title = lines[0].strip() or "Видео из Telegram"
    desc = lines[1].strip() if len(lines) > 1 else ""

    try:
        # 1. Скачиваем видео из Telegram
        file = await bot.get_file(message.video.file_id)
        file_bytes = await bot.download_file(file.file_path)

        # 2. Заливаем в Firebase Storage
        telegram_id = message.from_user.id
        filename = f"bot_uploads/{telegram_id}/{int(time.time() * 1000)}.mp4"
        blob = bucket.blob(filename)
        blob.upload_from_file(io.BytesIO(file_bytes.read()), content_type="video/mp4")
        blob.make_public()
        video_url = blob.public_url

        # 3. Получаем/загружаем аватар и обновляем псевдо-профиль
        avatar_url = await get_or_upload_avatar(telegram_id)
        display_name = upsert_telegram_profile(message.from_user, avatar_url)

        # 4. Создаём пост в той же коллекции, что использует сайт
        db.collection("messages").add(
            {
                "userId": tg_user_doc_id(telegram_id),
                "author": display_name,
                "avatarUrl": avatar_url,
                "text": f"**{title}**\n{desc}",
                "image": video_url,
                "accessMode": "pub",
                "isExternalLink": False,
                "createdAt": firestore.SERVER_TIMESTAMP,
                "localTime": int(time.time() * 1000),
                "reactions": {"👍": 1},
                "pinned": False,
            }
        )
        db.collection("telegram_users").document(tg_user_doc_id(telegram_id)).update(
            {"postCount": firestore.Increment(1)}
        )

        await status_msg.edit_text("✅ Видео опубликовано в ленте сайта!")
        if SITE_URL:
            await message.answer(f"Посмотреть можно здесь: {SITE_URL}", reply_markup=MAIN_MENU)
        else:
            await message.answer("Готово ✅", reply_markup=MAIN_MENU)

    except Exception as e:
        log.exception("Ошибка публикации видео")
        await status_msg.edit_text(f"❌ Не получилось опубликовать видео: {e}")


@router.message(States.waiting_video)
async def wrong_content_for_video(message: Message):
    await message.answer("Пришлите именно видео-файл (не текст, не кружок, не гиф) 🎥")


# --------------------------------------------------------------------------
# ЗАПУСК
# --------------------------------------------------------------------------

async def main():
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
