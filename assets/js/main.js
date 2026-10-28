/* Điện Lạnh Đắc An — site behaviour (no dependencies) */
(function () {
  "use strict";
  var doc = document.documentElement;
  doc.classList.add("js");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Header shadow on scroll */
  var header = document.querySelector(".header");
  if (header) {
    var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 8); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* Mobile drawer */
  var drawer = document.getElementById("drawer");
  var toggle = document.querySelector(".header .menu-toggle");
  function setDrawer(open) {
    if (!drawer || !toggle) return;
    drawer.classList.toggle("is-open", open);
    drawer.setAttribute("aria-hidden", open ? "false" : "true");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.style.overflow = open ? "hidden" : "";
    if (open) {
      var first = drawer.querySelector("nav a");
      if (first) first.focus();
    } else {
      toggle.focus({ preventScroll: true });
    }
  }
  if (toggle) toggle.addEventListener("click", function () { setDrawer(true); });
  if (drawer) {
    drawer.addEventListener("click", function (e) {
      if (e.target.closest("[data-close]")) setDrawer(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && drawer.classList.contains("is-open")) setDrawer(false);
    });
  }

  /* Count-up for the capacity ledger (one orchestrated moment) */
  var counters = document.querySelectorAll(".count[data-to]");
  var fmt = new Intl.NumberFormat("vi-VN");
  function run(el) {
    var to = parseInt(el.getAttribute("data-to"), 10);
    if (reduceMotion || !to) { el.textContent = fmt.format(to); return; }
    var start = null, dur = 1400;
    function frame(t) {
      if (!start) start = t;
      var p = Math.min((t - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt.format(Math.round(to * eased));
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  if (counters.length && "IntersectionObserver" in window) {
    if (!reduceMotion) counters.forEach(function (c) { c.textContent = "0"; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { run(en.target); io.unobserve(en.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { io.observe(c); });
  }

  /* Service catalog filter (Dịch vụ page) */
  var filterBar = document.querySelector("[data-filter-bar]");
  if (filterBar) {
    filterBar.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-filter]");
      if (!btn) return;
      var f = btn.getAttribute("data-filter");
      filterBar.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", b === btn ? "true" : "false"); });
      document.querySelectorAll(".cat").forEach(function (card) {
        var jobs = card.querySelectorAll(".cat__jobs li");
        var visible = 0;
        jobs.forEach(function (li) {
          var show = f === "all" || li.getAttribute("data-type") === f;
          li.hidden = !show;
          if (show) visible++;
        });
        card.hidden = visible === 0;
      });
    });
  }

  /* "Đặt lịch" buttons on catalog prefill the device */
  document.querySelectorAll("[data-book]").forEach(function (a) {
    a.addEventListener("click", function () {
      var sel = document.getElementById("f-device");
      if (sel) sel.value = a.getAttribute("data-book");
      var seg = document.getElementById("seg-b2c");
      if (seg) { seg.checked = true; seg.dispatchEvent(new Event("change", { bubbles: true })); }
    });
  });

  /* Lead / booking form */
  document.querySelectorAll("[data-lead-form]").forEach(function (form) {
    var status = form.querySelector(".form__status");
    var submit = form.querySelector('button[type="submit"]');

    function syncSegment() {
      var seg = form.querySelector('input[name="segment"]:checked');
      var isB2B = seg && seg.value === "Doanh nghiệp";
      form.querySelectorAll("[data-b2b]").forEach(function (el) { el.hidden = !isB2B; });
      form.querySelectorAll("[data-b2c]").forEach(function (el) { el.hidden = isB2B; });
    }
    form.addEventListener("change", function (e) { if (e.target.name === "segment") syncSegment(); });
    syncSegment();

    function setErr(input, msg) {
      var wrap = input.closest(".field");
      var err = wrap && wrap.querySelector(".err");
      input.setAttribute("aria-invalid", msg ? "true" : "false");
      if (err) err.textContent = msg || "";
    }
    function validate() {
      var ok = true, firstBad = null;
      var name = form.elements.name, phone = form.elements.phone, need = form.elements.need, email = form.elements.email;
      if (name && !name.value.trim()) { setErr(name, "Nhập họ tên để Đắc An xưng hô khi gọi lại."); ok = false; firstBad = firstBad || name; } else if (name) setErr(name, "");
      var digits = phone ? phone.value.replace(/\D/g, "") : "";
      if (phone && (digits.length < 9 || digits.length > 12)) { setErr(phone, "Nhập số điện thoại 9–12 chữ số, ví dụ 0916 756 248."); ok = false; firstBad = firstBad || phone; } else if (phone) setErr(phone, "");
      if (email && email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) { setErr(email, "Email chưa đúng định dạng."); ok = false; firstBad = firstBad || email; } else if (email) setErr(email, "");
      if (need && !need.value) { setErr(need, "Chọn nhu cầu để Đắc An chuyển đúng bộ phận."); ok = false; firstBad = firstBad || need; } else if (need) setErr(need, "");
      if (firstBad) firstBad.focus();
      return ok;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      status.className = "form__status";
      status.textContent = "";
      if (!validate()) return;

      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = typeof v === "string" ? v.trim() : v; });
      data.page = location.pathname;

      submit.disabled = true;
      var label = submit.textContent;
      submit.textContent = "Đang gửi…";

      fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (body) { return { ok: res.ok, body: body }; });
      }).then(function (r) {
        if (r.ok && r.body && r.body.ok) {
          status.className = "form__status is-ok";
          status.textContent = "Đã gửi yêu cầu. Đắc An sẽ gọi lại cho bạn sớm nhất.";
          form.reset();
          syncSegment();
        } else {
          throw new Error("send-failed");
        }
      }).catch(function () {
        status.className = "form__status is-err";
        status.innerHTML = 'Chưa gửi được yêu cầu. Vui lòng gọi <a href="tel:+84916756248">0916 756 248</a> hoặc email <a href="mailto:phuong@dacanco.com">phuong@dacanco.com</a>.';
      }).finally(function () {
        submit.disabled = false;
        submit.textContent = label;
      });
    });
  });

  /* Footer year */
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
