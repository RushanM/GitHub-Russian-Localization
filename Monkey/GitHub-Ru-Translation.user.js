// ==UserScript==
// @name            GitHub Russian Translation
// @name:ru         Русификатор GitHub
// @author          Deflecta
// @contributionURL https://boosty.to/rushanm
// @description     Translates GitHub websites into Russian
// @description:ru  Переводит сайты GitHub на русский язык
// @downloadURL     https://github.com/RushanM/GitHub-Russian-Translation/raw/main/GitHub%20Ru%20Translation.user.js
// @grant           none
// @homepageURL     https://github.com/RushanM/GitHub-Russian-Translation
// @icon            https://github.githubassets.com/favicons/favicon.png
// @license         MIT
// @match           https://github.com/*
// @match           https://github.blog/*
// @match           https://education.github.com/*
// @run-at          document-end
// @namespace       githubrutraslation
// @supportURL      https://github.com/RushanM/GitHub-Russian-Translation/issues
// @updateURL       https://github.com/RushanM/GitHub-Russian-Translation/raw/main/GitHub%20Ru%20Translation.user.js
// @version         1-B28
// @require         https://raw.githubusercontent.com/RushanM/GitHub-Russian-Translation/refs/heads/modules/Monkey/modules/utils.js
// @require         https://raw.githubusercontent.com/RushanM/GitHub-Russian-Translation/refs/heads/modules/Monkey/modules/translators.js
// @require         https://raw.githubusercontent.com/RushanM/GitHub-Russian-Translation/refs/heads/modules/Monkey/modules/observers.js
// ==/UserScript==

(function () {
    'use strict';
    
    // Добавляем шрифт Inter для лучшего отображения кириллицы
    const interFontLink = document.createElement('link');
    interFontLink.rel = 'stylesheet';
    interFontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap';
    document.head.appendChild(interFontLink);

    // Загружаем переводы и инициализируем переводчик
    let translations = {};
    fetch("https://raw.githubusercontent.com/RushanM/GitHub-Russian-Translation/refs/heads/modules/%D0%9E%D0%B1%D1%89%D0%B5%D0%B5/rus_p.json")
        .then(response => response.json())
        .then(data => {
            // Сохраняем переводы во внешних переменных
            window.dashboardCopilotTranslation = data.dashboard["Chat with Copilot"];
            window.dashboardHomeTranslation = data.dashboard["Home"];
            
            // Объединяем секции словаря в один объект
            translations = TranslationUtils.mergeTranslations(data);
            
            // Запускаем перевод и наблюдение за DOM
            GitHubTranslator.init(translations);
            DOMObservers.startObserving(translations);

            // блок для перевода Dashboard
            function translateDashboardBreadcrumbs() {
                // переводим основную крошку
                document.querySelectorAll('.AppHeader-context-item-label').forEach(el => {
                    if (el.textContent.trim() === 'Dashboard' && translations['Dashboard']) {
                        el.textContent = translations['Dashboard'];
                    }
                });
                // переводим выпадающее меню
                document.querySelectorAll('.ActionListItem-label').forEach(el => {
                    if (el.textContent.trim() === 'Dashboard' && translations['Dashboard']) {
                        el.textContent = translations['Dashboard'];
                    }
                });
                // переводим tool-tip
                document.querySelectorAll('tool-tip[role="tooltip"], tool-tip.sr-only').forEach(el => {
                    if (el.textContent.trim() === 'Dashboard' && translations['Dashboard']) {
                        el.textContent = translations['Dashboard'];
                    }
                });
            }

            // Вызываем перевод сразу и при мутациях
            translateDashboardBreadcrumbs();
            const dashboardObserver = new MutationObserver(translateDashboardBreadcrumbs);
            dashboardObserver.observe(document.body, { childList: true, subtree: true });
            
            // Вызываем трансформацию строк с автором темы при загрузке страницы
            DOMObservers.transformIssueAuthorStrings(translations);
            
            // Устанавливаем интервал для периодической проверки новых строк с автором
            setInterval(() => {
                DOMObservers.transformIssueAuthorStrings(translations);
                translateDashboardBreadcrumbs();
            }, 2000);
        });
})();