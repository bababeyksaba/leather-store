"use client";

import { useEffect, useRef, useState } from "react";
import { api, imageUrl } from "../lib/api";
import "./category-menu.css";

function containsCategory(category, slug) {
  return Boolean(
    slug &&
      (category.slug === slug ||
        (category.children ?? []).some((child) =>
          containsCategory(child, slug)
        ))
  );
}

function flattenCategories(categories) {
  return categories.flatMap((category) => [
    category,
    ...flattenCategories(category.children ?? []),
  ]);
}

function CategoryImage({ image, title }) {
  const [failed, setFailed] = useState(false);
  const src = imageUrl(image);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <div className="store-menu-image">
      {src && !failed ? (
        <img
          src={src}
          alt={title}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span>{title}</span>
      )}
    </div>
  );
}

function CategoryBranch({ category, selectedSlug, onSelect }) {
  const descendants = flattenCategories(category.children ?? []);

  return (
    <section className="store-menu-column">
      <CategoryImage image={category.image} title={category.name} />

      <h3 className="store-menu-title">{category.name}</h3>

      {descendants.length > 0 && (
        <ul className="store-menu-links">
          {descendants.map((child) => (
            <li key={child.id}>
              <button
                type="button"
                aria-pressed={selectedSlug === child.slug}
                onClick={() => onSelect(child)}
              >
                {child.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function CategoryMenu({
  onSelect,
  selectedSlug = "",
}) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [openGroup, setOpenGroup] = useState(null);
  const [mobile, setMobile] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const rootRef = useRef(null);
  const drawerRef = useRef(null);
  const toggleRef = useRef(null);
  const closeRef = useRef(null);
  const triggersRef = useRef({});
  const timerRef = useRef(null);

  function cancelClose() {
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }

  function closeDrawer() {
    cancelClose();
    setDrawerOpen(false);
    setOpenGroup(null);
    toggleRef.current?.focus();
  }

  function closeGroup() {
    cancelClose();
    const previous = openGroup;
    setOpenGroup(null);
    triggersRef.current[previous]?.focus();
  }

  function selectCategory(category) {
    cancelClose();
    setOpenGroup(null);
    setDrawerOpen(false);

    if (mobile) {
      toggleRef.current?.focus();
    }

    const value = {
      slug: category.slug,
      title: category.name,
    };

    if (typeof onSelect === "function") {
      onSelect(value);
    } else {
      window.location.assign(
        `/?category=${encodeURIComponent(category.slug)}#catalog`
      );
    }
  }

  function openWithMouse(id) {
    if (
      mobile ||
      !window.matchMedia("(hover: hover) and (pointer: fine)").matches
    ) {
      return;
    }

    cancelClose();
    setOpenGroup(id);
  }

  function scheduleClose() {
    if (mobile) return;

    cancelClose();

    timerRef.current = setTimeout(() => {
      if (!rootRef.current?.contains(document.activeElement)) {
        setOpenGroup(null);
      }
    }, 180);
  }

  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");

    function sync() {
      setMobile(media.matches);
      setDrawerOpen(false);
      setOpenGroup(null);
    }

    sync();
    media.addEventListener("change", sync);

    return () => {
      media.removeEventListener("change", sync);
      clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");

    api("menu/categories/")
      .then((data) => {
        if (active) {
          setGroups(
            Array.isArray(data) ? data : data?.results ?? []
          );
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || "دریافت دسته‌بندی‌ها ناموفق بود.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [retry]);

  useEffect(() => {
    function handleOutside(event) {
      if (!rootRef.current?.contains(event.target)) {
        cancelClose();
        setOpenGroup(null);
      }
    }

    function handleEscape(event) {
      if (event.key !== "Escape") return;

      if (drawerOpen) {
        closeDrawer();
      } else if (openGroup !== null) {
        closeGroup();
      }
    }

    document.addEventListener("pointerdown", handleOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [drawerOpen, openGroup]);

  useEffect(() => {
    if (!mobile || !drawerOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function trapFocus(event) {
      if (event.key !== "Tab") return;

      const elements = Array.from(
        drawerRef.current?.querySelectorAll(
          'button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]'
        ) ?? []
      ).filter((element) => element.getClientRects().length > 0);

      const first = elements[0];
      const last = elements[elements.length - 1];

      if (!first) {
        event.preventDefault();
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", trapFocus);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", trapFocus);
    };
  }, [mobile, drawerOpen]);

  return (
    <div className="store-navigation" ref={rootRef}>
      <button
        ref={toggleRef}
        type="button"
        className="store-menu-toggle"
        aria-label="باز کردن منوی محصولات"
        aria-expanded={drawerOpen}
        aria-controls="store-category-navigation"
        onClick={() => setDrawerOpen(true)}
      >
        <svg
          width="25"
          height="25"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {mobile && drawerOpen && (
        <div
          className="store-menu-backdrop"
          aria-hidden="true"
          onClick={closeDrawer}
        />
      )}

      <div
        id="store-category-navigation"
        ref={drawerRef}
        className={`store-menu-surface ${drawerOpen ? "is-open" : ""}`}
        role={mobile ? "dialog" : undefined}
        aria-modal={mobile && drawerOpen ? true : undefined}
        aria-label="منوی محصولات"
        hidden={mobile && !drawerOpen}
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
        onBlur={(event) => {
          if (
            !mobile &&
            !event.currentTarget.contains(event.relatedTarget)
          ) {
            cancelClose();
            setOpenGroup(null);
          }
        }}
      >
        <div className="store-drawer-heading">
          <strong>دسته‌بندی محصولات</strong>

          <button
            ref={closeRef}
            type="button"
            className="store-menu-icon"
            aria-label="بستن منو"
            onClick={closeDrawer}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <nav className="store-menu-nav" aria-label="دسته‌بندی محصولات">
          {loading && (
            <p className="store-menu-status" role="status">
              در حال دریافت دسته‌بندی‌ها…
            </p>
          )}

          {error && (
            <div className="store-menu-status" role="alert">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => setRetry((value) => value + 1)}
              >
                تلاش دوباره
              </button>
            </div>
          )}

          {!loading && !error && !groups.length && (
            <p className="store-menu-status">
              هنوز دسته‌بندی‌ای ثبت نشده است.
            </p>
          )}

          {!loading && !error && groups.map((group) => {
            const hasChildren = Boolean(group.children?.length);
            const expanded = openGroup === group.id;

            return (
              <div className="store-menu-group" key={group.id}>
                <button
                  ref={(element) => {
                    triggersRef.current[group.id] = element;
                  }}
                  type="button"
                  className={`store-menu-trigger ${
                    containsCategory(group, selectedSlug)
                      ? "is-selected"
                      : ""
                  }`}
                  aria-expanded={hasChildren ? expanded : undefined}
                  aria-controls={
                    hasChildren ? `store-panel-${group.id}` : undefined
                  }
                  onMouseEnter={() =>
                    openWithMouse(hasChildren ? group.id : null)
                  }
                  onClick={(event) => {
                    cancelClose();

                    if (!hasChildren) {
                      selectCategory(group);
                      return;
                    }

                    const mouseClick =
                      !mobile &&
                      event.detail > 0 &&
                      window.matchMedia(
                        "(hover: hover) and (pointer: fine)"
                      ).matches;

                    setOpenGroup(
                      mouseClick ? group.id : expanded ? null : group.id
                    );
                  }}
                >
                  <span>{group.name}</span>

                  {hasChildren && (
                    <svg
                      className="store-menu-chevron"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      aria-hidden="true"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  )}
                </button>

                {hasChildren && (
                  <div
                    id={`store-panel-${group.id}`}
                    className="store-menu-panel"
                    hidden={!expanded}
                  >
                    <div className="store-panel-heading">
                      <strong>محصولات {group.name}</strong>
                      <button
                        type="button"
                        className="store-menu-icon"
                        aria-label="بستن زیرمنو"
                        onClick={closeGroup}
                      >
                        ×
                      </button>
                    </div>

                    <div className="store-menu-grid">
                      {group.children.map((category) => (
                        <CategoryBranch
                          key={category.id}
                          category={category}
                          selectedSlug={selectedSlug}
                          onSelect={selectCategory}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );
}