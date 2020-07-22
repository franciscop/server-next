const $ = u;

// Remove an incorrect "get" that there was highlighted
Prism.hooks.add("after-highlight", function (env) {
  u("span.token.keyword").each((el) => {
    if (el.innerHTML === "get") {
      if (el.nextElementSibling && el.nextElementSibling.innerHTML === "(") {
        u(el).replace('<span class="token function">get</span>');
      } else {
        u(el).replace("get");
      }
    }
    if (el.innerHTML === "delete") {
      if (
        el.previousElementSibling &&
        el.previousElementSibling.innerHTML === "."
      ) {
        u(el).replace("delete");
      }
    }
    if (el.innerHTML === "public") u(el).replace("public");
  });
});

const showSection = (section) => {
  if (!section.is) section = $(section);
  if (!section.is("section")) section = section.closest("section");
  const isActive = section.hasClass("active");
  $("aside section").removeClass("active");
  section.toggleClass("active", !isActive);
  const menu = section.find(".submenu").first();
  const height = isActive ? 0 : menu.scrollHeight;
  menu.style.maxHeight = height + "px";
  section.find("h3 img").attr("src", `/img/${isActive ? "plus" : "minus"}.svg`);
};

if (/^\/documentation\/?$/.test(window.location.pathname)) {
  showSection($(".more").first());
} else {
  showSection($(`a[href="${window.location.pathname}"]`));
}

$(".more").on("click", (e) => {
  showSection(e.currentTarget);
});

// Go to the appropriate part of the page when clicking an internal link
// Manual event delegation
u("a").on("click", (e) => {
  const href = u(e.currentTarget).attr("href");
  if (!href) return;
  const [url, hash] = href.split("#");

  // If it is the current URL just go to the top
  if (url === window.location.pathname && !hash) {
    e.preventDefault();
    u("body").scroll();
    history.replaceState(null, null, window.location.pathname);
    return;
  }

  // If it is an internal link go to that part
  console.log(url, window.location.pathname);
  if ((!url || url === window.location.pathname) && u("#" + hash).length) {
    e.preventDefault();
    u("#" + hash).scroll();
    history.replaceState(null, null, "#" + hash);
  }
});

// Search focus
(() => {
  if (!$(".search").length) return;

  window.addEventListener("keydown", (e) => {
    if (e.target.nodeName === "INPUT") {
      if (e.key === "Escape") {
        e.target.blur();
      }
      return;
    }
    if (e.key === "/") {
      e.preventDefault();
      $("aside input").first().focus();
    }
  });

  $(".search input").on("input", (e) => {
    $(e.target).closest("form").toggleClass("active", !!e.target.value);
  });
})();
