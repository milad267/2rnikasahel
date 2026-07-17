import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { siteSettings, orders, products, categories, productVariants, users, orderItems, carts, cartItems } from "@/db/schema";
import { eq, and, asc, count, sql } from "drizzle-orm";
import crypto from "node:crypto";
import { hashPassword } from "@/lib/auth";
import { getProxyConfig, fetchWithProxy } from "@/lib/proxy";

// ─── Registration state ───
interface RegState {
  step: "phone" | "name" | "done";
  chatId: number;
  phone?: string;
  name?: string;
  userId?: number;
  pendingSlug?: string; // محصولی که کاربر می‌خواست بخره
}

async function getRegState(chatId: number): Promise<RegState | null> {
  try {
    const [row] = await db.select({ value: siteSettings.value }).from(siteSettings)
      .where(and(eq(siteSettings.key, `telegram.reg_${chatId}`), eq(siteSettings.group, "telegram"))).limit(1);
    if (row?.value && typeof row.value === "string") return JSON.parse(row.value);
  } catch {}
  return null;
}

async function setRegState(chatId: number, state: RegState) {
  await db.insert(siteSettings).values({
    key: `telegram.reg_${chatId}`, group: "telegram",
    value: JSON.stringify(state), locale: "fa",
  }).onConflictDoUpdate({
    target: [siteSettings.key, siteSettings.locale],
    set: { value: JSON.stringify(state), updatedAt: new Date() },
  });
}

async function clearRegState(chatId: number) {
  try {
    await db.delete(siteSettings)
      .where(and(eq(siteSettings.key, `telegram.reg_${chatId}`), eq(siteSettings.group, "telegram")));
  } catch {}
}

