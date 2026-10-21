const query = (obj) =>
  Object.keys(obj)
    .map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(obj[k]))
    .join("&");
const colorThemes = document.querySelectorAll('[name="theme"]');
const markdown = window.markdownit();
let message_box = document.getElementById(`messages`);
let message_input = document.getElementById(`message-input`);
let box_conversations = document.querySelector(`.top`);
let spinner = box_conversations ? box_conversations.querySelector(".spinner") : null;
let stop_generating = document.querySelector(`.stop_generating`);
let send_button = document.querySelector(`#send-button`);
let prompt_lock = false;

// Direct SVG definitions to guarantee avatars always render with 100% reliability
window.user_svg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
window.gpt_svg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="#ffffff"><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1683a.071.071 0 0 1 .038.052v5.5826a4.5045 4.5045 0 0 1-4.4945 4.4947zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1683a.0757.0757 0 0 1-.071 0l-4.8303-2.7866A4.504 4.504 0 0 1 2.3408 7.8956zm16.0993 3.8558L12.5973 8.3829l2.0201-1.1683a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.388-.6813zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.407 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.6608v.0033zm-7.0006 1.543l-3.3685-1.9442 3.3685-1.9442 3.3685 1.9442z"/></svg>`;
window.user_image = `<div class="avatar user-avatar">${window.user_svg}</div>`;
window.gpt_image = `<div class="avatar gpt-avatar">${window.gpt_svg}</div>`;

hljs.addPlugin(new CopyButtonPlugin());

function resizeTextarea(textarea) {
  if (!textarea) return;
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(Math.max(textarea.scrollHeight, 26), 180) + 'px';
}

const format = (text) => {
  return text.replace(/(?:\r\n|\r|\n)/g, "<br>");
};

const scrollToBottom = (smooth = true) => {
  const wrapper = document.getElementById('messages-wrapper');
  if (wrapper) {
    if (smooth) {
      wrapper.scrollTo({ top: wrapper.scrollHeight, behavior: 'smooth' });
    } else {
      wrapper.scrollTop = wrapper.scrollHeight;
    }
  }
  if (message_box) {
    message_box.scrollTop = message_box.scrollHeight;
  }
};

// ============================================================================
// IMAGE & DOCUMENT ATTACHMENT HANDLING
// ============================================================================
window.attached_image = null;
window.attached_document = null;

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function compressImage(file, maxWidth = 1280, maxHeight = 1280, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

window.processSelectedImage = async function (file) {
  if (!file || !file.type.startsWith('image/')) {
    console.warn("Selected file is not an image");
    return;
  }
  try {
    const compressedBase64 = await compressImage(file);
    window.attached_image = compressedBase64;

    const previewDock = document.getElementById('image-preview-dock');
    const imgCard = document.getElementById('image-preview-card');
    const previewImg = document.getElementById('preview-image');
    const attachBtn = document.getElementById('attach-button');

    if (previewImg) previewImg.src = compressedBase64;
    if (imgCard) imgCard.style.display = 'inline-block';
    if (previewDock) previewDock.style.display = 'flex';
    if (attachBtn) attachBtn.classList.add('has-image');

    if (message_input) message_input.focus();
  } catch (err) {
    console.error("Failed to process image:", err);
  }
};

window.handleImageFileSelect = async function (event) {
  const files = event.target.files;
  if (files && files[0]) {
    await window.processSelectedImage(files[0]);
  }
};

window.clearImageAttachment = function () {
  window.attached_image = null;
  const imgCard = document.getElementById('image-preview-card');
  const previewDock = document.getElementById('image-preview-dock');
  const previewImg = document.getElementById('preview-image');
  const fileInput = document.getElementById('image-upload');
  const attachBtn = document.getElementById('attach-button');

  if (imgCard) imgCard.style.display = 'none';
  if (previewImg) previewImg.src = '';
  if (fileInput) fileInput.value = '';
  if (attachBtn) attachBtn.classList.remove('has-image');

  if (!window.attached_document && previewDock) {
    previewDock.style.display = 'none';
  }
};

window.processSelectedDocument = async function (file) {
  if (!file) return;
  try {
    const isText = file.type.startsWith('text/') ||
      /\.(txt|md|markdown|csv|json|js|ts|py|html|css|xml|yaml|yml|log|sh)$/i.test(file.name);

    let content;
    if (isText) {
      content = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
      });
    } else {
      content = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    window.attached_document = {
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      content: content
    };

    const previewDock = document.getElementById('image-preview-dock');
    const docCard = document.getElementById('document-preview-card');
    const docName = document.getElementById('preview-doc-name');
    const docSize = document.getElementById('preview-doc-size');
    const docAttachBtn = document.getElementById('doc-attach-button');

    if (docName) docName.innerText = file.name;
    if (docSize) docSize.innerText = formatFileSize(file.size);
    if (docCard) docCard.style.display = 'inline-flex';
    if (previewDock) previewDock.style.display = 'flex';
    if (docAttachBtn) docAttachBtn.classList.add('has-image');

    if (message_input) message_input.focus();
  } catch (err) {
    console.error("Failed to process document:", err);
  }
};

