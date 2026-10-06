"use client";

import { useEffect, useRef, useState } from "react";
import { api, imageUrl } from "../lib/api";

function containsCategory(category, slug) {
  if (!slug) return false;

  return (
    category.slug === slug ||
    (category.children ?? []).some((child) =>
      containsCategory(child, slug)
    )
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
    <span className="category-menu-image">
      {src && !failed ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="category-image-placeholder">
          {title}
        </span>
      )}
    </span>
  );
}

function CategoryBranch({
  category,
  selectedSlug,
  onSelect,
}) {
  const descendants = flattenCategories(
    category.children ?? []
  );

  return (
    <div className="category-column">
      <div className="category-menu-card">
        <CategoryImage
          image={category.image}
          title={category.name}
        />

        <h3 className="category-menu-title">
          {category.name}
        </h3>
      </div>

      {descendants.length > 0 && (
        <ul className="category-text-list">
          {descendants.map((child) => (
            <li key={child.id}>
              <button
                type="button"
                className="category-text-link"
                aria-pressed={selectedSlug === child.slug}
                onClick={() => onSelect(child)}
              >
                {child.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        className="category-view-all"
        onClick={() => onSelect(category)}
      >
        نمایش همه ←
      </button>
    </div>
  );
}

export default function CategoryMenu({
  onSelect,
  selectedSlug = "",
}) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openGroup, setOpenGroup] = useState(null);
  const [retry, setRetry] = useState(0);

  const menuRef = useRef(null);
  const triggerRefs = useRef({});
  const closeTimer = useRef(null);

  function cancelClose() {
    if (closeTimer.current !== null) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function supportsHover() {
    return window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    ).matches;
  }

  function openWithMouse(groupId) {
    if (!supportsHover()) return;

    cancelClose();
    setOpenGroup(groupId);
  }

  function scheduleClose() {
    if (!supportsHover()) return;

    // هنگام استفاده از صفحه‌کلید، منوی دارای فوکوس باز بماند.
    if (
      menuRef.current?.contains(document.activeElement)
    ) {
      return;
    }

    cancelClose();

    closeTimer.current = setTimeout(() => {
      setOpenGroup(null);
      closeTimer.current = null;
    }, 200);
  }

  useEffect(() => {
    return () => {
      if (closeTimer.current !== null) {
        clearTimeout(closeTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");

    api("menu/categories/")
      .then((data) => {
        if (!active) return;

        setGroups(
          Array.isArray(data) ? data : data.results ?? []
        );
      })
      .catch((err) => {
        if (!active) return;

        setError(
          err.message || "دریافت دسته‌بندی‌ها ناموفق بود."
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [retry]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!menuRef.current?.contains(event.target)) {
        cancelClose();
        setOpenGroup(null);
      }
    }

    function handleEscape(event) {
      if (
        event.key === "Escape" &&
        openGroup !== null
      ) {
        cancelClose();
        setOpenGroup(null);
        triggerRefs.current[openGroup]?.focus();
      }
    }

    document.addEventListener(
      "pointerdown",
      handleOutsideClick
    );

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handleOutsideClick
      );

      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [openGroup]);

  function closePanel() {
    cancelClose();

    const previousGroup = openGroup;
    setOpenGroup(null);

    if (previousGroup !== null) {
      triggerRefs.current[previousGroup]?.focus();
    }
  }

  function selectCategory(category) {
    cancelClose();

    onSelect({
      slug: category.slug,
      title: category.name,
    });

    closePanel();
  }

  function selectAllProducts() {
    cancelClose();

    onSelect({
      slug: "",
      title: "همهٔ محصولات",
    });

    setOpenGroup(null);
  }

  return (
    <nav
      className="category-menu"
      aria-label="دسته‌بندی محصولات"
      ref={menuRef}
      onMouseEnter={cancelClose}
      onMouseLeave={scheduleClose}
      onBlur={(event) => {
        if (
          !event.currentTarget.contains(
            event.relatedTarget
          )
        ) {
          cancelClose();
          setOpenGroup(null);
        }
      }}
    >
      <div className="category-menu-bar">
        <button
          type="button"
          className={`category-menu-trigger ${
            !selectedSlug ? "is-selected" : ""
          }`}
          onMouseEnter={() => openWithMouse(null)}
          onClick={selectAllProducts}
        >
          همهٔ محصولات
        </button>

        {groups.map((group) => {
          const hasChildren =
            (group.children ?? []).length > 0;

          const selected = containsCategory(
            group,
            selectedSlug
          );

          const expanded = openGroup === group.id;

          return (
            <button
              key={group.id}
              ref={(element) => {
                triggerRefs.current[group.id] = element;
              }}
              type="button"
              className={`category-menu-trigger ${
                selected ? "is-selected" : ""
              }`}
              aria-expanded={
                hasChildren ? expanded : undefined
              }
              aria-controls={
                hasChildren
                  ? `category-panel-${group.id}`
                  : undefined
              }
              onMouseEnter={() => {
                openWithMouse(
                  hasChildren ? group.id : null
                );
              }}
              onClick={(event) => {
                cancelClose();

                if (!hasChildren) {
                  selectCategory(group);
                  return;
                }

                // کلیک موس روی عنوان، منوی باز را نبندد.
                // لمس و فعال‌سازی با صفحه‌کلید حالت را تغییر دهند.
                if (
                  supportsHover() &&
                  event.detail > 0
                ) {
                  setOpenGroup(group.id);
                } else {
                  setOpenGroup(
                    expanded ? null : group.id
                  );
                }
              }}
            >
              {group.name}
            </button>
          );
        })}
      </div>

      {loading && (
        <p role="status">
          در حال دریافت دسته‌بندی‌ها…
        </p>
      )}

      {error && (
        <p className="error" role="alert">
          دریافت منو ناموفق بود: {error}

          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setRetry((value) => value + 1);
            }}
          >
            تلاش دوباره
          </button>
        </p>
      )}

      {groups.map((group) => {
        if (!group.children?.length) return null;

        return (
          <div
            key={group.id}
            id={`category-panel-${group.id}`}
            className="category-menu-panel"
            hidden={openGroup !== group.id}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            {openGroup === group.id && (
              <>
                <div className="category-menu-heading">
                  <strong>
                    محصولات {group.name}
                  </strong>

                  <button
                    type="button"
                    className="category-menu-close"
                    onClick={closePanel}
                    aria-label="بستن زیرمنو"
                  >
                    ×
                  </button>
                </div>

                <div className="category-menu-grid">
                  {group.children.map((category) => (
                    <CategoryBranch
                      key={category.id}
                      category={category}
                      selectedSlug={selectedSlug}
                      onSelect={selectCategory}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        );
      })}
    </nav>
  );
}