// ─── Find user by phone ───
async function findUserByPhone(phone: string) {
  const [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  return user || null;
}

// ─── Create user from Telegram ───
async function createUserFromTelegram(phone: string, name: string): Promise<number> {
  const randomPass = Math.random().toString(36).slice(2, 10) + "A1!";
  const hash = hashPassword(randomPass);
  const [user] = await db.insert(users).values({
    phone, name: name || "کاربر تلگرام",
    passwordHash: hash, role: "customer", isActive: true,
  }).returning();
  return user.id;
}

// ─── Get user's registration status ───
async function getTelegramUser(chatId: number) {
  try {
    const [row] = await db.select({ value: siteSettings.value }).from(siteSettings)
      .where(and(eq(siteSettings.key, `telegram.user_${chatId}`), eq(siteSettings.group, "telegram"))).limit(1);
    if (row?.value && typeof row.value === "string") return JSON.parse(row.value);
  } catch {}
  return null;
}

async function setTelegramUser(chatId: number, userId: number, phone: string, name: string) {
  await db.insert(siteSettings).values({
    key: `telegram.user_${chatId}`, group: "telegram",
    value: JSON.stringify({ userId, phone, name }), locale: "fa",
  }).onConflictDoUpdate({
    target: [siteSettings.key, siteSettings.locale],
    set: { value: JSON.stringify({ userId, phone, name }), updatedAt: new Date() },
  });
}

export async function POST(req: NextRequest) {
  try {
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET || "";
    const providedSecret = req.headers.get("x-telegram-bot-api-secret-token") || "";
    if (process.env.NODE_ENV === "production") {
      const valid = expectedSecret.length >= 16 && providedSecret.length === expectedSecret.length && crypto.timingSafeEqual(Buffer.from(providedSecret), Buffer.from(expectedSecret));
      if (!valid) return NextResponse.json({ ok: false, error: "webhook unauthorized" }, { status: 403 });
    }
    const body = await req.json();
    const message = body.message || body.callback_query?.message;
    const callbackData = body.callback_query?.data;
    const chatId = message?.chat?.id;
    const text = ((body.message?.text || "") as string).trim();
    const callbackChatId = body.callback_query?.message?.chat?.id;
    const msgId = body.callback_query?.message?.message_id;

    // Contact (phone) sharing
    const contact = body.message?.contact;
    const actualChatId = callbackData ? callbackChatId : chatId;
    if (!actualChatId) return NextResponse.json({ ok: true });

    // Read bot token
    const [tokenRow] = await db.select({ value: siteSettings.value }).from(siteSettings)
      .where(and(eq(siteSettings.key, "telegram.bot_token"), eq(siteSettings.group, "telegram"))).limit(1);
    const botToken = tokenRow?.value as string;
    if (!botToken) return NextResponse.json({ ok: false, error: "bot not configured" });

    // Read shared proxy config
    const proxyConfig = await getProxyConfig();

    // Helpers
    const sendMsg = async (txt: string, kb?: any, replyMarkup?: any) => {
      const payload: any = { chat_id: actualChatId, text: txt, parse_mode: "HTML" };
      if (kb) payload.reply_markup = { inline_keyboard: kb };
      if (replyMarkup) payload.reply_markup = replyMarkup;
      if (callbackData && msgId) payload.message_id = msgId;
      await fetchWithProxy(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }, proxyConfig);
    };

    const editMsg = async (txt: string, kb?: any) => {
      if (!msgId) return;
      const payload: any = { chat_id: actualChatId, message_id: msgId, text: txt, parse_mode: "HTML" };
      if (kb) payload.reply_markup = { inline_keyboard: kb };
      await fetchWithProxy(`https://api.telegram.org/bot${botToken}/editMessageText`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }, proxyConfig);
    };

    const answerCb = async (text = "✅") => {
      if (!body.callback_query?.id) return;
      await fetchWithProxy(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: body.callback_query.id, text, show_alert: false }),
      }, proxyConfig);
    };

    // ─── Handle phone number sharing (Telegram contact button) ───
    if (contact) {
      if (contact.user_id && body.message?.from?.id && contact.user_id !== body.message.from.id) {
        return NextResponse.json({ ok: false, error: "contact owner mismatch" }, { status: 403 });
      }
      const phone = contact.phone_number || "";
      const firstName = contact.first_name || "";
      const lastName = contact.last_name || "";
      const fullName = `${firstName} ${lastName}`.trim() || "کاربر تلگرام";

      // Check if user already exists
      let user = await findUserByPhone(phone);
      let userId: number;

      if (user) {
        userId = user.id;
        await setTelegramUser(actualChatId, userId, phone, user.name);
        await sendMsg(
          `✅ خوش برگشتید ${user.name}! \n\nحساب شما قبلاً ثبت شده بود.`,
          [[{ text: "🛍 ادامه خرید", callback_data: "back_shop" }]]
        );
      } else {
        // Create new user
        userId = await createUserFromTelegram(phone, fullName);
        await setTelegramUser(actualChatId, userId, phone, fullName);

        // If there's a pending product, process it
        const regState = await getRegState(actualChatId);
        const pendingSlug = regState?.pendingSlug || "";

        await sendMsg(
          `✅ ثبت‌نام شما با موفقیت انجام شد!\n\n👤 ${fullName}\n📱 ${phone}\n\nاکنون می‌توانید خرید کنید.`,
          [[{ text: "🛍 فروشگاه", callback_data: "back_shop" }]]
        );

        if (pendingSlug) {
          await clearRegState(actualChatId);
          await showProductDetail(pendingSlug, sendMsg, botToken, actualChatId, proxyConfig);
        }
      }
      return NextResponse.json({ ok: true });
    }

    // ─── Handle callback queries ───
    if (callbackData) {
      await answerCb();

      // Register flow callbacks
      if (callbackData === "start_register") {
        // Send phone request with Telegram contact button
        await sendMsg(
          "📱 <b>ثبت‌نام در فروشگاه</b>\n\nبرای ثبت‌نام و ادامه خرید، لطفاً دکمه «ارسال شماره تماس» را بزنید تا شماره شما از طریق تلگرام ارسال شود.",
          [],
          {
            keyboard: [[{ text: "📱 ارسال شماره تماس", request_contact: true }]],
            resize_keyboard: true, one_time_keyboard: true,
          }
        );
        return NextResponse.json({ ok: true });
      }

      if (callbackData === "back_main") {
        const [welcomeRow] = await db.select({ value: siteSettings.value }).from(siteSettings)
          .where(and(eq(siteSettings.key, "telegram.welcome_message"), eq(siteSettings.group, "telegram"))).limit(1);
        const welcome = (welcomeRow?.value as string) || "به ربات فروشگاه درنیکا ساحل خوش آمدید 👋";
        await editMsg(`🏪 <b>درنیکا ساحل</b>\n\n${welcome}`, mainMenu());
        return NextResponse.json({ ok: true });
      }

      if (callbackData === "back_shop") {
        // Check if user is registered before showing shop
        const tUser = await getTelegramUser(actualChatId);
        if (!tUser) {
          await editMsg(
            "🔒 <b>خرید از فروشگاه</b>\n\nبرای مشاهده محصولات باید ابتدا ثبت‌نام کنید.\n\nروی دکمه زیر کلیک کنید تا شماره تماس شما از طریق تلگرام ارسال شود و ثبت‌نام انجام شود.",
            [[{ text: "📱 ثبت‌نام / ورود", callback_data: "start_register" }]]
          );
          return NextResponse.json({ ok: true });
        }
        await showCategories(editMsg);
        return NextResponse.json({ ok: true });
      }

      if (callbackData.startsWith("cat_")) {
        // Check registration
        const tUser = await getTelegramUser(actualChatId);
        if (!tUser) {
          await editMsg("🔒 لطفاً ابتدا ثبت‌نام کنید.", [[{ text: "📱 ثبت‌نام", callback_data: "start_register" }]]);
          return NextResponse.json({ ok: true });
        }
        const catSlug = callbackData.replace("cat_", "");
        await showProductsByCategory(catSlug, editMsg);
        return NextResponse.json({ ok: true });
      }

      if (callbackData.startsWith("prod_")) {
        // Check registration
        const tUser = await getTelegramUser(actualChatId);
        if (!tUser) {
          // Save pending product and ask to register
          await setRegState(actualChatId, {
            step: "phone", chatId: actualChatId,
            pendingSlug: callbackData.replace("prod_", ""),
          });
          await editMsg(
            "🔒 <b>خرید محصول</b>\n\nبرای خرید باید ابتدا ثبت‌نام کنید.\n\nروی دکمه زیر کلیک کنید تا شماره تماس شما ارسال شود:",
            [[{ text: "📱 ثبت‌نام / ورود", callback_data: "start_register" }]]
          );
          return NextResponse.json({ ok: true });
        }
        const prodSlug = callbackData.replace("prod_", "");
        await showProductDetail(prodSlug, editMsg, botToken, actualChatId, proxyConfig);
        return NextResponse.json({ ok: true });
      }

      if (callbackData.startsWith("buy_")) {
        const tUser = await getTelegramUser(actualChatId);
        if (!tUser) {
          await editMsg("🔒 لطفاً ابتدا ثبت‌نام کنید.", [[{ text: "📱 ثبت‌نام", callback_data: "start_register" }]]);
          return NextResponse.json({ ok: true });
        }
        // Parse variant ID from callback
        const variantId = Number(callbackData.replace("buy_", ""));
        if (!variantId) { await editMsg("❌ خطا"); return NextResponse.json({ ok: true }); }

        // Create a cart-like order for the user
        try {
          const [variant] = await db.select({
            id: productVariants.id, name: productVariants.name,
            price: productVariants.price, productId: productVariants.productId,
            sku: productVariants.sku,
          }).from(productVariants).where(eq(productVariants.id, variantId)).limit(1);

          if (!variant) { await editMsg("❌ محصول یافت نشد"); return NextResponse.json({ ok: true }); }

          const [product] = await db.select({ title: products.title }).from(products)
            .where(eq(products.id, variant.productId)).limit(1);

          // Create order
          const orderNumber = `TB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
          const [order] = await db.insert(orders).values({
            orderNumber, userId: tUser.userId,
            status: "pending_payment",
            totalAmount: variant.price,
            shippingAddress: "سفارش تلگرامی",
            paymentMethod: "telegram",
          }).returning();

          // Create order item
          await db.insert(orderItems).values({
            orderId: order.id, variantId: variant.id,
            sku: variant.sku,
            productTitle: product?.title || "نامشخص",
            variantTitle: variant.name,
            quantity: 1,
            unitPrice: variant.price,
            lineTotal: variant.price,
          });

          // Notify admin
          const adminChatId = (await db.select({ value: siteSettings.value }).from(siteSettings)
            .where(and(eq(siteSettings.key, "telegram.default_chat_id"), eq(siteSettings.group, "telegram"))).limit(1))[0]?.value;
          if (adminChatId) {
            await fetchWithProxy(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: Number(adminChatId), parse_mode: "HTML", text:
                  `🆕 <b>سفارش جدید از تلگرام</b>\n\n` +
                  `👤 کاربر: ${tUser.name}\n📱 ${tUser.phone}\n📦 محصول: ${product?.title} - ${variant.name}\n💰 ${Number(variant.price).toLocaleString()} ریال\n🔢 شماره: ${order.orderNumber}`,
              }),
            }, proxyConfig);
          }

          await editMsg(
            `✅ <b>سفارش شما ثبت شد!</b>\n\n` +
            `🛒 ${product?.title} - ${variant.name}\n` +
            `💰 ${Number(variant.price).toLocaleString()} ریال\n` +
            `🔢 شماره سفارش: <code>${order.orderNumber}</code>\n\n` +
            `📋 برای پیگیری از /order استفاده کنید.`,
            [[{ text: "🛍 ادامه خرید", callback_data: "back_shop" }]]
          );
        } catch (e: any) {
          await editMsg(`❌ خطا در ثبت سفارش: ${e.message}`);
        }
        return NextResponse.json({ ok: true });
      }

      if (callbackData === "cmd_status") {
        await showStatus(editMsg);
        return NextResponse.json({ ok: true });
      }

      if (callbackData === "cmd_help") {
        await editMsg(
          "🤖 <b>راهنمای ربات فروشگاه</b>\n\n" +
          "🛍 <b>فروشگاه</b> — مشاهده و خرید محصولات (نیاز به ثبت‌نام)\n" +
          "📊 <b>وضعیت</b> — آمار فروشگاه\n" +
          "🔙 <b>بازگشت</b> — منوی اصلی\n\n" +
          "دستورات:\n/shop — فروشگاه\n/status — وضعیت\n/order [شماره] — پیگیری سفارش\n/register — ثبت‌نام\n/help — راهنما",
          [[{ text: "🔙 منوی اصلی", callback_data: "back_main" }]]
        );
        return NextResponse.json({ ok: true });
      }

      return NextResponse.json({ ok: true });
    }

    // ─── Handle text commands ───
    if (text.startsWith("/start")) {
      const [welcomeRow] = await db.select({ value: siteSettings.value }).from(siteSettings)
        .where(and(eq(siteSettings.key, "telegram.welcome_message"), eq(siteSettings.group, "telegram"))).limit(1);
      const welcome = (welcomeRow?.value as string) || "به ربات فروشگاه درنیکا ساحل خوش آمدید 👋";

      // Check if already registered
      const tUser = await getTelegramUser(actualChatId);
      const msg = tUser
        ? `🏪 <b>درنیکا ساحل</b>\n\n${welcome}\n\n👤 ${tUser.name} عزیز، خوش آمدید!\nاز منوی زیر می‌توانید فروشگاه را مرور کنید:`
        : `🏪 <b>درنیکا ساحل</b>\n\n${welcome}\n\nاز منوی زیر می‌توانید فروشگاه را مرور کنید:\n⚠️ برای خرید نیاز به ثبت‌نام دارید.`;

      await sendMsg(msg, mainMenu());

      // Remove persistent keyboard if present
      await fetchWithProxy(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: actualChatId, text: ".", parse_mode: "HTML",
          reply_markup: { remove_keyboard: true },
        }),
      }, proxyConfig);
    }
    else if (text.startsWith("/shop")) {
      const tUser = await getTelegramUser(actualChatId);
      if (!tUser) {
        await sendMsg(
          "🔒 <b>فروشگاه</b>\n\nبرای مشاهده محصولات باید ثبت‌نام کنید.",
          [[{ text: "📱 ثبت‌نام / ورود", callback_data: "start_register" }]]
        );
      } else {
        await showCategories(sendMsg);
      }
    }
    else if (text.startsWith("/register")) {
      await sendMsg(
        "📱 <b>ثبت‌نام در فروشگاه</b>\n\nبرای ثبت‌نام، دکمه زیر را بزنید تا شماره تماس شما از طریق تلگرام ارسال شود:",
        [],
        {
          keyboard: [[{ text: "📱 ارسال شماره تماس", request_contact: true }]],
          resize_keyboard: true, one_time_keyboard: true,
        }
      );
    }
    else if (text.startsWith("/status")) {
      await showStatus(sendMsg);
    }
    else if (text.startsWith("/help")) {
      await sendMsg(
        "🤖 <b>راهنمای ربات فروشگاه</b>\n\n" +
        "/shop — 🛍 فروشگاه\n" +
        "/register — 📝 ثبت‌نام\n" +
        "/status — 📊 وضعیت\n" +
        "/order [شماره] — 📋 پیگیری سفارش\n" +
        "/help — ❓ راهنما",
        [[{ text: "🏪 منوی اصلی", callback_data: "back_main" }]]
      );
    }
    else if (text.startsWith("/order")) {
      const orderNumber = text.replace("/order", "").trim();
      if (!orderNumber) {
        await sendMsg("🔍 <b>پیگیری سفارش</b>\n\nلطفاً شماره سفارش را وارد کنید:\n<code>/order TB-XXXXX</code>",
          [[{ text: "🏪 منوی اصلی", callback_data: "back_main" }]]);
      } else {
        const [order] = await db.select({
          orderNumber: orders.orderNumber, status: orders.status,
          totalAmount: orders.totalAmount, createdAt: orders.createdAt,
        }).from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);

        if (order) {
          const statusMap: Record<string, string> = {
            pending_payment: "⏳ در انتظار پرداخت",
            paid: "✅ پرداخت شده",
            processing: "🔄 در حال پردازش",
            shipped: "📦 ارسال شده",
            delivered: "✅ تحویل شده",
            cancelled: "❌ لغو شده",
          };
          const date = new Date(order.createdAt).toLocaleDateString("fa-IR");
          await sendMsg(
            `📋 <b>سفارش ${order.orderNumber}</b>\n\n` +
            `📅 تاریخ: ${date}\n` +
            `💰 مبلغ: ${Number(order.totalAmount).toLocaleString()} ریال\n` +
            `📌 وضعیت: ${statusMap[order.status] || order.status}`,
            [[{ text: "🏪 منوی اصلی", callback_data: "back_main" }]]
          );
        } else {
          await sendMsg("❌ سفارشی با این شماره یافت نشد.", [[{ text: "🏪 منوی اصلی", callback_data: "back_main" }]]);
        }
      }
    }
    else {
      await sendMsg(
        "❓ دستور نامشخص\n\nاز دکمه زیر برای بازگشت به منو استفاده کنید:",
        [[{ text: "🏪 منوی اصلی", callback_data: "back_main" }]]
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[telegram/webhook]", error);
    return NextResponse.json({ ok: false, error: "Internal error" });
  }
}

// ─── Main menu ───
function mainMenu() {
  return [
    [{ text: "🛍 فروشگاه", callback_data: "back_shop" }],
    [{ text: "📊 وضعیت", callback_data: "cmd_status" }, { text: "📋 راهنما", callback_data: "cmd_help" }],
  ];
}

// ─── Show status ───
async function showStatus(sendFn: any) {
  try {
    const [prodCount] = await db.select({ value: count() }).from(products).where(eq(products.isActive, true));
    const [catCount] = await db.select({ value: count() }).from(categories).where(eq(categories.isActive, true));
    const [orderCount] = await db.select({ value: count() }).from(orders);

    await sendFn(
      `📊 <b>وضعیت فروشگاه</b>\n\n🟢 فعال\n\n🛍 محصولات: <b>${prodCount?.value || 0}</b>\n📁 دسته‌بندی‌ها: <b>${catCount?.value || 0}</b>\n📦 سفارشات: <b>${orderCount?.value || 0}</b>`,
      [[{ text: "🛍 فروشگاه", callback_data: "back_shop" }], [{ text: "🔙 منوی اصلی", callback_data: "back_main" }]]
    );
  } catch {
    await sendFn("❌ خطا", [[{ text: "🔙 منوی اصلی", callback_data: "back_main" }]]);
  }
}

// ─── Show categories ───
async function showCategories(sendFn: any) {
  const cats = await db.select({ slug: categories.slug, title: categories.title }).from(categories)
    .where(eq(categories.isActive, true)).orderBy(asc(categories.sortOrder));
  const kb = cats.map(c => [{ text: `📁 ${c.title}`, callback_data: `cat_${c.slug}` }]);
  kb.push([{ text: "🏪 منوی اصلی", callback_data: "back_main" }]);
  await sendFn("🛍 <b>دسته‌بندی‌های فروشگاه</b>\n\nلطفاً یک دسته را انتخاب کنید:", kb);
}

// ─── Show products by category ───
async function showProductsByCategory(catSlug: string, sendFn: any) {
  const [cat] = await db.select({ id: categories.id, title: categories.title }).from(categories)
    .where(eq(categories.slug, catSlug)).limit(1);
  if (!cat) { await sendFn("❌ یافت نشد", [[{ text: "🔙 بازگشت", callback_data: "back_shop" }]]); return; }

  const prods = await db.select({
    slug: products.slug, title: products.title,
    minPrice: sql<string>`min(${productVariants.price})::text`,
  }).from(products)
    .leftJoin(productVariants, eq(productVariants.productId, products.id))
    .where(and(eq(products.categoryId, cat.id), eq(products.isActive, true)))
    .groupBy(products.id).orderBy(asc(products.sortOrder));

  if (prods.length === 0) {
    await sendFn(`📁 <b>${cat.title}</b>\n\nهیچ محصولی وجود ندارد.`,
      [[{ text: "🔙 بازگشت", callback_data: "back_shop" }]]);
    return;
  }

  const kb = prods.map(p => [{ text: `🛒 ${p.title}`, callback_data: `prod_${p.slug}` }]);
  kb.push([{ text: "🔙 بازگشت", callback_data: "back_shop" }]);

  let msg = `📁 <b>${cat.title}</b>\n\n`;
  for (const p of prods) {
    msg += `🛒 ${p.title} — <b>${Number(p.minPrice || 0).toLocaleString()}</b> ریال\n`;
  }
  await sendFn(msg, kb);
}

// ─── Show product detail ───
async function showProductDetail(slug: string, sendFn: any, botToken: string, chatId: number, proxyConfig?: any) {
  const [prod] = await db.select({
    id: products.id, title: products.title, subtitle: products.subtitle,
    description: products.description, coverImage: products.coverImage,
  }).from(products).where(eq(products.slug, slug)).limit(1);

  if (!prod) { await sendFn("❌ محصول یافت نشد", [[{ text: "🔙 بازگشت", callback_data: "back_shop" }]]); return; }

  const variants = await db.select({
    id: productVariants.id, name: productVariants.name,
    price: productVariants.price, stock: productVariants.stock,
  }).from(productVariants)
    .where(and(eq(productVariants.productId, prod.id), eq(productVariants.isActive, true)))
    .orderBy(asc(productVariants.sortOrder));

  let msg = `🛒 <b>${prod.title}</b>\n\n`;
  if (prod.subtitle) msg += `📝 ${prod.subtitle}\n\n`;
  if (prod.description) msg += `${prod.description.slice(0, 300)}${prod.description.length > 300 ? "..." : ""}\n\n`;

  const kb: any[] = [];
  if (variants.length > 0) {
    msg += "💵 <b>قیمت‌ها:</b>\n";
    for (const v of variants) {
      msg += `• ${v.name}: <b>${Number(v.price).toLocaleString()}</b> ریال ${v.stock <= 0 ? "— ❌ ناموجود" : ""}\n`;
      if (v.stock > 0) {
        kb.push([{ text: `🛒 خرید ${v.name} — ${Number(v.price).toLocaleString()} ریال`, callback_data: `buy_${v.id}` }]);
      }
    }
  }
  kb.push([{ text: "🔙 بازگشت", callback_data: "back_shop" }]);

  // Send image
  if (prod.coverImage) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "";
      const fullUrl = prod.coverImage.startsWith("http") ? prod.coverImage : `${baseUrl}${prod.coverImage}`;
      await fetchWithProxy(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, photo: fullUrl, caption: prod.title, parse_mode: "HTML" }),
      }, proxyConfig);
    } catch {}
  }

  await sendFn(msg, kb);
}
