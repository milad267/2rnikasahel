import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCartPageData, readSessionToken } from "@/lib/commerce";
import { CheckoutForm } from "./CheckoutForm";

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/checkout");
  }

  const sessionToken = await readSessionToken();
  const cart = await getCartPageData(sessionToken);

  if (cart.items.length === 0) {
    redirect("/cart");
  }

  return (
    <div className="min-h-screen px-4 pb-24 pt-28 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-gradient-navy text-2xl font-black sm:text-3xl">تکمیل و تأیید نهایی سفارش</h1>
        <p className="mt-2 text-sm text-charcoal-500">
          آدرس ارسال و روش پرداخت را وارد کنید. پس از تأیید، سفارش شما ثبت و پرداخت می‌شود.
        </p>
        <div className="mt-8">
          <CheckoutForm
            subtotal={cart.subtotal}
            count={cart.count}
            userName={user.name}
            userPhone={user.phone}
          />
        </div>
      </div>
    </div>
  );
}