window.handleDocumentFileSelect = async function (event) {
  const files = event.target.files;
  if (files && files[0]) {
    await window.processSelectedDocument(files[0]);
  }
};

window.clearDocumentAttachment = function () {
  window.attached_document = null;
  const docCard = document.getElementById('document-preview-card');
  const fileInput = document.getElementById('document-upload');
  const docAttachBtn = document.getElementById('doc-attach-button');
  const previewDock = document.getElementById('image-preview-dock');

  if (docCard) docCard.style.display = 'none';
  if (fileInput) fileInput.value = '';
  if (docAttachBtn) docAttachBtn.classList.remove('has-image');

  if (!window.attached_image && previewDock) {
    previewDock.style.display = 'none';
  }
};

window.delete_current_conversation = async function () {
  if (!window.conversation_id) return;
  if (!confirm("Are you sure you want to delete this chat? It will be permanently removed from the database.")) return;

  const convIdToDelete = window.conversation_id;
  try {
    const res = await fetch(`/backend-api/v2/conversation/${convIdToDelete}`, { method: 'DELETE' });
    if (res.ok) {
      console.log("Deleted chat from MongoDB:", convIdToDelete);
    }
  } catch (e) {
    console.warn("Delete error:", e);
  }

  const el = document.getElementById(`convo-${convIdToDelete}`);
  if (el) el.remove();

  await new_conversation();
};

