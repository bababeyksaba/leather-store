"use client";

const stages = [
  ["new", "در انتظار آماده‌سازی"],
  ["processing", "در حال آماده‌سازی"],
  ["shipped", "ارسال‌شده"],
  ["delivered", "تحویل‌شده"],
];

function dateText(value) {
  return value
    ? new Date(value).toLocaleString("fa-IR")
    : "—";
}

export default function OrderFulfillment({ order }) {
  if (order.status !== "paid") return null;

  const current = stages.findIndex(
    ([id]) => id === order.fulfillment_status
  );

  return (
    <section
      aria-label="وضعیت ارسال سفارش"
      className="address-card"
    >
      <h3>
        وضعیت ارسال:
        {" "}
        {order.fulfillment_label || "در انتظار آماده‌سازی"}
      </h3>

      <ol>
        {stages.map(([id, title], index) => (
          <li
            key={id}
            aria-current={
              index === current ? "step" : undefined
            }
          >
            {index < current
              ? "✓ "
              : index === current
                ? "● "
                : "○ "}

            {title}
          </li>
        ))}
      </ol>

      {order.processing_at && (
        <p>
          شروع آماده‌سازی:
          {" "}
          {dateText(order.processing_at)}
        </p>
      )}

      {order.shipped_at && (
        <p>
          زمان ارسال: {dateText(order.shipped_at)}
        </p>
      )}

      {order.delivered_at && (
        <p>
          زمان تحویل: {dateText(order.delivered_at)}
        </p>
      )}

      {order.carrier && (
        <p>شرکت حمل: {order.carrier}</p>
      )}

      {order.tracking_code && (
        <p>
          کد رهگیری:
          {" "}
          <b dir="ltr">{order.tracking_code}</b>
        </p>
      )}
    </section>
  );
}