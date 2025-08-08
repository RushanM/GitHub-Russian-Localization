// проверка включения/выключения перевода
let translationEnabled = true;
let observer = null;

// загружаем библиотеку Fluent
async function loadFluentLibrary() {
    // проверяем, если библиотека уже загружена
    if (window.FluentBundle) {
        return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
        try {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@fluent/bundle@0.19.1/index.js';
            script.async = true;
            script.crossOrigin = 'anonymous';
            
            script.onload = () => {
                console.log('Библиотека Fluent успешно загружена');
                resolve();
            };
            
            script.onerror = (error) => {
                console.error('Не удалось загрузить библиотеку Fluent:', error);
                reject(new Error('Не удалось загрузить библиотеку Fluent'));
            };
            
            document.head.appendChild(script);
        } catch (error) {
            console.error('Ошибка при загрузке библиотеки Fluent:', error);
            reject(error);
        }
    });
}

// проверяем сохранённое состояние при загрузке
browser.storage.local.get('enabled').then(result => {
    translationEnabled = result.enabled !== undefined ? result.enabled : true;
    if (translationEnabled) {
        initTranslation();
    }
});

// слушаем сообщения от popup.js
browser.runtime.onMessage.addListener(function (message) {
    if (message.action === "toggleTranslation") {
        translationEnabled = message.enabled;

        if (translationEnabled) {
            initTranslation();
        } else {
            disableTranslation();
        }
    }
    return Promise.resolve({ response: "Состояние изменено" });
});

// функция выключения перевода
function disableTranslation() {
    if (observer) {
        // останавливаем наблюдатель
        observer.disconnect();
        observer = null;
    }

    window.location.reload();
}

// загрузка и инициализация локализации в формате Fluent
async function loadFluentTranslations() {
    try {
        // загрузим библиотеку Fluent, если её ещё нет
        if (!window.FluentBundle) {
            console.log('Библиотека Fluent не загружена, пытаюсь загрузить...');
            await loadFluentLibrary();
        }
        
        // проверяем ещё раз после попытки загрузки
        if (!window.FluentBundle) {
            console.error('Не удалось загрузить библиотеку Fluent');
            return null;
        }
        
        const { FluentBundle, FluentResource } = window.FluentBundle;
        
        // загружаем файл FTL
        const response = await fetch("https://raw.githubusercontent.com/RushanM/GitHub-Russian-Translation/refs/heads/master/%D0%9E%D0%B1%D1%89%D0%B5%D0%B5/ru-ru.ftl");
        if (!response.ok) {
            console.error('Ошибка загрузки файла локализации:', response.statusText);
            return null;
        }
        
        const ftlContent = await response.text();
        
        // создаём сборку с русской локализацией
        const bundle = new FluentBundle('ru');
        const resource = new FluentResource(ftlContent);
        
        // добавляем ресурс в сборку
        const errors = bundle.addResource(resource);
        if (errors.length) {
            console.warn('Ошибки при синтаксическом анализе файла FTL:', errors);
        }
        
        return bundle;
    } catch (error) {
        console.error('Ошибка загрузки переводов с файла Fluent:', error);
        return null;
    }
}

