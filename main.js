// GitHub Configuration
const GITHUB_OWNER = 'jungboov';
const GITHUB_REPO = 'pebble';
const GITHUB_CLIENT_ID = 'YOUR_GITHUB_CLIENT_ID'; // GitHub OAuth App에서 발급받아야 함

let githubToken = localStorage.getItem('github_token');
let currentUser = null;

// Floating Action Button
function toggleFabMenu() {
    const fab = document.querySelector('.fab');
    const menu = document.getElementById('fab-menu');
    fab.classList.toggle('active');
    menu.classList.toggle('active');
}

function closeFabAndGo(section) {
    document.querySelector('.fab').classList.remove('active');
    document.getElementById('fab-menu').classList.remove('active');
    if (section === 'home') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function closeFabAndOpen(modalName) {
    document.querySelector('.fab').classList.remove('active');
    document.getElementById('fab-menu').classList.remove('active');
    openModal(modalName);
}

function closeContextAndGo(section) {
    document.getElementById('context-menu').classList.remove('active');
    if (section === 'home') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Close FAB menu when clicking outside
document.addEventListener('click', (e) => {
    const fabContainer = document.querySelector('.fab-container');
    if (fabContainer && !fabContainer.contains(e.target)) {
        document.querySelector('.fab').classList.remove('active');
        document.getElementById('fab-menu').classList.remove('active');
    }
});

// Context Menu (Right Click)
const contextMenu = document.getElementById('context-menu');

document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    
    const x = e.clientX;
    const y = e.clientY;
    
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    
    setTimeout(() => {
        const menuRect = contextMenu.getBoundingClientRect();
        if (x + menuRect.width > window.innerWidth) {
            contextMenu.style.left = (x - menuRect.width) + 'px';
        }
        if (y + menuRect.height > window.innerHeight) {
            contextMenu.style.top = (y - menuRect.height) + 'px';
        }
    }, 0);
    
    contextMenu.classList.add('active');
});

document.addEventListener('click', () => {
    contextMenu.classList.remove('active');
});

document.addEventListener('scroll', () => {
    contextMenu.classList.remove('active');
});

// Modal Functions
function openModal(name) {
    contextMenu.classList.remove('active');
    document.getElementById('modal-' + name).classList.add('active');
    document.body.style.overflow = 'hidden';
    
    if (name === 'blog') {
        loadBlogPosts();
        checkGitHubAuth();
    }
}

function closeModal(name) {
    document.getElementById('modal-' + name).classList.remove('active');
    document.body.style.overflow = '';
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
});

// Close modal on ESC key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    }
});

