"use client";

const stages = [
  { title: "ثبت سفارش", icon: "store" },
  { title: "تحویل به پیک", icon: "box" },
  { title: "ارسال به مشتری", icon: "truck" },
  { title: "تحویل سفارش", icon: "home" },
];

function StageIcon({ type }) {
  const icons = {
    store: (
      <>
        <path d="M3 10V5h18v5M5 10v11h14V10M9 21v-7h6v7" />
        <path d="M3 10c0 3 4 3 4 0 0 3 5 3 5 0 0 3 5 3 5 0 0 3 4 3 4 0M3 5l2-3h14l2 3" />
      </>
    ),

    box: (
      <>
        <path d="m3 7 9-4 9 4v10l-9 4-9-4Z" />
        <path d="m3 7 9 4 9-4M12 11v10M7 5l10 4" />
      </>
    ),

    truck: (
      <>
        <path d="M2 4h12v13H2ZM14 9h4l4 5v3h-8M18 9v5h4" />
        <circle cx="6" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
      </>
    ),

    home: (
      <>
        <path d="m3 10 9-7 9 7M5 9v12h14V9" />
        <path d="m8 15 3 3 5-6" />
      </>
    ),
  };

  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icons[type]}
    </svg>
  );
}

function dateText(value) {
  if (!value) return "";

  return new Date(value).toLocaleString("fa-IR");
}

export default function OrderFulfillment({ order }) {
  if (order.status !== "paid") return null;

  const current = {
    new: 0,
    processing: 1,
    shipped: 2,
    delivered: 3,
  }[order.fulfillment_status];

  if (current === undefined) {
    return <p>وضعیت ارسال هنوز مشخص نشده است.</p>;
  }

  // تحویل به پیک و شروع ارسال در بک‌اند با shipped ثبت می‌شوند.
  const times = [
    order.paid_at || order.created_at,
    order.shipped_at,
    order.shipped_at,
    order.delivered_at,
  ];

  const descriptions = {
    new: "سفارش شما ثبت شده و در انتظار آماده‌سازی است.",
    processing: "سفارش در حال آماده‌سازی برای تحویل به پیک است.",
    shipped: "سفارش به شرکت حمل تحویل شده و در مسیر شماست.",
    delivered: "سفارش تحویل داده شده است.",
  };

  return (
    <section
      className="order-tracker"
      aria-label="مراحل ارسال سفارش"
    >
      <div className="order-tracker-heading">
        <h3>مسیر سفارش شما</h3>

        <span>{order.fulfillment_label}</span>
      </div>

      <ol className="order-timeline">
        {stages.map((stage, index) => {
          const completed =
            index < current ||
            (current === 3 && index === 3);

          const active = index === current;

          const className = [
            "order-step",
            completed ? "is-done" : "",
            active ? "is-current" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <li
              key={stage.icon}
              className={className}
              aria-current={active ? "step" : undefined}
            >
              <div className="order-step-icon">
                <StageIcon type={stage.icon} />

                {completed && (
                  <span
                    className="order-step-check"
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                )}
              </div>

              <div className="order-step-text">
                <strong>{stage.title}</strong>

                <small>
                  {completed
                    ? "تکمیل‌شده"
                    : active
                      ? index === 1
                        ? "در حال آماده‌سازی"
                        : "مرحلهٔ فعلی"
                      : "در انتظار"}
                </small>

                {times[index] && (completed || active) && (
                  <time dateTime={times[index]}>
                    {dateText(times[index])}
                  </time>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <p className="order-tracker-note" role="status">
        {descriptions[order.fulfillment_status]}
      </p>

      {(order.carrier || order.tracking_code) && (
        <dl className="order-shipping-meta">
          {order.carrier && (
            <div>
              <dt>شرکت حمل</dt>
              <dd>{order.carrier}</dd>
            </div>
          )}

          {order.tracking_code && (
            <div>
              <dt>کد رهگیری</dt>
              <dd dir="ltr">{order.tracking_code}</dd>
            </div>
          )}
        </dl>
      )}
    </section>
  );
}