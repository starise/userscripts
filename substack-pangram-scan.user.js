// ==UserScript==
// @version      0.1.0
// @name         Substack: Pangram scan text for AI
// @author       Andrea Brandi
// @namespace    https://github.com/starise/userscripts
// @description  Adds Substack's native Pangram scan to standalone post pages.
// @match        https://*/p/*
// @run-at       document-idle
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/starise/userscripts/main/substack-pangram-scan.user.js
// @updateURL    https://raw.githubusercontent.com/starise/userscripts/main/substack-pangram-scan.user.js
// ==/UserScript==

(() => {
  "use strict";

  const ID_PREFIX = "vm-substack-pangram-scan";
  const BUTTON_ID = `${ID_PREFIX}-button`;
  const DIALOG_ID = `${ID_PREFIX}-dialog`;
  const MAX_POLL_ATTEMPTS = 20;
  const POLL_DELAY_MS = 500;
  const REQUEST_TIMEOUT_MS = 15_000;

  const extractPostId = (content) => {
    if (typeof content !== "string") return null;
    return content.match(/(?:^|\/|%2f)post_preview(?:\/|%2f)(\d+)(?=\/|%2f|[?&#]|$)/i)?.[1] ?? null;
  };

  const getPostId = () => {
    for (const meta of document.querySelectorAll('meta[content*="post_preview"]')) {
      const postId = extractPostId(meta.content);
      if (postId) return postId;
    }
    return null;
  };

  const getPostContext = () => {
    if (!/^\/p\/[^/]+\/?$/.test(location.pathname)) return null;

    const header = document.querySelector("article .post-header");
    const postId = getPostId();
    if (!header || !postId) return null;

    const group = header.querySelector(".post-ufi")?.lastElementChild;
    return group ? { group, postId } : null;
  };

  const fetchJson = async (url) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        redirect: "error",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Substack returned ${response.status}`);

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.toLowerCase().includes("application/json")) {
        throw new Error("Substack returned an unexpected response");
      }
      return response.json();
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new Error("Substack did not respond in time");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  };

  const getDetection = async (postId) => {
    let taskId = null;
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      const query = taskId ? `?task_id=${encodeURIComponent(taskId)}` : "";
      const result = await fetchJson(`/api/v1/pangram/detection/p-${postId}${query}`);
      if (!result || typeof result !== "object" || Array.isArray(result)) {
        throw new Error("Substack returned invalid analysis data");
      }
      if (result.type !== "pending") return result;

      if (result.task_id != null) {
        if (typeof result.task_id !== "string" || !result.task_id || result.task_id.length > 200) {
          throw new Error("Substack returned an invalid task ID");
        }
        taskId = result.task_id;
      }
      if (!taskId) throw new Error("Substack did not return an analysis task ID");
      await new Promise((resolve) => setTimeout(resolve, POLL_DELAY_MS));
    }
    return {
      header: "Still analyzing",
      details: "Close this result and try again in a moment.",
    };
  };

  const appendTextElement = (parent, tagName, className, text) => {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    element.textContent = text;
    parent.append(element);
    return element;
  };

  const showResult = (result) => {
    document.getElementById(DIALOG_ID)?.remove();

    const dialog = document.createElement("dialog");
    dialog.id = DIALOG_ID;
    dialog.setAttribute("aria-labelledby", `${ID_PREFIX}-title`);

    const form = document.createElement("form");
    form.method = "dialog";
    const closeButton = appendTextElement(form, "button", "vm-close", "×");
    closeButton.type = "submit";
    closeButton.setAttribute("aria-label", "Close");

    const title = appendTextElement(
      form,
      "h2",
      "",
      typeof result.header === "string" && result.header ? result.header : "AI detection",
    );
    title.id = `${ID_PREFIX}-title`;
    appendTextElement(
      form,
      "p",
      "vm-details",
      typeof result.details === "string" && result.details
        ? result.details
        : "No further details were returned.",
    );

    const scoreList = document.createElement("dl");
    scoreList.className = "vm-scores";
    for (const [label, value] of [
      ["Human", result.fraction_human],
      ["AI-assisted", result.fraction_ai_assisted],
      ["AI-generated", result.fraction_ai],
    ]) {
      if (!Number.isFinite(value) || value < 0 || value > 1) continue;
      const row = document.createElement("div");
      appendTextElement(row, "dt", "", label);
      appendTextElement(row, "dd", "", `${Math.round(value * 100)}%`);
      scoreList.append(row);
    }
    form.append(scoreList);
    appendTextElement(form, "p", "vm-credit", "Detection by Pangram, via Substack");
    dialog.append(form);
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      const outside =
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom;
      if (outside) dialog.close();
    });

    document.body.append(dialog);
    dialog.showModal();
  };

  const addStyles = () => {
    if (document.getElementById(`${ID_PREFIX}-styles`)) return;
    const style = document.createElement("style");
    style.id = `${ID_PREFIX}-styles`;
    style.textContent = `
      #${DIALOG_ID} {
        width: min(440px, calc(100vw - 32px));
        padding: 24px;
        border: 0;
        border-radius: 12px;
        color: var(--color-fg-primary, #181818);
        background: var(--color-bg-primary, #fff);
        box-shadow: 0 16px 48px rgb(0 0 0 / 24%);
        font: inherit;
      }
      #${DIALOG_ID}::backdrop { background: rgb(0 0 0 / 45%); }
      #${DIALOG_ID} h2 { margin: 0 32px 8px 0; font-size: 22px; }
      #${DIALOG_ID} p { line-height: 1.5; }
      #${DIALOG_ID} .vm-close {
        position: absolute; top: 12px; right: 12px; border: 0;
        background: transparent; color: inherit; font-size: 28px; cursor: pointer;
      }
      #${DIALOG_ID} .vm-scores div {
        display: flex; justify-content: space-between; padding: 8px 0;
        border-bottom: 1px solid var(--color-detail, #ddd);
      }
      #${DIALOG_ID} dt, #${DIALOG_ID} dd { margin: 0; }
      #${DIALOG_ID} dd { font-weight: 600; }
      #${DIALOG_ID} .vm-credit {
        margin: 16px 0 0; color: var(--color-fg-secondary, #666); font-size: 13px;
      }`;
    document.head.append(style);
  };

  const createButton = (postId) => {
    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.dataset.postId = postId;
    button.className =
      "pencraft pc-reset pencraft post-ufi-button style-button has-label with-border";
    button.setAttribute("aria-label", "Scan text for AI with Pangram");
    const label = appendTextElement(button, "span", "label", "Scan text for AI");

    button.addEventListener("click", async () => {
      button.disabled = true;
      label.textContent = "Checking…";
      try {
        showResult(await getDetection(button.dataset.postId));
      } catch (error) {
        showResult({
          header: "Analysis unavailable",
          details: error instanceof Error ? error.message : "Unexpected error",
        });
      } finally {
        button.disabled = false;
        label.textContent = "Scan text for AI";
      }
    });
    return button;
  };

  const syncButton = () => {
    const context = getPostContext();
    const existing = document.getElementById(BUTTON_ID);
    if (!context) {
      existing?.remove();
      return;
    }

    addStyles();
    if (existing?.dataset.postId !== context.postId) existing?.remove();
    const button = document.getElementById(BUTTON_ID) ?? createButton(context.postId);
    if (button.parentElement !== context.group) context.group.prepend(button);
  };

  let syncQueued = false;
  const queueSync = () => {
    if (syncQueued) return;
    syncQueued = true;
    requestAnimationFrame(() => {
      syncQueued = false;
      syncButton();
    });
  };

  syncButton();
  new MutationObserver(queueSync).observe(document.body, {
    childList: true,
    subtree: true,
  });
})();