// GitHub Authentication
function githubLogin() {
    // GitHub OAuth 로그인
    // 참고: 실제 사용시 GitHub OAuth App 등록 필요
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=repo&redirect_uri=${encodeURIComponent(window.location.origin + window.location.pathname)}`;
    window.location.href = authUrl;
}

async function checkGitHubAuth() {
    // URL에서 code 파라미터 확인 (OAuth 콜백)
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code && !githubToken) {
        // 실제로는 백엔드에서 토큰 교환 필요
        // GitHub Pages에서는 Personal Access Token 사용 권장
        alert('GitHub OAuth는 백엔드가 필요합니다.\n\nPersonal Access Token을 사용하려면:\n1. GitHub Settings > Developer settings > Personal access tokens\n2. Generate new token (repo 권한 필요)\n3. 토큰을 복사해서 아래 프롬프트에 입력');
        
        const token = prompt('GitHub Personal Access Token을 입력하세요:');
        if (token) {
            localStorage.setItem('github_token', token);
            githubToken = token;
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    if (githubToken) {
        try {
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `token ${githubToken}`
                }
            });
            
            if (response.ok) {
                currentUser = await response.json();
                
                // jungboov 계정인지 확인
                if (currentUser.login === GITHUB_OWNER) {
                    document.getElementById('btn-write').style.display = 'block';
                    document.getElementById('btn-github-login').style.display = 'none';
                    document.getElementById('user-info').style.display = 'flex';
                    document.getElementById('user-info').innerHTML = `
                        <img src="${currentUser.avatar_url}" alt="${currentUser.login}">
                        ${currentUser.login}
                    `;
                } else {
                    document.getElementById('btn-github-login').textContent = '권한 없음';
                    document.getElementById('btn-github-login').disabled = true;
                }
            } else {
                localStorage.removeItem('github_token');
                githubToken = null;
            }
        } catch (error) {
            console.error('GitHub auth error:', error);
        }
    }
}

// Blog Functions
async function loadBlogPosts() {
    const blogList = document.getElementById('blog-list');
    blogList.innerHTML = '<div class="blog-loading">글을 불러오는 중...</div>';

    try {
        // GitHub에서 posts.json 가져오기
        const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/blog/posts.json`);
        
        if (response.ok) {
            const data = await response.json();
            const posts = JSON.parse(atob(data.content));
            
            if (posts.length === 0) {
                blogList.innerHTML = '<div class="blog-empty">아직 작성된 글이 없습니다.</div>';
            } else {
                blogList.innerHTML = posts.map(post => `
                    <div class="blog-item" onclick="viewPost('${post.id}')">
                        <h3>${post.title}</h3>
                        <div class="blog-item-meta">${post.date}</div>
                    </div>
                `).join('');
            }
        } else {
            blogList.innerHTML = '<div class="blog-empty">아직 작성된 글이 없습니다.</div>';
        }
    } catch (error) {
        console.error('Error loading posts:', error);
        blogList.innerHTML = '<div class="blog-empty">글을 불러올 수 없습니다.</div>';
    }
}