window.delete_message_item = async function (msgIndex) {
  if (!window.conversation_id) return;
  if (!confirm("Delete this message?")) return;

  try {
    const res = await fetch(`/backend-api/v2/conversation/${window.conversation_id}/message/${msgIndex}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      await load_conversation(window.conversation_id);
    }
  } catch (e) {
    console.warn("Delete message error:", e);
  }
};

window.useStarterPrompt = function (promptText) {
  if (message_input) {
    message_input.value = promptText;
    resizeTextarea(message_input);
    message_input.focus();
  }
};

const delete_conversations = async () => {
  try {
    await fetch('/backend-api/v2/conversations/clear', { method: 'DELETE' });
  } catch (e) {
    console.warn("Delete all error:", e);
  }
  localStorage.clear();
  await new_conversation();
};

const handle_ask = async () => {
  let message = message_input.value.trim();
  let image = window.attached_image;
  let attachedDoc = window.attached_document;
  if (message.length > 0 || image || attachedDoc) {
    message_input.value = ``;
    message_input.style.height = 'auto';
    window.clearImageAttachment();
    window.clearDocumentAttachment();
    message_input.focus();
    await ask_gpt(message, image, attachedDoc);
  }
};

const remove_cancel_button = async () => {
  stop_generating.classList.add(`stop_generating-hiding`);

  setTimeout(() => {
    stop_generating.classList.remove(`stop_generating-hiding`);
    stop_generating.classList.add(`stop_generating-hidden`);
  }, 300);
};

const ask_gpt = async (message, image = null, attachedDoc = null) => {
  try {
    message_input.value = ``;
    message_input.innerHTML = ``;
    message_input.innerText = ``;

    window.scrollTo(0, 0);
    window.controller = new AbortController();

    jailbreak = document.getElementById("jailbreak");
    model = document.getElementById("model");
    prompt_lock = true;
    window.text = ``;
    window.token = message_id();

    stop_generating.classList.remove(`stop_generating-hidden`);

    const welcome = document.getElementById("welcome-state");
    if (welcome) welcome.style.display = "none";

    const imageHtml = image ? `
      <div class="message-image-container">
        <img src="${image}" alt="Attached Image" class="message-attached-image" onclick="window.open('${image}', '_blank')" />
      </div>
    ` : '';

    const docHtml = attachedDoc ? `
      <div class="message-document-card" title="${attachedDoc.name}">
        <div class="message-doc-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
        </div>
        <div class="message-doc-info">
          <span class="message-doc-name">${attachedDoc.name}</span>
          <span class="message-doc-meta">${formatFileSize(attachedDoc.size)} &bull; Attached Document</span>
        </div>
      </div>
    ` : '';

    message_box.innerHTML += `
            <div class="message">
                <div class="user">
                    ${window.user_image}
                </div>
                <div class="content" id="user_${token}"> 
                    ${docHtml}
                    ${imageHtml}
                    ${message ? format(message) : ''}
                </div>
            </div>
        `;

    scrollToBottom();
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 200));

    message_box.innerHTML += `
            <div class="message">
                <div class="user">
                    ${window.gpt_image}
                </div>
                <div class="content" id="gpt_${window.token}">
                    <div id="cursor"></div>
                </div>
            </div>
        `;

    scrollToBottom();
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 200));
    window.scrollTo(0, 0);

    const response = await fetch(`/backend-api/v2/conversation`, {
      method: `POST`,
      signal: window.controller.signal,
      headers: {
        "content-type": `application/json`,
        accept: `text/event-stream`,
      },
      body: JSON.stringify({
        conversation_id: window.conversation_id,
        action: `_ask`,
        model: 'gpt-4o-mini',
        jailbreak: (jailbreak && jailbreak.selectedIndex >= 0 && jailbreak.options[jailbreak.selectedIndex]) ? jailbreak.options[jailbreak.selectedIndex].value : 'default',
        image: image || null,
        document: attachedDoc || null,
        meta: {
          id: window.token,
          content: {
            conversation: await get_conversation(window.conversation_id),
            internet_access: document.getElementById("switch").checked,
            content_type: "text",
            image: image || null,
            document: attachedDoc || null,
            parts: [
              {
                content: message,
                role: "user",
                image: image || null,
                document: attachedDoc || null,
              },
            ],
          },
        },
      }),
    });

    if (response.status === 401) {
      window.location.href = '/login';
      return;
    }

    if (!response.ok) {
      let errText = await response.text();
      try {
        const errJson = JSON.parse(errText);
        errText = errJson.error || errJson.message || errText;
      } catch (ignored) { }
      throw new Error(errText);
    }

    const reader = response.body.getReader();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      chunk = new TextDecoder().decode(value);

      if (
        chunk.includes(
          `<form id="challenge-form" action="/backend-api/v2/conversation?`
        )
      ) {
        chunk = `cloudflare token expired, please refresh the page.`;
      }

      text += chunk;

      document.getElementById(`gpt_${window.token}`).innerHTML =
        markdown.render(text);
      document.querySelectorAll(`code`).forEach((el) => {
        hljs.highlightElement(el);
      });

      window.scrollTo(0, 0);
      scrollToBottom(false);
    }

    scrollToBottom(true);
    await remove_cancel_button();
    prompt_lock = false;

    // Refresh conversation list from MongoDB to reflect new chat & title
    await load_conversations(20, 0);
    window.scrollTo(0, 0);
  } catch (e) {
    scrollToBottom(true);
    await remove_cancel_button();
    prompt_lock = false;

    console.log(e);

    let cursorDiv = document.getElementById(`cursor`);
    if (cursorDiv) cursorDiv.parentNode.removeChild(cursorDiv);

    if (e.name != `AbortError`) {
      let error_message = e.message || `Oops, something went wrong. Please try again.`;

      document.getElementById(`gpt_${window.token}`).innerHTML = markdown.render(error_message);
    } else {
      document.getElementById(`gpt_${window.token}`).innerHTML += ` [aborted]`;
    }

    window.scrollTo(0, 0);
  }
};

const clear_conversations = async () => {
  const elements = box_conversations.childNodes;
  let index = elements.length;

  if (index > 0) {
    while (index--) {
      const element = elements[index];
      if (
        element.nodeType === Node.ELEMENT_NODE &&
        element.tagName.toLowerCase() !== `button` &&
        !element.classList.contains('convo-section-label') &&
        !element.classList.contains('spinner')
      ) {
        box_conversations.removeChild(element);
      }
    }
  }
};

const clear_conversation = async () => {
  message_box.innerHTML = '';
};

