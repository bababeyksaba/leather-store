export const dynamic = "force-dynamic";

const backend = (
  process.env.DJANGO_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

async function proxy(request, context) {
  const { path } = await context.params;
  const pathname = path.join("/");

  const allowed =
    /^(products(?:\/.*)?|categories(?:\/.*)?|orders(?:\/.*)?|shipping-methods\/?|auth(?:\/.*)?|account(?:\/.*)?|cart(?:\/.*)?|media(?:\/.*)?|menu\/categories\/?)$/.test(
      pathname
    );

  const invalidPath = path.some(
    (part) =>
      part === "." ||
      part === ".." ||
      part.includes("/") ||
      part.includes("\\")
  );

  if (!allowed || invalidPath) {
    return Response.json(
      { detail: "مسیر مجاز نیست." },
      { status: 404 }
    );
  }

  const isMedia = path[0] === "media";

  if (isMedia && request.method !== "GET") {
    return Response.json(
      { detail: "روش مجاز نیست." },
      { status: 405 }
    );
  }

  const encodedPath = path.map(encodeURIComponent).join("/");

  const url = new URL(
    `${isMedia ? "/" : "/api/"}${encodedPath}${
      isMedia ? "" : "/"
    }`,
    backend
  );

  url.search = new URL(request.url).search;

  const headers = new Headers();

  for (const name of [
    "cookie",
    "content-type",
    "x-csrftoken",
    "origin",
    "referer",
  ]) {
    const value = request.headers.get(name);

    if (value) headers.set(name, value);
  }

  try {
    const upstream = await fetch(url, {
      method: request.method,
      headers,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
      ...(request.method === "GET"
        ? {}
        : { body: await request.arrayBuffer() }),
    });

    const outgoing = new Headers({
      "Cache-Control": "no-store",
    });

    const contentType = upstream.headers.get("content-type");

    if (contentType) {
      outgoing.set("content-type", contentType);
    }

    for (const cookie of upstream.headers.getSetCookie()) {
      outgoing.append("set-cookie", cookie);
    }

    return new Response(
      upstream.status === 204 ? null : upstream.body,
      {
        status: upstream.status,
        headers: outgoing,
      }
    );
  } catch {
    return Response.json(
      {
        detail:
          "اتصال به Django برقرار نشد. سرور پورت ۸۰۰۰ را اجرا کنید.",
      },
      { status: 502 }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;