async function viewPost(postId) {
    closeModal('blog');
    openModal('post');
    
    const postContent = document.getElementById('post-content');
    postContent.innerHTML = '<div class="blog-loading">글을 불러오는 중...</div>';

    try {
        const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/blog/${postId}.md`);
        
        if (response.ok) {
            const data = await response.json();
            const content = atob(data.content);
            
            // 간단한 마크다운 파싱
            const lines = content.split('\n');
            const title = lines[0].replace(/^#\s*/, '');
            const date = lines[1].replace(/^>\s*/, '');
            const body = lines.slice(3).join('\n');
            
            postContent.innerHTML = `
                <h1>${title}</h1>
                <div class="post-content-meta">${date}</div>
                <div>${markdownToHtml(body)}</div>
            `;
        }
    } catch (error) {
        console.error('Error loading post:', error);
        postContent.innerHTML = '<div class="blog-empty">글을 불러올 수 없습니다.</div>';
    }
}

function markdownToHtml(markdown) {
    return markdown
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*)\*/gim, '<em>$1</em>')
        .replace(/\n/gim, '<br>');
}

async function publishPost() {
    const title = document.getElementById('post-title').value.trim();
    const body = document.getElementById('post-body').value.trim();

    if (!title || !body) {
        alert('제목과 내용을 모두 입력해주세요.');
        return;
    }

    if (!githubToken) {
        alert('GitHub 로그인이 필요합니다.');
        return;
    }

    const postId = 'post-' + Date.now();
    const date = new Date().toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const postContent = `# ${title}\n> ${date}\n\n${body}`;

    try {
        // 1. 포스트 파일 생성
        await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/blog/${postId}.md`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${githubToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Add blog post: ${title}`,
                content: btoa(unescape(encodeURIComponent(postContent)))
            })
        });

        // 2. posts.json 업데이트
        let posts = [];
        let postsSha = null;
        
        try {
            const postsResponse = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/blog/posts.json`);
            if (postsResponse.ok) {
                const postsData = await postsResponse.json();
                posts = JSON.parse(atob(postsData.content));
                postsSha = postsData.sha;
            }
        } catch (e) {}

        posts.unshift({ id: postId, title: title, date: date });

        await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/blog/posts.json`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${githubToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Update posts list`,
                content: btoa(unescape(encodeURIComponent(JSON.stringify(posts, null, 2)))),
                sha: postsSha
            })
        });

        alert('글이 발행되었습니다!');
        document.getElementById('post-title').value = '';
        document.getElementById('post-body').value = '';
        closeModal('write');
        openModal('blog');
        loadBlogPosts();
        
    } catch (error) {
        console.error('Error publishing:', error);
        alert('글 발행 중 오류가 발생했습니다.');
    }
}

// Theme Toggle
function toggleTheme() {
    const body = document.body;
    const isDark = body.getAttribute('data-theme') === 'dark';
    body.setAttribute('data-theme', isDark ? 'light' : 'dark');
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
    updateThemeIcon(!isDark);
}

function updateThemeIcon(isDark) {
    const icon = document.getElementById('theme-icon');
    if (isDark) {
        icon.innerHTML = '<path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/>';
    } else {
        icon.innerHTML = '<path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/>';
    }
}

// Language Toggle
const translations = {
    ko: {
        'hero-title': '일상에 스며드는<br><span>작은 도구들</span>',
        'hero-desc': 'pebble mouse부터 pebble cal까지, 우리의 생태계는 사용자의 편의를 위해 유기적으로 맞물려 작동합니다. 복잡한 설정도, 불필요한 데이터 수집도 없습니다. 오직 당신의 생산성과 평온함을 위해 설계된 pebble의 "작은 도구들"이 선사하는 일상의 변화를 경험해 보세요.',
        'hero-cta-apps': '앱 둘러보기',
        'hero-cta-github': 'GitHub',
        'scroll': '스크롤',
        'apps-title': 'pebble 앱',
        'apps-desc': '심플하지만 특별한 유틸리티 컬렉션',
        'tap-mouse-subtitle': '오토 클릭',
        'tap-mouse-desc': '반복적인 클릭 작업을 자동화하세요. 간격, 횟수, 위치를 자유롭게 설정할 수 있습니다.',
        'tap-keyboard-subtitle': '오토 키보드',
        'tap-keyboard-desc': '자주 사용하는 키 입력을 자동화하세요. 단축키, 텍스트 시퀀스, 매크로를 지원합니다.',
        'clock-subtitle': '플립 시계',
        'clock-desc': '아름다운 플립 시계로 시간을 확인하세요. 다양한 스타일과 테마를 제공합니다.',
        'screen-subtitle': '바탕화면 & 잠금화면',
        'screen-desc': '매일 새로운 영감을 주는 배경화면. 자동 변경, 시간대별 테마를 지원합니다.',
        'cal-subtitle': '캘린더 위젯',
        'cal-desc': '한눈에 보는 깔끔한 캘린더 위젯. 일정 확인과 D-day 카운트를 지원합니다.',
        'alarm-subtitle': '알람 & 타이머',
        'alarm-desc': '알람시계, 스톱워치, 타이머, 세계시계를 하나에. 위젯으로 빠르게 확인하세요.',
        'features-title': '일상의 균형을 완성하는 디지털 생태계',
        'features-desc': '작지만 단단한, 일상의 동반자',
        'feature-simple-title': '간단한 설정',
        'feature-simple-desc': '복잡한 설정 없이 바로 사용할 수 있어요. 필요한 기능만 딱.',
        'feature-clean-title': '깔끔한 디자인',
        'feature-clean-desc': '눈에 거슬리지 않으면서도 아름다운 UI를 제공합니다.',
        'feature-privacy-title': '프라이버시 우선',
        'feature-privacy-desc': '불필요한 권한을 요청하지 않아요. 당신의 데이터는 당신의 것.',
        'feature-cross-title': '크로스 플랫폼',
        'feature-cross-desc': 'Windows, Mac, Android, iOS 어디서든 동일한 경험을.',
        'footer-apps': '앱',
        'footer-github': 'GitHub',
        'footer-contact': '문의',
        'footer-privacy': '개인정보처리방침',
        'menu-home': '홈',
        'menu-apps': '앱',
        'menu-blog': '블로그',
        'menu-contact': '문의',
        'menu-privacy': '개인정보'
    },
    en: {
        'hero-title': 'small tools that<br><span>blend into life</span>',
        'hero-desc': 'From pebble mouse to pebble cal, our ecosystem works organically for your convenience. No complex settings, no unnecessary data collection. Experience the daily transformation brought by pebble "small tools", designed solely for your productivity and peace of mind.',
        'hero-cta-apps': 'Browse Apps',
        'hero-cta-github': 'GitHub',
        'scroll': 'Scroll',
        'apps-title': 'pebble apps',
        'apps-desc': 'Simple yet special utility collection',
        'tap-mouse-subtitle': 'Auto Clicker',
        'tap-mouse-desc': 'Automate repetitive click tasks. Freely set intervals, counts, and positions.',
        'tap-keyboard-subtitle': 'Auto Keyboard',
        'tap-keyboard-desc': 'Automate frequently used key inputs. Supports shortcuts, text sequences, and macros.',
        'clock-subtitle': 'Flip Clock',
        'clock-desc': 'Check time with a beautiful flip clock. Various styles and themes available.',
        'screen-subtitle': 'Wallpaper & Lock Screen',
        'screen-desc': 'Wallpapers that inspire daily. Auto-change and time-based themes supported.',
        'cal-subtitle': 'Calendar Widget',
        'cal-desc': 'Clean calendar widget at a glance. Schedule check and D-day countdown supported.',
        'alarm-subtitle': 'Alarm & Timer',
        'alarm-desc': 'Alarm clock, stopwatch, timer, and world clock in one. Check quickly with widgets.',
        'features-title': 'a digital ecosystem for balanced living',
        'features-desc': 'Small but solid, your daily companion',
        'feature-simple-title': 'Simple Setup',
        'feature-simple-desc': 'Ready to use without complex settings. Just the features you need.',
        'feature-clean-title': 'Clean Design',
        'feature-clean-desc': 'Beautiful UI that never gets in the way.',
        'feature-privacy-title': 'Privacy First',
        'feature-privacy-desc': 'No unnecessary permissions. Your data stays yours.',
        'feature-cross-title': 'Cross Platform',
        'feature-cross-desc': 'Same experience on Windows, Mac, Android, and iOS.',
        'footer-apps': 'Apps',
        'footer-github': 'GitHub',
        'footer-contact': 'Contact',
        'footer-privacy': 'Privacy Policy',
        'menu-home': 'Home',
        'menu-apps': 'Apps',
        'menu-blog': 'Blog',
        'menu-contact': 'Contact',
        'menu-privacy': 'Privacy'
    }
};

let currentLang = 'ko';

function toggleLang() {
    currentLang = currentLang === 'ko' ? 'en' : 'ko';
    document.getElementById('lang-text').textContent = currentLang === 'ko' ? 'EN' : 'KO';
    applyTranslations();
    localStorage.setItem('lang', currentLang);
}

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang][key]) {
            el.innerHTML = translations[currentLang][key];
        }
    });
    
    // Translate menu items
    const menuTranslations = {
        'home': translations[currentLang]['menu-home'],
        'apps': translations[currentLang]['menu-apps'],
        'blog': translations[currentLang]['menu-blog'],
        'contact': translations[currentLang]['menu-contact'],
        'privacy': translations[currentLang]['menu-privacy']
    };
    
    document.querySelectorAll('[data-i18n-fab]').forEach(el => {
        const key = el.getAttribute('data-i18n-fab');
        if (menuTranslations[key]) {
            el.textContent = menuTranslations[key];
        }
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme === 'dark');

    // Load saved language
    const savedLang = localStorage.getItem('lang') || 'ko';
    currentLang = savedLang;
    document.getElementById('lang-text').textContent = currentLang === 'ko' ? 'EN' : 'KO';
    applyTranslations();

    // Card mouse tracking effect
    const cards = document.querySelectorAll('.app-card');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            card.style.setProperty('--mouse-x', x + '%');
            card.style.setProperty('--mouse-y', y + '%');
        });
    });
});