const show_option = async (conversation_id) => {
  const conv = document.getElementById(`conv-${conversation_id}`);
  const yes = document.getElementById(`yes-${conversation_id}`);
  const not = document.getElementById(`not-${conversation_id}`);

  if (conv) conv.style.display = "none";
  if (yes) yes.style.display = "inline-flex";
  if (not) not.style.display = "inline-flex";
};

const hide_option = async (conversation_id) => {
  const conv = document.getElementById(`conv-${conversation_id}`);
  const yes = document.getElementById(`yes-${conversation_id}`);
  const not = document.getElementById(`not-${conversation_id}`);

  if (conv) conv.style.display = "inline-flex";
  if (yes) yes.style.display = "none";
  if (not) not.style.display = "none";
};

const delete_conversation = async (conversation_id) => {
  try {
    await fetch(`/backend-api/v2/conversation/${conversation_id}`, { method: 'DELETE' });
  } catch (e) {
    console.warn("Delete error:", e);
  }

  const conversation = document.getElementById(`convo-${conversation_id}`);
  if (conversation) conversation.remove();

  if (window.conversation_id === conversation_id) {
    await new_conversation();
  } else {
    await load_conversations(20, 0, true);
  }
};

const set_conversation = async (conversation_id) => {
  history.pushState({}, null, `/chat/${conversation_id}`);
  window.conversation_id = conversation_id;

  await clear_conversation();
  await load_conversation(conversation_id);
};

const new_conversation = async () => {
  history.pushState({}, null, `/chat/`);
  window.conversation_id = uuid();

  await clear_conversation();
  show_welcome();
  await load_conversations(20, 0, true);
};

const show_welcome = () => {
  let welcome = document.getElementById("welcome-state");
  if (!welcome) {
    message_box.innerHTML = `
      <div id="welcome-state" class="welcome-screen">
          <div class="welcome-badge">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#ffffff">
                  <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1683a.071.071 0 0 1 .038.052v5.5826a4.5045 4.5045 0 0 1-4.4945 4.4947zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1683a.0757.0757 0 0 1-.071 0l-4.8303-2.7866A4.504 4.504 0 0 1 2.3408 7.8956zm16.0993 3.8558L12.5973 8.3829l2.0201-1.1683a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.388-.6813zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.407 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.6608v.0033zm-7.0006 1.543l-3.3685-1.9442 3.3685-1.9442 3.3685 1.9442z"/>
              </svg>
          </div>
          <h1 class="welcome-title">How can I help you today?</h1>
          <p class="welcome-subtitle">Powered by OpenAI's fast, highly capable <strong>GPT-4o mini</strong></p>
          
          <div class="prompt-grid">
              <div class="prompt-card" onclick="useStarterPrompt('Explain quantum computing in simple terms with a real-world analogy.')">
                  <div class="prompt-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-7 7c0 2.5 1.5 4.5 3 6h8c1.5-1.5 3-3.5 3-6a7 7 0 0 0-7-7z"/></svg></div>
                  <div class="prompt-content">
                      <span class="prompt-title">Explain a concept</span>
                      <span class="prompt-desc">Quantum computing explained simply</span>
                  </div>
              </div>
              <div class="prompt-card" onclick="useStarterPrompt('Write a clean, resilient Python function to fetch and parse JSON from a REST API.')">
                  <div class="prompt-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg></div>
                  <div class="prompt-content">
                      <span class="prompt-title">Write or debug code</span>
                      <span class="prompt-desc">Resilient Python REST API client</span>
                  </div>
              </div>
              <div class="prompt-card" onclick="useStarterPrompt('Draft a concise, professional follow-up email after a job interview.')">
                  <div class="prompt-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg></div>
                  <div class="prompt-content">
                      <span class="prompt-title">Draft professional email</span>
                      <span class="prompt-desc">Follow-up after a technical interview</span>
                  </div>
              </div>
              <div class="prompt-card" onclick="useStarterPrompt('Brainstorm 5 innovative feature ideas for an AI-powered productivity app.')">
                  <div class="prompt-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg></div>
                  <div class="prompt-content">
                      <span class="prompt-title">Brainstorm ideas</span>
                      <span class="prompt-desc">5 unique AI productivity features</span>
                  </div>
              </div>
          </div>
      </div>
    `;
  } else {
    welcome.style.display = "flex";
  }
};

