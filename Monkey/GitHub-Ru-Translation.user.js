// ==UserScript==
// @name            GitHub Russian Translation
// @name:ru         Русификатор GitHub
// @author          Rushan "Deflecta" M
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
// @require         https://raw.githubusercontent.com/RushanM/GitHub-Russian-Translation/refs/heads/modules/Monkey/modules/fluent-translator.js
// @require         https://raw.githubusercontent.com/RushanM/GitHub-Russian-Translation/refs/heads/modules/Monkey/modules/utils.js
// @require         https://raw.githubusercontent.com/RushanM/GitHub-Russian-Translation/refs/heads/modules/Monkey/modules/translators.js
// @require         https://raw.githubusercontent.com/RushanM/GitHub-Russian-Translation/refs/heads/modules/Monkey/modules/observers.js
// ==/UserScript==

(function () {
    'use strict';

    // путь к файлу Fluent
    const ftlPath = "https://raw.githubusercontent.com/RushanM/GitHub-Russian-Translation/refs/heads/modules/%D0%9E%D0%B1%D1%89%D0%B5%D0%B5/ru-ru.ftl";
    
    // для обратной совместимости также загружаем JSON версию
    const jsonPath = "https://raw.githubusercontent.com/RushanM/GitHub-Russian-Translation/refs/heads/modules/%D0%9E%D0%B1%D1%89%D0%B5%D0%B5/rus_p.json";

    // загружаем переводы с файла Fluent
    async function loadAndInitializeTranslations() {
        try {
            // загружаем библиотеку Fluent перед загрузкой переводов
            await FluentTranslationModule.loadFluentLibrary();
            
            // теперь загружаем переводы
            const success = await FluentTranslationModule.loadTranslations(ftlPath);
            
            if (!success) {
                console.warn('Не удалось загрузить файл FTL, пытаюсь загрузить файл JSON…');
                return loadJsonFallback();
            }
            
            // запускаем перевод и наблюдение за DOM
            startTranslation();
        } catch (error) {
            console.error('Ошибка при загрузке Fluent переводов:', error);
            loadJsonFallback();
        }
    }
    
    // запускаем загрузку переводов
    loadAndInitializeTranslations();

    // загрузка файла JSON (запасной вариант)
    function loadJsonFallback() {
        return fetch(jsonPath)
            .then(response => response.json())
            .then(data => {
                // сохраняем переводы во внешних переменных
                window.dashboardCopilotTranslation = data.dashboard["Chat with Copilot"];
                window.dashboardHomeTranslation = data.dashboard["Home"];
                
                // объединяем секции словаря в один объект
                const translations = TranslationUtils.mergeTranslations(data);

                // запускаем перевод и наблюдение за DOM
                startTranslationWithJson(translations);
            })
            .catch(error => {
                console.error('Не удалось загрузить переводы:', error);
            });
    }

    // запуск перевода с помощью Fluent
    function startTranslation() {
        // устанавливаем переводы для транслятора
        GitHubTranslator.init({});
        
        // запускаем наблюдатели с пустым объектом переводов,
        // т. к. теперь они будут получать переводы через FluentTranslationModule
        DOMObservers.startObserving({});

        // блок для перевода Dashboard
        function translateDashboardBreadcrumbs() {
            // переводим основную крошку
            document.querySelectorAll('.AppHeader-context-item-label').forEach(el => {
                if (el.textContent.trim() === 'Dashboard') {
                    el.textContent = FluentTranslationModule.getMessage('dashboard-title');
                }
            });
            
            // переводим выпадающее меню
            document.querySelectorAll('.ActionListItem-label').forEach(el => {
                if (el.textContent.trim() === 'Dashboard') {
                    el.textContent = FluentTranslationModule.getMessage('dashboard-title');
                }
            });
            
            // переводим tool-tip
            document.querySelectorAll('tool-tip[role="tooltip"], tool-tip.sr-only').forEach(el => {
                if (el.textContent.trim() === 'Dashboard') {
                    el.textContent = FluentTranslationModule.getMessage('dashboard-title');
                }
            });
        }

        // вызываем перевод сразу и при мутациях
        translateDashboardBreadcrumbs();
        const dashboardObserver = new MutationObserver(translateDashboardBreadcrumbs);
        dashboardObserver.observe(document.body, { childList: true, subtree: true });
        
        // вызываем трансформацию строк с автором темы при загрузке страницы
        DOMObservers.transformIssueAuthorStrings({});
        
        // устанавливаем интервал для периодической проверки новых строк с автором
        setInterval(() => {
            DOMObservers.transformIssueAuthorStrings({});
            translateDashboardBreadcrumbs();
        }, 2000);
    }

    // запуск перевода с помощью JSON (для обратной совместимости)
    function startTranslationWithJson(translations) {
        // запускаем перевод и наблюдение за DOM
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

        // вызываем перевод сразу и при мутациях
        translateDashboardBreadcrumbs();
        const dashboardObserver = new MutationObserver(translateDashboardBreadcrumbs);
        dashboardObserver.observe(document.body, { childList: true, subtree: true });
        
        // вызываем трансформацию строк с автором темы при загрузке страницы
        DOMObservers.transformIssueAuthorStrings(translations);
        
        // устанавливаем интервал для периодической проверки новых строк с автором
        setInterval(() => {
            DOMObservers.transformIssueAuthorStrings(translations);
            translateDashboardBreadcrumbs();
        }, 2000);
    }
})();