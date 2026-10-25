document.addEventListener('DOMContentLoaded', () => {
  // ================= 1. LOCALIZATION =================
  const langBtn = document.getElementById('lang-btn');
  const langMenu = document.getElementById('lang-menu');
  const langCurrent = document.getElementById('lang-current');
  
  let currentLang = 'en';
  const userLangs = navigator.languages || [navigator.language];
  
  for (const lang of userLangs) {
    const lowerLang = lang.toLowerCase();
    if (lowerLang.startsWith('ru')) {
      currentLang = 'ru';
      break;
    }
    if (lowerLang.startsWith('en')) {
      currentLang = 'en';
      break;
    }
  }

  const langCurrentEl = document.getElementById('lang-current');
  if (langCurrentEl) {
    langCurrentEl.textContent = currentLang.toUpperCase();
  }
  document.documentElement.lang = currentLang;
  let translations = {};

  async function loadLocale(lang) {
    try {
      const response = await fetch(`locales/${lang}.json`);
      if (!response.ok) throw new Error('Network response was not ok');
      translations = await response.json();
      
      applyTranslations();
      
      renderRoadmap(); 
      renderFeatures();
      
    } catch (error) {
      console.error(`Can't load localization for ${lang}:`, error);
    }
  }

  function applyTranslations() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
      const key = el.getAttribute('data-i18n');
      const keys = key.split('.');
      let value = translations;
      for (const k of keys) {
        if (value && value[k] !== undefined) {
          value = value[k];
        } else { value = null; break; }
      }
      if (value) el.innerHTML = value;
    });
  }

  if (langBtn && langMenu) {
    langBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      langMenu.classList.toggle('hidden');
    });

    langMenu.querySelectorAll('button').forEach(item => {
      item.addEventListener('click', (e) => {
        const selectedLang = e.target.dataset.lang;
        if (selectedLang !== currentLang) {
          currentLang = selectedLang;
          langCurrent.textContent = currentLang.toUpperCase();
          document.documentElement.lang = currentLang;
          loadLocale(currentLang);
        }
        langMenu.classList.add('hidden');
      });
    });

    document.addEventListener('click', (e) => {
      if (!langMenu.contains(e.target) && !langBtn.contains(e.target)) {
        langMenu.classList.add('hidden');
      }
    });
  }


  // ================= 2. ROADMAP =================
  let roadmapData = [];

  async function loadRoadmapData() {
    try {
      const indexResponse = await fetch('data/roadmap/index.json');
      if (!indexResponse.ok) throw new Error('Index not found');
      const versionFiles = await indexResponse.json();

      const filePromises = versionFiles.map(fileName => 
        fetch(`data/roadmap/${fileName}.json`).then(res => {
          if (!res.ok) throw new Error(`Failed to load ${fileName}`);
          return res.json();
        })
      );

      roadmapData = await Promise.all(filePromises);
      
      roadmapData.sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));

      renderRoadmap();
    } catch (error) {
      console.error('Ошибка загрузки Roadmap:', error);
      const errorMsg = translations?.errors?.roadmapLoad || "Ошибка загрузки данных.";
      document.getElementById('roadmap-list').innerHTML = `
        <div class="bg-[#111111] border border-red-500/20 text-red-400 rounded-xl p-6 text-center">
          ${errorMsg}
        </div>
      `;
    }
  }

  function renderRoadmap() {
    const container = document.getElementById('roadmap-list');
    if (!container || !roadmapData.length) return;

    container.innerHTML = '';

    const sortedData = [...roadmapData].sort((a, b) => 
      b.version.localeCompare(a.version, undefined, { numeric: true })
    );

    const currentVersion = sortedData.find(item => item.current === true);
    const inProgressVersion = sortedData.find(item => item.status === 'in-progress');
    
    const plannedVersions = sortedData
      .filter(item => item.status === 'planned')
      .sort((a, b) => a.version.localeCompare(b.version, undefined, { numeric: true }));
      
    const releasedVersions = sortedData.filter(item => item.status === 'released' && item.current !== true);

    const createCard = (item, isInsideGroup = false) => {
      let statusColor = "bg-slate-500";
      let iconName = "calendar-clock";
      let iconColor = "text-slate-400";
      
      if (item.status === 'released') {
        statusColor = "bg-green-500";
        iconName = "check-circle-2";
        iconColor = "text-green-500";
      } else if (item.status === 'in-progress') {
        statusColor = "bg-blue-500";
        iconName = "timer";
        iconColor = "text-blue-500";
      }

      const statusText = translations?.roadmap?.status?.[item.status] || item.status;
      const dateStr = item.date || item.date_range || '';
      const titleStr = item.title[currentLang] || item.title['en'];
      const detailsArray = item.details[currentLang] || item.details['en'];
      const isCurrent = item.current === true;

      const currentBadge = isCurrent 
        ? `<span class="inline-block w-max px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-white text-blue-600 rounded shadow-sm">${translations?.roadmap?.currentVersion || 'Latest'}</span>` 
        : '';

      const detailIconColor = isCurrent ? "text-white/80" : iconColor;
      const detailTextColor = isCurrent ? "text-white/90" : "text-slate-300";

      const detailsHtml = detailsArray.map(detail => `
        <li class="flex items-start gap-2 mb-2">
          <i data-lucide="${iconName}" class="w-4 h-4 ${detailIconColor} shrink-0 mt-0.5"></i>
          <span class="text-sm ${detailTextColor}">${detail}</span>
        </li>
      `).join('');

      let downloadBtn = '';
      if (item.download_url) {
        const btnClasses = isCurrent
          ? "inline-flex items-center gap-2 bg-white text-blue-600 hover:bg-blue-50 px-5 py-2.5 rounded-lg font-black uppercase tracking-wider text-[11px] transition-colors shadow-sm mt-4"
          : "inline-flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-500 px-5 py-2.5 rounded-lg font-black uppercase tracking-wider text-[11px] transition-colors shadow-[0_0_10px_rgba(37,99,235,0.3)] mt-4";
          
        downloadBtn = `
          <div class="pt-4 flex justify-end">
            <a href="${item.download_url}" target="_blank" rel="noopener" class="${btnClasses}">
              <i data-lucide="download" class="w-4 h-4"></i>
              ${translations?.roadmap?.download || 'Download'}
            </a>
          </div>
        `;
      }

      const wrapper = document.createElement('div');
      wrapper.className = "relative";

      const card = document.createElement('details');
      
      if (isInsideGroup) {
        card.className = `group bg-[#0a0a0a] border border-white/5 rounded-lg transition-all duration-300 open:border-white/10 open:bg-[#0d0d0d] ${isCurrent ? '!bg-blue-600 !border-blue-500' : ''}`;
      } else {
        card.className = isCurrent 
          ? "group w-full overflow-hidden bg-blue-600 border border-blue-500 rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(37,99,235,0.2)]"
          : "group w-full bg-[#111111] border border-white/10 rounded-xl transition-all duration-300 open:border-blue-500/50 open:bg-[#151515]";
      }
      
      card.innerHTML = `
        <summary class="flex items-center justify-between p-5 pl-6 cursor-pointer list-none select-none gap-4">
          <div class="flex items-center gap-4">
            ${!isInsideGroup ? `
              <div class="flex flex-col items-start gap-1.5 shrink-0 min-w-[100px]">
                ${currentBadge}
                <div class="flex items-center gap-2 px-2.5 py-1 rounded-md border ${
                  isCurrent ? 'bg-black/20 border-white/20' : 'bg-[#1d293d] border-white/5'
                }">
                  <div class="w-2 h-2 rounded-full ${isCurrent ? 'bg-white' : statusColor}"></div>
                  <span class="text-[10px] font-black uppercase tracking-wider ${isCurrent ? 'text-white' : 'text-slate-300'}">${statusText}</span>
                </div>
              </div>
            ` : ''}
            
            <div>
              <h3 class="text-lg font-bold text-white">v${item.version} — ${titleStr}</h3>
              <p class="text-xs mt-0.5 ${isCurrent ? 'text-blue-100' : 'text-slate-400'}">${dateStr}</p>
            </div>
          </div>
          <div class="w-8 h-8 shrink-0 rounded-full flex items-center justify-center group-open:rotate-180 transition-transform ${
            isCurrent ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-400'
          }">
            <i data-lucide="chevron-down" class="w-4 h-4"></i>
          </div>
        </summary>
        
        <div class="px-6 pb-5 pt-2 border-t ${isCurrent ? 'border-white/20' : 'border-white/5'}">
          <ul class="mt-2">${detailsHtml}</ul>
          ${downloadBtn}
        </div>
      `;

      if (isCurrent) {
        const stripe = document.createElement('div');
        stripe.className = "absolute left-0 top-2 bottom-2 w-1.5 bg-white rounded-r-full z-20 transition-all duration-300 pointer-events-none";
        wrapper.appendChild(stripe);
      }

      wrapper.appendChild(card);
      return wrapper;
    };

    const createGroup = (title, items, iconName) => {
      if (!items.length) return null;
      
      const group = document.createElement('details');
      group.className = "group bg-[#111111] border border-white/10 rounded-xl transition-all duration-300 open:border-blue-500/30";
      
      group.innerHTML = `
        <summary class="flex items-center justify-between p-5 cursor-pointer list-none select-none">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
              <i data-lucide="${iconName}" class="w-4 h-4 text-slate-400"></i>
            </div>
            <h3 class="text-lg font-bold text-white">${title}</h3>
            <span class="px-2 py-0.5 text-xs font-bold bg-white/5 text-slate-400 rounded-md">${items.length}</span>
          </div>
          <div class="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-open:rotate-180 transition-transform">
            <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400"></i>
          </div>
        </summary>
        <div class="px-4 pb-4 pt-2 flex flex-col gap-3">
          <!-- Сюда будут вставляться карточки -->
        </div>
      `;
      
      const contentDiv = group.querySelector('div.flex-col');
      items.forEach(item => {
        contentDiv.appendChild(createCard(item, true));
      });

      return group;
    };

    if (currentVersion) {
      container.appendChild(createCard(currentVersion));
    }

    if (inProgressVersion) {
      container.appendChild(createCard(inProgressVersion));
    }

    const plannedGroup = createGroup(translations?.roadmap?.groups?.planned || 'Planned', plannedVersions, 'calendar');
    if (plannedGroup) container.appendChild(plannedGroup);

    const releasedGroup = createGroup(translations?.roadmap?.groups?.released || 'Past versions', releasedVersions, 'archive');
    if (releasedGroup) container.appendChild(releasedGroup);

    lucide.createIcons();
  }


  // ================= 3. FEATURES =================
  let featuresData = [];

  async function loadFeaturesData() {
    try {
      const response = await fetch('data/features.json');
      if (!response.ok) throw new Error('Features not found');
      featuresData = await response.json();
      renderFeatures();
    } catch (error) {
      console.error('Failed load for Features:', error);
      const errorMsg = translations?.errors?.featuresLoad || "Error loading data...";
      const container = document.getElementById('features-list');
      if (container) {
        container.innerHTML = `
          <div class="bg-[#111111] border border-red-500/20 text-red-400 rounded-xl p-6 text-center col-span-full">
            ${errorMsg}
          </div>
        `;
      }
    }
  }

    function renderFeatures() {
    const container = document.getElementById('features-list');
    if (!container || !featuresData.length) return;

    container.innerHTML = '';

    featuresData.forEach((item) => {
      const titleStr = item.title[currentLang] || item.title['en'];
      const descStr = item.description[currentLang] || item.description['en'];
      const iconName = item.icon || 'box';

      const card = document.createElement('div');
      card.className = "bg-[#111111] border border-white/10 rounded-xl p-5 flex flex-col gap-3 hover:border-blue-500/30 transition-colors";
      
      card.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-600/20 flex items-center justify-center shrink-0">
            <i data-lucide="${iconName}" class="w-4 h-4 text-blue-500"></i>
          </div>
          <h3 class="text-base font-bold text-white leading-tight">${titleStr}</h3>
        </div>
        
        <div>
          <p class="text-sm text-slate-400 leading-relaxed">${descStr}</p>
        </div>
      `;

      container.appendChild(card);
    });

    lucide.createIcons();
  }


  // ================= 4. OTHER =================
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const burger = document.getElementById('burger');
  const mobileMenu = document.getElementById('mobile-menu');
  
  if (burger && mobileMenu) {
    burger.addEventListener('click', () => {
      const isHidden = mobileMenu.classList.contains('hidden');
      if (isHidden) {
        mobileMenu.classList.remove('hidden');
        burger.setAttribute('aria-expanded', 'true');
      } else {
        mobileMenu.classList.add('hidden');
        burger.setAttribute('aria-expanded', 'false');
      }
    });

    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }


  // ================= 5. INITIALIZATION =================
  loadLocale(currentLang);
  loadRoadmapData();
  loadFeaturesData();
});