const load_conversation = async (conversation_id) => {
  let items = [];
  try {
    const res = await fetch(`/backend-api/v2/conversation/${conversation_id}`);
    if (res.status === 401) {
      window.location.href = '/login';
      return;
    }
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        items = data.items;
      }
    }
  } catch (e) {
    console.warn("MongoDB load conversation error:", e);
  }

  await clear_conversation();

  if (!items || items.length === 0) {
    show_welcome();
    return;
  }

  const welcome = document.getElementById("welcome-state");
  if (welcome) welcome.style.display = "none";

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const imageHtml = item.image ? `
      <div class="message-image-container">
        <img src="${item.image}" alt="Attached Image" class="message-attached-image" onclick="window.open('${item.image}', '_blank')" />
      </div>
    ` : '';

    const docHtml = item.document ? `
      <div class="message-document-card" title="${item.document.name || 'Document'}">
        <div class="message-doc-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
        </div>
        <div class="message-doc-info">
          <span class="message-doc-name">${item.document.name || 'Document'}</span>
          <span class="message-doc-meta">${formatFileSize(item.document.size)} &bull; Attached Document</span>
        </div>
      </div>
    ` : '';

    message_box.innerHTML += `
            <div class="message" id="msg-index-${idx}">
                <div class="message-actions">
                    <button type="button" class="msg-action-btn" title="Delete this message" onclick="delete_message_item(${idx})">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
                <div class="user">
                    ${item.role === "assistant" ? window.gpt_image : window.user_image}
                </div>
                <div class="content">
                    ${docHtml}
                    ${imageHtml}
                    ${item.role === "assistant"
        ? markdown.render(item.content)
        : (item.content ? format(item.content) : '')
      }
                </div>
            </div>
        `;
  }

  document.querySelectorAll(`code`).forEach((el) => {
    hljs.highlightElement(el);
  });

  scrollToBottom(true);

  setTimeout(() => {
    scrollToBottom(false);
  }, 150);

  setTimeout(() => {
    scrollToBottom(false);
  }, 400);
};