// функция инициализации всего перевода
async function initTranslation() {
    'use strict';

    // сначала пробуем загрузить локализацию с файла Fluent
    const fluentBundle = await loadFluentTranslations();
    
    // если не удалось загрузить Fluent, загружаем JSON как запасной вариант
    if (!fluentBundle) {
        // загружаем переводы из удалённого файла rus_p.json и объединяем все секции
        fetch("https://raw.githubusercontent.com/RushanM/GitHub-Russian-Translation/refs/heads/master/%D0%9E%D0%B1%D1%89%D0%B5%D0%B5/rus_p.json")
            .then(response => response.json())
            .then(data => {
                // сохраняем перевод из dashboard для Chat with Copilot
                window.dashboardCopilotTranslation = data.dashboard["Chat with Copilot"];
                // сохраняем перевод из dashboard для Home
                window.dashboardHomeTranslation = data.dashboard["Home"];
                const translations = Object.assign(
                    {},
                    data.dashboard,
                    data.search,
                    data.left_sidebar,
                    data.settings,
                    data.repo_tabs,
                    data.copilot,
                    data.createnew,
                    data.right_sidebar,
                    data.copilot_openwith,
                    data.general
                );
                runTranslationWithJson(translations);
            });
    } else {
        // запускаем перевод с Fluent
        runTranslationWithFluent(fluentBundle);
    }

    // функция перевода с использованием Fluent
    function runTranslationWithFluent(bundle) {
        // вспомогательная функция для получения перевода
        function getMessage(id, args = null) {
            const message = bundle.getMessage(id);
            if (!message) {
                return id;
            }
            
            try {
                const formatted = bundle.formatPattern(message.value, args);
                return formatted;
            } catch (e) {
                console.warn(`Ошибка форматирования сообщения '${id}':`, e);
                return id;
            }
        }
        
        // функция склонения репозиториев
        function getRepositoriesTranslation(count) {
            return getMessage('repositories-one', { count });
        }
        
        // словарь соответствия старых ключей новым
        const keyMap = {
            'Dashboard': 'dashboard-title',
            'Chat with Copilot': 'dashboard-chat-with-copilot',
            'Home': 'dashboard-home',
            'Filter': 'dashboard-filter',
            'Issues': 'left-sidebar-issues',
            'Pull requests': 'left-sidebar-pull-requests',
            'Projects': 'left-sidebar-projects',
            'Discussions': 'left-sidebar-discussions',
            'Codespaces': 'left-sidebar-codespaces',
            'Copilot': 'left-sidebar-copilot',
            'Settings': 'copilot-settings',
            'Sign out': 'right-sidebar-sign-out',
            'Releases': 'repo-tabs-releases',
        };
        
        // функция для перевода текстовых узлов
        function translateTextNodes() {
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: function(node) {
                        if (!node.textContent.trim() || 
                            node.parentElement.tagName === 'SCRIPT' || 
                            node.parentElement.tagName === 'STYLE') {
                            return NodeFilter.FILTER_REJECT;
                        }
                        return NodeFilter.FILTER_ACCEPT;
                    }
                }
            );
            
            let currentNode;
            while (currentNode = walker.nextNode()) {
                if (isExcludedElement(currentNode.parentElement)) {
                    continue;
                }
                
                const text = currentNode.textContent.trim();
                if (!text) continue;
                
                // проверяем, есть ли ключ в словаре соответствия
                if (keyMap[text]) {
                    const translation = getMessage(keyMap[text]);
                    if (translation && translation !== text) {
                        currentNode.textContent = currentNode.textContent.replace(text, translation);
                    }
                    continue;
                }
                
                // обрабатываем относительное время
                translateRelativeTime(currentNode);
            }
        }
        
        // функция перевода атрибутов
        function translateAttributes() {
            const elementsWithAttrs = document.querySelectorAll('[aria-label], [placeholder], [title]');
            elementsWithAttrs.forEach(el => {
                ['aria-label', 'placeholder', 'title'].forEach(attr => {
                    if (el.hasAttribute(attr)) {
                        const text = el.getAttribute(attr).trim();
                        if (keyMap[text]) {
                            const translation = getMessage(keyMap[text]);
                            if (translation && translation !== text) {
                                el.setAttribute(attr, translation);
                            }
                        }
                    }
                });
            });
        }
        
        // функция перевода относительного времени
        function translateRelativeTime(node) {
            const text = node.textContent.trim();
            
            // обрабатываем часы
            const hoursMatch = text.match(/^(\d+) hours? ago$/);
            if (hoursMatch) {
                const hours = parseInt(hoursMatch[1]);
                const translation = `${hours} ${hours === 1 ? 'час' : (hours >= 2 && hours <= 4 ? 'часа' : 'часов')} назад`;
                node.textContent = node.textContent.replace(text, translation);
                return;
            }
            
            // обрабатываем минуты
            const minutesMatch = text.match(/^(\d+) minutes? ago$/);
            if (minutesMatch) {
                const minutes = parseInt(minutesMatch[1]);
                const translation = `${minutes} ${minutes === 1 ? 'минуту' : (minutes >= 2 && minutes <= 4 ? 'минуты' : 'минут')} назад`;
                node.textContent = node.textContent.replace(text, translation);
                return;
            }
            
            // аналогично для дней, недель и т. д.
            const daysMatch = text.match(/^(\d+) days? ago$/);
            if (daysMatch) {
                const days = parseInt(daysMatch[1]);
                const translation = `${days} ${days === 1 ? 'день' : (days >= 2 && days <= 4 ? 'дня' : 'дней')} назад`;
                node.textContent = node.textContent.replace(text, translation);
                return;
            }
            
            const weeksMatch = text.match(/^(\d+) weeks? ago$/);
            if (weeksMatch) {
                const weeks = parseInt(weeksMatch[1]);
                const translation = `${weeks} ${weeks === 1 ? 'неделю' : (weeks >= 2 && weeks <= 4 ? 'недели' : 'недель')} назад`;
                node.textContent = node.textContent.replace(text, translation);
                return;
            }
        }
        
        // функция для перевода абсолютного времени
        function translateAbsoluteTime(text) {
            // регулярное выражение для извлечения компонентов времени
            const regex = /^([A-Z][a-z]{2}) (\d{1,2}), (\d{4}), (\d{1,2}):(\d{2})\s*(AM|PM)\s*GMT\+3$/;
            const match = text.match(regex);
            if (match) {
                const monthEn = match[1];
                const day = match[2];
                const year = match[3];
                let hour = parseInt(match[4], 10);
                const minute = match[5];
                const period = match[6];
                
                // маппирование месяцев
                const monthMap = {
                    'Jan': getMessage('months-january', null) || 'января',
                    'Feb': getMessage('months-february', null) || 'февраля',
                    'Mar': getMessage('months-march', null) || 'марта',
                    'Apr': getMessage('months-april', null) || 'апреля',
                    'May': getMessage('months-may', null) || 'мая',
                    'Jun': getMessage('months-june', null) || 'июня',
                    'Jul': getMessage('months-july', null) || 'июля',
                    'Aug': getMessage('months-august', null) || 'августа',
                    'Sep': getMessage('months-september', null) || 'сентября',
                    'Oct': getMessage('months-october', null) || 'октября',
                    'Nov': getMessage('months-november', null) || 'ноября',
                    'Dec': getMessage('months-december', null) || 'декабря'
                };
                
                // преобразование в 24-часовой формат
                if (period === 'PM' && hour !== 12) {
                    hour += 12;
                } else if (period === 'AM' && hour === 12) {
                    hour = 0;
                }
                
                // форматирование часов с ведущим нулём
                const hourStr = hour < 10 ? '0' + hour : hour.toString();
                const monthRu = monthMap[monthEn] || monthEn;
                
                const byMoscowTime = getMessage('time-by-moscow-time');
                return `${day} ${monthRu} ${year}, ${hourStr}:${minute} ${byMoscowTime}`;
            }
            return text;
        }
        
        // функция для проверки исключений
        function isExcludedElement(el) {
            if (el.closest('.markdown-heading')) return true;
            if (el.closest('.react-directory-filename-column')) return true;
            return false;
        }
        
        // форматирование звёздочек (k -> К)
        function formatStarCount() {
            const starCounters = document.querySelectorAll('.Counter.js-social-count');
            starCounters.forEach(counter => {
                let text = counter.textContent.trim();
                if (text.includes('k')) {
                    text = text.replace('.', ',').replace('k', 'К');
                    counter.textContent = text;
                }
            });
        }
        
        // специальные функции для конкретных элементов интерфейса
        function translateDashboardBreadcrumbs() {
            // переводим основную крошку
            document.querySelectorAll('.AppHeader-context-item-label').forEach(el => {
                if (el.textContent.trim() === 'Dashboard') {
                    el.textContent = getMessage('dashboard-title');
                }
            });
            
            // переводим выпадающее меню
            document.querySelectorAll('.ActionListItem-label').forEach(el => {
                if (el.textContent.trim() === 'Dashboard') {
                    el.textContent = getMessage('dashboard-title');
                }
            });
            
            // переводим tool-tip
            document.querySelectorAll('tool-tip[role="tooltip"], tool-tip.sr-only').forEach(el => {
                if (el.textContent.trim() === 'Dashboard') {
                    el.textContent = getMessage('dashboard-title');
                }
            });
        }
        
        // перевод навигационной панели
        function translateNavigation() {
            document.querySelectorAll('.UnderlineNav-item').forEach(item => {
                const textSpan = item.querySelector(':scope > span:not(.Counter)');
                if (textSpan) {
                    const text = textSpan.textContent.trim();
                    if (keyMap[text]) {
                        const translation = getMessage(keyMap[text]);
                        if (translation && translation !== text) {
                            textSpan.textContent = translation;
                        }
                    }
                }
            });
        }
        
        // запускаем начальный перевод
        translateTextNodes();
        translateAttributes();
        translateDashboardBreadcrumbs();
        translateNavigation();
        formatStarCount();
        
        // настраиваем MutationObserver для отслеживания изменений DOM
        observer = new MutationObserver(() => {
            translateTextNodes();
            translateAttributes();
            translateDashboardBreadcrumbs();
            translateNavigation();
            formatStarCount();
        });
        
        // наблюдаем за всем документом
        observer.observe(document, {
            childList: true,
            subtree: true,
            attributes: true
        });
    }
}
