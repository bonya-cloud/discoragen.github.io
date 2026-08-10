  // =====================================================================
  // ОГЛАВЛЕНИЕ JS (искать по этим меткам через Ctrl+F):
  // - ЛОГИКА ПОЛНОЭКРАННОГО РЕЖИМА          — открытие/закрытие модалок
  // - ЛОГИКА ИГРЫ 1/2/3                     — мини-игры (CS2 Quiz, Clicker, UFC)
  // - УПРАВЛЕНИЕ МОБИЛЬНЫМ МЕНЮ             — бургер-меню, переключение вкладок
  // - АВТО-ОТКРЫТИЕ ВКЛАДКИ ПО ССЫЛКЕ       — deep-link из Telegram-бота (?tab=...)
  // - УМНЫЙ ПОИСК                           — поиск по платформе
  // - ПОДПИСКА (Premium/Lite)               — покупка и статус подписки
  // - ВХОД ЧЕРЕЗ TELEGRAM + МУЛЬТИАККАУНТЫ  — авторизация и мультиаккаунты
  // - TELEGRAM MINI APP                     — интеграция с Mini App API
  // - КОРОБКА СЕКРЕТОВ                      — анонимные признания
  // - остальное: модалки постов/профиля/друзей/видео/гостевой книги,
  //   рендер лент (посты, видео, фото), донаты, жалобы и модерация
  // =====================================================================
  const ADMIN_EMAILS = ["discoragen@gmail.com", "leznevnikita8@gmail.com"];

  let searchQuery = '';
  let blockedUsers = JSON.parse(localStorage.getItem('discoragen_blacklist') || '[]');
  
  let newPostFileBase64 = null;
  let newPostAccessMode = 'pub';
  let newPostIsExternalLink = false;

  let currentFeedType = 'all';
  let currentFeedSort = 'best';
  let currentFeedTime = 'today';

  let commentListeners = {};

  /* ЛОГИКА ПОЛНОЭКРАННОГО РЕЖИМА */
  function toggleFullScreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        showToast('⚠️ Ошибка включения полноэкранного режима');
      });
      document.getElementById('enterFsIcon').style.display = 'none';
      document.getElementById('exitFsIcon').style.display = 'block';
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      document.getElementById('enterFsIcon').style.display = 'block';
      document.getElementById('exitFsIcon').style.display = 'none';
    }
  }

  /* ЛОГИКА ИГРЫ 1: CS2 QUIZ */
  const cs2Questions = [
    { q: "Какое основное оружие спецназа по умолчанию на закупке?", options: ["AK-47", "M4A4 / M4A1-S", "Galil AR", "Famas"], correct: 1 },
    { q: "Сколько раундов нужно выиграть в обычном соревновательном матче CS2 для победы?", options: ["13 раундов", "16 раундов", "9 раундов", "10 раундов"], correct: 0 },
    { q: "Как называется классическая карта с бомбсайтами A и B в пустыне?", options: ["Inferno", "Mirage", "Dust II", "Nuke"], correct: 2 }
  ];
  let currentQuizIdx = 0;
  let quizScore = 0;

  // Открыть модалку квиза CS2
  function openCs2QuizModal() {
    currentQuizIdx = 0;
    quizScore = 0;
    document.getElementById('cs2QuizModal').classList.add('show');
    renderQuizQuestion();
  }
  // Закрыть модалку квиза CS2
  function closeCs2QuizModal() {
    document.getElementById('cs2QuizModal').classList.remove('show');
  }
  // Отрисовать текущий вопрос квиза
  function renderQuizQuestion() {
    const container = document.getElementById('quizContent');
    if (currentQuizIdx >= cs2Questions.length) {
      container.innerHTML = `
        <div style="text-align:center; padding: 20px;">
          <h3 style="font-family:'Space Grotesk',sans-serif; margin-bottom: 10px; font-size: 20px;">🎉 Викторина завершена!</h3>
          <p style="color:var(--muted); margin-bottom: 16px;">Ваш результат: <strong>${quizScore} из ${cs2Questions.length}</strong></p>
          <button class="gb-send-btn" onclick="openCs2QuizModal()" style="width:100%;">Сыграть еще раз</button>
        </div>
      `;
      return;
    }
    const qObj = cs2Questions[currentQuizIdx];
    let html = `<div style="font-weight:700; font-size: 15px; margin-bottom: 12px; color: var(--text);">Вопрос ${currentQuizIdx + 1} из ${cs2Questions.length}:<br>${qObj.q}</div>`;
    qObj.options.forEach((opt, idx) => {
      html += `<button class="game-btn-option" onclick="answerCs2Quiz(${idx})">${opt}</button>`;
    });
    container.innerHTML = html;
  }
  // Обработать ответ пользователя на вопрос квиза
  function answerCs2Quiz(idx) {
    if (idx === cs2Questions[currentQuizIdx].correct) {
      quizScore++;
      showToast('✅ Правильно!');
    } else {
      showToast('❌ Неправильно!');
    }
    currentQuizIdx++;
    renderQuizQuestion();
  }

  /* ЛОГИКА ИГРЫ 2: CYBER CLICKER */
  let cyberScore = parseInt(localStorage.getItem('cyber_score') || '0');
  let cyberPower = parseInt(localStorage.getItem('cyber_power') || '1');
  let cyberAuto = parseInt(localStorage.getItem('cyber_auto') || '0');

  // Открыть модалку кликера Cyber Clicker
  function openCyberClickerModal() {
    document.getElementById('cyberClickerModal').classList.add('show');
    updateClickerUI();
  }
  // Закрыть модалку кликера, сохранив прогресс
  function closeCyberClickerModal() {
    document.getElementById('cyberClickerModal').classList.remove('show');
  }
  // Обработать клик игрока в кликере (+очки)
  function handleCyberClick() {
    cyberScore += cyberPower;
    saveClickerData();
    updateClickerUI();
  }
  // Купить улучшение в кликере
  function buyClickerUpgrade(type) {
    if (type === 'power') {
      let cost = 30 * cyberPower;
      if (cyberScore >= cost) {
        cyberScore -= cost;
        cyberPower++;
        showToast('⚡ Сила клика увеличена!');
      } else {
        showToast('⚠️ Недостаточно очков!');
      }
    } else if (type === 'auto') {
      let cost = 50 * (cyberAuto + 1);
      if (cyberScore >= cost) {
        cyberScore -= cost;
        cyberAuto++;
        showToast('🤖 Auto-Clicker куплен!');
      } else {
        showToast('⚠️ Недостаточно очков!');
      }
    }
    saveClickerData();
    updateClickerUI();
  }
  // Сохранить прогресс кликера в localStorage
  function saveClickerData() {
    localStorage.setItem('cyber_score', cyberScore);
    localStorage.setItem('cyber_power', cyberPower);
    localStorage.setItem('cyber_auto', cyberAuto);
  }
  // Обновить счётчики и кнопки в интерфейсе кликера
  function updateClickerUI() {
    const scoreEl = document.getElementById('clickerScore');
    if (scoreEl) scoreEl.textContent = cyberScore + ' очков';
    const autoBtn = document.getElementById('upgradeAutoBtn');
    if (autoBtn) autoBtn.textContent = `Купить Auto-Clicker (+1/сек) — ${50 * (cyberAuto + 1)} очков`;
    const powerBtn = document.getElementById('upgradePowerBtn');
    if (powerBtn) powerBtn.textContent = `Сила клика (+1 за клик) — ${30 * cyberPower} очков`;
  }
  setInterval(() => {
    if (cyberAuto > 0) {
      cyberScore += cyberAuto;
      saveClickerData();
      updateClickerUI();
    }
  }, 1000);

  /* ЛОГИКА ИГРЫ 3: UFC FIGHTER SIMULATOR */
  let ufcPower = parseInt(localStorage.getItem('ufc_power') || '12');
  let ufcStamina = parseInt(localStorage.getItem('ufc_stamina') || '12');
  let ufcWins = parseInt(localStorage.getItem('ufc_wins') || '0');

  // Открыть модалку симулятора UFC-бойца
  function openUfcSimulatorModal() {
    document.getElementById('ufcSimulatorModal').classList.add('show');
    updateUfcUI();
  }
  // Закрыть модалку симулятора UFC-бойца
  function closeUfcSimulatorModal() {
    document.getElementById('ufcSimulatorModal').classList.remove('show');
  }
  // Прокачать характеристику бойца за очки
  function trainUfcStat(stat) {
    if (stat === 'power') {
      ufcPower += 2;
      showToast('💪 Сила бойца выросла!');
    } else {
      ufcStamina += 2;
      showToast('⚡ Выносливость бойца выросла!');
    }
    localStorage.setItem('ufc_power', ufcPower);
    localStorage.setItem('ufc_stamina', ufcStamina);
    updateUfcUI();
  }
  // Запустить бой в симуляторе UFC
  function startUfcFight() {
    const logEl = document.getElementById('ufcFightLog');
    let enemyPower = 15 + Math.floor(Math.random() * 10);
    let myTotal = ufcPower + ufcStamina;
    if (myTotal >= enemyPower) {
      ufcWins++;
      localStorage.setItem('ufc_wins', ufcWins);
      logEl.innerHTML = `<strong style="color: #10b981;">🏆 Победа нокаутом!</strong> Соперник повержен в октагоне.`;
      showToast('🏆 Победа в бою!');
    } else {
      logEl.innerHTML = `<strong style="color: var(--danger);">❌ Поражение!</strong> Соперник оказался сильнее. Прокачай характеристики!`;
      showToast('❌ Вы проиграли бой');
    }
    updateUfcUI();
  }
  // Обновить интерфейс симулятора (характеристики, кнопки)
  function updateUfcUI() {
    document.getElementById('ufcPower').textContent = ufcPower;
    document.getElementById('ufcStamina').textContent = ufcStamina;
    document.getElementById('ufcWins').textContent = ufcWins;
  }

  /* УПРАВЛЕНИЕ МОБИЛЬНЫМ МЕНЮ */
  function openMobileMenu() {
    document.getElementById('mobileDrawerOverlay').classList.add('show');
  }

  // Закрыть мобильное меню (бургер)
  function closeMobileMenu() {
    document.getElementById('mobileDrawerOverlay').classList.remove('show');
  }

  // Переключить активную вкладку в мобильном меню
  function switchTabMob(tabName) {
    closeMobileMenu();
    switchTab(tabName);
    
    document.querySelectorAll('.mobile-drawer-link').forEach(l => l.classList.remove('active'));
    if (tabName === 'main') document.getElementById('mobNavMain').classList.add('active');
    if (tabName === 'photos') document.getElementById('mobNavPhotos').classList.add('active');
    if (tabName === 'videos') document.getElementById('mobNavVideos').classList.add('active');
    if (tabName === 'games') document.getElementById('mobNavGames').classList.add('active');
    if (tabName === 'friends') document.getElementById('mobNavFriends').classList.add('active');
    if (tabName === 'dm') document.getElementById('mobNavDm').classList.add('active');
    if (tabName === 'newpost') document.getElementById('mobNavNewPost').classList.add('active');
  }

  // Открыть/закрыть кастомный выпадающий список
  function toggleCustomDropdown(menuId, event) {
    event.stopPropagation();
    const menu = document.getElementById(menuId);
    document.querySelectorAll('.custom-dropdown-menu').forEach(m => {
      if (m.id !== menuId) m.classList.remove('show');
    });
    menu.classList.toggle('show');
  }

  document.addEventListener('click', () => {
    document.querySelectorAll('.custom-dropdown-menu').forEach(m => m.classList.remove('show'));
    const sDropdown = document.getElementById('smartSearchDropdown');
    if (sDropdown) sDropdown.style.display = 'none';
  });

  // Выбрать тип отображаемой ленты
  function selectFeedType(type, label, el) {
    currentFeedType = type;
    document.getElementById('btnTypeLabel').textContent = label;
    el.parentNode.querySelectorAll('.custom-dropdown-item').forEach(i => i.classList.remove('active'));
    el.classList.add('active');
    renderPhotosGrid();
  }

  // Выбрать способ сортировки ленты
  function selectFeedSort(sort, label, el) {
    currentFeedSort = sort;
    document.getElementById('btnSortLabel').textContent = label;
    el.parentNode.querySelectorAll('.custom-dropdown-item').forEach(i => i.classList.remove('active'));
    el.classList.add('active');
    renderPhotosGrid();
  }

  // Выбрать период фильтрации ленты по времени
  function selectFeedTime(time, label, el) {
    currentFeedTime = time;
    document.getElementById('btnTimeLabel').textContent = label;
    el.parentNode.querySelectorAll('.custom-dropdown-item').forEach(i => i.classList.remove('active'));
    el.classList.add('active');
    renderPhotosGrid();
  }

  /* ===== АВТО-ОТКРЫТИЕ ВКЛАДКИ ПО ССЫЛКЕ ИЗ TELEGRAM-БОТА (?tab=...) ===== */
  // Поддерживаемые значения: ?tab=profile, ?tab=friends, ?tab=photos, ?tab=videos, ?tab=games, ?tab=dm, ?tab=newpost
  function applyStartTabFromUrl() {
    try {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (!tab) return;

      if (tab === 'profile') {
        // Профиль — это не вкладка, а модалка, открываем её отдельной функцией
        openMyProfileModal();
      } else if (['main', 'newpost', 'photos', 'videos', 'games', 'friends', 'dm'].includes(tab)) {
        switchTab(tab);
      }

      // Убираем параметр из адресной строки, чтобы при обновлении страницы
      // пользователя не кидало обратно на ту же вкладку принудительно
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);
    } catch (e) {
      console.error('applyStartTabFromUrl error:', e);
    }
  }

  // Переключить активную вкладку сайта (профиль/друзья/лента и т.д.)
  function switchTab(tabName) {
    const mainPage = document.getElementById('mainPage');
    const newPostPage = document.getElementById('newPostPage');
    const photosPage = document.getElementById('photosPage');
    const videosPage = document.getElementById('videosPage');
    const gamesPage = document.getElementById('gamesPage');
    const friendsPage = document.getElementById('friendsPage');
    const dmPage = document.getElementById('dmPage');
    const secretsPage = document.getElementById('secretsPage');

    const navMain = document.getElementById('navMain');
    const navNewPost = document.getElementById('navNewPost');
    const navPhotos = document.getElementById('navPhotos');
    const navVideos = document.getElementById('navVideos');
    const navGames = document.getElementById('navGames');
    const navFriends = document.getElementById('navFriends');
    const navDm = document.getElementById('navDm');
    const navSecrets = document.getElementById('navSecrets');

    mainPage.style.display = 'none';
    if (newPostPage) newPostPage.style.display = 'none';
    photosPage.style.display = 'none';
    videosPage.style.display = 'none';
    gamesPage.style.display = 'none';
    friendsPage.style.display = 'none';
    if (dmPage) dmPage.style.display = 'none';
    if (secretsPage) secretsPage.style.display = 'none';

    navMain.classList.remove('active');
    if (navNewPost) navNewPost.classList.remove('active');
    if (navPhotos) navPhotos.classList.remove('active');
    navVideos.classList.remove('active');
    navGames.classList.remove('active');
    if (navFriends) navFriends.classList.remove('active');
    if (navDm) navDm.classList.remove('active');
    if (navSecrets) navSecrets.classList.remove('active');

    // mobile active states
    document.querySelectorAll('.mobile-drawer-link').forEach(l => l.classList.remove('active'));
    const mobMap = { main: 'mobNavMain', photos: 'mobNavPhotos', videos: 'mobNavVideos', games: 'mobNavGames', friends: 'mobNavFriends', dm: 'mobNavDm', newpost: 'mobNavNewPost', secrets: 'mobNavSecrets' };
    const mobEl = document.getElementById(mobMap[tabName]);
    if (mobEl) mobEl.classList.add('active');

    if (tabName === 'main') {
      mainPage.style.display = 'block';
      navMain.classList.add('active');
    } else if (tabName === 'newpost') {
      if (newPostPage) newPostPage.style.display = 'block';
      if (navNewPost) navNewPost.classList.add('active');
    } else if (tabName === 'photos') {
      photosPage.style.display = 'block';
      if (navPhotos) navPhotos.classList.add('active');
      renderPhotosGrid();
    } else if (tabName === 'videos') {
      videosPage.style.display = 'block';
      navVideos.classList.add('active');
    } else if (tabName === 'games') {
      gamesPage.style.display = 'block';
      navGames.classList.add('active');
    } else if (tabName === 'friends') {
      friendsPage.style.display = 'block';
      if (navFriends) navFriends.classList.add('active');
      renderFriendsList();
    } else if (tabName === 'dm') {
      if (dmPage) dmPage.style.display = 'block';
      if (navDm) navDm.classList.add('active');
    } else if (tabName === 'secrets') {
      if (secretsPage) secretsPage.style.display = 'block';
      if (navSecrets) navSecrets.classList.add('active');
      renderSecrets();
    }
    handleSmartSearch(searchQuery);
  }

  /* УМНЫЙ ПОИСК */
  function handleSmartSearch(query) {
    searchQuery = query.toLowerCase().trim();
    
    document.querySelectorAll('.search-input').forEach(inp => {
      if (inp.value !== query && inp.id !== 'userSearchInput') inp.value = query;
    });

    const dropdown = document.getElementById('smartSearchDropdown');
    if (!dropdown) return;

    if (!searchQuery) {
      dropdown.style.display = 'none';
      dropdown.innerHTML = '';
      return;
    }

    dropdown.style.display = 'block';
    dropdown.innerHTML = '<div style="color: var(--muted); font-size: 12px; text-align: center; padding: 10px;">Ищем везде...</div>';

    const matchedComments = currentMessagesList.filter(m => (m.text || '').toLowerCase().includes(searchQuery));
    const matchedVideos = currentVideosList.filter(v => (v.title || '').toLowerCase().includes(searchQuery) || (v.category || '').toLowerCase().includes(searchQuery));
    const gamesCards = Array.from(document.querySelectorAll('.game-card'));
    const matchedGames = gamesCards.filter(g => (g.getAttribute('data-title') || '').toLowerCase().includes(searchQuery) || g.textContent.toLowerCase().includes(searchQuery));

    db.collection('users').get().then(snapshot => {
      let matchedUsers = [];
      snapshot.forEach(doc => {
        const u = doc.data();
        if ((u.username || '').toLowerCase().includes(searchQuery) || (u.email || '').toLowerCase().includes(searchQuery)) {
          matchedUsers.push({ id: doc.id, ...u });
        }
      });

      dropdown.innerHTML = '';
      let hasResults = false;

      if (matchedUsers.length > 0) {
        hasResults = true;
        const titleDiv = document.createElement('div');
        titleDiv.className = 'smart-search-section-title';
        titleDiv.textContent = `👥 Пользователи (${matchedUsers.length})`;
        dropdown.appendChild(titleDiv);

        matchedUsers.forEach(u => {
          const item = document.createElement('div');
          item.className = 'smart-search-item';
          item.innerHTML = `<span>👤</span> <strong>${escapeHtml(u.username)}</strong> <span style="color:var(--muted); font-size:11.5px;">@${escapeHtml(u.username.toLowerCase())}</span>`;
          item.onclick = () => {
            dropdown.style.display = 'none';
            openUserProfile(u.id, u.username, u.avatarUrl);
          };
          dropdown.appendChild(item);
        });
      }

      if (matchedVideos.length > 0) {
        hasResults = true;
        const titleDiv = document.createElement('div');
        titleDiv.className = 'smart-search-section-title';
        titleDiv.textContent = `🎬 Видео (${matchedVideos.length})`;
        dropdown.appendChild(titleDiv);

        matchedVideos.forEach(v => {
          const item = document.createElement('a');
          item.className = 'smart-search-item';
          item.href = v.url;
          item.target = '_blank';
          item.innerHTML = `<span>▶️</span> <span>${escapeHtml(v.title)}</span>`;
          item.onclick = () => { dropdown.style.display = 'none'; };
          dropdown.appendChild(item);
        });
      }

      if (matchedGames.length > 0) {
        hasResults = true;
        const titleDiv = document.createElement('div');
        titleDiv.className = 'smart-search-section-title';
        titleDiv.textContent = `🎮 Игры (${matchedGames.length})`;
        dropdown.appendChild(titleDiv);

        matchedGames.forEach(g => {
          const gName = g.querySelector('.game-name').textContent;
          const item = document.createElement('div');
          item.className = 'smart-search-item';
          item.innerHTML = `<span>🎮</span> <span>${escapeHtml(gName)}</span>`;
          item.onclick = () => {
            dropdown.style.display = 'none';
            switchTab('games');
          };
          dropdown.appendChild(item);
        });
      }

      if (matchedComments.length > 0) {
        hasResults = true;
        const titleDiv = document.createElement('div');
        titleDiv.className = 'smart-search-section-title';
        titleDiv.textContent = `💬 Комментарии / Записи (${matchedComments.length})`;
        dropdown.appendChild(titleDiv);

        matchedComments.slice(0, 5).forEach(m => {
          const item = document.createElement('div');
          item.className = 'smart-search-item';
          item.innerHTML = `<span>💬</span> <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"><strong>@${escapeHtml(m.author)}:</strong> ${escapeHtml(m.text)}</span>`;
          item.onclick = () => {
            dropdown.style.display = 'none';
            switchTab('main');
          };
          dropdown.appendChild(item);
        });
      }

      if (!hasResults) {
        dropdown.innerHTML = '<div style="color: var(--muted); font-size: 13px; text-align: center; padding: 16px;">Ничего не найдено по вашему запросу</div>';
      }
    }).catch(err => {
      console.error(err);
    });
  }

  const profileMenuBtn = document.getElementById('profileMenuBtn');
  const profileDropdown = document.getElementById('profileDropdown');
  const supportModal = document.getElementById('supportModal');
  const donateModal = document.getElementById('donateModal');
  const rulesModal = document.getElementById('rulesModal');
  const suggestVideoModal = document.getElementById('suggestVideoModal');
  const loginModal = document.getElementById('loginModal');
  const registerModal = document.getElementById('registerModal');
  const editProfileModal = document.getElementById('editProfileModal');
  const userProfileModal = document.getElementById('userProfileModal');
  const reportsModal = document.getElementById('reportsModal');
  const adminPanelModal = document.getElementById('adminPanelModal');
  const subsAdminModal = document.getElementById('subsAdminModal');
  const banAdminModal = document.getElementById('banAdminModal');
  const topDonatorsModal = document.getElementById('topDonatorsModal');
  const activityHistoryModal = document.getElementById('activityHistoryModal');
  const viewPostModal = document.getElementById('viewPostModal');
  const changePasswordModal = document.getElementById('changePasswordModal');
  const loginLogsModal = document.getElementById('loginLogsModal');

  profileMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    profileDropdown.classList.toggle('show');
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.profile-dropdown-container')) {
      profileDropdown.classList.remove('show');
    }
  });

  // Открыть модалку поддержки
  function openSupportModal() { profileDropdown.classList.remove('show'); supportModal.classList.add('show'); }
  function closeSupportModal() { supportModal.classList.remove('show'); }

  let selectedDonateAmount = null;
  let finalDonateAmount = null;

  // Открыть модалку доната
  function openDonateModal() {
    profileDropdown.classList.remove('show');
    donateModal.classList.add('show');
    resetDonateModal();
  }

  // Закрыть модалку доната
  function closeDonateModal() {
    donateModal.classList.remove('show');
    resetDonateModal();
  }

  // ===== ПОДПИСКА (Premium / Lite) =====
  let chosenSubTier = null;
  let chosenSubPrice = null;

  window.openSubscriptionModal = function() {
    if (profileDropdown) profileDropdown.classList.remove('show');
    document.getElementById('subStepPlans').style.display = 'block';
    document.getElementById('subStepPay').style.display = 'none';
    const giftLite = document.getElementById('subGiftLiteBtn');
    const giftPremium = document.getElementById('subGiftPremiumBtn');
    const showGift = isAdmin() ? 'flex' : 'none';
    if (giftLite) giftLite.style.display = showGift;
    if (giftPremium) giftPremium.style.display = showGift;
    document.getElementById('subscriptionModal').classList.add('show');
  };

  window.closeSubscriptionModal = function() {
    document.getElementById('subscriptionModal').classList.remove('show');
  };

  window.selectSubPlan = function(tier, price) {
    if (!auth.currentUser || !currentUserProfile) {
      showToast('⚠️ Нужно войти в аккаунт, чтобы оформить подписку');
      return;
    }
    chosenSubTier = tier;
    chosenSubPrice = price;
    document.getElementById('subChosenPlanText').textContent = tier === 'premium' ? 'PREMIUM (287 ₽/мес)' : 'LITE (132 ₽/мес)';
    document.getElementById('subStepPlans').style.display = 'none';
    document.getElementById('subStepPay').style.display = 'block';
  };

  window.backToSubPlans = function() {
    document.getElementById('subStepPlans').style.display = 'block';
    document.getElementById('subStepPay').style.display = 'none';
  };

  window.confirmSubPaid = function() {
    if (!chosenSubTier || !auth.currentUser) return;
    db.collection('reports').add({
      type: 'subscription',
      tier: chosenSubTier,
      amount: chosenSubPrice,
      userId: auth.currentUser.uid,
      username: currentUserProfile ? currentUserProfile.username : 'Пользователь',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      showToast('👑 Заявка отправлена! Подписка включится после проверки платежа админом.');
      closeSubscriptionModal();
    }).catch(err => {
      console.error(err);
      showToast('❌ Ошибка отправки заявки. Попробуйте позже.');
    });
  };

  // Сбросить модалку доната к первому шагу
  function resetDonateModal() {
    selectedDonateAmount = null;
    finalDonateAmount = null;
    document.getElementById('donateStepAmount').style.display = 'block';
    document.getElementById('donateStepWarning').style.display = 'none';
    document.getElementById('donateStepNickname').style.display = 'none';
    document.getElementById('donateQrBox').classList.remove('show');
    document.getElementById('donateCustomAmountInput').style.display = 'none';
    document.getElementById('donateCustomAmountInput').value = '';
    document.getElementById('donateNicknameInput').value = '';
    document.querySelectorAll('#donateAmountsGrid .donate-amount-btn').forEach(b => b.classList.remove('active'));
  }

  // Выбрать сумму доната
  function selectDonateAmount(value, btnEl) {
    document.querySelectorAll('#donateAmountsGrid .donate-amount-btn').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');
    const customInput = document.getElementById('donateCustomAmountInput');
    if (value === 'custom') {
      customInput.style.display = 'block';
      customInput.focus();
      selectedDonateAmount = 'custom';
    } else {
      customInput.style.display = 'none';
      selectedDonateAmount = value;
    }
  }

  // Перейти к шагу предупреждения перед донатом
  function proceedToDonateWarning() {
    let amount = selectedDonateAmount;
    if (amount === 'custom') {
      const customVal = parseFloat(document.getElementById('donateCustomAmountInput').value);
      if (!customVal || customVal <= 0) {
        showToast('⚠️ Введите корректную сумму доната');
        return;
      }
      amount = customVal;
    }
    if (!amount) {
      showToast('⚠️ Сначала выберите или введите сумму доната');
      return;
    }
    finalDonateAmount = amount;
    document.getElementById('donateWarningAmountText').textContent = `на сумму ${amount} ₽`;
    document.getElementById('donateStepAmount').style.display = 'none';
    document.getElementById('donateStepWarning').style.display = 'block';
  }

  // Вернуться от предупреждения к выбору суммы доната
  function backToDonateAmount() {
    document.getElementById('donateStepWarning').style.display = 'none';
    document.getElementById('donateStepAmount').style.display = 'block';
  }

  // Перейти к шагу ввода никнейма для доната
  function proceedToDonateNickname() {
    document.getElementById('donateStepWarning').style.display = 'none';
    document.getElementById('donateStepNickname').style.display = 'block';
  }

  // Вернуться от ввода никнейма к предупреждению
  function backToDonateWarning() {
    document.getElementById('donateStepNickname').style.display = 'none';
    document.getElementById('donateStepWarning').style.display = 'block';
  }

  // Показать QR-код для оплаты доната
  function showDonateQr() {
    document.getElementById('donateStepNickname').style.display = 'none';
    document.getElementById('donateQrBox').classList.add('show');
  }

  // Подтвердить, что донат отправлен
  function confirmDonateDone() {
    const nicknameRaw = document.getElementById('donateNicknameInput').value.trim();
    const displayName = nicknameRaw || 'Аноним';
    const reporterId = (auth.currentUser && auth.currentUser.displayName) ? auth.currentUser.displayName : 'Гость';
    const userId = auth.currentUser ? auth.currentUser.uid : null;

    db.collection('reports').add({
      type: 'donation',
      displayName: displayName,
      amount: finalDonateAmount,
      reporterId: reporterId,
      userId: userId,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      showToast('💖 Спасибо за поддержку! Как только мы подтвердим перевод, вы появитесь в топ-донатерах.');
      closeDonateModal();
    }).catch(err => {
      console.error(err);
      showToast('💖 Спасибо за поддержку проекта!');
      closeDonateModal();
    });
  }

  // Скопировать номер телефона для доната в буфер обмена
  function copyDonatePhone() {
    const phoneText = document.getElementById('donateSbpPhone').textContent.trim();
    const btn = document.getElementById('donateCopyBtn');
    const onCopied = () => {
      btn.textContent = 'Скопировано ✓';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = 'Скопировать'; btn.classList.remove('copied'); }, 1800);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(phoneText).then(onCopied).catch(() => fallbackCopyText(phoneText, onCopied));
    } else {
      fallbackCopyText(phoneText, onCopied);
    }
  }

  // Запасной способ копирования текста (для браузеров без Clipboard API)
  function fallbackCopyText(text, onDone) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    if (onDone) onDone();
  }
  // Открыть модалку с правилами платформы
  function openRulesModal() { profileDropdown.classList.remove('show'); rulesModal.classList.add('show'); }
  function closeRulesModal() { rulesModal.classList.remove('show'); }
  // Открыть модалку предложения видео
  function openSuggestVideoModal() { suggestVideoModal.classList.add('show'); }
  function closeSuggestVideoModal() {
    suggestVideoModal.classList.remove('show');
    document.getElementById('suggestVideoUrl').value = '';
    document.getElementById('suggestVideoComment').value = '';
    document.getElementById('suggestPreviewBox').style.backgroundImage = 'none';
    document.getElementById('suggestPreviewText').style.display = 'block';
  }

  // Открыть модалку смены пароля
  function openChangePasswordModal() {
    profileDropdown.classList.remove('show');
    changePasswordModal.classList.add('show');
  }
  // Закрыть модалку смены пароля
  function closeChangePasswordModal() {
    changePasswordModal.classList.remove('show');
    document.getElementById('currentPasswordInput').value = '';
    document.getElementById('newPasswordInput').value = '';
  }

  // Открыть модалку истории входов
  function openLoginLogsModal() {
    profileDropdown.classList.remove('show');
    loginLogsModal.classList.add('show');
    fetchLoginLogs();
  }
  // Закрыть модалку истории входов
  function closeLoginLogsModal() {
    loginLogsModal.classList.remove('show');
  }

  // Открыть модалку своего профиля
  function openMyProfileModal() {
    profileDropdown.classList.remove('show');
    const user = auth.currentUser;
    if (!user) {
      showToast('⚠️ Войдите в аккаунт, чтобы посмотреть свой профиль!');
      openLoginModal();
      return;
    }
    openUserProfile(user.uid, currentUserProfile ? currentUserProfile.username : (user.displayName || 'User'), currentUserProfile ? currentUserProfile.avatarUrl : '');
  }

  // Сменить пароль пользователя через Firebase Auth
  function updatePasswordUser() {
    const currentPass = document.getElementById('currentPasswordInput').value;
    const newPass = document.getElementById('newPasswordInput').value;
    const user = auth.currentUser;

    if (!currentPass || !newPass) {
      showToast('⚠️ Заполните все поля!');
      return;
    }
    if (newPass.length < 6) {
      showToast('⚠️ Новый пароль должен быть не менее 6 символов!');
      return;
    }

    const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPass);
    user.reauthenticateWithCredential(credential).then(() => {
      return user.updatePassword(newPass);
    }).then(() => {
      closeChangePasswordModal();
      showToast('✅ Пароль успешно изменен!');
    }).catch(err => {
      console.error(err);
      showToast('❌ Ошибка смены пароля (неверный текущий пароль?)');
    });
  }

  // Записать факт входа в лог (для истории входов)
  function recordLoginLog(userId) {
    db.collection('users').doc(userId).collection('login_logs').add({
      device: navigator.userAgent,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      localTime: Date.now()
    }).catch(e => console.error(e));
  }

  // Загрузить историю входов пользователя
  function fetchLoginLogs() {
    const container = document.getElementById('loginLogsContainer');
    container.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 20px;">Загрузка логов...</div>';
    const user = auth.currentUser;
    if (!user) {
      container.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 20px;">Неавторизован</div>';
      return;
    }

    db.collection('users').doc(user.uid).collection('login_logs').orderBy('timestamp', 'desc').get().then(snapshot => {
      container.innerHTML = '';
      if (snapshot.empty) {
        container.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 20px;">Логи входов пока отсутствуют</div>';
        return;
      }
      snapshot.forEach(doc => {
        const log = doc.data();
        const timeInfo = formatMessageTime(log.timestamp, log.localTime);
        const div = document.createElement('div');
        div.style.cssText = 'background: rgba(150,150,150,0.05); border: 1px solid var(--card-border); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 4px;';
        div.innerHTML = `
          <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--accent); font-weight: 600;">
            <span>🖥️ Успешный вход в аккаунт</span>
            <span>${timeInfo.display}</span>
          </div>
          <div style="font-size: 12.5px; color: var(--muted); word-break: break-all;">Устройство / Браузер: ${escapeHtml(log.device || 'Неизвестно')}</div>
        `;
        container.appendChild(div);
      });
    }).catch(err => {
      console.error(err);
      container.innerHTML = '<div style="color: var(--danger); text-align: center; padding: 20px;">Ошибка загрузки логов</div>';
    });
  }

  // Разобрать текст поста на заголовок и описание
  function parsePostContent(msg) {
    let title = 'Публикация';
    let desc = msg.text || '';

    if (msg.text) {
      let cleanText = msg.text.replace(/^📁\s*/, '');
      const match = cleanText.match(/\*\*(.*?)\*\*\n([\s\S]*)/);
      if (match) {
        title = match[1];
        desc = match[2];
      } else {
        const lines = cleanText.split('\n');
        if (lines.length > 0 && lines[0].trim().length > 0) {
          title = lines[0];
          desc = lines.slice(1).join('\n');
        }
      }
    }
    return { title, desc };
  }

  // Открыть модалку просмотра поста
  function openViewPostModal(targetMsgId) {
    const reelsContainer = document.getElementById('reelsContainer');
    reelsContainer.innerHTML = '';

    const allPosts = currentMessagesList.filter(m => m.image && m.accessMode !== 'link' && !blockedUsers.includes(m.author));

    if (allPosts.length === 0) {
      showToast('⚠️ Нет доступных медиа-постов');
      return;
    }

    const targetIndex = allPosts.findIndex(m => m.id === targetMsgId);
    const postsToRender = targetIndex !== -1 ? allPosts.slice(targetIndex) : allPosts;

    postsToRender.forEach(msg => {
      const parsed = parsePostContent(msg);
      const timeInfo = formatMessageTime(msg.createdAt, msg.localTime);
      const upVotes = msg.reactions ? (msg.reactions['👍'] || msg.reactions['❤️'] || 0) : 0;
      const viewsCount = Math.floor(Math.abs(hashCode(msg.id)) % 800) + 120;

      let avatarHTML = msg.avatarUrl 
        ? `<img src="${escapeHtml(msg.avatarUrl)}" alt="Avatar">` 
        : (msg.author || 'A')[0].toUpperCase();

      let mediaHTML = '';
      if (msg.image) {
        if (msg.isExternalLink) {
          mediaHTML = `<a href="${escapeHtml(msg.image)}" target="_blank" rel="noopener" style="display: flex; align-items: center; justify-content: center; gap: 10px; height: 260px; background: rgba(59,130,246,0.1); border: 1px dashed var(--accent); border-radius: 10px; color: var(--accent); font-weight: 700; font-size: 15px; text-decoration: none;">🔗 Открыть файл по ссылке</a>`;
        } else if (msg.image.startsWith('data:video/') || msg.image.includes('.mp4') || msg.image.includes('.webm')) {
          mediaHTML = `<video controls src="${msg.image}" style="max-height: 520px; width: 100%; object-fit: contain;"></video>`;
        } else if (msg.image.startsWith('data:audio/') || msg.image.includes('.mp3') || msg.image.includes('.wav')) {
          mediaHTML = `<audio controls src="${msg.image}" style="width: 100%; margin: 20px 0;"></audio>`;
        } else {
          mediaHTML = `<img src="${msg.image}" style="max-height: 520px; width: 100%; object-fit: contain;" alt="Media" />`;
        }
      }

      const card = document.createElement('div');
      card.className = 'reel-card';
      card.id = `reel_card_${msg.id}`;

      card.innerHTML = `
        <div class="reel-header">
          <div class="reel-avatar" onclick="openUserProfile('${escapeHtml(msg.userId || '')}', '${escapeHtml(msg.author || '')}', '${escapeHtml(msg.avatarUrl || '')}')" title="Посмотреть профиль">${avatarHTML}</div>
          <div style="display: flex; align-items: center;">
            <span class="reel-author-name" onclick="openUserProfile('${escapeHtml(msg.userId || '')}', '${escapeHtml(msg.author || '')}', '${escapeHtml(msg.avatarUrl || '')}')" style="cursor: pointer;">${escapeHtml(msg.author || 'Пользователь')}</span>
            <span class="reel-date">${timeInfo.display}</span>
          </div>
        </div>

        <div class="reel-title">${escapeHtml(parsed.title)}</div>
        ${parsed.desc ? `<div class="reel-desc">${escapeHtml(parsed.desc)}</div>` : ''}

        <div class="reel-media-box">
          ${mediaHTML}
        </div>

        <div class="reel-actions-bar">
          <div class="reel-action-group">
            <button class="reel-act-btn" onclick="handleReaction('${msg.id}', '👍')">
              <span>↑</span> <span id="reel_like_count_${msg.id}">${upVotes}</span>
            </button>
            <button class="reel-act-btn" onclick="handleReaction('${msg.id}', '👎')">
              <span>↓</span>
            </button>
            <button class="reel-act-btn" onclick="downloadPostMedia('${msg.id}')" title="Скачать файл">
              <span>↓</span>
            </button>
            <button class="reel-act-btn" onclick="copyPostLink('${msg.id}')" title="Поделиться">
              <span>🔗</span>
            </button>
            <button class="reel-act-btn" onclick="reportMessage('${msg.id}')" title="Пожаловаться">
              <span>🚩</span>
            </button>
            ${isAdmin() ? `<button class="reel-act-btn" style="color: var(--danger);" onclick="deleteMessage('${msg.id}')">🗑️</button>` : ''}
          </div>

          <div class="reel-views-count">
            <span>👁️</span> <span>${viewsCount}</span>
          </div>
        </div>

        <div class="reel-comments-section">
          <div class="reel-comments-header">
            <span id="reel_comment_title_${msg.id}">0 комментариев</span>
            <span class="reel-comments-sort">⇄ Упорядочить</span>
          </div>

          <div class="reel-comment-input-box">
            <div class="reel-avatar" style="width: 36px; height: 36px; font-size: 14px;">
              ${currentUserProfile && currentUserProfile.avatarUrl ? `<img src="${escapeHtml(currentUserProfile.avatarUrl)}">` : (currentUserProfile ? currentUserProfile.username[0].toUpperCase() : 'G')}
            </div>
            <div class="reel-input-wrapper">
              <input type="text" class="reel-comment-input" id="reelInput_${msg.id}" placeholder="Введите комментарий..." oninput="handleReelInputState('${msg.id}')" onkeydown="if(event.key==='Enter') submitReelComment('${msg.id}')" />
              <div class="reel-comment-input-bottom">
                <button class="reel-submit-comment-btn" id="reelSubmitBtn_${msg.id}" onclick="submitReelComment('${msg.id}')">Оставить комментарий</button>
              </div>
            </div>
          </div>

          <div class="reel-comments-list" id="reelCommentsList_${msg.id}">
            <div style="color: var(--muted); font-size: 12.5px; text-align: center; padding: 10px;">Загрузка комментариев...</div>
          </div>
        </div>
      `;

      reelsContainer.appendChild(card);
      listenReelComments(msg.id);
    });

    reelsContainer.scrollTop = 0;
    viewPostModal.classList.add('show');
  }

  // Простое хеширование строки (для генерации детерминированных значений)
  function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  // Включить/выключить кнопку отправки в зависимости от заполненности поля комментария
  function handleReelInputState(msgId) {
    const input = document.getElementById(`reelInput_${msgId}`);
    const btn = document.getElementById(`reelSubmitBtn_${msgId}`);
    if (input && btn) {
      if (input.value.trim().length > 0) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    }
  }

  // Подписаться на комментарии к посту в реальном времени
  function listenReelComments(msgId) {
    const commentsListContainer = document.getElementById(`reelCommentsList_${msgId}`);
    const commentTitle = document.getElementById(`reel_comment_title_${msgId}`);

    db.collection('messages').doc(msgId).collection('comments').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
      if (!commentsListContainer) return;
      commentsListContainer.innerHTML = '';

      if (commentTitle) {
        commentTitle.textContent = `${snapshot.size} комментария`;
      }

      if (snapshot.empty) {
        commentsListContainer.innerHTML = `<div style="color: var(--muted); font-size: 12.5px; text-align: center; padding: 12px;">Пока нет комментариев. Будьте первыми!</div>`;
        return;
      }

      snapshot.forEach(doc => {
        const c = doc.data();
        const timeInfo = formatMessageTime(c.createdAt, c.localTime);
        const item = document.createElement('div');
        item.className = 'reel-comment-item';

        let cAvatar = c.avatarUrl ? `<img src="${escapeHtml(c.avatarUrl)}">` : (c.author || 'A')[0].toUpperCase();

        item.innerHTML = `
          <div class="reel-avatar" style="width: 34px; height: 34px; font-size: 13px;">${cAvatar}</div>
          <div class="reel-comment-content">
            <div class="reel-comment-meta">
              <span class="reel-comment-author">${escapeHtml(c.author || 'Аноним')}</span>
              <span class="reel-comment-time">${timeInfo.display}</span>
            </div>
            <div class="reel-comment-text">${escapeHtml(c.text)}</div>
            <div class="reel-comment-actions">
              <button class="reel-vote-btn" onclick="showToast('👍 Вы поддержали комментарий')">↑ <span>${c.likes || 1}</span></button>
              <button class="reel-vote-btn" onclick="showToast('👎 Оценка отправлена')">↓</button>
              <button class="reel-reply-btn" onclick="replyToComment('${msgId}', '${escapeHtml(c.author)}')">Ответить</button>
            </div>
          </div>
        `;
        commentsListContainer.appendChild(item);
      });
    });
  }

  // Ответить на комментарий
  function replyToComment(msgId, authorName) {
    const input = document.getElementById(`reelInput_${msgId}`);
    if (input) {
      input.value = `@${authorName}, `;
      input.focus();
      handleReelInputState(msgId);
    }
  }

  // Отправить новый комментарий к посту
  function submitReelComment(msgId) {
    if (blockedByRestriction('comments', 'Комментирование')) return;
    const input = document.getElementById(`reelInput_${msgId}`);
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    const currentUser = auth.currentUser;
    const authorName = currentUserProfile ? currentUserProfile.username : (currentUser ? (currentUser.displayName || 'User') : ('guest_' + Math.floor(Math.random() * 900 + 100)));
    const userAvatarUrl = currentUserProfile ? currentUserProfile.avatarUrl : '';

    db.collection('messages').doc(msgId).collection('comments').add({
      author: authorName,
      avatarUrl: userAvatarUrl,
      text: text,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      localTime: Date.now(),
      likes: 1
    }).then(() => {
      input.value = '';
      handleReelInputState(msgId);
      showToast('💬 Комментарий успешно опубликован!');
    }).catch(err => {
      console.error(err);
      showToast('❌ Ошибка отправки комментария');
    });
  }

  // Скачать медиафайл поста
  function downloadPostMedia(msgId) {
    const msg = currentMessagesList.find(m => m.id === msgId);
    if (!msg || !msg.image) {
      showToast('⚠️ У этого поста нет медиафайла для скачивания!');
      return;
    }
    if (msg.isExternalLink) {
      window.open(msg.image, '_blank', 'noopener');
      return;
    }
    const a = document.createElement('a');
    a.href = msg.image;
    a.download = `file_${msgId}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('📥 Загрузка файла начата...');
  }

  // Скопировать ссылку на пост в буфер обмена
  function copyPostLink(msgId) {
    const link = window.location.origin + window.location.pathname + `#post_${msgId}`;
    navigator.clipboard.writeText(link).then(() => {
      showToast('🔗 Ссылка на пост скопирована в буфер обмена!');
    }).catch(() => {
      showToast('🔗 Ссылка скопирована!');
    });
  }

  // Закрыть модалку просмотра поста
  function closeViewPostModal() {
    viewPostModal.classList.remove('show');
  }

  // Установить тип доступа к новому посту (публичный / по ссылке)
  function setAccessType(mode) {
    newPostAccessMode = mode;
    const pubBtn = document.getElementById('accessPubBtn');
    const linkBtn = document.getElementById('accessLinkBtn');
    if (mode === 'pub') {
      pubBtn.classList.add('selected');
      linkBtn.classList.remove('selected');
    } else {
      linkBtn.classList.add('selected');
      pubBtn.classList.remove('selected');
    }
  }

  // Открыть системный диалог выбора файла для нового поста
  function triggerNewPostFileInput() {
    document.getElementById('newPostFileInput').click();
  }

  // Обработать выбор файла для нового поста
  function handleNewPostFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    const MAX_SIZE = 1 * 1024 * 1024;

    if (file.size > MAX_SIZE) {
      event.target.value = '';
      openLinkUploadModal();
      return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      newPostFileBase64 = e.target.result;
      newPostIsExternalLink = false;
      const indicator = document.getElementById('newPostFileIndicator');
      indicator.textContent = `✓ Файл выбран: ${file.name}`;
      indicator.style.display = 'block';
      showToast('📁 Медиафайл успешно прикреплен!');
    };
    reader.readAsDataURL(file);
  }

  // Открыть модалку загрузки медиа по ссылке
  function openLinkUploadModal() {
    document.getElementById('linkUploadInput').value = '';
    document.getElementById('linkUploadModal').classList.add('show');
  }

  // Закрыть модалку загрузки медиа по ссылке
  function closeLinkUploadModal() {
    document.getElementById('linkUploadModal').classList.remove('show');
  }

  // Подтвердить ссылку на медиа для нового поста
  function confirmMediaLink() {
    const link = document.getElementById('linkUploadInput').value.trim();
    if (!link) {
      showToast('⚠️ Вставьте ссылку на файл');
      return;
    }
    try {
      new URL(link);
    } catch {
      showToast('❌ Некорректная ссылка');
      return;
    }

    newPostFileBase64 = link;
    newPostIsExternalLink = true;
    const indicator = document.getElementById('newPostFileIndicator');
    indicator.textContent = `✓ Ссылка прикреплена: ${link}`;
    indicator.style.display = 'block';
    closeLinkUploadModal();
    showToast('🔗 Ссылка на файл прикреплена!');
  }

  // Отправить новый пост на публикацию
  function submitNewPost() {
    if (blockedByRestriction('media', 'Публикация фото/видео/аудио')) return;
    const title = document.getElementById('newPostTitle').value.trim();
    const desc = document.getElementById('newPostDesc').value.trim();

    if (!title) {
      showToast('⚠️ Заполните название публикации!');
      return;
    }

    if (!newPostFileBase64) {
      showToast('⚠️ В ленту можно публиковать только видео, фото и аудио файлы! Прикрепите файл.');
      return;
    }

    const currentUser = auth.currentUser;
    const authorName = currentUserProfile ? currentUserProfile.username : (currentUser ? (currentUser.displayName || 'User') : ('guest_' + Math.floor(Math.random() * 900 + 100)));
    const userAvatarUrl = currentUserProfile ? currentUserProfile.avatarUrl : '';
    const userIdVal = currentUser ? currentUser.uid : ('guest_' + Math.random());

    const fullText = `**${title}**\n${desc}`;

    showActionLoader('Публикация поста...');

    db.collection('messages').add({
      userId: userIdVal,
      author: authorName,
      avatarUrl: userAvatarUrl,
      text: fullText,
      image: newPostFileBase64,
      accessMode: newPostAccessMode,
      isExternalLink: newPostIsExternalLink,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      localTime: Date.now(),
      reactions: { '👍': 1 },
      pinned: false
    }).then(() => {
      hideActionLoader();
      document.getElementById('newPostTitle').value = '';
      document.getElementById('newPostDesc').value = '';
      newPostFileBase64 = null;
      newPostIsExternalLink = false;
      const ind = document.getElementById('newPostFileIndicator');
      if (ind) ind.style.display = 'none';
      showToast('✅ Медиа-пост успешно опубликован в ленту!');
      switchTab('photos');
    }).catch(err => {
      hideActionLoader();
      console.error(err);
      showToast('❌ Ошибка публикации поста');
    });
  }

  // Открыть модалку входа
  function openLoginModal() {
    profileDropdown.classList.remove('show');
    loginModal.classList.add('show');
    mountTelegramAuthWidget('tgAuthWrapLogin');
  }
  // Закрыть модалку входа
  function closeLoginModal() { loginModal.classList.remove('show'); }
  function openRegisterModal() {
    profileDropdown.classList.remove('show');
    registerModal.classList.add('show');
    mountTelegramAuthWidget('tgAuthWrapRegister');
    const regUsernameEl = document.getElementById('regUsername');
    if (regUsernameEl && !regUsernameEl.value && tgUser) {
      regUsernameEl.value = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || tgUser.username || '';
    }
  }
  // Закрыть модалку регистрации
  function closeRegisterModal() { registerModal.classList.remove('show'); }

  // Открыть модалку жалоб (для админов/модераторов)
  function openReportsModal() {
    profileDropdown.classList.remove('show');
    reportsModal.classList.add('show');
    fetchReports();
  }
  // Закрыть модалку жалоб
  function closeReportsModal() { reportsModal.classList.remove('show'); }

  // Открыть хаб админ-панели (единая кнопка со всеми инструментами админа)
  function openAdminPanelModal() {
    if (!isAdmin()) return;
    profileDropdown.classList.remove('show');
    adminPanelModal.classList.add('show');
  }
  function closeAdminPanelModal() { adminPanelModal.classList.remove('show'); }

  // Открыть панель выдачи подписок
  function openSubsAdminModal() {
    if (!isAdmin()) return;
    subsAdminModal.classList.add('show');
    const resultsBox = document.getElementById('subAdminResults');
    if (resultsBox) resultsBox.innerHTML = '<div style="color: var(--muted); font-size: 12.5px; text-align:center; padding: 8px;">Введите никнейм или email для поиска</div>';
  }
  function closeSubsAdminModal() { subsAdminModal.classList.remove('show'); }

  // Открыть панель банов и таймаутов
  function openBanAdminModal() {
    if (!isAdmin()) return;
    banAdminModal.classList.add('show');
    const resultsBox = document.getElementById('banAdminResults');
    if (resultsBox) resultsBox.innerHTML = '<div style="color: var(--muted); font-size: 12.5px; text-align:center; padding: 8px;">Введите никнейм или email для поиска</div>';
  }
  function closeBanAdminModal() { banAdminModal.classList.remove('show'); }

  // Открыть модалку топ-донатеров
  function openTopDonatorsModal() {
    profileDropdown.classList.remove('show');
    topDonatorsModal.classList.add('show');
    renderTopDonators();
  }
  // Закрыть модалку топ-донатеров
  function closeTopDonatorsModal() { topDonatorsModal.classList.remove('show'); }

  // Отрисовать список топ-донатеров
  function renderTopDonators() {
    const container = document.getElementById('topDonatorsListContainer');
    container.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 20px;">Загрузка...</div>';

    db.collection('topDonators').get().then(snapshot => {
      if (snapshot.empty) {
        container.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 20px;">Пока никто не в топе — станьте первым! 🚀</div>';
        return;
      }

      const totals = {};
      snapshot.forEach(doc => {
        const d = doc.data();
        const name = d.displayName || 'Аноним';
        totals[name] = (totals[name] || 0) + (Number(d.amount) || 0);
      });

      const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);

      container.innerHTML = '';
      sorted.forEach(([name, total], index) => {
        const row = document.createElement('div');
        row.className = 'donator-row';
        row.innerHTML = `
          <div class="donator-rank">${index < 3 ? ['🥇','🥈','🥉'][index] : (index + 1)}</div>
          <div class="donator-name">${escapeHtml(name)}</div>
          <div class="donator-amount">${total.toLocaleString('ru-RU')} ₽</div>
        `;
        container.appendChild(row);
      });
    }).catch(err => {
      console.error(err);
      container.innerHTML = '<div style="color: var(--danger); text-align: center; padding: 20px;">Ошибка загрузки топа</div>';
    });
  }

  // Открыть модалку истории активности пользователя
  function openActivityHistoryModal() {
    profileDropdown.classList.remove('show');
    activityHistoryModal.classList.add('show');
    renderActivityHistory();
  }
  // Закрыть модалку истории активности
  function closeActivityHistoryModal() { activityHistoryModal.classList.remove('show'); }

  // Открыть модалку редактирования профиля
  function openEditProfileModal() {
    profileDropdown.classList.remove('show');
    if (currentUserProfile) {
      document.getElementById('editAvatarUrl').value = currentUserProfile.avatarUrl || '';
      document.getElementById('editUsernameInput').value = currentUserProfile.username || '';
      document.getElementById('editBioInput').value = currentUserProfile.bio || '';
      document.getElementById('editTagsInput').value = currentUserProfile.tags || '';
      document.getElementById('editPhoneInput').value = currentUserProfile.phone || '';
      document.getElementById('editBirthdayInput').value = currentUserProfile.birthday || '';
      setupNickColorPicker(currentUserProfile);
    }
    editProfileModal.classList.add('show');
  }

  // Настроить выбор цвета никнейма в редакторе профиля
  function setupNickColorPicker(profile) {
    const section = document.getElementById('nickColorSection');
    const swatchesBox = document.getElementById('nickColorSwatches');
    const customInput = document.getElementById('nickColorCustomInput');
    const hint = document.getElementById('nickColorPlanHint');
    const isActive = profile.subTier && profile.subExpiresAt && profile.subExpiresAt > Date.now();
    if (!isActive) {
      section.style.display = 'none';
      return;
    }
    section.style.display = 'block';
    const isPremium = profile.subTier === 'premium';
    hint.textContent = isPremium ? '(Premium — любой цвет/градиент)' : '(Lite — выбор из 3 цветов)';
    const presets = ['#3b82f6', '#22c55e', '#f472b6'];
    swatchesBox.innerHTML = presets.map(c =>
      `<button type="button" class="sub-color-swatch ${profile.nickColor === c ? 'active' : ''}" style="background:${c};" onclick="pickNickColor('${c}')"></button>`
    ).join('');
    customInput.style.display = isPremium ? 'block' : 'none';
    customInput.value = (profile.nickColor && !presets.includes(profile.nickColor)) ? profile.nickColor : '';
  }

  window.pickNickColor = function(color) {
    document.querySelectorAll('#nickColorSwatches .sub-color-swatch').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('nickColorCustomInput').value = '';
    document.getElementById('nickColorCustomInput').dataset.picked = color;
  };
  // Закрыть модалку редактирования профиля
  function closeEditProfileModal() { editProfileModal.classList.remove('show'); }

  // Открыть модалку редактирования профиля из другой модалки
  function openEditProfileModalFromModal() {
    closeUserProfileModal();
    openEditProfileModal();
  }

  // Открыть системный диалог выбора файла аватара
  function triggerLocalAvatarUpload() {
    document.getElementById('localAvatarFileInput').click();
  }

  // Обработать выбор локального файла аватара
  function handleLocalAvatarFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const isGif = file.type === 'image/gif';
    const isPremiumActive = currentUserProfile && currentUserProfile.subTier === 'premium' && currentUserProfile.subExpiresAt && currentUserProfile.subExpiresAt > Date.now();
    if (isGif && !isPremiumActive) {
      showToast('👑 GIF-аватарки доступны только по Premium-подписке');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('⚠️ Файл слишком большой! Максимальный размер 2 МБ.');
      return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
      const base64Url = e.target.result;
      document.getElementById('editAvatarUrl').value = base64Url;
      const avatarBox = document.getElementById('modalUserAvatar');
      if (avatarBox) {
        avatarBox.innerHTML = `<img src="${base64Url}" alt="Avatar">`;
      }
      showToast('📸 Фото успешно загружено из галереи!');
    };
    reader.readAsDataURL(file);
  }

  let activeViewingUserId = null;
  let activeViewingUserName = null;

  // Открыть модалку профиля другого пользователя
  function openUserProfile(userId, fallbackName, fallbackAvatar) {
    activeViewingUserId = userId;
    activeViewingUserName = fallbackName;
    const avatarBox = document.getElementById('modalUserAvatar');
    const nameEl = document.getElementById('modalUserName');
    const bioEl = document.getElementById('modalUserBio');
    const phoneEl = document.getElementById('modalUserPhone');
    const birthdayEl = document.getElementById('modalUserBirthday');
    const regDateEl = document.getElementById('modalUserRegDate');
    const handleEl = document.getElementById('modalUserHandle');
    const msgsContainer = document.getElementById('modalUserMessages');
    const blockBtn = document.getElementById('modalBlockUserBtn');
    const friendBtn = document.getElementById('modalFriendActionBtn');
    const editBtnProfile = document.getElementById('modalEditBtnProfile');

    const phoneBlock = document.getElementById('tgPhoneBlock');
    const bioBlock = document.getElementById('tgBioBlock');
    const birthdayBlock = document.getElementById('tgBirthdayBlock');

    nameEl.textContent = fallbackName || 'Пользователь';
    handleEl.textContent = '@' + (fallbackName ? fallbackName.toLowerCase().replace(/\s+/g, '') : 'user');
    bioBlock.style.display = 'none';
    phoneBlock.style.display = 'none';
    birthdayBlock.style.display = 'none';
    regDateEl.textContent = '18 июля 2026';

    const currentAuthUser = auth.currentUser;
    const isMe = currentAuthUser && currentAuthUser.uid === userId;

    if (isMe) {
      editBtnProfile.style.display = 'flex';
      friendBtn.style.display = 'none';
      blockBtn.style.display = 'none';
    } else {
      editBtnProfile.style.display = 'none';
      friendBtn.style.display = 'flex';
      blockBtn.style.display = 'flex';
      const myFriends = currentUserProfile && currentUserProfile.friends ? currentUserProfile.friends : [];
      if (myFriends.includes(userId)) {
        friendBtn.innerHTML = `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> В друзьях`;
      } else {
        friendBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg> В друзья`;
      }
    }

    if (blockedUsers.includes(fallbackName)) {
      blockBtn.innerHTML = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Разблокировать`;
    } else {
      blockBtn.innerHTML = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg> Блокировать`;
    }

    if (fallbackAvatar) {
      avatarBox.innerHTML = `<img src="${escapeHtml(fallbackAvatar)}" alt="Avatar">`;
    } else {
      avatarBox.innerHTML = (fallbackName || 'U')[0].toUpperCase();
    }
    msgsContainer.innerHTML = '<div style="color: var(--muted); font-size: 13px; text-align: center; padding: 10px;">Загрузка...</div>';
    userProfileModal.classList.add('show');

    if (userId && !userId.startsWith('guest_')) {
      db.collection('users').doc(userId).get().then(doc => {
        if (doc.exists) {
          const data = doc.data();
          if (data.username) {
            nameEl.textContent = data.username;
            handleEl.textContent = '@' + data.username.toLowerCase().replace(/\s+/g, '');
          }
          if (data.bio) {
            bioEl.textContent = data.bio;
            bioBlock.style.display = 'flex';
          }
          if (data.phone) {
            phoneEl.textContent = data.phone;
            phoneBlock.style.display = 'flex';
          }
          if (data.birthday) {
            birthdayEl.textContent = data.birthday;
            birthdayBlock.style.display = 'flex';
          }
          if (data.createdAt) {
            const d = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
            const monthNames = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
            regDateEl.textContent = `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
          }
          if (data.avatarUrl) {
            avatarBox.innerHTML = `<img src="${escapeHtml(data.avatarUrl)}" alt="Avatar">`;
          } else {
            avatarBox.innerHTML = (data.username || fallbackName || 'U')[0].toUpperCase();
          }
        }
      }).catch(e => console.error(e));
    }

    const userMsgs = currentMessagesList.filter(m => m.userId === userId || m.author === fallbackName);
    msgsContainer.innerHTML = '';
    if (userMsgs.length === 0) {
      msgsContainer.innerHTML = '<div style="color: var(--muted); font-size: 13px; text-align: center; padding: 10px;">Нет сообщений</div>';
    } else {
      userMsgs.forEach(m => {
        const div = document.createElement('div');
        div.style.cssText = 'background: rgba(150,150,150,0.05); border: 1px solid var(--card-border); border-radius: 6px; padding: 8px 12px; font-size: 13px; color: var(--text);';
        div.textContent = m.text;
        msgsContainer.appendChild(div);
      });
    }
  }

  window.toggleFriendFromModal = function() {
    if (!activeViewingUserId) return;
    toggleFriend(activeViewingUserId);
    closeUserProfileModal();
  };

  window.toggleBlockCurrentUser = function() {
    if (!activeViewingUserName) return;
    const currentAuthUser = auth.currentUser;
    if (currentAuthUser && activeViewingUserId && currentAuthUser.uid === activeViewingUserId) {
      showToast('⚠️ Нельзя заблокировать самого себя');
      return;
    }
    const index = blockedUsers.indexOf(activeViewingUserName);
    if (index > -1) {
      blockedUsers.splice(index, 1);
      showToast(`🟢 Пользователь ${activeViewingUserName} разблокирован`);
    } else {
      blockedUsers.push(activeViewingUserName);
      showToast(`⛔ Пользователь ${activeViewingUserName} добавлен в черный список`);
    }
    localStorage.setItem('discoragen_blacklist', JSON.stringify(blockedUsers));
    closeUserProfileModal();
    sortAndRender();
  };

  // Закрыть модалку профиля пользователя
  function closeUserProfileModal() { userProfileModal.classList.remove('show'); }

  supportModal.addEventListener('click', (e) => { if (e.target === supportModal) closeSupportModal(); });
  donateModal.addEventListener('click', (e) => { if (e.target === donateModal) closeDonateModal(); });
  rulesModal.addEventListener('click', (e) => { if (e.target === rulesModal) closeRulesModal(); });
  suggestVideoModal.addEventListener('click', (e) => { if (e.target === suggestVideoModal) closeSuggestVideoModal(); });
  loginModal.addEventListener('click', (e) => { if (e.target === loginModal) closeLoginModal(); });
  registerModal.addEventListener('click', (e) => { if (e.target === registerModal) closeRegisterModal(); });
  editProfileModal.addEventListener('click', (e) => { if (e.target === editProfileModal) closeEditProfileModal(); });
  userProfileModal.addEventListener('click', (e) => { if (e.target === userProfileModal) closeUserProfileModal(); });
  reportsModal.addEventListener('click', (e) => { if (e.target === reportsModal) closeReportsModal(); });
  adminPanelModal.addEventListener('click', (e) => { if (e.target === adminPanelModal) closeAdminPanelModal(); });
  subsAdminModal.addEventListener('click', (e) => { if (e.target === subsAdminModal) closeSubsAdminModal(); });
  banAdminModal.addEventListener('click', (e) => { if (e.target === banAdminModal) closeBanAdminModal(); });
  topDonatorsModal.addEventListener('click', (e) => { if (e.target === topDonatorsModal) closeTopDonatorsModal(); });
  activityHistoryModal.addEventListener('click', (e) => { if (e.target === activityHistoryModal) closeActivityHistoryModal(); });
  changePasswordModal.addEventListener('click', (e) => { if (e.target === changePasswordModal) closeChangePasswordModal(); });
  loginLogsModal.addEventListener('click', (e) => { if (e.target === loginLogsModal) closeLoginLogsModal(); });

  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const sunIcon = document.getElementById('sunIcon');
  const moonIcon = document.getElementById('moonIcon');

  // Переключить тему оформления (светлая/тёмная)
  function setTheme(isLight) {
    if (isLight) {
      document.body.classList.add('light-theme');
      sunIcon.style.display = 'block';
      moonIcon.style.display = 'none';
      localStorage.setItem('discoragen_theme', 'light');
    } else {
      document.body.classList.remove('light-theme');
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'block';
      localStorage.setItem('discoragen_theme', 'dark');
    }
  }

  if (localStorage.getItem('discoragen_theme') === 'light') setTheme(true);

  themeToggleBtn.addEventListener('click', () => {
    setTheme(!document.body.classList.contains('light-theme'));
  });

  const firebaseConfig = {
    apiKey: "AIzaSyDcgAxaEm0rKEbfL597920nX4fqgyD3BdE",
    authDomain: "guestbook-site-5b1ab.firebaseapp.com",
    projectId: "guestbook-site-5b1ab",
    storageBucket: "guestbook-site-5b1ab.firebasestorage.app",
    messagingSenderId: "593355741478",
    appId: "1:593355741478:web:472142384f1347cbabc9e7"
  };
  firebase.initializeApp(firebaseConfig);
  let db = firebase.firestore();
  const primaryDb = db;

  // Включаем офлайн-кэш Firestore — уже загруженные ранее сообщения/видео
  // будут показываться мгновенно из локального кэша, даже при плохом/нестабильном
  // соединении (например, при включенном VPN), а актуализация произойдет,
  // когда соединение восстановится.
  db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
    if (err.code === 'failed-precondition') {
      // Сайт открыт в нескольких вкладках одновременно — кэш можно включить только в одной
      console.warn('Firestore persistence: открыто несколько вкладок, офлайн-кэш отключен');
    } else if (err.code === 'unimplemented') {
      // Браузер не поддерживает нужные технологии (редкие/старые браузеры)
      console.warn('Firestore persistence: браузер не поддерживает офлайн-кэш');
    }
  });
  let auth = firebase.auth();
  const primaryAuth = auth;

  // ===================== ВХОД / РЕГИСТРАЦИЯ ЧЕРЕЗ TELEGRAM + МУЛЬТИАККАУНТЫ =====================
  // Работает в ОБЫЧНОМ браузере (не путать с Mini App выше). Позволяет войти/зарегистрироваться
  // одним кликом через Telegram вместо email+пароля, и хранить несколько Telegram-аккаунтов
  // на одном устройстве с переключением между ними без потери данных.
  //
  // Как это устроено технически: у сайта нет своего сервера для проверки подписи Telegram,
  // поэтому у КАЖДОГО Telegram-аккаунта — свой отдельный экземпляр Firebase-приложения
  // (firebase.initializeApp с уникальным именем "tg_<telegramId>") со своей анонимной
  // Firebase-сессией. Это позволяет:
  //   1) при повторном входе тем же Telegram-аккаунтом — переиспользовать ТУ ЖЕ сессию
  //      (а не плодить новые анонимные аккаунты при каждом перезаходе — именно из-за этого
  //      раньше рос счётчик "всего пользователей");
  //   2) хранить несколько разных Telegram-аккаунтов одновременно и мгновенно переключаться
  //      между ними без повторного входа через Telegram;
  //   3) удалять аккаунт целиком по кнопке (Firestore-профиль + сама Firebase-сессия).
  // Ограничение: аккаунты привязаны к ЭТОМУ браузеру/устройству — на другом устройстве это
  // будет уже другой набор аккаунтов. Полная синхронизация между устройствами потребовала бы
  // сервера, проверяющего подпись Telegram (Cloud Function + Admin SDK).
  const TELEGRAM_AUTH_BOT_USERNAME = 'ObshazhnyaApp_Bot';
  const TG_ACCOUNTS_KEY = 'tgAccountsList';
  const TG_ACTIVE_KEY = 'tgActiveTelegramId';

  // Загрузить список сохранённых Telegram-аккаунтов из localStorage
  function loadTgAccounts() {
    try { return JSON.parse(localStorage.getItem(TG_ACCOUNTS_KEY) || '[]'); } catch (e) { return []; }
  }
  // Сохранить список Telegram-аккаунтов в localStorage
  function saveTgAccounts(list) { localStorage.setItem(TG_ACCOUNTS_KEY, JSON.stringify(list)); }
  function upsertTgAccountMeta(meta) {
    const list = loadTgAccounts();
    const idx = list.findIndex(a => String(a.telegramId) === String(meta.telegramId));
    if (idx >= 0) list[idx] = Object.assign({}, list[idx], meta); else list.push(meta);
    saveTgAccounts(list);
  }
  // Удалить Telegram-аккаунт из сохранённого списка
  function removeTgAccountMeta(telegramId) {
    saveTgAccounts(loadTgAccounts().filter(a => String(a.telegramId) !== String(telegramId)));
  }

  // Получить (или создать) отдельный экземпляр Firebase-приложения для Telegram-аккаунта
  function getTgApp(telegramId) {
    const appName = 'tg_' + telegramId;
    const existing = firebase.apps.find(a => a.name === appName);
    return existing || firebase.initializeApp(firebaseConfig, appName);
  }

  // Подключить виджет входа через Telegram в указанный контейнер
  function mountTelegramAuthWidget(containerId) {
    const wrap = document.getElementById(containerId);
    if (!wrap || wrap.dataset.mounted) return;
    wrap.dataset.mounted = '1';
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', TELEGRAM_AUTH_BOT_USERNAME);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '10');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    wrap.appendChild(script);
  }

  // authEpoch защищает от гонки: если пока грузился профиль пользователь успел
  // переключиться на другой аккаунт, устаревший колбэк просто ничего не сделает.
  let authEpoch = 0;

  // Обработать успешную авторизацию пользователя (основную или через Telegram)
  function handleAuthUser(user) {
    const myEpoch = authEpoch;
    startBanWatcher(user);
    if (user) {
      db.collection('users').doc(user.uid).get().then(doc => {
        if (myEpoch !== authEpoch) return;
        currentUserProfile = doc.exists ? doc.data() : { username: user.displayName || 'User', avatarUrl: '', bio: '', tags: '', phone: '', birthday: '', friends: [] };
        updateDropdownUI(user, currentUserProfile);
        sortAndRender();
        renderVideosGrid();
        renderFriendsList();
        updateGlobalStatistics();
        initialAuthResolved = true;
        tryHideInitialLoader();
      }).catch(() => {
        if (myEpoch !== authEpoch) return;
        currentUserProfile = { username: user.displayName || 'User', avatarUrl: '', bio: '', tags: '', phone: '', birthday: '', friends: [] };
        updateDropdownUI(user, currentUserProfile);
        sortAndRender();
        renderVideosGrid();
        renderFriendsList();
        initialAuthResolved = true;
        tryHideInitialLoader();
      });
    } else {
      currentUserProfile = null;
      updateDropdownUI(null, null);
      sortAndRender();
      renderVideosGrid();
      renderFriendsList();
      updateGlobalStatistics();
      initialAuthResolved = true;
      tryHideInitialLoader();
    }
  }

  // Переключение на конкретный Telegram-аккаунт (или восстановление его сессии при загрузке).
  // cb(user) вызывается один раз, когда состояние авторизации этого аккаунта известно.
  function switchToTelegramAccount(telegramId, cb) {
    authEpoch++;
    const app = getTgApp(telegramId);
    auth = app.auth();
    db = app.firestore();
    localStorage.setItem(TG_ACTIVE_KEY, String(telegramId));
    renderTgAccountSwitcher();
    if (auth.currentUser) {
      handleAuthUser(auth.currentUser);
      if (cb) cb(auth.currentUser);
    } else {
      const authRef = auth;
      const unsub = auth.onAuthStateChanged((u) => {
        unsub();
        if (auth !== authRef) return; // уже переключились на что-то другое, пока ждали
        handleAuthUser(u);
        if (cb) cb(u);
      });
    }
  }

  // Возврат к обычному режиму (гость или email/пароль-аккаунт основного приложения).
  // Сама Telegram-сессия НЕ уничтожается — просто перестаёт быть активной,
  // поэтому вернуться к ней потом можно без повторного входа через Telegram.
  function switchToDefaultAccount() {
    authEpoch++;
    auth = primaryAuth;
    db = primaryDb;
    localStorage.removeItem(TG_ACTIVE_KEY);
    renderTgAccountSwitcher();
    handleAuthUser(auth.currentUser);
  }

  // Вызывается автоматически виджетом Telegram после успешного входа пользователя.
  window.onTelegramAuth = function (telegramUser) {
    const displayName = telegramUser.username ? '@' + telegramUser.username : telegramUser.first_name;

    switchToTelegramAccount(telegramUser.id, (user) => {
      // Завершить создание/обновление профиля пользователя после входа через Telegram
      function finalize(uid) {
        db.collection('users').doc(uid).get().then((doc) => {
          if (doc.exists) {
            return db.collection('users').doc(uid).update({
              username: displayName,
              avatarUrl: telegramUser.photo_url || doc.data().avatarUrl || '',
              telegramId: telegramUser.id
            });
          }
          return db.collection('users').doc(uid).set({
            username: displayName,
            email: '',
            avatarUrl: telegramUser.photo_url || '',
            bio: '',
            tags: '',
            phone: '',
            birthday: '',
            telegramId: telegramUser.id,
            friends: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }).then(() => {
          upsertTgAccountMeta({ telegramId: telegramUser.id, username: displayName, avatarUrl: telegramUser.photo_url || '' });
          recordLoginLog(uid);
          closeLoginModal();
          closeRegisterModal();
          renderTgAccountSwitcher();
          showToast(`✅ Вы вошли как ${displayName}`);
        }).catch((err) => {
          console.error(err);
          showToast('❌ Ошибка входа через Telegram: ' + err.message);
        });
      }

      if (user) {
        finalize(user.uid);
      } else {
        auth.signInAnonymously()
          .then((cred) => finalize(cred.user.uid))
          .catch((err) => {
            console.error(err);
            showToast('❌ Не удалось войти через Telegram. Проверь, включён ли Anonymous Auth в Firebase.');
          });
      }
    });
  };

  // Полностью удаляет Telegram-аккаунт с этого устройства: Firestore-профиль + саму сессию.
  window.deleteTgAccount = function (telegramId) {
    if (!confirm('Удалить этот Telegram-аккаунт вместе с профилем на этом устройстве? Это необратимо.')) return;
    const app = getTgApp(telegramId);
    const targetAuth = app.auth();
    const targetDb = app.firestore();

    // Выполнить удаление Telegram-аккаунта (профиль + сессия)
    function doDelete(uid) {
      targetDb.collection('users').doc(uid).delete().catch(() => {}).then(() => {
        return targetAuth.currentUser ? targetAuth.currentUser.delete() : Promise.resolve();
      }).then(() => {
        removeTgAccountMeta(telegramId);
        if (localStorage.getItem(TG_ACTIVE_KEY) === String(telegramId)) {
          switchToDefaultAccount();
        } else {
          renderTgAccountSwitcher();
        }
        showToast('🗑️ Telegram-аккаунт удалён с этого устройства');
      }).catch((err) => {
        console.error(err);
        showToast('❌ Не удалось удалить аккаунт: ' + err.message);
      });
    }

    if (targetAuth.currentUser) {
      doDelete(targetAuth.currentUser.uid);
    } else {
      const unsub = targetAuth.onAuthStateChanged((u) => {
        unsub();
        if (u) {
          doDelete(u.uid);
        } else {
          removeTgAccountMeta(telegramId);
          renderTgAccountSwitcher();
          showToast('🗑️ Аккаунт удалён из списка');
        }
      });
    }
  };

  // Примечание: switchToTelegramAccount и deleteTgAccount объявлены как обычные function
  // верхнего уровня — в classic-скрипте (не module) они уже автоматически доступны глобально
  // как window.switchToTelegramAccount / window.deleteTgAccount, поэтому вызывать их из
  // onclick="..." в HTML можно напрямую, без отдельного window.-обёртки (которая раньше
  // здесь была и по ошибке вызывала бесконечную рекурсию, ломая вход).

  // Список сохранённых Telegram-аккаунтов в выпадающем меню профиля
  function renderTgAccountSwitcher() {
    const section = document.getElementById('tgAccountSwitcherSection');
    if (!section) return;
    const accounts = loadTgAccounts();
    const activeId = localStorage.getItem(TG_ACTIVE_KEY);
    const isOnTelegram = !!activeId;
    const primaryUser = primaryAuth.currentUser;

    // Показываем переключатель, если есть TG-аккаунты ИЛИ есть email-аккаунт
    if (!accounts.length && !primaryUser) {
      section.innerHTML = '';
      return;
    }

    let html = '<div class="tg-account-switch-label">Аккаунты на этом устройстве</div>';

    // Email / основной аккаунт (primary Firebase)
    if (primaryUser) {
      const emailName = primaryUser.displayName || primaryUser.email || 'Email-аккаунт';
      const isEmailActive = !isOnTelegram;
      const emailInitial = (emailName || 'E').charAt(0).toUpperCase();
      html += `
        <div class="tg-account-item ${isEmailActive ? 'active' : ''}" onclick="${isEmailActive ? '' : 'switchToDefaultAccount()'}">
          <div class="tg-account-fallback" style="background: #16a34a;">${escapeHtml(emailInitial)}</div>
          <span class="tg-account-item-name">${escapeHtml(emailName)}${isEmailActive ? ' (активен)' : ''} · email</span>
        </div>`;
    } else if (accounts.length) {
      // Нет email-сессии, но есть TG — предлагаем войти в email
      html += `
        <div class="tg-account-add-item" onclick="profileDropdown.classList.remove('show'); switchToDefaultAccount(); openLoginModal();">
          + Войти в email-аккаунт
        </div>`;
    }

    // Telegram-аккаунты
    if (accounts.length) {
      html += '<div class="tg-account-switch-label" style="margin-top:6px;">Telegram</div>';
      accounts.forEach((acc) => {
        const isActive = String(acc.telegramId) === String(activeId);
        const safeName = escapeHtml(acc.username || 'Telegram');
        const avatarHtml = acc.avatarUrl
          ? `<img src="${escapeHtml(acc.avatarUrl)}" alt="">`
          : `<div class="tg-account-fallback">${escapeHtml((acc.username || '?').replace('@', '').charAt(0).toUpperCase())}</div>`;
        html += `
          <div class="tg-account-item ${isActive ? 'active' : ''}" onclick="${isActive ? '' : `switchToTelegramAccount('${acc.telegramId}')`}">
            ${avatarHtml}
            <span class="tg-account-item-name">${safeName}${isActive ? ' (активен)' : ''}</span>
            <button type="button" class="tg-account-item-remove" onclick="event.stopPropagation(); deleteTgAccount('${acc.telegramId}')" title="Удалить аккаунт">✕</button>
          </div>`;
      });
      html += `<div class="tg-account-add-item" onclick="profileDropdown.classList.remove('show'); openLoginModal();">+ Добавить ещё Telegram-аккаунт</div>`;
    }

    section.innerHTML = html;
  }

  // Восстанавливаем активный Telegram-аккаунт при загрузке страницы, если он был выбран ранее
  const savedActiveTelegramId = localStorage.getItem(TG_ACTIVE_KEY);
  if (savedActiveTelegramId) {
    switchToTelegramAccount(savedActiveTelegramId);
  }

  // Основная (email/пароль) сессия — обрабатываем её изменения, но только пока
  // активен именно основной аккаунт (не Telegram-аккаунт).
  primaryAuth.onAuthStateChanged((user) => {
    // Всегда обновляем список аккаунтов (чтобы email-аккаунт появился в переключателе)
    renderTgAccountSwitcher();
    if (auth !== primaryAuth) return;
    handleAuthUser(user);
  });
  // ===================== /ВХОД ЧЕРЕЗ TELEGRAM =====================


  // ===================== TELEGRAM MINI APP =====================
  // Работает только когда сайт открыт внутри Telegram (кнопка меню/Web App у бота).
  // При обычном открытии в браузере window.Telegram будет отсутствовать —
  // весь блок ниже просто ничего не сделает и сайт будет работать как обычный сайт.
  const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  let tgUser = null;

  if (tg) {
    tg.ready();
    tg.expand(); // разворачиваем на весь экран, а не половину
    if (typeof tg.disableVerticalSwipes === 'function') {
      tg.disableVerticalSwipes(); // чтобы свайп вниз внутри страницы не закрывал приложение
    }
    if (typeof tg.setHeaderColor === 'function') {
      try { tg.setHeaderColor('#18191c'); } catch (e) {}
    }
    if (typeof tg.setBackgroundColor === 'function') {
      try { tg.setBackgroundColor('#18191c'); } catch (e) {}
    }

    // Данные пользователя Telegram (имя, ник, фото), доступные сразу без запроса.
    // ВАЖНО: это НЕ проверенные данные — их можно подделать на клиенте, поэтому
    // используем их только для удобства (автозаполнение), а не как замену входу.
    tgUser = tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user : null;

    // Кнопка "Назад" Telegram вместо обычной кнопки закрытия модалок.
    tg.BackButton.onClick(() => {
      const openModal = document.querySelector('.modal-overlay.show');
      if (openModal) {
        openModal.classList.remove('show');
        updateTelegramBackButton();
      } else {
        tg.close();
      }
    });

    // Следим за открытием/закрытием модалок, чтобы показывать/скрывать BackButton
    const modalObserver = new MutationObserver(updateTelegramBackButton);
    document.querySelectorAll('.modal-overlay').forEach((el) => {
      modalObserver.observe(el, { attributes: true, attributeFilter: ['class'] });
    });
  }

  // Обновить видимость кнопки "Назад" Telegram Mini App в зависимости от открытых модалок
  function updateTelegramBackButton() {
    if (!tg) return;
    const anyOpen = document.querySelector('.modal-overlay.show');
    if (anyOpen) {
      tg.BackButton.show();
    } else {
      tg.BackButton.hide();
    }
  }

  let currentMessagesList = [];
  let currentVideosList = [];
  let currentUserProfile = null;
  let currentVideoFilter = 'Рекомендуем';
  let selectedSuggestCategory = 'Смешные';
  let suggestVideoId = null;
  let suggestVideoTitle = '';

  const errorToast = document.getElementById('errorToast');
  const statTotalUsersEl = document.getElementById('statTotalUsers');
  const statOnlineTodayEl = document.getElementById('statOnlineToday');
  const statCommentsCountEl = document.getElementById('statCommentsCount');
  const statVideosCountEl = document.getElementById('statVideosCount');
  const statGamesCountEl = document.getElementById('statGamesCount');
  const statViewsCountEl = document.getElementById('statViewsCount');

  const gbMessagesContainer = document.getElementById('gbMessages');
  const gbInput = document.getElementById('gbInput');
  const gbSendBtn = document.getElementById('gbSendBtn');
  const sortSelect = document.getElementById('sortSelect');

  const savedDraft = localStorage.getItem('discoragen_gb_draft');
  if (savedDraft && gbInput) {
    gbInput.value = savedDraft;
  }
  if (gbInput) {
    gbInput.addEventListener('input', () => {
      localStorage.setItem('discoragen_gb_draft', gbInput.value);
    });
    gbInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendGuestbookMessage();
    });
  }

  if (gbSendBtn) {
    gbSendBtn.addEventListener('click', sendGuestbookMessage);
  }

  // Отправить сообщение в гостевую книгу
  function sendGuestbookMessage() {
    const user = auth.currentUser;
    if (!user || !currentUserProfile) {
      showToast('🔒 Чтобы писать в гостевой книге, нужно зарегистрироваться или войти в аккаунт');
      openLoginModal();
      return;
    }

    if (blockedByRestriction('guestbook', 'Написание сообщений в гостевой книге')) return;

    const text = gbInput.value.trim();
    if (!text) {
      showToast('⚠️ Введите текст сообщения');
      return;
    }

    gbSendBtn.disabled = true;

    db.collection('messages').add({
      userId: user.uid,
      author: currentUserProfile.username,
      avatarUrl: currentUserProfile.avatarUrl || '',
      text: text,
      image: null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      localTime: Date.now(),
      reactions: {},
      pinned: false
    }).then(() => {
      gbInput.value = '';
      localStorage.removeItem('discoragen_gb_draft');
      gbSendBtn.disabled = false;
    }).catch(err => {
      console.error(err);
      showToast('❌ Ошибка отправки сообщения');
      gbSendBtn.disabled = false;
    });
  }

  /* ===== КОНФЕТТИ ПРИ УСПЕШНОМ ИЗМЕНЕНИИ ПРОФИЛЯ ===== */
  function showConfettiCelebration() {
    const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#14b8a6'];
    const container = document.createElement('div');
    container.id = 'confettiContainer';
    document.body.appendChild(container);

    const pieceCount = 90;
    for (let i = 0; i < pieceCount; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = 6 + Math.random() * 6;
      const isCircle = Math.random() > 0.5;
      piece.style.left = (Math.random() * 100) + 'vw';
      piece.style.width = size + 'px';
      piece.style.height = (isCircle ? size : size * 0.4) + 'px';
      piece.style.background = color;
      piece.style.borderRadius = isCircle ? '50%' : '2px';
      piece.style.setProperty('--drift', (Math.random() * 200 - 100) + 'px');
      piece.style.setProperty('--spin', (Math.random() * 720 - 360) + 'deg');
      const duration = 2.2 + Math.random() * 1.6;
      const delay = Math.random() * 0.4;
      piece.style.animationDuration = duration + 's';
      piece.style.animationDelay = delay + 's';
      container.appendChild(piece);
    }

    setTimeout(() => { container.remove(); }, 4200);
  }

  let toastTimeout;
  // Показать всплывающее уведомление (тост)
  function showToast(message) {
    clearTimeout(toastTimeout);
    errorToast.textContent = message;
    errorToast.classList.add('show');
    toastTimeout = setTimeout(() => errorToast.classList.remove('show'), 3500);
  }

  /* ===== ОВЕРЛЕЙ ЗАГРУЗКИ ДЕЙСТВИЯ (отправка поста / видео) ===== */
  const actionLoaderOverlay = document.getElementById('actionLoaderOverlay');
  const actionLoaderText = document.getElementById('actionLoaderText');
  // Показать оверлей загрузки при выполнении действия
  function showActionLoader(text) {
    if (actionLoaderText) actionLoaderText.textContent = text || 'Загрузка...';
    if (actionLoaderOverlay) actionLoaderOverlay.classList.add('show');
  }
  // Скрыть оверлей загрузки действия
  function hideActionLoader() {
    if (actionLoaderOverlay) actionLoaderOverlay.classList.remove('show');
  }

  /* ===== ЭКРАН ПЕРВОНАЧАЛЬНОЙ ЗАГРУЗКИ САЙТА ===== */
  const initialLoaderOverlay = document.getElementById('initialLoaderOverlay');
  const initialLoaderText = document.getElementById('initialLoaderText');
  const initialLoaderSpinner = document.getElementById('initialLoaderSpinner');
  const initialLoaderRetryBtn = document.getElementById('initialLoaderRetryBtn');
  let initialMessagesLoaded = false;
  let initialVideosLoaded = false;
  let initialAuthResolved = false;
  let initialLoaderHidden = false;

  // Попробовать скрыть начальный экран загрузки, если все данные готовы
  function tryHideInitialLoader() {
    if (initialLoaderHidden) return;
    if (initialMessagesLoaded && initialVideosLoaded && initialAuthResolved && initialLoaderOverlay) {
      initialLoaderHidden = true;
      clearTimeout(slowLoadHintTimeout);
      clearTimeout(stuckLoadTimeout);
      initialLoaderOverlay.classList.add('hide');
      applyStartTabFromUrl();
    }
  }

  // Если загрузка идет дольше обычного (например, из-за VPN или плохой сети),
  // подбадриваем пользователя вместо того, чтобы он думал, что сайт завис
  const slowLoadHintTimeout = setTimeout(() => {
    if (!initialLoaderHidden && initialLoaderText) {
      initialLoaderText.textContent = 'Загрузка занимает больше времени, чем обычно... Проверьте соединение (VPN может замедлять загрузку)';
    }
  }, 6000);

  // Если данные так и не пришли за долгое время — НЕ впускаем пользователя на непрогруженный
  // сайт молча, а честно показываем, что не получилось, и даем кнопку "Обновить страницу"
  const stuckLoadTimeout = setTimeout(() => {
    if (!initialLoaderHidden) {
      if (initialLoaderSpinner) initialLoaderSpinner.style.display = 'none';
      if (initialLoaderText) initialLoaderText.textContent = '⚠️ Не удалось загрузить сайт. Проверьте интернет-соединение или VPN и попробуйте снова.';
      if (initialLoaderRetryBtn) initialLoaderRetryBtn.style.display = 'inline-block';
    }
  }, 20000);

  // Проверить, является ли текущий пользователь администратором
  function isAdmin() {
    const user = auth.currentUser;
    return user && user.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
  }

  window.deleteMessage = function(id) {
    if (!isAdmin()) {
      showToast('❌ Недостаточно прав!');
      return;
    }
    if (confirm('Удалить это сообщение / пост?')) {
      db.collection('messages').doc(id).delete().then(() => {
        showToast('🗑️ Успешно удалено');
        closeViewPostModal();
      }).catch(err => {
        showToast('❌ Ошибка удаления');
      });
    }
  };

  window.reportMessage = function(id) {
    db.collection('reports').add({
      messageId: id,
      reporterId: auth.currentUser && auth.currentUser.displayName ? auth.currentUser.displayName : 'Гость',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      showToast('🚨 Жалоба успешно отправлена модераторам!');
    }).catch(err => {
      showToast('❌ Ошибка отправки жалобы');
    });
  };

  let currentReportsList = [];

  // Загрузить список жалоб на сообщения
  function fetchReports() {
    const container = document.getElementById('reportsListContainer');
    const bulkActions = document.getElementById('reportsBulkActions');
    container.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 20px;">Загрузка жалоб...</div>';
    if (bulkActions) bulkActions.style.display = 'none';
    currentReportsList = [];

    db.collection('reports').get().then(snapshot => {
      container.innerHTML = '';
      if (snapshot.empty) {
        container.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 20px;">Нет активных жалоб 👍</div>';
        return;
      }

      let hasMessageReports = false;

      snapshot.forEach(doc => {
        const report = doc.data();
        const reportId = doc.id;

        if (report.type === 'donation') {
          const div = document.createElement('div');
          div.style.cssText = 'background: rgba(250, 204, 21, 0.06); border: 1px solid rgba(250, 204, 21, 0.3); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 8px;';
          div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--muted);">
              <span>💛 Заявка на донат</span>
              <span>От: <strong style="color: var(--accent);">${escapeHtml(report.reporterId)}</strong></span>
            </div>
            <div style="background: var(--input-bg); padding: 8px 12px; border-radius: 6px; font-size: 13.5px; color: var(--text);">
              Никнейм для топа: <b>${escapeHtml(report.displayName)}</b><br>
              Заявленная сумма: <b>${escapeHtml(String(report.amount))} ₽</b>
            </div>
            <div style="font-size: 11px; color: var(--muted);">Проверьте поступление на счёт вручную перед подтверждением.</div>
            <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px;">
              <button class="reaction-btn" style="color: var(--danger); border-color: rgba(239,68,68,0.3);" onclick="dismissReport('${reportId}')">❌ Отклонить</button>
              <button class="reaction-btn" style="color: #16a34a; border-color: rgba(22,163,74,0.3);" onclick="approveDonation('${reportId}', '${escapeHtml(report.displayName).replace(/'/g, "\\'")}', ${Number(report.amount) || 0})">✅ Подтвердить и добавить в топ</button>
            </div>
          `;
          container.appendChild(div);
          return;
        }

        if (report.type === 'subscription') {
          const isPremiumReq = report.tier === 'premium';
          const div = document.createElement('div');
          div.style.cssText = `background: rgba(250, 204, 21, 0.06); border: 1px solid ${isPremiumReq ? 'rgba(250,204,21,0.45)' : 'rgba(59,130,246,0.35)'}; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 8px;`;
          div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--muted);">
              <span>${isPremiumReq ? '👑 Заявка на PREMIUM' : '✓ Заявка на LITE'}</span>
              <span>От: <strong style="color: var(--accent);">${escapeHtml(report.username || 'Пользователь')}</strong></span>
            </div>
            <div style="background: var(--input-bg); padding: 8px 12px; border-radius: 6px; font-size: 13.5px; color: var(--text);">
              Тариф: <b>${isPremiumReq ? 'Premium' : 'Lite'}</b><br>
              Заявленная сумма: <b>${escapeHtml(String(report.amount))} ₽</b>
            </div>
            <div style="font-size: 11px; color: var(--muted);">Проверьте поступление на счёт вручную перед подтверждением.</div>
            <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px;">
              <button class="reaction-btn" style="color: var(--danger); border-color: rgba(239,68,68,0.3);" onclick="dismissReport('${reportId}')">❌ Отклонить</button>
              <button class="reaction-btn" style="color: #16a34a; border-color: rgba(22,163,74,0.3);" onclick="approveSubscription('${reportId}', '${report.userId}', '${report.tier}')">✅ Подтвердить и активировать</button>
            </div>
          `;
          container.appendChild(div);
          return;
        }

        hasMessageReports = true;
        currentReportsList.push({ reportId, messageId: report.messageId });
        db.collection('messages').doc(report.messageId).get().then(msgDoc => {
          const msgData = msgDoc.exists ? msgDoc.data() : { text: 'Сообщение было удалено', author: 'Неизвестно' };
          const div = document.createElement('div');
          div.style.cssText = 'background: rgba(150,150,150,0.05); border: 1px solid var(--card-border); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 8px;';
          div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--muted);">
              <span>Автор: <strong style="color: var(--text);">${escapeHtml(msgData.author)}</strong></span>
              <span>Репорт от: <strong style="color: var(--accent);">${escapeHtml(report.reporterId)}</strong></span>
            </div>
            <div style="background: var(--input-bg); padding: 8px 12px; border-radius: 6px; font-size: 13.5px; color: var(--text);">
              "${escapeHtml(msgData.text)}"
            </div>
            <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px;">
              <button class="reaction-btn" style="color: var(--danger); border-color: rgba(239,68,68,0.3);" onclick="deleteReportedMessage('${reportId}', '${report.messageId}')">🗑️ Удалить</button>
              <button class="reaction-btn" onclick="dismissReport('${reportId}')">✅ Закрыть жалобу</button>
            </div>
          `;
          container.appendChild(div);
        });
      });

      if (bulkActions) bulkActions.style.display = hasMessageReports ? 'flex' : 'none';
    }).catch(err => {
      container.innerHTML = '<div style="color: var(--danger); text-align: center; padding: 20px;">Ошибка загрузки жалоб</div>';
    });
  }

  window.approveDonation = function(reportId, displayName, amount) {
    if (!isAdmin()) return;
    if (!confirm(`Вы проверили в банке — деньги от "${displayName}" (${amount} ₽) действительно поступили?`)) return;

    db.collection('topDonators').add({
      displayName: displayName,
      amount: amount,
      approvedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      return db.collection('reports').doc(reportId).delete();
    }).then(() => {
      showToast('🏆 Донат подтверждён и добавлен в топ-донатеров!');
      fetchReports();
    }).catch(err => {
      console.error(err);
      showToast('❌ Ошибка подтверждения доната');
    });
  };

  window.adminGiftFromSubModal = function(tier) {
    if (!isAdmin()) return;
    const query = prompt(`Никнейм или email пользователя, которому подарить тариф "${tier === 'premium' ? 'Premium' : 'Lite'}":`);
    if (!query) return;
    const q = query.trim().toLowerCase();
    if (!q) return;

    primaryDb.collection('users').get().then(snapshot => {
      let matched = [];
      snapshot.forEach(doc => {
        const u = doc.data();
        if ((u.username || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)) {
          matched.push({ id: doc.id, ...u });
        }
      });

      if (matched.length === 0) {
        showToast('❌ Пользователь не найден');
        return;
      }
      if (matched.length > 1) {
        showToast(`⚠️ Найдено ${matched.length} пользователей — уточните запрос или используйте панель жалоб`);
        return;
      }

      const target = matched[0];
      if (!confirm(`Подарить тариф "${tier}" пользователю "${target.username || target.email}" на 30 дней?`)) return;

      const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
      primaryDb.collection('users').doc(target.id).update({
        subTier: tier,
        subExpiresAt: expiresAt
      }).then(() => {
        showToast(`🎁 Тариф "${tier}" подарен пользователю ${target.username || target.email}!`);
      }).catch(err => {
        console.error(err);
        showToast('❌ Ошибка выдачи подписки');
      });
    }).catch(err => {
      console.error(err);
      showToast('❌ Ошибка поиска пользователя');
    });
  };

  window.adminSearchSubUsers = function() {
    if (!isAdmin()) return;
    const resultsBox = document.getElementById('subAdminResults');
    const query = document.getElementById('subAdminSearchInput').value.trim().toLowerCase();
    if (!query) {
      resultsBox.innerHTML = '<div style="color: var(--muted); font-size: 12.5px; text-align:center; padding: 8px;">Введите никнейм или email для поиска</div>';
      return;
    }
    resultsBox.innerHTML = '<div style="color: var(--muted); font-size: 12.5px; text-align:center; padding: 8px;">Поиск...</div>';

    primaryDb.collection('users').get().then(snapshot => {
      let matched = [];
      snapshot.forEach(doc => {
        const u = doc.data();
        if ((u.username || '').toLowerCase().includes(query) || (u.email || '').toLowerCase().includes(query)) {
          matched.push({ id: doc.id, ...u });
        }
      });

      if (matched.length === 0) {
        resultsBox.innerHTML = '<div style="color: var(--muted); font-size: 12.5px; text-align:center; padding: 8px;">Никого не найдено</div>';
        return;
      }

      resultsBox.innerHTML = '';
      matched.slice(0, 15).forEach(u => {
        const activeTier = (u.subTier && u.subExpiresAt && u.subExpiresAt > Date.now()) ? u.subTier : null;
        const statusStr = activeTier === 'premium' ? '👑 Premium' : (activeTier === 'lite' ? '✓ Lite' : 'Нет подписки');
        const row = document.createElement('div');
        row.style.cssText = 'background: var(--input-bg); border: 1px solid var(--card-border); border-radius: 8px; padding: 10px; display:flex; flex-direction:column; gap:6px;';
        row.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; font-size: 13px;">
            <strong>${escapeHtml(u.username || u.email || u.id)}</strong>
            <span style="color: var(--muted); font-size: 11.5px;">${statusStr}</span>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="reaction-btn" style="font-size:11.5px; color:#3b82f6; border-color: rgba(59,130,246,0.3);" onclick="adminGrantSub('${u.id}', 'lite')">Дать Lite (30 дн.)</button>
            <button class="reaction-btn" style="font-size:11.5px; color:#facc15; border-color: rgba(250,204,21,0.4);" onclick="adminGrantSub('${u.id}', 'premium')">Дать Premium (30 дн.)</button>
            ${activeTier ? `<button class="reaction-btn" style="font-size:11.5px; color: var(--danger); border-color: rgba(239,68,68,0.3);" onclick="adminRevokeSub('${u.id}')">🗑️ Забрать подписку</button>` : ''}
          </div>
        `;
        resultsBox.appendChild(row);
      });
    }).catch(err => {
      console.error(err);
      resultsBox.innerHTML = '<div style="color: var(--danger); font-size: 12.5px; text-align:center; padding: 8px;">Ошибка поиска</div>';
    });
  };

  window.adminGrantSub = function(userId, tier) {
    if (!isAdmin()) return;
    if (!confirm(`Выдать тариф "${tier}" этому пользователю на 30 дней?`)) return;
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
    primaryDb.collection('users').doc(userId).update({
      subTier: tier,
      subExpiresAt: expiresAt
    }).then(() => {
      showToast('👑 Подписка выдана!');
      adminSearchSubUsers();
    }).catch(err => {
      console.error(err);
      showToast('❌ Ошибка выдачи подписки');
    });
  };

  window.adminRevokeSub = function(userId) {
    if (!isAdmin()) return;
    if (!confirm('Забрать подписку у этого пользователя?')) return;
    primaryDb.collection('users').doc(userId).update({
      subTier: firebase.firestore.FieldValue.delete(),
      subExpiresAt: firebase.firestore.FieldValue.delete()
    }).then(() => {
      showToast('🗑️ Подписка отозвана!');
      adminSearchSubUsers();
    }).catch(err => {
      console.error(err);
      showToast('❌ Ошибка отзыва подписки');
    });
  };

  /* ===== БАНЫ И ТАЙМАУТЫ =====
     Модель данных в users/{uid}:
       banned: true|false            — перма-бан, блокирует доступ ко всему сайту
       banReason: string (опц.)      — причина перма-бана
       restrictions: {
         guestbook: { until: <мс>, reason?: string },  — таймаут на сообщения в гостевой книге
         media:     { until: <мс>, reason?: string },  — таймаут на публикацию фото/видео
         comments:  { until: <мс>, reason?: string }   — таймаут на комментарии
       }
  */
  const BAN_RESTRICTION_LABELS = { guestbook: '📝 Гостевая книга', media: '🖼️ Фото/видео', comments: '💬 Комментарии' };
  const BAN_DURATION_OPTIONS = [
    { ms: 60 * 1000, label: '1 минута' },
    { ms: 10 * 60 * 1000, label: '10 минут' },
    { ms: 7 * 24 * 60 * 60 * 1000, label: 'Неделя' },
    { ms: 30 * 24 * 60 * 60 * 1000, label: 'Месяц' },
    { ms: 365 * 24 * 60 * 60 * 1000, label: 'Год' }
  ];

  // Форматирует оставшееся время таймаута в человекочитаемый вид
  function formatDurationLeft(ms) {
    if (ms <= 0) return '0 сек.';
    if (ms < 60 * 1000) return Math.ceil(ms / 1000) + ' сек.';
    if (ms < 60 * 60 * 1000) return Math.ceil(ms / (60 * 1000)) + ' мин.';
    if (ms < 24 * 60 * 60 * 1000) return Math.ceil(ms / (60 * 60 * 1000)) + ' ч.';
    return Math.ceil(ms / (24 * 60 * 60 * 1000)) + ' дн.';
  }

  // Вернуть активное ограничение указанной категории для текущего пользователя (или null)
  function getActiveRestriction(category) {
    if (!currentUserProfile || !currentUserProfile.restrictions) return null;
    const r = currentUserProfile.restrictions[category];
    if (r && r.until && r.until > Date.now()) return r;
    return null;
  }

  // Проверка перед действием: если категория заблокирована таймаутом — показать тост и вернуть true
  function blockedByRestriction(category, actionLabel) {
    if (currentUserProfile && currentUserProfile.banned) {
      showToast('⛔ Ваш аккаунт заблокирован администратором');
      return true;
    }
    const r = getActiveRestriction(category);
    if (!r) return false;
    const left = formatDurationLeft(r.until - Date.now());
    showToast(`🚫 ${actionLabel} временно недоступно (таймаут). Осталось: ${left}${r.reason ? ' — ' + r.reason : ''}`);
    return true;
  }

  window.adminSearchBanUsers = function() {
    if (!isAdmin()) return;
    const resultsBox = document.getElementById('banAdminResults');
    const query = document.getElementById('banAdminSearchInput').value.trim().toLowerCase();
    if (!query) {
      resultsBox.innerHTML = '<div style="color: var(--muted); font-size: 12.5px; text-align:center; padding: 8px;">Введите никнейм или email для поиска</div>';
      return;
    }
    resultsBox.innerHTML = '<div style="color: var(--muted); font-size: 12.5px; text-align:center; padding: 8px;">Поиск...</div>';

    primaryDb.collection('users').get().then(snapshot => {
      let matched = [];
      snapshot.forEach(doc => {
        const u = doc.data();
        if ((u.username || '').toLowerCase().includes(query) || (u.email || '').toLowerCase().includes(query)) {
          matched.push({ id: doc.id, ...u });
        }
      });

      if (matched.length === 0) {
        resultsBox.innerHTML = '<div style="color: var(--muted); font-size: 12.5px; text-align:center; padding: 8px;">Никого не найдено</div>';
        return;
      }

      resultsBox.innerHTML = '';
      matched.slice(0, 15).forEach(u => resultsBox.appendChild(buildBanUserRow(u)));
    }).catch(err => {
      console.error(err);
      resultsBox.innerHTML = '<div style="color: var(--danger); font-size: 12.5px; text-align:center; padding: 8px;">Ошибка поиска</div>';
    });
  };

  // Построить карточку пользователя в панели банов (статус + элементы управления)
  function buildBanUserRow(u) {
    const now = Date.now();
    const restrictions = u.restrictions || {};
    const durationSelectId = `banDuration_${u.id}`;

    let statusHtml = '';
    if (u.banned) {
      statusHtml += `<div style="color: var(--danger); font-weight:700; font-size:12px;">⛔ ПЕРМА-БАН${u.banReason ? ' — ' + escapeHtml(u.banReason) : ''}</div>`;
    }
    Object.keys(BAN_RESTRICTION_LABELS).forEach(cat => {
      const r = restrictions[cat];
      if (r && r.until && r.until > now) {
        statusHtml += `<div style="color:#f59e0b; font-size:11.5px; display:flex; align-items:center; gap:6px;">⏳ ${BAN_RESTRICTION_LABELS[cat]}: ещё ${formatDurationLeft(r.until - now)}
          <a href="#" onclick="event.preventDefault(); adminRemoveRestriction('${u.id}','${cat}')" style="color: var(--danger);">[снять]</a></div>`;
      }
    });

    const durationOptionsHtml = BAN_DURATION_OPTIONS.map(opt => `<option value="${opt.ms}">${opt.label}</option>`).join('');

    const row = document.createElement('div');
    row.style.cssText = 'background: var(--input-bg); border: 1px solid var(--card-border); border-radius: 10px; padding: 12px; display:flex; flex-direction:column; gap:8px;';
    row.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; font-size: 13px;">
        <strong>${escapeHtml(u.username || u.email || u.id)}</strong>
      </div>
      ${statusHtml}
      <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
        <select id="${durationSelectId}" style="background: var(--input-bg); border: 1px solid var(--card-border); border-radius:6px; padding:6px 6px; color: var(--text); font-family: 'Onest', sans-serif; font-size: 11.5px; outline:none;">
          ${durationOptionsHtml}
        </select>
        <button class="reaction-btn" style="font-size:11px;" onclick="adminApplyRestriction('${u.id}','guestbook','${durationSelectId}')">🚫 Гостевая</button>
        <button class="reaction-btn" style="font-size:11px;" onclick="adminApplyRestriction('${u.id}','media','${durationSelectId}')">🚫 Медиа</button>
        <button class="reaction-btn" style="font-size:11px;" onclick="adminApplyRestriction('${u.id}','comments','${durationSelectId}')">🚫 Комменты</button>
      </div>
      <div>
        ${u.banned
          ? `<button class="reaction-btn" style="font-size:11.5px; color:#22c55e; border-color: rgba(34,197,94,0.4);" onclick="adminUnbanUser('${u.id}')">✅ Разбанить</button>`
          : `<button class="reaction-btn" style="font-size:11.5px; color: var(--danger); border-color: rgba(239,68,68,0.4);" onclick="adminPermaBanUser('${u.id}')">⛔ Перма-бан (навсегда)</button>`}
      </div>
    `;
    return row;
  }

  // Выдать таймаут на конкретную категорию действий
  window.adminApplyRestriction = function(userId, category, durationSelectId) {
    if (!isAdmin()) return;
    const select = document.getElementById(durationSelectId);
    if (!select) return;
    const durationMs = parseInt(select.value, 10);
    const label = select.options[select.selectedIndex].text;
    const catLabel = BAN_RESTRICTION_LABELS[category] || category;
    if (!confirm(`Выдать таймаут "${label}" на категорию "${catLabel}"?`)) return;

    primaryDb.collection('users').doc(userId).update({
      [`restrictions.${category}`]: { until: Date.now() + durationMs }
    }).then(() => {
      showToast('⏳ Таймаут выдан!');
      adminSearchBanUsers();
    }).catch(err => {
      console.error(err);
      showToast('❌ Ошибка выдачи таймаута');
    });
  };

  // Снять активный таймаут с категории
  window.adminRemoveRestriction = function(userId, category) {
    if (!isAdmin()) return;
    if (!confirm('Снять таймаут с этой категории?')) return;
    primaryDb.collection('users').doc(userId).update({
      [`restrictions.${category}`]: firebase.firestore.FieldValue.delete()
    }).then(() => {
      showToast('✅ Таймаут снят!');
      adminSearchBanUsers();
    }).catch(err => {
      console.error(err);
      showToast('❌ Ошибка снятия таймаута');
    });
  };

  // Перма-бан: пользователь больше не сможет заходить на сайт, пока его не разбанят
  window.adminPermaBanUser = function(userId) {
    if (!isAdmin()) return;
    if (!confirm('Забанить этого пользователя навсегда? Он не сможет заходить на сайт, пока вы его не разбаните.')) return;
    primaryDb.collection('users').doc(userId).update({
      banned: true,
      banReason: firebase.firestore.FieldValue.delete()
    }).then(() => {
      showToast('⛔ Пользователь забанен!');
      adminSearchBanUsers();
    }).catch(err => {
      console.error(err);
      showToast('❌ Ошибка бана пользователя');
    });
  };

  // Снять перма-бан
  window.adminUnbanUser = function(userId) {
    if (!isAdmin()) return;
    if (!confirm('Разбанить этого пользователя?')) return;
    primaryDb.collection('users').doc(userId).update({
      banned: false,
      banReason: firebase.firestore.FieldValue.delete()
    }).then(() => {
      showToast('✅ Пользователь разбанен!');
      adminSearchBanUsers();
    }).catch(err => {
      console.error(err);
      showToast('❌ Ошибка разбана пользователя');
    });
  };

  // Показать/скрыть полноэкранный блокирующий оверлей для забаненного пользователя
  function showBanOverlay(reason) {
    const overlay = document.getElementById('banOverlay');
    if (!overlay) return;
    const reasonEl = document.getElementById('banOverlayReason');
    if (reasonEl) {
      if (reason) {
        reasonEl.textContent = 'Причина: ' + reason;
        reasonEl.style.display = 'block';
      } else {
        reasonEl.style.display = 'none';
      }
    }
    overlay.classList.add('show');
  }
  function hideBanOverlay() {
    const overlay = document.getElementById('banOverlay');
    if (overlay) overlay.classList.remove('show');
  }

  // Слушатель бана в реальном времени: следит за документом текущего пользователя
  // и мгновенно показывает/скрывает блокирующий оверлей при изменении статуса админом.
  let banWatcherUnsub = null;
  function startBanWatcher(user) {
    if (banWatcherUnsub) { banWatcherUnsub(); banWatcherUnsub = null; }
    if (!user) { hideBanOverlay(); return; }
    const watchDb = db;
    banWatcherUnsub = watchDb.collection('users').doc(user.uid).onSnapshot(doc => {
      if (!doc.exists) return;
      const data = doc.data();
      if (currentUserProfile) {
        currentUserProfile.banned = !!data.banned;
        currentUserProfile.banReason = data.banReason || '';
        currentUserProfile.restrictions = data.restrictions || {};
      }
      if (data.banned) {
        showBanOverlay(data.banReason);
      } else {
        hideBanOverlay();
      }
    }, err => { console.error('Ошибка слежения за баном:', err); });
  }
  /* ===== /БАНЫ И ТАЙМАУТЫ ===== */

  window.approveSubscription = function(reportId, userId, tier) {
    if (!isAdmin()) return;
    if (!confirm(`Подтвердить оплату и активировать тариф "${tier}" пользователю?`)) return;

    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 дней
    db.collection('users').doc(userId).update({
      subTier: tier,
      subExpiresAt: expiresAt
    }).then(() => {
      return db.collection('reports').doc(reportId).delete();
    }).then(() => {
      showToast('👑 Подписка активирована на 30 дней!');
      fetchReports();
    }).catch(err => {
      console.error(err);
      showToast('❌ Ошибка активации подписки');
    });
  };

  window.approveAllReports = function() {
    if (!isAdmin()) return;
    if (currentReportsList.length === 0) return;
    if (!confirm(`Одобрить все жалобы (${currentReportsList.length}) и оставить сообщения без изменений?`)) return;

    const batch = db.batch();
    currentReportsList.forEach(r => {
      batch.delete(db.collection('reports').doc(r.reportId));
    });
    batch.commit().then(() => {
      showToast('✅ Все жалобы одобрены (сообщения оставлены)');
      fetchReports();
    }).catch(err => {
      console.error(err);
      showToast('❌ Ошибка при массовом одобрении');
    });
  };

  window.deleteAllReportedMessages = function() {
    if (!isAdmin()) return;
    if (currentReportsList.length === 0) return;
    if (!confirm(`Удалить все репортнутые сообщения (${currentReportsList.length}) и закрыть жалобы?`)) return;

    const batch = db.batch();
    currentReportsList.forEach(r => {
      batch.delete(db.collection('messages').doc(r.messageId));
      batch.delete(db.collection('reports').doc(r.reportId));
    });
    batch.commit().then(() => {
      showToast('🗑️ Все репортнутые сообщения удалены');
      fetchReports();
    }).catch(err => {
      console.error(err);
      showToast('❌ Ошибка при массовом удалении');
    });
  };

  // Отрисовать историю активности пользователя
  function renderActivityHistory() {
    const historyContainer = document.getElementById('activityHistoryList');
    historyContainer.innerHTML = '';

    const currentUserId = auth.currentUser ? auth.currentUser.uid : null;
    const currentUserName = currentUserProfile ? currentUserProfile.username : (auth.currentUser ? auth.currentUser.displayName : null);

    const userMsgs = currentMessagesList.filter(m => {
      if (currentUserId && m.userId === currentUserId) return true;
      if (currentUserName && m.author === currentUserName) return true;
      return false;
    });

    if (userMsgs.length === 0) {
      historyContainer.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 20px;">У вас пока нет сохраненных постов или сообщений.</div>';
      return;
    }

    userMsgs.forEach(m => {
      const timeInfo = formatMessageTime(m.createdAt, m.localTime);
      const div = document.createElement('div');
      div.style.cssText = 'background: rgba(150,150,150,0.04); border: 1px solid var(--card-border); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 6px;';
      
      let imgHtml = m.image ? `<img src="${m.image}" class="gb-image-thumb" />` : '';

      div.innerHTML = `
        <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--muted);">
          <span>${m.image ? 'Медиа-пост в ленту' : 'Сообщение в гостевой'}</span>
          <span>${timeInfo.display}</span>
        </div>
        <div style="font-size: 13.5px; color: var(--text);">${escapeHtml(m.text)}</div>
        ${imgHtml}
      `;
      historyContainer.appendChild(div);
    });
  }

  window.deleteReportedMessage = function(reportId, messageId) {
    if (!isAdmin()) return;
    db.collection('messages').doc(messageId).delete().then(() => {
      return db.collection('reports').doc(reportId).delete();
    }).then(() => {
      showToast('🗑️ Сообщение удалено, жалоба закрыта');
      fetchReports();
    }).catch(err => {
      showToast('❌ Ошибка удаления');
    });
  };

  window.dismissReport = function(reportId) {
    if (!isAdmin()) return;
    db.collection('reports').doc(reportId).delete().then(() => {
      showToast('✅ Жалоба закрыта');
      fetchReports();
    }).catch(err => {
      showToast('❌ Ошибка');
    });
  };

  window.togglePinMessage = function(id, currentPinned) {
    if (!isAdmin()) {
      showToast('❌ Недостаточно прав!');
      return;
    }
    db.collection('messages').doc(id).update({
      pinned: !currentPinned,
      pinnedUntil: null
    }).then(() => {
      showToast(!currentPinned ? '📌 Сообщение закреплено' : '📌 Сообщение откреплено');
    }).catch(err => {
      showToast('❌ Ошибка при изменении закрепления');
    });
  };

  // Проверить, может ли пользователь сейчас закрепить своё сообщение (по подписке)
  function canSelfPin() {
    if (!currentUserProfile || !currentUserProfile.subTier || !currentUserProfile.subExpiresAt || currentUserProfile.subExpiresAt <= Date.now()) return false;
    const periodMs = currentUserProfile.subTier === 'premium' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
    const last = currentUserProfile.lastSelfPinAt || 0;
    return Date.now() - last >= periodMs;
  }

  window.selfPinMessage = function(id) {
    const user = auth.currentUser;
    if (!user || !canSelfPin()) {
      showToast('⚠️ Закрепление уже использовано в этом периоде');
      return;
    }
    const pinnedUntil = Date.now() + 60 * 60 * 1000; // 1 час
    db.collection('messages').doc(id).update({ pinned: true, pinnedUntil: pinnedUntil }).then(() => {
      return db.collection('users').doc(user.uid).update({ lastSelfPinAt: Date.now() });
    }).then(() => {
      currentUserProfile.lastSelfPinAt = Date.now();
      showToast('📌 Сообщение закреплено на 1 час!');
    }).catch(err => {
      console.error(err);
      showToast('❌ Ошибка закрепления');
    });
  };

  window.deleteVideo = function(id) {
    if (!isAdmin()) {
      showToast('❌ Недостаточно прав!');
      return;
    }
    if (confirm('Удалить это видео из ленты?')) {
      db.collection('videos').doc(id).delete().then(() => {
        showToast('🗑️ Видео успешно удалено');
      }).catch(err => {
        showToast('❌ Ошибка удаления видео');
      });
    }
  };

  // Зарегистрировать нового пользователя (email/пароль)
  function registerUser() {
    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value.trim();

    if (!username || !email || !password) {
      showToast('⚠️ Заполните все поля!');
      return;
    }
    if (password.length < 6) {
      showToast('⚠️ Пароль должен быть не менее 6 символов!');
      return;
    }

    // Регистрация email всегда на primaryAuth
    primaryAuth.createUserWithEmailAndPassword(email, password)
      .then((userCredential) => {
        authEpoch++;
        auth = primaryAuth;
        db = primaryDb;
        localStorage.removeItem(TG_ACTIVE_KEY);
        recordLoginLog(userCredential.user.uid);
        return userCredential.user.updateProfile({
          displayName: username
        }).then(() => {
          return primaryDb.collection('users').doc(userCredential.user.uid).set({
            username: username,
            email: email,
            avatarUrl: '',
            bio: '',
            tags: '',
            phone: '',
            birthday: '',
            friends: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }).then(() => userCredential.user);
      })
      .then((user) => {
        handleAuthUser(user);
        renderTgAccountSwitcher();
        closeRegisterModal();
        showToast('✅ Аккаунт успешно создан!');
        updateGlobalStatistics();
      })
      .catch((error) => {
        console.error(error);
        if (error.code === 'auth/email-already-in-use') {
          showToast('❌ Этот email уже занят!');
        } else {
          showToast('❌ Ошибка: ' + error.message);
        }
      });
  }

  // Войти в аккаунт (email/пароль)
  function loginUser() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (!email || !password) {
      showToast('⚠️ Заполните все поля!');
      return;
    }

    // Email/пароль всегда на основном Firebase-приложении (primaryAuth),
    // а не на tg_* инстансе — иначе "неверный пароль" при активном Telegram-аккаунте.
    primaryAuth.signInWithEmailAndPassword(email, password)
      .then((userCredential) => {
        // Переключаемся на email-сессию
        authEpoch++;
        auth = primaryAuth;
        db = primaryDb;
        localStorage.removeItem(TG_ACTIVE_KEY);
        recordLoginLog(userCredential.user.uid);
        handleAuthUser(userCredential.user);
        renderTgAccountSwitcher();
        closeLoginModal();
        showToast('✅ Успешный вход в аккаунт!');
      })
      .catch((error) => {
        console.error(error);
        if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
          showToast('❌ Неверный email или пароль!');
        } else if (error.code === 'auth/too-many-requests') {
          showToast('❌ Слишком много попыток. Попробуйте позже.');
        } else {
          showToast('❌ Ошибка входа: ' + (error.message || error.code));
        }
      });
  }

  // Выйти из аккаунта
  function logoutUser() {
    const activeTelegramId = localStorage.getItem(TG_ACTIVE_KEY);
    if (activeTelegramId) {
      // Telegram-сессия не уничтожается — просто становится неактивной,
      // вернуться к ней потом можно из списка аккаунтов без повторного входа.
      switchToDefaultAccount();
      showToast('👋 Вы вышли из аккаунта');
    } else {
      auth.signOut().then(() => {
        showToast('👋 Вы вышли из аккаунта');
      });
    }
  }

  // Сохранить изменения профиля
  function saveProfileChanges() {
    const user = auth.currentUser;
    if (!user) return;

    const newAvatar = document.getElementById('editAvatarUrl').value.trim();
    const newUsername = document.getElementById('editUsernameInput').value.trim();
    const newBio = document.getElementById('editBioInput').value.trim();
    const newTags = document.getElementById('editTagsInput').value.trim();
    const newPhone = document.getElementById('editPhoneInput').value.trim();
    const newBirthday = document.getElementById('editBirthdayInput').value.trim();
    const nickColorCustomEl = document.getElementById('nickColorCustomInput');
    const newNickColor = nickColorCustomEl ? (nickColorCustomEl.value.trim() || nickColorCustomEl.dataset.picked || '') : '';

    if (!newUsername) {
      showToast('⚠️ Никнейм не может быть пустым!');
      return;
    }

    user.updateProfile({
      displayName: newUsername
    }).then(() => {
      return db.collection('users').doc(user.uid).set({
        username: newUsername,
        avatarUrl: newAvatar,
        bio: newBio,
        tags: newTags,
        phone: newPhone,
        birthday: newBirthday,
        nickColor: newNickColor,
        email: user.email
      }, { merge: true });
    }).then(() => {
      return db.collection('messages').where('userId', '==', user.uid).get();
    }).then((snapshot) => {
      const batch = db.batch();
      snapshot.forEach(doc => {
        batch.update(doc.ref, {
          avatarUrl: newAvatar,
          author: newUsername
        });
      });
      return batch.commit();
    }).then(() => {
      closeEditProfileModal();
      showToast('✅ Профиль и аватарки обновлены!');
      currentUserProfile.username = newUsername;
      currentUserProfile.avatarUrl = newAvatar;
      currentUserProfile.bio = newBio;
      currentUserProfile.tags = newTags;
      currentUserProfile.phone = newPhone;
      currentUserProfile.birthday = newBirthday;
      updateDropdownUI(user, currentUserProfile);
      switchTab('main');
      showConfettiCelebration();
    }).catch(err => {
      console.error(err);
      showToast('❌ Ошибка сохранения профиля');
    });
  }

  // Обновить содержимое выпадающего меню профиля в шапке сайта
  function updateDropdownUI(user, profile) {
    const dropdownUsernameText = document.getElementById('dropdownUsernameText');
    const authDropdownSection = document.getElementById('authDropdownSection');
    const dropdownAvatarBox = document.getElementById('dropdownAvatarBox');
    renderTgAccountSwitcher();

    if (gbInput && gbSendBtn) {
      if (user && profile) {
        gbInput.disabled = false;
        gbInput.placeholder = 'Напишите текстовое сообщение...';
        gbSendBtn.disabled = false;
      } else {
        gbInput.disabled = true;
        gbInput.placeholder = 'Войдите в аккаунт, чтобы писать в гостевой книге';
        gbSendBtn.disabled = true;
      }
    }

    if (user) {
      const name = profile.username || user.displayName || 'Пользователь';
      const adminBadgeStr = isAdmin() ? ' 👑 [Админ]' : '';
      const mySub = profile.subTier && profile.subExpiresAt && profile.subExpiresAt > Date.now() ? profile.subTier : null;
      const mySubBadgeStr = mySub === 'premium' ? 'PREMIUM 👑 ' : (mySub === 'lite' ? 'LITE' : '');
      dropdownUsernameText.textContent = name + adminBadgeStr + mySubBadgeStr;

      if (profile.avatarUrl) {
        dropdownAvatarBox.innerHTML = `<img src="${escapeHtml(profile.avatarUrl)}" alt="Avatar">`;
      } else {
        dropdownAvatarBox.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
      }

      let adminReportsItem = '';
      if (isAdmin()) {
        adminReportsItem = `
          <a href="#" class="dropdown-item" onclick="event.preventDefault(); openAdminPanelModal()">
            <svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            🛠️ Админ-панель
          </a>
        `;
      }

      authDropdownSection.innerHTML = `
        ${adminReportsItem}
        <a href="#" class="dropdown-item" onclick="event.preventDefault(); openMyProfileModal()">
          <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Профиль 👤
        </a>
        <a href="#" class="dropdown-item" onclick="event.preventDefault(); openActivityHistoryModal()">
          <svg viewBox="0 0 24 24"><path d="M12 20v-6M6 20V10M18 20V4"/></svg>
          История активности 📊
        </a>
        <a href="#" class="dropdown-item" onclick="event.preventDefault(); openChangePasswordModal()">
          <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          Смена пароля 🔐
        </a>
        <a href="#" class="dropdown-item" onclick="event.preventDefault(); openLoginLogsModal()">
          <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          Логи входов 📋
        </a>
        <a href="#" class="dropdown-item" onclick="event.preventDefault(); openEditProfileModal()">
          <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Настроить профиль
        </a>
        <a href="#" class="dropdown-item logout" onclick="event.preventDefault(); logoutUser()">
          <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Выйти (${name})
        </a>
      `;
    } else {
      dropdownUsernameText.textContent = 'Гость';
      dropdownAvatarBox.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
      authDropdownSection.innerHTML = `
        <a href="#" class="dropdown-item" onclick="event.preventDefault(); openLoginModal()">
          <svg viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
          Войти
        </a>
        <a href="#" class="dropdown-item" onclick="event.preventDefault(); openRegisterModal()">
          <svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
          Регистрация
        </a>
      `;
    }
  }

  // (Обработка входа теперь происходит через handleAuthUser() и primaryAuth.onAuthStateChanged
  // выше, в блоке "ВХОД ЧЕРЕЗ TELEGRAM + МУЛЬТИАККАУНТЫ" — так поддерживаются оба варианта:
  // и обычный email/пароль-аккаунт, и переключение между несколькими Telegram-аккаунтами.)

  // Отформатировать время сообщения для отображения
  function formatMessageTime(createdAt, localTime) {
    const date = createdAt ? createdAt.toDate() : (localTime ? new Date(localTime) : new Date());
    const now = new Date();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    const timeStr = `${hours}:${minutes}`;
    const dateStr = `${day}.${month}.${year}`;
    const tooltip = `${timeStr} ${dateStr}`;

    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    let display = '';
    if (isToday) display = `сегодня в ${timeStr}`;
    else if (isYesterday) display = `вчера в ${timeStr}`;
    else display = `${dateStr} в ${timeStr}`;

    return { display, tooltip };
  }

  // Обновить общую статистику платформы (счётчики и т.д.)
  function updateGlobalStatistics() {
    db.collection('users').get().then(snap => {
      if (statTotalUsersEl) statTotalUsersEl.textContent = snap.size || 1;
    }).catch(() => {});

    if (statCommentsCountEl) statCommentsCountEl.textContent = currentMessagesList.length;
    if (statVideosCountEl) statVideosCountEl.textContent = currentVideosList.length;
    if (statGamesCountEl) statGamesCountEl.textContent = 3;

    let totalViews = currentMessagesList.reduce((acc, m) => acc + (Math.abs(hashCode(m.id || '1')) % 500 + 40), 1250);
    if (statViewsCountEl) {
      statViewsCountEl.textContent = totalViews > 1000 ? (totalViews / 1000).toFixed(1) + ' тыс.' : totalViews;
    }
    if (statOnlineTodayEl) {
      statOnlineTodayEl.textContent = Math.floor(Math.random() * 4) + 1;
    }
  }

  // Посчитать суммарное количество реакций
  function getTotalReactions(reactions) {
    if (!reactions) return 0;
    return Object.values(reactions).reduce((a, b) => a + b, 0);
  }

  // ===== Кэш подписчиков (Premium / Lite) для бейджей и цвета ника =====
  let premiumUsersMap = {};
  primaryDb.collection('users').where('subTier', 'in', ['lite', 'premium']).onSnapshot((snap) => {
    const map = {};
    snap.forEach(d => {
      const u = d.data();
      if (u.subExpiresAt && u.subExpiresAt > Date.now()) map[d.id] = u;
    });
    premiumUsersMap = map;
    if (typeof renderMessages === 'function') renderMessages();
  }, (err) => console.error('premium users snapshot error:', err));

  // Сформировать HTML-бейдж подписки пользователя (Premium/Lite)
  function getUserBadgeHTML(userId) {
    const u = premiumUsersMap[userId];
    if (!u) return '';
    return u.subTier === 'premium'
      ? '<span class="user-sub-badge" title="Premium">👑</span>'
      : '<span class="user-sub-badge" title="Lite">✓</span>';
  }

  // Сформировать inline-стиль отображения никнейма по подписке пользователя
  function getUserNameStyle(userId) {
    const u = premiumUsersMap[userId];
    if (!u) return '';
    if (u.subTier === 'premium') {
      return u.nickColor ? `style="background:${escapeHtml(u.nickColor)};-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:800;"` : 'class="name-premium"';
    }
    return u.nickColor ? `style="color:${escapeHtml(u.nickColor)};font-weight:700;"` : 'class="name-lite"';
  }

  db.collection('messages').onSnapshot((snapshot) => {
    currentMessagesList = [];
    snapshot.forEach(doc => { currentMessagesList.push({ id: doc.id, ...doc.data() }); });
    updateGlobalStatistics();
    sortAndRender();
    renderPhotosGrid();
    renderFriendsList();
    initialMessagesLoaded = true;
    tryHideInitialLoader();
  });

  db.collection('videos').onSnapshot((snapshot) => {
    currentVideosList = [];
    snapshot.forEach(doc => { currentVideosList.push({ id: doc.id, ...doc.data() }); });
    updateVideoCategoryCounts();
    renderVideosGrid();
    updateGlobalStatistics();
    initialVideosLoaded = true;
    tryHideInitialLoader();
  });

  // Найти пользователей платформы по поисковому запросу
  function searchPlatformUsers(query) {
    const container = document.getElementById('userSearchResults');
    const q = query.toLowerCase().trim();
    if (!q) {
      container.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 20px; grid-column: 1/-1;">Введите запрос для поиска пользователей...</div>';
      return;
    }
    db.collection('users').get().then(snapshot => {
      container.innerHTML = '';
      let results = [];
      snapshot.forEach(doc => {
        const u = doc.data();
        const uname = (u.username || '').toLowerCase();
        const uemail = (u.email || '').toLowerCase();
        if (uname.includes(q) || uemail.includes(q)) {
          results.push({ id: doc.id, ...u });
        }
      });
      if (results.length === 0) {
        container.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 20px; grid-column: 1/-1;">Пользователи не найдены</div>';
        return;
      }
      results.forEach(user => {
        const isMe = auth.currentUser && auth.currentUser.uid === user.id;
        const myFriends = currentUserProfile && currentUserProfile.friends ? currentUserProfile.friends : [];
        const isFriend = myFriends.includes(user.id);
        
        const card = document.createElement('div');
        card.style.cssText = 'background: rgba(150,150,150,0.05); border: 1px solid var(--card-border); border-radius: 10px; padding: 14px; display: flex; align-items: center; gap: 12px;';
        
        let avatarHtml = user.avatarUrl ? `<img src="${escapeHtml(user.avatarUrl)}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">` : `<div style="width:40px;height:40px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;">${(user.username || 'U')[0].toUpperCase()}</div>`;
        
        card.innerHTML = `
          ${avatarHtml}
          <div style="flex:1; min-width:0;">
            <div style="font-weight:700; color:var(--text); font-size:14px; cursor:pointer;" onclick="openUserProfile('${user.id}', '${escapeHtml(user.username)}', '${escapeHtml(user.avatarUrl || '')}')">${escapeHtml(user.username || 'Пользователь')}</div>
            <div style="font-size:12px; color:var(--muted); overflow:hidden; text-overflow:ellipsis;">@${escapeHtml((user.username || '').toLowerCase().replace(/\s+/g, ''))}</div>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="reaction-btn" onclick="openUserProfile('${user.id}', '${escapeHtml(user.username)}', '${escapeHtml(user.avatarUrl || '')}')">Профиль</button>
            ${!isMe ? `<button class="reaction-btn ${isFriend ? 'active' : ''}" onclick="toggleFriend('${user.id}')">${isFriend ? '✓ В друзьях' : '+ Друг'}</button>` : ''}
          </div>
        `;
        container.appendChild(card);
      });
    }).catch(err => {
      console.error(err);
      container.innerHTML = '<div style="color: var(--danger); text-align: center; padding: 20px; grid-column: 1/-1;">Ошибка поиска</div>';
    });
  }

  window.toggleFriend = function(targetUserId) {
    const user = auth.currentUser;
    if (!user) {
      showToast('⚠️ Войдите в аккаунт, чтобы добавлять друзей!');
      return;
    }
    if (!currentUserProfile.friends) currentUserProfile.friends = [];
    const idx = currentUserProfile.friends.indexOf(targetUserId);
    if (idx > -1) {
      currentUserProfile.friends.splice(idx, 1);
      showToast('🗑️ Пользователь удален из друзей');
    } else {
      currentUserProfile.friends.push(targetUserId);
      showToast('✅ Пользователь добавлен в друзья!');
    }
    db.collection('users').doc(user.uid).update({
      friends: currentUserProfile.friends
    }).then(() => {
      const searchInp = document.getElementById('userSearchInput');
      if (searchInp && searchInp.value.trim()) {
        searchPlatformUsers(searchInp.value);
      }
      renderFriendsList();
    }).catch(err => {
      console.error(err);
      showToast('❌ Ошибка обновления друзей');
    });
  };

  // Отрисовать список друзей
  function renderFriendsList() {
    const listContainer = document.getElementById('myFriendsList');
    const feedContainer = document.getElementById('friendsActivityFeed');
    if (!listContainer || !feedContainer) return;

    const user = auth.currentUser;
    if (!user) {
      listContainer.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 20px;">Войдите в аккаунт, чтобы управлять друзьями</div>';
      feedContainer.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 20px;">Войдите в аккаунт</div>';
      return;
    }

    const friendsIds = currentUserProfile && currentUserProfile.friends ? currentUserProfile.friends : [];
    if (friendsIds.length === 0) {
      listContainer.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 20px;">У вас пока нет друзей в списке. Используйте поиск выше!</div>';
      feedContainer.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 20px;">Нет активности друзей</div>';
      return;
    }

    listContainer.innerHTML = '';
    friendsIds.forEach(fId => {
      db.collection('users').doc(fId).get().then(doc => {
        if (!doc.exists) return;
        const fData = doc.data();
        const div = document.createElement('div');
        div.style.cssText = 'background: rgba(150,150,150,0.05); border: 1px solid var(--card-border); border-radius: 8px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between;';
        div.innerHTML = `
          <div style="display: flex; align-items: center; gap: 10px; cursor: pointer;" onclick="openUserProfile('${fId}', '${escapeHtml(fData.username)}', '${escapeHtml(fData.avatarUrl || '')}')">
            <div style="width:34px; height:34px; border-radius:50%; background:var(--accent); display:flex; align-items:center; justify-content:center; color:#fff; font-weight:700; overflow:hidden;">
              ${fData.avatarUrl ? `<img src="${escapeHtml(fData.avatarUrl)}" style="width:100%;height:100%;object-fit:cover;">` : (fData.username || 'U')[0].toUpperCase()}
            </div>
            <span style="font-weight:600; color:var(--text); font-size:13.5px;">${escapeHtml(fData.username || 'Пользователь')}</span>
          </div>
          <button class="reaction-btn" style="color:var(--danger);" onclick="toggleFriend('${fId}')">Удалить</button>
        `;
        listContainer.appendChild(div);
      });
    });

    const friendMsgs = currentMessagesList.filter(m => friendsIds.includes(m.userId) || friendsIds.includes(m.author));
    feedContainer.innerHTML = '';
    if (friendMsgs.length === 0) {
      feedContainer.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 20px;">Друзья еще ничего не опубликовали</div>';
      return;
    }
    friendMsgs.slice(0, 10).forEach(m => {
      const timeInfo = formatMessageTime(m.createdAt, m.localTime);
      const div = document.createElement('div');
      div.style.cssText = 'background: rgba(150,150,150,0.04); border: 1px solid var(--card-border); border-radius: 8px; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px;';
      div.innerHTML = `
        <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--accent); font-weight: 600;">
          <span>@${escapeHtml(m.author)}</span>
          <span>${timeInfo.display}</span>
        </div>
        <div style="font-size: 13px; color: var(--text);">${escapeHtml(m.text)}</div>
      `;
      feedContainer.appendChild(div);
    });
  }

  // Обновить счётчики видео по категориям
  function updateVideoCategoryCounts() {
    const total = currentVideosList.length;
    const funny = currentVideosList.filter(v => v.category === 'Смешные').length;
    const truecrime = currentVideosList.filter(v => v.category === 'Трукрайм').length;
    const exposes = currentVideosList.filter(v => v.category === 'Разоблачения').length;
    const trailers = currentVideosList.filter(v => v.category === 'Трейлеры').length;
    const other = currentVideosList.filter(v => v.category === 'Разное').length;

    document.getElementById('count-rec').textContent = total;
    document.getElementById('count-funny').textContent = funny;
    document.getElementById('count-truecrime').textContent = truecrime;
    document.getElementById('count-exposes').textContent = exposes;
    document.getElementById('count-trailers').textContent = trailers;
    document.getElementById('count-other').textContent = other;
  }

  // Извлечь ID видео из ссылки на YouTube
  function extractYoutubeId(url) {
    if (!url) return null;
    const re = /(?:youtube\.com\/watch\?v=|youtube\.com\/shorts\/|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;
    const m = url.match(re);
    return m && m[1] ? m[1] : null;
  }

  window.filterVideos = function(category, btnEl) {
    currentVideoFilter = category;
    document.querySelectorAll('#videoFilterBar .video-filter-btn').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    renderVideosGrid();
  };

  window.handleVideoUrlInput = function(url) {
    const videoId = extractYoutubeId(url);
    const box = document.getElementById('suggestPreviewBox');
    const text = document.getElementById('suggestPreviewText');
    if (videoId) {
      suggestVideoId = videoId;
      box.style.backgroundImage = `url('https://img.youtube.com/vi/${videoId}/hqdefault.jpg')`;
      if (text) text.textContent = 'Видео найдено ✓';
      fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { suggestVideoTitle = (data && data.title) ? data.title : ''; })
        .catch(() => { suggestVideoTitle = ''; });
    } else {
      suggestVideoId = null;
      suggestVideoTitle = '';
      box.style.backgroundImage = 'none';
      if (text) text.textContent = 'Превью видео появится здесь';
    }
  };

  window.selectSuggestCategory = function(btnEl, category) {
    document.querySelectorAll('#suggestCategoryGrid .category-tag').forEach(b => b.classList.remove('selected'));
    btnEl.classList.add('selected');
    selectedSuggestCategory = category;
  };

  window.submitVideoSuggestion = function() {
    if (blockedByRestriction('media', 'Публикация фото/видео/аудио')) return;
    const urlInput = document.getElementById('suggestVideoUrl');
    const commentInput = document.getElementById('suggestVideoComment');
    const url = urlInput.value.trim();
    const comment = commentInput.value.trim();
    const videoId = extractYoutubeId(url);

    if (!url || !videoId) {
      showToast('⚠️ Вставьте корректную ссылку на видео с YouTube!');
      return;
    }

    // Проверка на дубликат: такое видео уже есть в списке
    const alreadyExists = currentVideosList.some(v => v.videoId === videoId);
    if (alreadyExists) {
      showToast('⚠️ Такое видео уже есть на сайте!');
      return;
    }

    const currentUser = auth.currentUser;
    const authorName = currentUserProfile ? currentUserProfile.username : (currentUser ? (currentUser.displayName || 'User') : ('guest_' + Math.floor(Math.random() * 900 + 100)));
    const userAvatarUrl = currentUserProfile ? currentUserProfile.avatarUrl : '';
    const userIdVal = currentUser ? currentUser.uid : ('guest_' + Math.random());

    showActionLoader('Отправка видео...');

    db.collection('videos').add({
      videoId: videoId,
      url: url,
      title: suggestVideoTitle || 'Видео без названия',
      category: selectedSuggestCategory,
      comment: comment,
      userId: userIdVal,
      author: authorName,
      avatarUrl: userAvatarUrl,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      localTime: Date.now(),
      likes: 0
    }).then(() => {
      hideActionLoader();
      showToast('✅ Видео успешно отправлено!');
      closeSuggestVideoModal();
      switchTab('videos');
    }).catch(err => {
      hideActionLoader();
      console.error(err);
      showToast('❌ Ошибка добавления видео');
    });
  };

  window.playVideoCard = function(containerEl, videoId) {
    // Переносим пользователя на YouTube в новой вкладке вместо показа видео на сайте
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank', 'noopener');
  };

  window.likeVideo = function(id) {
    const voteKey = `voted_video_${id}`;
    const hasVoted = localStorage.getItem(voteKey) === 'true';
    const videoRef = db.collection('videos').doc(id);

    db.runTransaction(async (transaction) => {
      const doc = await transaction.get(videoRef);
      if (!doc.exists) return;
      let likes = doc.data().likes || 0;
      if (hasVoted) {
        likes = Math.max(0, likes - 1);
        transaction.update(videoRef, { likes });
        localStorage.removeItem(voteKey);
      } else {
        likes = likes + 1;
        transaction.update(videoRef, { likes });
        localStorage.setItem(voteKey, 'true');
      }
    }).catch(err => {
      console.error(err);
      showToast('❌ Ошибка реакции');
    });
  };

  // Отрисовать сетку видео
  function renderVideosGrid() {
    const grid = document.getElementById('videosGrid');
    if (!grid) return;
    grid.innerHTML = '';

    let list = currentVideosList.slice();
    if (currentVideoFilter !== 'Рекомендуем') {
      list = list.filter(v => v.category === currentVideoFilter);
    }

    list.sort((a, b) => {
      const timeA = a.createdAt?.toMillis() || a.localTime || 0;
      const timeB = b.createdAt?.toMillis() || b.localTime || 0;
      if (currentVideoFilter === 'Рекомендуем') return (b.likes || 0) - (a.likes || 0) || (timeB - timeA);
      return timeB - timeA;
    });

    if (list.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--muted); font-size: 14px;">В этой категории пока нет видео. Предложите первое!</div>`;
      return;
    }

    const isUserAdmin = isAdmin();

    list.forEach(v => {
      const timeInfo = formatMessageTime(v.createdAt, v.localTime);
      const card = document.createElement('div');
      card.className = 'video-card';

      let adminBtn = '';
      if (isUserAdmin) {
        adminBtn = `<button onclick="event.stopPropagation(); deleteVideo('${v.id}')" title="Удалить видео" style="position:absolute; top:10px; right:10px; background: rgba(239,68,68,0.9); border:none; color:#fff; padding:5px 9px; border-radius:6px; font-size:11px; font-weight:700; z-index:20; cursor:pointer;">🗑️</button>`;
      }

      card.innerHTML = `
        <div class="video-thumb-container" style="background-image: url('https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg');" onclick="playVideoCard(this, '${v.videoId}')">
          ${adminBtn}
          <span class="video-badge">▶ ${escapeHtml(v.category || '')}</span>
        </div>
        <div class="video-info-box">
          <div class="video-title">${escapeHtml(v.title || 'Видео без названия')}</div>
          <div class="video-meta-row">
            <span class="video-author">@${escapeHtml(v.author || 'Гость')}</span>
            <span class="video-likes-count" style="cursor:pointer;" onclick="likeVideo('${v.id}')">👍 ${v.likes || 0}</span>
          </div>
          <div class="video-footer-meta">
            <span>${timeInfo.display}</span>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  if (sortSelect) sortSelect.addEventListener('change', sortAndRender);

  // Проверить, закреплено ли сообщение (и не истёк ли срок закрепления)
  function isMsgPinned(m) {
    return !!m.pinned && (!m.pinnedUntil || m.pinnedUntil > Date.now());
  }

  // Отсортировать и отрисовать список сообщений ленты/гостевой
  function sortAndRender() {
    const sortVal = sortSelect ? sortSelect.value : 'newest';
    const filteredList = currentMessagesList.filter(m => !blockedUsers.includes(m.author) && !m.image);
    const sortedList = [...filteredList];

    sortedList.sort((a, b) => {
      const aPin = isMsgPinned(a), bPin = isMsgPinned(b);
      if (aPin && !bPin) return -1;
      if (!aPin && bPin) return 1;

      const timeA = a.createdAt?.toMillis() || a.localTime || 0;
      const timeB = b.createdAt?.toMillis() || b.localTime || 0;
      const popA = getTotalReactions(a.reactions);
      const popB = getTotalReactions(b.reactions);

      if (sortVal === 'newest') return timeB - timeA;
      if (sortVal === 'oldest') return timeA - timeB;
      if (sortVal === 'popular') {
        if (popB !== popA) return popB - popA;
        return timeB - timeA;
      }
      return timeB - timeA;
    });

    renderGuestbook(sortedList);
  }

  // Отрисовать гостевую книгу
  function renderGuestbook(messagesToRender) {
    gbMessagesContainer.innerHTML = '';
    const isUserAdmin = isAdmin();

    messagesToRender.forEach((msg) => {
      const msgDiv = document.createElement('div');
      const isPinned = isMsgPinned(msg);
      msgDiv.className = isPinned ? 'gb-msg pinned-msg' : 'gb-msg';

      let reactionsHTML = '';
      if (msg.reactions) {
        for (const [emoji, count] of Object.entries(msg.reactions)) {
          const voteKey = `voted_${msg.id}_${emoji}`;
          const isMyVote = localStorage.getItem(voteKey) === 'true';
          const activeClass = isMyVote ? 'reaction-btn active' : 'reaction-btn';
          reactionsHTML += `<button class="${activeClass}" onclick="handleReaction('${msg.id}', '${emoji}')">${emoji} <span>${count}</span></button>`;
        }
      }

      const timeInfo = formatMessageTime(msg.createdAt, msg.localTime);

      let adminControlsHTML = '';
      if (isUserAdmin) {
        adminControlsHTML = `
          <button class="reaction-btn ${isPinned ? 'active' : ''}" onclick="togglePinMessage('${msg.id}', ${isPinned})" title="${isPinned ? 'Открепить' : 'Закрепить'}">📌</button>
          <button class="reaction-btn" style="color: var(--danger); border-color: var(--danger-bg);" onclick="deleteMessage('${msg.id}')" title="Удалить сообщение">🗑️</button>
        `;
      } else if (!isPinned && auth.currentUser && msg.userId === auth.currentUser.uid && canSelfPin()) {
        adminControlsHTML = `<button class="reaction-btn" onclick="selfPinMessage('${msg.id}')" title="Закрепить на 1 час (привилегия подписки)">📌 Закрепить</button>`;
      }

      const pinnedBadgeHTML = isPinned ? `<span style="background: rgba(59, 130, 246, 0.2); color: var(--accent); font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 700; margin-left: 6px;">📌 Закреплено</span>` : '';

      let avatarHTML = '';
      if (msg.avatarUrl) {
        avatarHTML = `<img src="${escapeHtml(msg.avatarUrl)}" alt="Avatar">`;
      } else {
        avatarHTML = (msg.author || 'A')[0].toUpperCase();
      }

      const safeAuthor = escapeHtml(msg.author || 'Пользователь');
      const safeUserId = escapeHtml(msg.userId || '');
      const safeAvatarUrl = escapeHtml(msg.avatarUrl || '');

      msgDiv.innerHTML = `
        <div class="gb-avatar ${premiumUsersMap[msg.userId] && premiumUsersMap[msg.userId].subTier === 'premium' ? 'avatar-frame-premium' : ''}" onclick="openUserProfile('${safeUserId}', '${safeAuthor}', '${safeAvatarUrl}')" title="Посмотреть профиль">${avatarHTML}</div>
        <div class="gb-content">
          <div class="gb-user-row">
            <span class="gb-author" ${getUserNameStyle(msg.userId)} onclick="openUserProfile('${safeUserId}', '${safeAuthor}', '${safeAvatarUrl}')" title="Посмотреть профиль">${safeAuthor}</span>${getUserBadgeHTML(msg.userId)}
            <span class="gb-time" title="${timeInfo.tooltip}">${timeInfo.display}</span>
            ${pinnedBadgeHTML}
          </div>
          <div class="gb-text">${escapeHtml(msg.text)}</div>
          <div class="gb-reactions">
            ${reactionsHTML}
            <div class="emoji-picker-container">
              <button class="reaction-btn" onclick="togglePicker('${msg.id}')">➕</button>
              <div class="emoji-picker-popup" id="picker-${msg.id}">
                <button class="picker-emoji-opt" onclick="handleReaction('${msg.id}', '👍')">👍</button>
                <button class="picker-emoji-opt" onclick="handleReaction('${msg.id}', '❤️')">❤️</button>
                <button class="picker-emoji-opt" onclick="handleReaction('${msg.id}', '🔥')">🔥</button>
                <button class="picker-emoji-opt" onclick="handleReaction('${msg.id}', '💀')">💀</button>
                <button class="picker-emoji-opt" onclick="handleReaction('${msg.id}', '🚀')">🚀</button>
                <button class="picker-emoji-opt" onclick="handleReaction('${msg.id}', '⭐')">⭐</button>
                <button class="picker-emoji-opt" onclick="handleReaction('${msg.id}', '💯')">💯</button>
              </div>
            </div>
            <button class="reaction-btn" onclick="reportMessage('${msg.id}')" title="Пожаловаться на спам / оскорбление">🚩</button>
            ${adminControlsHTML}
          </div>
        </div>
      `;
      gbMessagesContainer.appendChild(msgDiv);
    });
  }

  // Отрисовать сетку фотографий
  function renderPhotosGrid() {
    const grid = document.getElementById('photosGrid');
    if (!grid) return;
    grid.innerHTML = '';
    const isUserAdmin = isAdmin();

    let feedList = currentMessagesList.filter(m => {
      if (!m.image) return false;
      if (m.accessMode === 'link') return false;
      if (m.isExternalLink) return true;

      const img = m.image.toLowerCase();
      const isImage = img.startsWith('data:image/') || img.includes('image') || img.endsWith('.jpg') || img.endsWith('.png') || img.endsWith('.jpeg') || img.endsWith('.webp') || img.endsWith('.gif');
      const isVideo = img.startsWith('data:video/') || img.includes('video') || img.includes('.mp4') || img.includes('.webm') || img.includes('.mov');
      const isAudio = img.startsWith('data:audio/') || img.includes('audio') || img.includes('.mp3') || img.includes('.wav') || img.includes('.ogg');

      return isImage || isVideo || isAudio;
    });

    if (currentFeedType === 'image') {
      feedList = feedList.filter(m => {
        if (m.isExternalLink) return true;
        const img = m.image.toLowerCase();
        return img.startsWith('data:image/') || img.includes('image') || img.endsWith('.jpg') || img.endsWith('.png') || img.endsWith('.jpeg') || img.endsWith('.webp') || img.endsWith('.gif');
      });
    } else if (currentFeedType === 'video') {
      feedList = feedList.filter(m => {
        if (m.isExternalLink) return true;
        const img = m.image.toLowerCase();
        return img.startsWith('data:video/') || img.includes('video') || img.includes('.mp4') || img.includes('.webm') || img.includes('.mov');
      });
    } else if (currentFeedType === 'audio') {
      feedList = feedList.filter(m => {
        if (m.isExternalLink) return true;
        const img = m.image.toLowerCase();
        return img.startsWith('data:audio/') || img.includes('audio') || img.includes('.mp3') || img.includes('.wav') || img.includes('.ogg');
      });
    }

    const now = Date.now();
    feedList = feedList.filter(m => {
      const msgTime = m.createdAt?.toMillis() || m.localTime || now;
      const diffDays = (now - msgTime) / (1000 * 60 * 60 * 24);
      if (currentFeedTime === 'today') return diffDays <= 1;
      if (currentFeedTime === 'week') return diffDays <= 7;
      if (currentFeedTime === 'month') return diffDays <= 30;
      if (currentFeedTime === 'year') return diffDays <= 365;
      return true;
    });

    feedList.sort((a, b) => {
      const timeA = a.createdAt?.toMillis() || a.localTime || 0;
      const timeB = b.createdAt?.toMillis() || b.localTime || 0;
      const popA = getTotalReactions(a.reactions);
      const popB = getTotalReactions(b.reactions);

      if (currentFeedSort === 'best' || currentFeedSort === 'likes') return popB - popA;
      if (currentFeedSort === 'newest') return timeB - timeA;
      if (currentFeedSort === 'comments') return (b.text.length || 0) - (a.text.length || 0);
      return timeB - timeA;
    });

    if (feedList.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--muted); font-size: 14px;">В ленте по заданным фильтрам ничего нет. В ленте публикуются сугубо видео, фото и аудио файлы!</div>`;
      return;
    }

    feedList.forEach(p => {
      const card = document.createElement('div');
      card.className = 'photo-card';
      card.onclick = () => openViewPostModal(p.id);

      const timeInfo = formatMessageTime(p.createdAt, p.localTime);
      const parsed = parsePostContent(p);

      let adminDeletePhotoBtn = '';
      if (isUserAdmin) {
        adminDeletePhotoBtn = `
          <button onclick="event.stopPropagation(); deleteMessage('${p.id}')" title="Удалить пост" style="position: absolute; top: 10px; right: 10px; background: rgba(239, 68, 68, 0.9); border: none; color: #fff; padding: 5px 9px; border-radius: 6px; font-size: 11px; font-weight: 700; z-index: 20; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">🗑️ Удалить</button>
        `;
      }

      let previewContent = '';
      const imgLower = p.image.toLowerCase();
      if (p.isExternalLink) {
        previewContent = `<div style="height: 200px; display: flex; align-items: center; justify-content: center; background: rgba(59,130,246,0.1); color: var(--accent); font-size: 36px;">🔗</div>`;
      } else if (imgLower.startsWith('data:video/') || imgLower.includes('.mp4') || imgLower.includes('.webm')) {
        previewContent = `<video src="${p.image}" style="width: 100%; height: 200px; object-fit: cover;"></video>`;
      } else if (imgLower.startsWith('data:audio/') || imgLower.includes('.mp3') || imgLower.includes('.wav')) {
        previewContent = `<div style="height: 200px; display: flex; align-items: center; justify-content: center; background: rgba(59,130,246,0.1); color: var(--accent); font-size: 36px;">🎵 Аудио</div>`;
      } else {
        previewContent = `<div class="photo-img-container" style="background-image: url('${p.image}');"></div>`;
      }

      card.innerHTML = `
        ${adminDeletePhotoBtn}
        ${previewContent}
        <div class="photo-info">
          <div style="font-size: 12px; font-weight: 700; color: var(--accent);">@${escapeHtml(p.author)}</div>
          <div style="font-size: 14px; font-weight: 700; color: var(--text);">${escapeHtml(parsed.title)}</div>
          <div style="font-size: 11px; color: var(--muted); margin-top: 4px;">${timeInfo.display}</div>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  // Экранировать спецсимволы HTML, чтобы избежать XSS
  function escapeHtml(text) { return String(text || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  window.togglePicker = function(id) {
    document.querySelectorAll('.emoji-picker-popup').forEach(p => {
      if (p.id !== `picker-${id}`) p.classList.remove('show');
    });
    const picker = document.getElementById(`picker-${id}`);
    if (picker) picker.classList.toggle('show');
  };

  window.handleReaction = function(id, emoji) {
    const voteKey = `voted_${id}_${emoji}`;
    const hasVoted = localStorage.getItem(voteKey) === 'true';

    let totalUserVotesOnMsg = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`voted_${id}_`) && localStorage.getItem(key) === 'true') {
        totalUserVotesOnMsg++;
      }
    }

    const msgRef = db.collection('messages').doc(id);

    db.runTransaction(async (transaction) => {
      const doc = await transaction.get(msgRef);
      if (!doc.exists) return;
      let reactions = doc.data().reactions || {};

      if (hasVoted) {
        reactions[emoji] = (reactions[emoji] || 1) - 1;
        if (reactions[emoji] <= 0) delete reactions[emoji];
        transaction.update(msgRef, { reactions });
        localStorage.removeItem(voteKey);
      } else {
        if (totalUserVotesOnMsg >= maxReactionsForMe()) throw new Error('LIMIT_REACHED');
        reactions[emoji] = (reactions[emoji] || 0) + 1;
        transaction.update(msgRef, { reactions });
        localStorage.setItem(voteKey, 'true');
      }
    }).then(() => {
      const likeCountEl = document.getElementById(`reel_like_count_${id}`);
      if (likeCountEl) {
        db.collection('messages').doc(id).get().then(doc => {
          if (doc.exists) {
            const r = doc.data().reactions || {};
            likeCountEl.textContent = r['👍'] || r['❤️'] || 0;
          }
        });
      }
    }).catch(err => {
      console.error(err);
      if (err.message === 'LIMIT_REACHED') {
        showToast(`⚠️ Вы можете поставить максимум ${maxReactionsForMe()} реакции на один пост!`);
      } else {
        showToast('❌ Ошибка реакции');
      }
    });
  }

  // Максимально доступное число реакций для текущего пользователя (зависит от подписки)
  function maxReactionsForMe() {
    if (!currentUserProfile || !currentUserProfile.subTier || !currentUserProfile.subExpiresAt || currentUserProfile.subExpiresAt <= Date.now()) return 3;
    return currentUserProfile.subTier === 'premium' ? 8 : 5;
  }

  // ===================== КОРОБКА СЕКРЕТОВ / АНОНИМНЫЕ ПРИЗНАНИЯ =====================
  let currentSecretsList = [];

  // Слушаем коллекцию secrets в primaryDb (чтобы работало независимо от активного TG-аккаунта)
  primaryDb.collection('secrets').onSnapshot((snapshot) => {
    currentSecretsList = [];
    snapshot.forEach(doc => {
      currentSecretsList.push({ id: doc.id, ...doc.data() });
    });
    renderSecrets();
  }, (err) => {
    console.error('secrets snapshot error:', err);
  });

  const secretInputEl = document.getElementById('secretInput');
  if (secretInputEl) {
    secretInputEl.addEventListener('input', () => {
      const counter = document.getElementById('secretCharCounter');
      if (counter) counter.textContent = `${secretInputEl.value.length} / 500`;
    });
  }

  window.submitSecret = function() {
    const text = (document.getElementById('secretInput').value || '').trim();
    if (!text) {
      showToast('⚠️ Напишите текст признания');
      return;
    }
    if (text.length < 10) {
      showToast('⚠️ Слишком коротко — минимум 10 символов');
      return;
    }

    // Кулдаун зависит от тарифа: free — 2 мин, lite — 1 мин, premium — без ожидания
    const mySub = (currentUserProfile && currentUserProfile.subTier && currentUserProfile.subExpiresAt && currentUserProfile.subExpiresAt > Date.now()) ? currentUserProfile.subTier : 'free';
    const cooldownMs = mySub === 'premium' ? 0 : (mySub === 'lite' ? 60 * 1000 : 2 * 60 * 1000);

    const lastSent = Number(localStorage.getItem('last_secret_sent') || 0);
    if (cooldownMs > 0 && Date.now() - lastSent < cooldownMs) {
      const waitMin = Math.ceil((cooldownMs - (Date.now() - lastSent)) / 60000);
      showToast(`⏳ Подождите ещё немного перед следующим сообщением`);
      return;
    }

    const btn = document.getElementById('secretSendBtn');
    if (btn) btn.disabled = true;
    showActionLoader('Отправка в коробку...');

    primaryDb.collection('secrets').add({
      text: text,
      status: 'pending', // pending | approved | rejected
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      localTime: Date.now(),
      // Не сохраняем userId / author — полная анонимность. Тег тарифа — только для приоритета модерации.
      authorTier: mySub === 'free' ? null : mySub,
      moderatedAt: null
    }).then(() => {
      hideActionLoader();
      localStorage.setItem('last_secret_sent', String(Date.now()));
      document.getElementById('secretInput').value = '';
      const counter = document.getElementById('secretCharCounter');
      if (counter) counter.textContent = '0 / 500';
      if (btn) btn.disabled = false;
      showToast('✅ Сообщение отправлено на модерацию. Оно появится после проверки.');
    }).catch(err => {
      hideActionLoader();
      console.error(err);
      if (btn) btn.disabled = false;
      showToast('❌ Ошибка отправки. Попробуйте позже.');
    });
  };

  window.approveSecret = function(id) {
    if (!isAdmin()) {
      showToast('❌ Недостаточно прав');
      return;
    }
    primaryDb.collection('secrets').doc(id).update({
      status: 'approved',
      moderatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      showToast('✅ Секрет опубликован');
    }).catch(err => {
      console.error(err);
      showToast('❌ Ошибка');
    });
  };

  window.rejectSecret = function(id) {
    if (!isAdmin()) {
      showToast('❌ Недостаточно прав');
      return;
    }
    if (!confirm('Отклонить и удалить это сообщение?')) return;
    primaryDb.collection('secrets').doc(id).delete().then(() => {
      showToast('🗑️ Сообщение отклонено и удалено');
    }).catch(err => {
      console.error(err);
      showToast('❌ Ошибка');
    });
  };

  window.deleteSecret = function(id) {
    if (!isAdmin()) {
      showToast('❌ Недостаточно прав');
      return;
    }
    if (!confirm('Удалить опубликованный секрет?')) return;
    primaryDb.collection('secrets').doc(id).delete().then(() => {
      showToast('🗑️ Удалено');
    }).catch(err => {
      console.error(err);
      showToast('❌ Ошибка');
    });
  };

  // Отрисовать список анонимных признаний
  function renderSecrets() {
    const listEl = document.getElementById('secretsList');
    const pendingEl = document.getElementById('secretsPendingList');
    const adminSection = document.getElementById('secretsAdminSection');
    if (!listEl) return;

    const admin = isAdmin();
    if (adminSection) {
      adminSection.style.display = admin ? 'block' : 'none';
    }

    const sortVal = (document.getElementById('secretsSortSelect') || {}).value || 'newest';

    // --- Pending for admins ---
    if (admin && pendingEl) {
      const pending = currentSecretsList.filter(s => s.status === 'pending');
      // Приоритет: сначала premium, потом lite, потом остальные — внутри группы по свежести
      const tierRank = t => t === 'premium' ? 0 : (t === 'lite' ? 1 : 2);
      pending.sort((a, b) => {
        const r = tierRank(a.authorTier) - tierRank(b.authorTier);
        return r !== 0 ? r : (b.localTime || 0) - (a.localTime || 0);
      });
      if (pending.length === 0) {
        pendingEl.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 16px;">Нет сообщений на модерации 👍</div>';
      } else {
        pendingEl.innerHTML = '';
        pending.forEach(s => {
          const timeInfo = formatMessageTime(s.createdAt, s.localTime);
          const isPriority = s.authorTier === 'premium' || s.authorTier === 'lite';
          const priorityTag = s.authorTier === 'premium' ? '👑 Premium' : (s.authorTier === 'lite' ? '✓ Lite' : '');
          const div = document.createElement('div');
          div.style.cssText = isPriority
            ? 'background: rgba(250,204,21,0.08); border: 2px solid rgba(250,204,21,0.5); border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 10px;'
            : 'background: rgba(245,158,11,0.06); border: 1px solid rgba(245,158,11,0.3); border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 10px;';
          div.innerHTML = `
            <div style="font-size: 11px; color: var(--muted); display: flex; justify-content: space-between;"><span>${timeInfo.display}</span>${priorityTag ? `<span style="color:#facc15; font-weight:700;">${priorityTag}</span>` : ''}</div>
            <div style="font-size: 14px; color: var(--text); line-height: 1.45; white-space: pre-wrap; word-break: break-word;">${escapeHtml(s.text)}</div>
            <div style="display: flex; gap: 8px; justify-content: flex-end;">
              <button class="reaction-btn" style="color: var(--danger); border-color: rgba(239,68,68,0.35);" onclick="rejectSecret('${s.id}')">❌ Отклонить</button>
              <button class="reaction-btn" style="color: #16a34a; border-color: rgba(22,163,74,0.35);" onclick="approveSecret('${s.id}')">✅ Опубликовать</button>
            </div>
          `;
          pendingEl.appendChild(div);
        });
      }
    }

    // --- Approved list ---
    let approved = currentSecretsList.filter(s => s.status === 'approved');
    approved.sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() || a.localTime || 0;
      const tb = b.createdAt?.toMillis?.() || b.localTime || 0;
      return sortVal === 'oldest' ? ta - tb : tb - ta;
    });

    if (approved.length === 0) {
      listEl.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 28px;">Пока нет опубликованных секретов. Станьте первым — напишите анонимно выше.</div>';
      return;
    }

    listEl.innerHTML = '';
    approved.forEach(s => {
      const timeInfo = formatMessageTime(s.createdAt, s.localTime);
      const div = document.createElement('div');
      div.className = 'gb-msg';
      div.style.cssText = 'display:flex; gap:12px; padding:14px; background: rgba(150,150,150,0.03); border: 1px solid var(--card-border); border-radius: 10px;';
      const adminDel = admin
        ? `<button class="reaction-btn" style="color: var(--danger); margin-top: 8px;" onclick="deleteSecret('${s.id}')" title="Удалить">🗑️</button>`
        : '';
      div.innerHTML = `
        <div class="gb-avatar" style="background: linear-gradient(135deg, #6366f1, #a855f7); color:#fff; font-size:16px;">🤫</div>
        <div class="gb-content" style="flex:1;">
          <div class="gb-user-row">
            <span class="gb-author" style="color: var(--muted);">Аноним</span>
            <span class="gb-time" title="${timeInfo.tooltip}">${timeInfo.display}</span>
          </div>
          <div class="gb-text" style="white-space: pre-wrap;">${escapeHtml(s.text)}</div>
          ${adminDel}
        </div>
      `;
      listEl.appendChild(div);
    });
  }
  // ===================== /КОРОБКА СЕКРЕТОВ =====================