const get_conversation = async (conversation_id) => {
  try {
    const res = await fetch(`/backend-api/v2/conversation/${conversation_id}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        return data.items.map(m => ({ role: m.role, content: m.content, image: m.image }));
      }
    }
  } catch (e) { }
  return [];
};

const load_conversations = async (limit, offset, loader) => {
  let conversations = [];
  try {
    const res = await fetch('/backend-api/v2/conversations');
    if (res.status === 401) {
      window.location.href = '/login';
      return;
    }
    const data = await res.json();
    if (data.success && Array.isArray(data.conversations)) {
      conversations = data.conversations;
    }
  } catch (e) {
    console.warn('MongoDB conversations load error:', e);
  }

  await clear_conversations();

  for (let conversation of conversations) {
    box_conversations.innerHTML += `
    <div class="convo" id="convo-${conversation.id}">
      <div class="left" onclick="set_conversation('${conversation.id}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <span class="convo-title">${conversation.title || 'New Chat'}</span>
      </div>
      <span class="delete-icon" onclick="show_option('${conversation.id}')" id="conv-${conversation.id}" title="Delete chat" style="cursor:pointer; display:inline-flex; align-items:center;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </span>
      <span onclick="delete_conversation('${conversation.id}')" id="yes-${conversation.id}" style="display:none; cursor:pointer; align-items:center;" title="Confirm delete">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      </span>
      <span onclick="hide_option('${conversation.id}')" id="not-${conversation.id}" style="display:none; cursor:pointer; align-items:center;" title="Cancel">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </span>
    </div>
    `;
  }
};

const cancelBtn = document.getElementById(`cancelButton`);
if (cancelBtn) {
  cancelBtn.addEventListener(`click`, async () => {
    if (window.controller) window.controller.abort();
    console.log(`aborted ${window.conversation_id}`);
  });
}

const uuid = () => {
  return `xxxxxxxx-xxxx-4xxx-yxxx-${Date.now().toString(16)}`.replace(
    /[xy]/g,
    function (c) {
      var r = (Math.random() * 16) | 0,
        v = c == "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    }
  );
};

const message_id = () => {
  random_bytes = (Math.floor(Math.random() * 1338377565) + 2956589730).toString(2);
  unix = Math.floor(Date.now() / 1000).toString(2);
  return BigInt(`0b${unix}${random_bytes}`).toString();
};



const mobileSidebarBtn = document.querySelector(".mobile-sidebar");
if (mobileSidebarBtn) {
  mobileSidebarBtn.addEventListener("click", () => {
    if (typeof toggleMobileSidebar === 'function') {
      toggleMobileSidebar();
    }
  });
}

const register_settings_localstorage = async () => {
  settings_ids = ["switch", "model", "jailbreak"];
  settings_elements = settings_ids.map((id) => document.getElementById(id));
  settings_elements.map((element) =>
    element && element.addEventListener(`change`, async (event) => {
      switch (event.target.type) {
        case "checkbox":
          localStorage.setItem(event.target.id, event.target.checked);
          break;
        case "select-one":
          localStorage.setItem(event.target.id, event.target.selectedIndex);
          break;
        default:
          console.warn("Unresolved element type");
      }
    })
  );
};

const load_settings_localstorage = async () => {
  settings_ids = ["switch", "model", "jailbreak"];
  settings_elements = settings_ids.map((id) => document.getElementById(id));
  settings_elements.map((element) => {
    if (element && localStorage.getItem(element.id)) {
      switch (element.type) {
        case "checkbox":
          element.checked = localStorage.getItem(element.id) === "true";
          break;
        case "select-one":
          const savedIndex = parseInt(localStorage.getItem(element.id));
          if (!isNaN(savedIndex) && savedIndex >= 0 && savedIndex < element.options.length) {
            element.selectedIndex = savedIndex;
          } else {
            element.selectedIndex = 0;
          }
          break;
        default:
          console.warn("Unresolved element type");
      }
    }
  });
};

const storeTheme = function (theme) {
  localStorage.setItem("theme", theme);
};

const setTheme = function () {
  const activeTheme = localStorage.getItem("theme");
  colorThemes.forEach((themeOption) => {
    if (themeOption.id === activeTheme) {
      themeOption.checked = true;
    }
  });
  document.documentElement.className = activeTheme;
};

colorThemes.forEach((themeOption) => {
  themeOption.addEventListener("click", () => {
    storeTheme(themeOption.id);
    document.documentElement.className = themeOption.id;
  });
});

try {
  setTheme();
} catch (e) { }

const initChat = async () => {
  message_box = document.getElementById(`messages`);
  message_input = document.getElementById(`message-input`);
  box_conversations = document.querySelector(`.top`);
  spinner = box_conversations ? box_conversations.querySelector(".spinner") : null;
  stop_generating = document.querySelector(`.stop_generating`);
  send_button = document.querySelector(`#send-button`);

  try {
    load_settings_localstorage();
  } catch (e) {
    console.error("load_settings_localstorage error:", e);
  }

  setTimeout(() => {
    load_conversations(20, 0);
  }, 10);

  if (!window.location.href.endsWith(`#`)) {
    if (/\/chat\/.+/.test(window.location.href)) {
      await load_conversation(window.conversation_id);
    } else {
      show_welcome();
    }
  } else {
    show_welcome();
  }

  if (message_input) {
    message_input.addEventListener(`keydown`, async (evt) => {
      if (prompt_lock) return;
      if (evt.keyCode === 13 && !evt.shiftKey) {
        evt.preventDefault();
        await handle_ask();
      } else {
        resizeTextarea(message_input);
      }
    });
  }

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      new_conversation();
    }
  });

  // Clipboard Paste Support (e.g. Snipping Tool / Ctrl+V image)
  window.addEventListener('paste', async (e) => {
    if (e.clipboardData && e.clipboardData.items) {
      for (let item of e.clipboardData.items) {
        if (item.type && item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            await window.processSelectedImage(file);
          }
          break;
        }
      }
    }
  });

  // Drag and Drop Image Support
  const chatMain = document.querySelector('.conversation') || document.body;
  if (chatMain) {
    ['dragenter', 'dragover'].forEach(name => {
      chatMain.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
      }, false);
    });
    chatMain.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        if (file.type && file.type.startsWith('image/')) {
          await window.processSelectedImage(file);
        } else {
          await window.processSelectedDocument(file);
        }
      }
    }, false);
  }

  if (send_button) {
    send_button.addEventListener(`click`, async () => {
      if (prompt_lock) return;
      await handle_ask();
    });
  }

  try {
    register_settings_localstorage();
  } catch (e) {
    console.error("register_settings_localstorage error:", e);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initChat);
} else {
  initChat();
}
