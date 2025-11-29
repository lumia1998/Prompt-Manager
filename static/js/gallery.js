/**
 * static/js/gallery.js
 * 画廊页面核心交互逻辑：详情弹窗、统计打点、剪贴板复制。
 */

document.addEventListener("DOMContentLoaded", function() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
});

// Theme Toggle
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const target = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', target);
    localStorage.setItem('theme', target);
    updateThemeIcon(target);
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    if(icon) icon.className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
}

// Detail Modal
window.showDetail = function(el) {
    try {
        const scriptTag = el.querySelector('.img-data');
        if (!scriptTag) return;
        const data = JSON.parse(scriptTag.textContent);

        const modalImg = document.getElementById('modalImg');
        modalImg.src = data.file_path;

        document.getElementById('modalTitle').innerText = data.title;
        document.getElementById('modalAuthor').innerText = data.author ? 'by ' + data.author : '';
        document.getElementById('modalPrompt').innerText = data.prompt;

        window.currentImgId = data.id;

        const descSection = document.getElementById('modalDescSection');
        if (data.description && data.description.trim() !== '') {
            descSection.classList.remove('d-none');
            document.getElementById('modalDesc').innerText = data.description;
        } else {
            descSection.classList.add('d-none');
        }

        const tagsContainer = document.getElementById('modalTags');
        tagsContainer.innerHTML = '';
        data.tags.forEach(tag => {
            tagsContainer.innerHTML += `<span class="badge rounded-pill fw-normal border me-1" style="background:var(--btn-bg); color:var(--text-primary); border-color: rgba(128,128,128,0.2) !important;">${tag}</span>`;
        });

        const refsSection = document.getElementById('modalRefsSection');
        const refsContainer = document.getElementById('modalRefs');
        refsContainer.innerHTML = '';

        if (data.refs && data.refs.length > 0) {
            refsSection.classList.remove('d-none');

            // Original Image
            refsContainer.innerHTML += `
            <div class="d-flex flex-column align-items-center cursor-pointer me-2" onclick="document.getElementById('modalImg').src='${data.file_path}'">
                <img src="${data.file_path}" class="rounded border mb-1" style="width:60px;height:60px;object-fit:cover;">
                <span style="font-size:0.6rem;color:var(--text-secondary);">原图</span>
            </div>`;

            // Reference Images
            data.refs.forEach((ref, idx) => {
                let innerHTML = '';

                if (ref.is_placeholder) {
                    innerHTML = `
                    <div class="rounded border mb-1 d-flex flex-column align-items-center justify-content-center bg-light text-secondary"
                         style="width:60px;height:60px; border-style: dashed !important;">
                        <i class="bi bi-person-bounding-box" style="font-size: 1.2rem;"></i>
                    </div>
                    <span style="font-size:0.6rem;color:var(--text-secondary);">变量 ${idx+1}</span>`;
                } else {
                    innerHTML = `
                    <img src="${ref.file_path}" class="rounded border mb-1" style="width:60px;height:60px;object-fit:cover;">
                    <span style="font-size:0.6rem;color:var(--text-secondary);">Ref ${idx+1}</span>`;
                }

                const div = document.createElement('div');
                div.className = 'd-flex flex-column align-items-center cursor-pointer me-1';
                if (!ref.is_placeholder) {
                    div.onclick = function() { document.getElementById('modalImg').src = ref.file_path; };
                }
                div.innerHTML = innerHTML;
                refsContainer.appendChild(div);
            });
        } else {
            refsSection.classList.add('d-none');
        }

        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (navigator.sendBeacon && csrfToken) {
            const formData = new FormData();
            formData.append('csrf_token', csrfToken);
            navigator.sendBeacon(`/api/stats/view/${data.id}`, formData);
        } else {
            fetch(`/api/stats/view/${data.id}`, {
                method: 'POST',
                headers: {'X-CSRFToken': csrfToken}
            }).catch(() => {});
        }

        const adminSection = document.getElementById('admin-actions');
        if (window.UserContext && window.UserContext.isAdmin) {
            adminSection.classList.remove('d-none');
            const currentPath = window.location.pathname + window.location.search + window.location.hash;
            const encodedPath = encodeURIComponent(currentPath);
            document.getElementById('btn-edit-art').href = `/admin/edit/${data.id}?next=${encodedPath}`;
            document.getElementById('form-delete-art').action = `/admin/delete/${data.id}?next=${encodedPath}`;
        } else {
            adminSection.classList.add('d-none');
        }

        if (typeof bootstrap !== 'undefined') {
            new bootstrap.Modal(document.getElementById('detailModal')).show();
        }
    } catch(e) {
        console.error("Detail Error:", e);
    }
}

// Copy Logic
window.copyModalPrompt = function() {
    const node = document.getElementById('modalPrompt');
    const text = node.innerText || node.textContent;
    const btn = document.querySelector('#detailModal button[onclick="copyModalPrompt()"]');

    const onSuccess = () => {
        if(btn) {
            const originalContent = btn.innerHTML;
            btn.innerHTML = '<i class="bi bi-check-lg me-1"></i> Copied';
            btn.classList.remove('btn-link');
            btn.classList.add('text-success', 'fw-bold');
            setTimeout(() => {
                btn.innerHTML = originalContent;
                btn.classList.remove('text-success', 'fw-bold');
                btn.classList.add('btn-link');
            }, 2000);
        }
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (window.currentImgId && csrfToken) {
            fetch(`/api/stats/copy/${window.currentImgId}`, {
                method: 'POST',
                headers: {'X-CSRFToken': csrfToken}
            }).catch(() => {});
        }
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(onSuccess).catch(err => {
            fallbackCopy(text, btn, onSuccess);
        });
    } else {
        fallbackCopy(text, btn, onSuccess);
    }
}

function fallbackCopy(text, parentBtn, callback) {
    try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.setAttribute("readonly", "readonly");
        textArea.style.position = "absolute";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);

        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);

        if (callback) callback();
    } catch (err) {
        console.error("Copy failed:", err);
        prompt("请手动复制:", text);
    }
}