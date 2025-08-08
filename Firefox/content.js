// проверка включения/выключения перевода
let translationEnabled = true;
let observer = null;

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

// функция отключения перевода
function disableTranslation() {
    if (observer) {
        // останавливаем наблюдатель
        observer.disconnect();
        observer = null;
    }

    window.location.reload();
}

// функция инициализации всего перевода
function initTranslation() {
    'use strict';

    const interFontLink = document.createElement('link');
    interFontLink.rel = 'stylesheet';
    interFontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap';
    document.head.appendChild(interFontLink);

    // загружаем переводы из удалённого файла rus_p.json и объединяем все секции
    let translations = {};
    fetch("https://raw.githubusercontent.com/RushanM/GitHub-Russian-Translation/refs/heads/master/%D0%9E%D0%B1%D1%89%D0%B5%D0%B5/rus_p.json")
        .then(response => response.json())
        .then(data => {
            // сохраняем перевод из dashboard для Chat with Copilot
            window.dashboardCopilotTranslation = data.dashboard["Chat with Copilot"];
            // сохраняем перевод из dashboard для Home
            window.dashboardHomeTranslation = data.dashboard["Home"];
            translations = Object.assign(
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
            runTranslation();
        });

    function runTranslation() {
        function getRepositoriesTranslation(count) {
            if (count === 1) return `${count} репозиторий`;
            if (count >= 2 && count <= 4) return `${count} репозитория`;
            return `${count} репозиториев`;
        }

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

        // функция для перевода абсолютного времени во всплывающей подсказке, например:
        // «Feb 24, 2025, 3:09 PM GMT+3» → «24 февраля 2025, 15:09 по московскому времени»
        function translateAbsoluteTime(text) {
            // маппирование месяцев берём из файла с переводами
            const monthMapping = translations.months || {
                Jan: 'января',
                Feb: 'февраля',
                Mar: 'марта',
                Apr: 'апреля',
                May: 'мая',
                Jun: 'июня',
                Jul: 'июля',
                Aug: 'августа',
                Sep: 'сентября',
                Oct: 'октября',
                Nov: 'ноября',
                Dec: 'декабря'
            };

            // регулярное выражение для извлечения компонентов времени
            // пример: Feb 24, 2025, 3:09 PM GMT+3
            const regex = /^([A-Z][a-z]{2}) (\d{1,2}), (\d{4}), (\d{1,2}):(\d{2})\s*(AM|PM)\s*GMT\+3$/;
            const match = text.match(regex);
            if (match) {
                const monthEn = match[1];
                const day = match[2];
                const year = match[3];
                let hour = parseInt(match[4], 10);
                const minute = match[5];
                const period = match[6];

                // преобразование в 24-часовой формат
                if (period === 'PM' && hour !== 12) {
                    hour += 12;
                } else if (period === 'AM' && hour === 12) {
                    hour = 0;
                }
                // форматирование часов с ведущим нулём
                const hourStr = hour < 10 ? '0' + hour : hour.toString();
                const monthRu = monthMapping[monthEn] || monthEn;

                // используем перевод из файла переводов
                const byMoscowTime = translations.time?.by_moscow_time || "по московскому времени";
                return `${day} ${monthRu} ${year}, ${hourStr}:${minute} ${byMoscowTime}`;
            }
            return text;
        }

        // функция для перевода элементов <relative-time>
        function translateRelativeTimes() {
            const timeElements = document.querySelectorAll('relative-time');
            timeElements.forEach(el => {
                // если элемент уже переведён в основном DOM, проверяем его теневой DOM
                if (el.getAttribute('data-translated')) {
                    // проверяем наличие теневого корня и пытаемся перевести его содержимое
                    if (el.shadowRoot) {
                        // получаем текстовые узлы из теневого корня
                        const shadowTextNodes = [];

                        // функция для рекурсивного обхода теневого DOM
                        function collectTextNodes(node) {
                            if (node.nodeType === Node.TEXT_NODE) {
                                shadowTextNodes.push(node);
                            } else if (node.childNodes) {
                                node.childNodes.forEach(childNode => {
                                    collectTextNodes(childNode);
                                });
                            }
                        }
                        // Обходим теневой DOM
                        collectTextNodes(el.shadowRoot);

                        // переводим каждый текстовый узел
                        shadowTextNodes.forEach(textNode => {
                            const originalText = textNode.textContent.trim();
                            // ищем паттерны времени
                            const hoursAgoMatch = originalText.match(/(\d+)\s+hours?\s+ago/);
                            const minutesAgoMatch = originalText.match(/(\d+)\s+minutes?\s+ago/);
                            const daysAgoMatch = originalText.match(/(\d+)\s+days?\s+ago/);
                            const weeksAgoMatch = originalText.match(/(\d+)\s+weeks?\s+ago/);
                            const lastWeekMatch = originalText.match(/last\s+week/i);
                            const yesterdayMatch = originalText.match(/yesterday/i);
                            const dateMatch = originalText.match(/([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})\s+(\d{1,2}):(\d{2})/i);
                            const shortDateMatch = originalText.match(/on\s+([A-Za-z]{3})\s+(\d{1,2})/i);

                            if (hoursAgoMatch) {
                                const hours = parseInt(hoursAgoMatch[1], 10);
                                let translatedText;

                                // правильное склонение
                                if (hours === 1) {
                                    translatedText = translations.time?.hour_singular || "1 час назад";
                                } else if (hours >= 2 && hours <= 4) {
                                    translatedText = (translations.time?.hour_few || "{count} часа назад").replace("{count}", hours);
                                } else {
                                    translatedText = (translations.time?.hour_many || "{count} часов назад").replace("{count}", hours);
                                }

                                textNode.textContent = textNode.textContent.replace(
                                    /(\d+)\s+hours?\s+ago/,
                                    translatedText
                                );
                            } else if (daysAgoMatch) {
                                const days = parseInt(daysAgoMatch[1], 10);
                                let translatedText;

                                // правильное склонение
                                if (days === 1) {
                                    translatedText = translations.time?.day_singular || "1 день назад";
                                } else if (days >= 2 && days <= 4) {
                                    translatedText = (translations.time?.day_few || "{count} дня назад").replace("{count}", days);
                                } else {
                                    translatedText = (translations.time?.day_many || "{count} дней назад").replace("{count}", days);
                                }

                                textNode.textContent = textNode.textContent.replace(
                                    /(\d+)\s+days?\s+ago/,
                                    translatedText
                                );
                            } else if (weeksAgoMatch) {
                                const weeks = parseInt(weeksAgoMatch[1], 10);
                                let translatedText;

                                // правильное склонение
                                if (weeks === 1) {
                                    translatedText = translations.time?.week_singular || "1 неделю назад";
                                } else if (weeks >= 2 && weeks <= 4) {
                                    translatedText = (translations.time?.week_few || "{count} недели назад").replace("{count}", weeks);
                                } else {
                                    translatedText = (translations.time?.week_many || "{count} недель назад").replace("{count}", weeks);
                                }

                                textNode.textContent = textNode.textContent.replace(
                                    /(\d+)\s+weeks?\s+ago/,
                                    translatedText
                                );
                            } else if (lastWeekMatch) {
                                textNode.textContent = textNode.textContent.replace(
                                    /last\s+week/i,
                                    translations.time?.last_week || "на прошлой неделе"
                                );
                            } else if (yesterdayMatch) {
                                textNode.textContent = textNode.textContent.replace(
                                    /yesterday/i,
                                    translations.time?.yesterday || "вчера"
                                );
                            } else if (shortDateMatch) {
                                // обработка формата «on Mar 13»
                                const monthEn = shortDateMatch[1];
                                const day = shortDateMatch[2];

                                // используем словарь месяцев из файла переводов
                                const monthRu = translations.months?.[monthEn] || monthEn;
                                const translatedDate = `${day} ${monthRu}`;

                                textNode.textContent = textNode.textContent.replace(
                                    /on\s+[A-Za-z]{3}\s+\d{1,2}/i,
                                    `${day} ${monthRu}`
                                );
                            } else if (dateMatch) {
                                // если у нас полная дата в формате «April 11, 2025 10:27»
                                const monthEn = dateMatch[1];
                                const day = dateMatch[2];
                                const year = dateMatch[3];
                                const hour = dateMatch[4];
                                const minute = dateMatch[5];

                                // используем словарь месяцев из файла переводов
                                const monthRu = translations.months?.[monthEn] || monthEn;
                                const translatedDate = `${day} ${monthRu} ${year} ${hour}:${minute}`;

                                textNode.textContent = textNode.textContent.replace(
                                    /[A-Za-z]+\s+\d{1,2},\s+\d{4}\s+\d{1,2}:\d{2}/i,
                                    translatedDate
                                );
                            } else if (minutesAgoMatch) {
                                const minutes = parseInt(minutesAgoMatch[1], 10);
                                let translatedText;

                                // правильное склонение
                                if (minutes === 1) {
                                    translatedText = translations.time?.minute_singular || "1 минуту назад";
                                } else if (minutes >= 2 && minutes <= 4) {
                                    translatedText = (translations.time?.minute_few || "{count} минуты назад").replace("{count}", minutes);
                                } else if (minutes >= 5 && minutes <= 20) {
                                    translatedText = (translations.time?.minute_many || "{count} минут назад").replace("{count}", minutes);
                                } else {
                                    // для чисел 21, 31, 41… используем окончание как для 1
                                    const lastDigit = minutes % 10;
                                    const lastTwoDigits = minutes % 100;

                                    if (lastDigit === 1 && lastTwoDigits !== 11) {
                                        translatedText = (translations.time?.minute_singular || "1 минуту назад").replace("1", minutes);
                                    } else if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 10 || lastTwoDigits > 20)) {
                                        translatedText = (translations.time?.minute_few || "{count} минуты назад").replace("{count}", minutes);
                                    } else {
                                        translatedText = (translations.time?.minute_many || "{count} минут назад").replace("{count}", minutes);
                                    }
                                }

                                textNode.textContent = textNode.textContent.replace(
                                    /(\d+)\s+minutes?\s+ago/,
                                    translatedText
                                );
                            }
                        });
                    }
                    return;
                }

                // перевод всплывающей подсказки, если атрибут title существует
                if (el.hasAttribute('title')) {
                    const originalTitle = el.getAttribute('title');
                    el.setAttribute('title', translateAbsoluteTime(originalTitle));
                }

                // обработка текста даты/времени внутри элемента 
                const originalText = el.textContent.trim();

                // обработка относительного времени «x hours ago», «x minutes ago» и т. д.
                const hoursAgoMatch = originalText.match(/(\d+)\s+hours?\s+ago/);
                const minutesAgoMatch = originalText.match(/(\d+)\s+minutes?\s+ago/);
                const onDateMatch = originalText.match(/on\s+([A-Za-z]+\s+\d+,\s+\d+)/);

                if (hoursAgoMatch) {
                    const hours = parseInt(hoursAgoMatch[1], 10);
                    let translatedText;

                    // правильное склонение
                    if (hours === 1) {
                        translatedText = "1 час назад";
                    } else if (hours >= 2 && hours <= 4) {
                        translatedText = hours + " часа назад";
                    } else {
                        translatedText = hours + " часов назад";
                    }

                    el.textContent = translatedText;
                } else if (minutesAgoMatch) {
                    const minutes = parseInt(minutesAgoMatch[1], 10);
                    let translatedText;

                    // правильное склонение
                    if (minutes === 1) {
                        translatedText = "1 минуту назад";
                    } else if (minutes >= 2 && minutes <= 4) {
                        translatedText = minutes + " минуты назад";
                    } else if (minutes >= 5 && minutes <= 20) {
                        translatedText = minutes + " минут назад";
                    } else {
                        // для чисел 21, 31, 41… используем окончание как для 1
                        const lastDigit = minutes % 10;
                        const lastTwoDigits = minutes % 100;

                        if (lastDigit === 1 && lastTwoDigits !== 11) {
                            translatedText = minutes + " минуту назад";
                        } else if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 10 || lastTwoDigits > 20)) {
                            translatedText = minutes + " минуты назад";
                        } else {
                            translatedText = minutes + " минут назад";
                        }
                    }

                    el.textContent = translatedText;
                } else if (onDateMatch) {
                    // обрабатываем формат «on Apr 12, 2025»
                    // переводим английское название месяца на русский
                    const dateText = onDateMatch[1];
                    const monthMapping = {
                        Jan: 'января',
                        Feb: 'февраля',
                        Mar: 'марта',
                        Apr: 'апреля',
                        May: 'мая',
                        Jun: 'июня',
                        Jul: 'июля',
                        Aug: 'августа',
                        Sep: 'сентября',
                        Oct: 'октября',
                        Nov: 'ноября',
                        Dec: 'декабря'
                    };

                    // регулярное выражение для поиска и замены месяца в строке даты
                    const monthRegex = /([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})/;
                    const dateMatch = dateText.match(monthRegex);

                    if (dateMatch) {
                        const monthEn = dateMatch[1];
                        const day = dateMatch[2];
                        const year = dateMatch[3];
                        const monthRu = monthMapping[monthEn] || monthEn;

                        el.textContent = `в ${day} ${monthRu} ${year}`;
                    } else {
                        el.textContent = "в " + dateText;
                    }
                }

                // пробуем перехватывать события мутации теневого корня
                if (window.ShadowRoot && !el.getAttribute('data-shadow-observed')) {
                    try {
                        // пытаемся получить доступ к теневому DOM
                        const shadowRoot = el.shadowRoot;
                        if (shadowRoot) {
                            // добавляем наблюдатель за изменениями в теневом DOM
                            const shadowObserver = new MutationObserver((mutations) => {
                                mutations.forEach(mutation => {
                                    if (mutation.type === 'childList' || mutation.type === 'characterData') {
                                        // проходим по всем текстовым узлам в теневом DOM
                                        const textNodes = [];
                                        const walk = document.createTreeWalker(shadowRoot, NodeFilter.SHOW_TEXT);

                                        let node;
                                        while (node = walk.nextNode()) {
                                            textNodes.push(node);
                                        }

                                        textNodes.forEach(textNode => {
                                            const originalText = textNode.textContent;
                                            // ищем паттерны времени
                                            if (originalText.match(/(\d+)\s+hours?\s+ago/)) {
                                                const hours = parseInt(originalText.match(/(\d+)\s+hours?\s+ago/)[1], 10);
                                                let translatedText;
                                                // правильное склонение
                                                if (hours === 1) {
                                                    translatedText = translations.time?.hour_singular || "1 час назад";
                                                } else if (hours >= 2 && hours <= 4) {
                                                    translatedText = (translations.time?.hour_few || "{count} часа назад").replace("{count}", hours);
                                                } else {
                                                    translatedText = (translations.time?.hour_many || "{count} часов назад").replace("{count}", hours);
                                                }

                                                textNode.textContent = translatedText;
                                            } else if (originalText.match(/(\d+)\s+days?\s+ago/)) {
                                                const days = parseInt(originalText.match(/(\d+)\s+days?\s+ago/)[1], 10);
                                                let translatedText;

                                                // правильное склонение для русского языка
                                                if (days === 1) {
                                                    translatedText = translations.time?.day_singular || "1 день назад";
                                                } else if (days >= 2 && days <= 4) {
                                                    translatedText = (translations.time?.day_few || "{count} дня назад").replace("{count}", days);
                                                } else {
                                                    translatedText = (translations.time?.day_many || "{count} дней назад").replace("{count}", days);
                                                }

                                                textNode.textContent = translatedText;
                                            } else if (originalText.match(/yesterday/i)) {
                                                textNode.textContent = translations.time?.yesterday || "вчера";
                                            } else if (originalText.match(/([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})\s+(\d{1,2}):(\d{2})/i)) {
                                                const match = originalText.match(/([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})\s+(\d{1,2}):(\d{2})/i); const monthEn = match[1];
                                                const day = match[2];
                                                const year = match[3];
                                                const hour = match[4];
                                                const minute = match[5];

                                                // используем словарь месяцев из файла переводов
                                                const monthRu = translations.months?.[monthEn] || monthEn;
                                                textNode.textContent = `${day} ${monthRu} ${year} ${hour}:${minute}`;
                                            } else if (originalText.match(/(\d+)\s+minutes?\s+ago/)) {
                                                const minutes = parseInt(originalText.match(/(\d+)\s+minutes?\s+ago/)[1], 10);
                                                let translatedText;

                                                // правильное склонение
                                                if (minutes === 1) {
                                                    translatedText = translations.time?.minute_singular || "1 минуту назад";
                                                } else if (minutes >= 2 && minutes <= 4) {
                                                    translatedText = (translations.time?.minute_few || "{count} минуты назад").replace("{count}", minutes);
                                                } else {
                                                    translatedText = (translations.time?.minute_many || "{count} минут назад").replace("{count}", minutes);
                                                }

                                                textNode.textContent = translatedText;
                                            }
                                        });
                                    }
                                });
                            });

                            shadowObserver.observe(shadowRoot, {
                                childList: true,
                                characterData: true,
                                subtree: true
                            });

                            el.setAttribute('data-shadow-observed', 'true');
                        }
                    } catch (error) {
                        console.error('[Русификатор Гитхаба] Ошибка при работе с теневым DOM:', error);
                    }
                }

                // отмечаем элемент как переведённый
                el.setAttribute('data-translated', 'true');
            });
        }

        // функция для проверки, находится ли элемент в контейнере, где перевод нежелателен
        function isExcludedElement(el) {
            // если элемент находится внутри заголовков Markdown, то не переводим
            if (el.closest('.markdown-heading')) return true;
            // если элемент находится внутри ячейки с названием каталога, то не переводим
            if (el.closest('.react-directory-filename-column')) return true;
            return false;
        }

        // функция для перевода блока GitHub Education
        function translateEducationExperience() {
            document.querySelectorAll('.experience__action-item h3').forEach(el => {
                if (el.textContent.includes('Add') && el.textContent.includes('repositories to a list')) {
                    el.innerHTML = el.innerHTML.replace(
                        /Add .* repositories to a list/,
                        'Добавьте репозитории, на которые поставили звезду, в список'
                    );
                }
            });

            document.querySelectorAll('.experience__action-item p.mt-4.f4').forEach(el => {
                if (el.textContent.includes('To complete this task, create a list with at least 3')) {
                    el.innerHTML = el.innerHTML.replace(
                        /To complete this task, create a list with at least 3 .* repos with the list name 'My Repo Watchlist'./,
                        'Чтобы выполнить это задание, создайте список, содержащий не менее трёх репозиториев, на которые вы поставили звезду, с названием «My Repo Watchlist».'
                    );
                }
            });

            document.querySelectorAll('.experience__actions-items-labels .Label--attention').forEach(el => {
                if (el.textContent.trim() === 'Incomplete') {
                    el.textContent = 'Не выполнено';
                }
            });

            document.querySelectorAll('.experience__actions-items-labels .Label--secondary').forEach(el => {
                if (el.textContent.trim() === 'List') {
                    el.textContent = 'Список';
                }
            });

            document.querySelectorAll('.experience__cta .Button--primary .Button-label').forEach(el => {
                if (el.textContent.trim() === 'See detailed instructions') {
                    el.textContent = 'Подробные инструкции';
                }
            });

            document.querySelectorAll('.experience__cta .Button--secondary .Button-label').forEach(el => {
                if (el.textContent.trim() === 'Mark complete') {
                    el.textContent = 'Отметить как выполненное';
                }
            });
        }

        function translateTextContent() {
            const elements = document.querySelectorAll(
                '.ActionList-sectionDivider-title, .ActionListItem-label, span[data-content], ' +
                '.AppHeader-context-item-label, #qb-input-query, .Truncate-text, h2, button, ' +
                '.Label, a, img[alt], .Box-title, .post__content p, .post__content li, .Button-label, ' +
                '.prc-ActionList-GroupHeading-eahp0'
            );

            elements.forEach(el => {
                // если элемент подпадает под исключения, пропускаем его
                if (isExcludedElement(el)) return;

                if (el.tagName === 'IMG' && el.alt.trim() in translations) {
                    el.alt = translations[el.alt.trim()];
                } else if (el.childElementCount === 0) {
                    const text = el.textContent.trim();
                    if (translations[text]) {
                        el.textContent = translations[text];
                    } else {
                        const match = text.match(/^(\d+) repositories$/);
                        if (match) {
                            const count = parseInt(match[1], 10);
                            el.textContent = getRepositoriesTranslation(count);
                        } else if (text === 'added a repository to') {
                            el.textContent = translations['added a repository to'];
                        }
                    }
                } else {
                    // часть функции translateTextContent(), отвечающая за обработку элементов с дочерними элементами
                    if (el.childElementCount > 0) {
                        // сборка текстового содержания с учётом дочерних элементов
                        let text = '';
                        el.childNodes.forEach(node => {
                            if (node.nodeType === Node.TEXT_NODE) {
                                text += node.textContent;
                            } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'KBD') {
                                text += '/'; // добавление символа «/» из <kbd>
                            }
                        });
                        text = text.trim();
                        if (translations[text]) {
                            // создание нового фрагмента с переводом и сохранение тега <kbd>, если перевод соответствует шаблону
                            const newFragment = document.createDocumentFragment();
                            const parts = translations[text].split('<kbd class="AppHeader-search-kbd">/</kbd>');
                            newFragment.append(document.createTextNode(parts[0]));
                            // добавлять тег <kbd> только если есть вторая часть перевода
                            if (parts.length > 1 && parts[1] !== undefined) {
                                const kbd = document.createElement('kbd');
                                kbd.className = 'AppHeader-search-kbd';
                                kbd.textContent = '/';
                                newFragment.append(kbd);
                                newFragment.append(document.createTextNode(parts[1]));
                            }
                            // очистка элемента и вставка нового контента
                            el.innerHTML = '';
                            el.appendChild(newFragment);
                        }
                        el.childNodes.forEach(node => {
                            if (node.nodeType === Node.TEXT_NODE) {
                                const originalText = node.textContent;
                                const trimmed = originalText.trim();
                                if (translations[trimmed]) {
                                    node.textContent = translations[trimmed];
                                } else if (originalText.includes("starred")) {
                                    node.textContent = originalText.replace("starred", translations["starred"]);
                                } else if (originalText.includes("added a repository to")) {
                                    node.textContent = originalText.replace("added a repository to", translations['added a repository to']);
                                } else if (originalText.includes("Notifications")) {
                                    node.textContent = originalText.replace("Notifications", translations['Notifications']);
                                }
                            }
                        });
                        // последный выхват строчек
                        if (/\bstarred\b/.test(el.innerHTML) && !el.innerHTML.includes('starred-button-icon')) {
                            el.innerHTML = el.innerHTML.replace(/\bstarred\b/g, function (match) {
                                return translations["starred"];
                            });
                        }
                        if (/\badded a repository to\b/.test(el.innerHTML)) {
                            el.innerHTML = el.innerHTML.replace(/\badded a repository to\b/g, translations['added a repository to']);
                        }
                        if (/\bNotifications\b/.test(el.innerHTML)) {
                            el.innerHTML = el.innerHTML.replace(/\bNotifications\b/g, translations['Notifications']);
                        }
                    } else {
                        // сначала каждый узел
                        el.childNodes.forEach(node => {
                            if (node.nodeType === Node.TEXT_NODE) {
                                let originalText = node.textContent;
                                // переводы
                                originalText = originalText.replace(/\bstarred\b/g, translations["starred"]);
                                originalText = originalText.replace(/\badded a repository to\b/g, translations['added a repository to']);
                                originalText = originalText.replace(/\bNotifications\b/g, translations['Notifications']);
                                node.textContent = originalText;
                            }
                        });

                        // если всё ещё остаётся, заменить внутренний HTML
                        if (/\bstarred\b/.test(el.innerHTML)) {
                            el.innerHTML = el.innerHTML.replace(/\bstarred\b/g, translations["starred"]);
                        }
                        if (/\badded a repository to\b/.test(el.innerHTML)) {
                            el.innerHTML = el.innerHTML.replace(/\badded a repository to\b/g, translations['added a repository to']);
                        }
                        if (/\bNotifications\b/.test(el.innerHTML)) {
                            el.innerHTML = el.innerHTML.replace(/\bNotifications\b/g, translations['Notifications']);
                        }
                    }
                }
            });
            formatStarCount();
            translateRelativeTimes();

            document.querySelectorAll('.Button-label').forEach(btn => {
                if (btn.textContent.trim() === "New") {
                    btn.textContent = "Создать";
                }
            });
        }

        function translateCopilotPreview() {
            const askCopilotPlaceholder = document.querySelector('.copilotPreview__input[placeholder="Ask Copilot"]');
            if (askCopilotPlaceholder && translations['Ask Copilot']) {
                askCopilotPlaceholder.setAttribute('placeholder', translations['Ask Copilot']);
            }
            document.querySelectorAll('.copilotPreview__suggestionButton div').forEach(div => {
                const text = div.textContent.trim();
                if (translations[text]) {
                    div.innerHTML = translations[text];
                }
            });
        }

        function translateAttributes() {
            // перевод placeholder
            document.querySelectorAll('input[placeholder]').forEach(el => {
                const text = el.getAttribute('placeholder');
                if (translations[text]) {
                    el.setAttribute('placeholder', translations[text]);
                }
            });
            // перевод aria-label
            document.querySelectorAll('[aria-label]').forEach(el => {
                const text = el.getAttribute('aria-label');
                if (translations[text]) {
                    el.setAttribute('aria-label', translations[text]);
                }
            });
        }

        function translateTooltips() {
            const copilotChatTooltip = document.querySelector('tool-tip[for="copilot-chat-header-button"]');
            if (copilotChatTooltip && copilotChatTooltip.textContent.trim() === 'Chat with Copilot') {
                // Используем перевод из dashboard, сохранённый ранее
                copilotChatTooltip.textContent = window.dashboardCopilotTranslation;
            }

            document.querySelectorAll('tool-tip[role="tooltip"]').forEach(tooltip => {
                const text = tooltip.textContent.trim();
                if (translations[text]) {
                    tooltip.textContent = translations[text];
                }
            });

            document.querySelectorAll('.prc-TooltipV2-Tooltip-cYMVY').forEach(tooltip => {
                const text = tooltip.textContent.trim();
                if (translations[text]) {
                    tooltip.textContent = translations[text];
                }
            });
        }

        function translateGitHubEducation() {
            const noticeForms = document.querySelectorAll('div.js-notice form.js-notice-dismiss');

            noticeForms.forEach(form => {
                const heading = form.querySelector('h3.h4');
                if (heading && heading.textContent.trim() === 'Learn. Collaborate. Grow.') {
                    heading.textContent = 'Учитесь. Кооперируйтесь. Развивайтесь.';
                }

                const desc = form.querySelector('p.my-3.text-small');
                if (desc && desc.textContent.includes('GitHub Education gives you the tools')) {
                    desc.textContent = 'GitHub Education предоставляет инструменты и поддержку сообщества, чтобы вы могли принимать технологические вызовы и превращать их в возможности. Ваше технологическое будущее начинается здесь!';
                }

                const link = form.querySelector('.Button-label');
                if (link && link.textContent.trim() === 'Go to GitHub Education') {
                    link.textContent = 'Перейти в GitHub Education';
                }
            });

            document.querySelectorAll('.h5.color-fg-on-emphasis.text-mono').forEach(el => {
                if (el.textContent.trim() === 'LaunchPad') {
                    el.textContent = translations['LaunchPad'];
                }
            });

            document.querySelectorAll('.experience__gradient.experience__title').forEach(el => {
                if (el.textContent.trim() === 'Intro to GitHub') {
                    el.textContent = translations['Intro to GitHub'];
                }
            });

            // Шрифт Inter
            const educationNavBlock = document.querySelector('.d-flex.flex-justify-center.flex-md-justify-start.pb-5.pb-sm-7');
            if (educationNavBlock) {
                educationNavBlock.style.fontFamily = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
            }

            document.querySelectorAll('header h1.mb-5').forEach(el => {
                el.style.fontFamily = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
            });
        }

        function translateExperienceHeaderItems() {
            // Перевод заголовков и текста в блоке experience__header__items
            document.querySelectorAll('.experience__header__item .experience__hero__heading').forEach(el => {
                const text = el.textContent.trim();
                if (translations[text]) {
                    el.textContent = translations[text];
                }
            });

            // Перевод основного текста в блоке experience__header__items
            document.querySelectorAll('.experience__header__item p.color-fg-on-emphasis').forEach(el => {
                const text = el.textContent.trim();
                if (translations[text]) {
                    el.textContent = translations[text];
                }
            });

            // Шрифт Inter ко всему блоку для лучшей поддержки кириллицы
            document.querySelectorAll('.color-fg-on-emphasis').forEach(el => {
                el.style.fontFamily = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
            });
        }

        function translateFilterMenu() {
            const filterTranslations = {
                "Filter": "Фильтр",
                "Events": "События",
                "Activity you want to see on your feed": "Деятельность, которую вы хотите видеть в своей ленте",
                "Announcements": "Объявления",
                "Special discussion posts from repositories": "Особые обсуждения из репозиториев",
                "Releases": "Выпуски",
                "Update posts from repositories": "Новые обновления в репозиториях",
                "Sponsors": "Спонсоры",
                "Relevant projects or people that are being sponsored": "Проекты или люди, которых кто-то начинает спонсировать",
                "Stars": "Звёзды",
                "Repositories being starred by people": "Репозитории, которые получают звёзды от людей",
                "Repositories": "Репозитории",
                "Repositories that are created or forked by people": "Репозитории, созданные или разветвлённые пользователями",
                "Repository activity": "Деятельность в репозиториях",
                "Issues and pull requests from repositories": "Новые темы и запросы на слияние в репозиториях",
                "Follows": "Подписки",
                "Who people are following": "На кого подписываются пользователи",
                "Recommendations": "Рекомендации",
                "Repositories and people you may like": "Репозитории и пользователи, которые могут вам понравиться",
                "Include events from starred repositories": "Включать события из репозиториев, на которые вы поставили звезду",
                "By default, the feed shows events from repositories you sponsor or watch, and people you follow.": "По умолчанию лента отображает события из репозиториев, которые вы спонсируете или за которыми следите, а также от людей, на которых подписаны.",
                "Reset to default": "Сбросить до настроек по умолчанию",
                "Save": "Сохранить"
            };

            const elements = document.querySelectorAll(
                '.SelectMenu-title, .SelectMenu-item h5, .SelectMenu-item span, .px-3.mt-2 h5, .px-3.mt-2 p'
            );

            elements.forEach(el => {
                const text = el.textContent.trim();
                if (filterTranslations[text]) {
                    el.textContent = filterTranslations[text];
                }
            });
        }

        function translateOpenCopilotMenu() {
            document.querySelectorAll('span.prc-ActionList-ItemLabel-TmBhn').forEach(el => {
                const originalText = el.textContent.trim();
                if (translations[originalText]) {
                    el.textContent = translations[originalText];
                }
            });
        }

        function translateStarButtons() {
            // Находим все span с классом d-inline внутри кнопок
            document.querySelectorAll('.BtnGroup-item .d-inline').forEach(span => {
                const text = span.textContent.trim();
                if (text === 'Star') {
                    span.textContent = translations["Star"] || 'Поставить звезду';
                } else if (text === 'Starred') {
                    span.textContent = translations["Starred"] || 'Звезда поставлена';
                }
            });

            // переводим заголовок в диалоговом окне отмены звезды
            document.querySelectorAll('.Box-title').forEach(title => {
                if (title.textContent.trim() === 'Unstar this repository?') {
                    title.textContent = translations["Unstar this repository?"] || 'Убрать звезду с этого репозитория?';
                }
            });

            // переводим кнопку Unstar в диалоговом окне
            document.querySelectorAll('.btn-danger.btn').forEach(btn => {
                if (btn.textContent.trim() === 'Unstar') {
                    btn.textContent = translations["Unstar"] || 'Убрать звезду';
                }
            });
        }

        function translateRepositoryButtons() {
            // Перевод кнопки Sponsor
            document.querySelectorAll('.Button-label .v-align-middle').forEach(span => {
                const text = span.textContent.trim();
                if (text === 'Sponsor') {
                    span.textContent = translations["Sponsor"] || 'Спонсировать';
                }
            });

            // Перевод кнопки Watch
            document.querySelectorAll('.prc-Button-Label-pTQ3x').forEach(span => {
                if (span.textContent.trim().startsWith('Watch')) {
                    // Сохраняем счётчик
                    const counter = span.querySelector('.Counter');
                    const counterHTML = counter ? counter.outerHTML : '';

                    // Новый текст с сохранённым счетчиком
                    span.innerHTML = (translations["Watch"] || 'Следить') +
                        (counterHTML ? ' ' + counterHTML : '');
                }
            });

            // Перевод кнопки Fork
            document.querySelectorAll('.BtnGroup.d-flex').forEach(btnGroup => {
                // Проверяем, что это непереведенная кнопка Fork
                if (btnGroup.textContent.includes('Fork') && !btnGroup.hasAttribute('data-translated-fork')) {
                    // Сначала сохраним все важные элементы
                    const counter = btnGroup.querySelector('#repo-network-counter');
                    const details = btnGroup.querySelector('details');

                    // Создаём функцию для глубокого обхода DOM-дерева
                    function translateNode(node) {
                        if (node.nodeType === Node.TEXT_NODE) {
                            // Регулярное выражение для поиска слова «Fork» с сохранением пробелов
                            const regex = /(\s*)Fork(\s*)/g;
                            node.textContent = node.textContent.replace(regex,
                                (match, before, after) => before + (translations["Fork"] || 'Разветвить') + after);
                        } else {
                            // Рекурсивный обход всех дочерних узлов
                            for (let i = 0; i < node.childNodes.length; i++) {
                                translateNode(node.childNodes[i]);
                            }
                        }
                    }

                    // Запускаем перевод с корневого элемента
                    translateNode(btnGroup);

                    // Отмечаем элемент как обработанный
                    btnGroup.setAttribute('data-translated-fork', 'true');
                }
            });
        }

        function translateLabelElements() {
            document.querySelectorAll('.prc-Label-Label--LG6X').forEach(el => {
                if (el.textContent.trim() === 'Free' && translations['Free']) {
                    el.textContent = translations['Free'];
                }
            });
        }

        // Функция для перевода статусов тем, кнопок редактирования и создания тем
        function translateIssueElements() {
            // Перевод статуса «Open» в темах
            document.querySelectorAll('span[data-testid="header-state"]').forEach(el => {
                if (el.textContent.trim() === 'Open' && translations['Open']) {
                    // Сохраняем SVG-значок
                    const svg = el.querySelector('svg');
                    const svgHTML = svg ? svg.outerHTML : '';

                    // Заменяем текст, сохраняя значок
                    el.innerHTML = svgHTML + translations['Open'];
                }
                // Перевод статуса «Closed» в темах
                else if (el.textContent.trim() === 'Closed' && translations['Closed']) {
                    // Сохраняем SVG-значок
                    const svg = el.querySelector('svg');
                    const svgHTML = svg ? svg.outerHTML : '';

                    // Заменяем текст, сохраняя значок
                    el.innerHTML = svgHTML + translations['Closed'];
                }
            });

            // Перевод кнопки «Edit»
            document.querySelectorAll('.prc-Button-ButtonBase-c50BI .prc-Button-Label-pTQ3x').forEach(el => {
                if (el.textContent.trim() === 'Edit' && translations['Edit']) {
                    el.textContent = translations['Edit'];
                }
            });

            // Перевод кнопки «New issue»
            document.querySelectorAll('.prc-Button-ButtonBase-c50BI .prc-Button-Label-pTQ3x').forEach(el => {
                if (el.textContent.trim() === 'New issue' && translations['New issue']) {
                    el.textContent = translations['New issue'];
                }
            });
            // Трансформация строки вида «Пользователь opened 2 hours ago» в «Открыта Пользователь 2 часа назад»
            document.querySelectorAll('.Box-sc-g0xbh4-0.dqmClk, [data-testid="issue-body-header-author"]').forEach(authorEl => {
                // Ищем ближайший родительский контейнер, который содержит также подвал с «opened»
                const container = authorEl.closest('.ActivityHeader-module__narrowViewportWrapper--Hjl75, .Box-sc-g0xbh4-0.koxHLL');
                if (!container) return;

                // Находим подвал с текстом «opened»
                const footer = container.querySelector('.ActivityHeader-module__footer--FVHp7, .Box-sc-g0xbh4-0.bJQcYY');
                if (!footer) return;

                // Находим span с «opened» и автором
                const openedSpan = footer.querySelector('span');
                const authorLink = authorEl.querySelector('a[data-testid="issue-body-header-author"], a[href*="/users/"]') || authorEl;

                // Проверяем, что span содержит «opened»
                if (!openedSpan || !openedSpan.textContent.includes('opened')) return;

                // Получаем ссылку на время с relative-time
                const timeLink = footer.querySelector('a[data-testid="issue-body-header-link"]');
                if (!timeLink) return;

                // Находим элемент relative-time внутри ссылки
                const relativeTime = timeLink.querySelector('relative-time');
                if (!relativeTime) return;

                try {
                    // Если уже трансформировано, пропускаем
                    if (footer.getAttribute('data-ru-transformed')) return;

                    // Отмечаем как трансформированное
                    footer.setAttribute('data-ru-transformed', 'true');

                    // Создаём новую структуру
                    // 1. Сохраняем автора
                    const authorClone = authorLink.cloneNode(true);

                    // 2. Меняем текст в span на перевод «opened» из файла локализации
                    openedSpan.textContent = translations["opened"] ? translations["opened"] + ' ' : 'Открыта ';

                    // 3. Вставляем автора после слова «Открыта»
                    openedSpan.after(authorClone);

                    // 4. Добавляем пробел между автором и временем
                    authorClone.after(document.createTextNode(' '));

                    // 5. Трансформируем текст времени
                    const originalTimeText = relativeTime.textContent;

                    // Проверяем, содержит ли текст паттерн времени (например, «3 hours ago» или «on Apr 12, 2025»)
                    const hoursAgoMatch = originalTimeText.match(/(\d+)\s+hours?\s+ago/);
                    const minutesAgoMatch = originalTimeText.match(/(\d+)\s+minutes?\s+ago/);
                    const onDateMatch = originalTimeText.match(/on\s+([A-Za-z]+\s+\d+,\s+\d+)/);

                    if (hoursAgoMatch) {
                        const hours = parseInt(hoursAgoMatch[1], 10);
                        let translatedText;

                        // Правильное склонение
                        if (hours === 1) {
                            translatedText = "Час назад";
                        } else if (hours >= 2 && hours <= 4) {
                            translatedText = hours + " часа назад";
                        } else {
                            translatedText = hours + " часов назад";
                        }

                        relativeTime.textContent = translatedText;
                    } else if (minutesAgoMatch) {
                        const minutes = parseInt(minutesAgoMatch[1], 10);
                        let translatedText;

                        // Правильное склонение
                        if (minutes === 1) {
                            translatedText = "1 минуту назад";
                        } else if (minutes >= 2 && minutes <= 4) {
                            translatedText = minutes + " минуты назад";
                        } else if (minutes >= 5 && minutes <= 20) {
                            translatedText = minutes + " минут назад";
                        } else {
                            // Для чисел 21, 31, 41… используем окончание как для 1
                            const lastDigit = minutes % 10;
                            const lastTwoDigits = minutes % 100;

                            if (lastDigit === 1 && lastTwoDigits !== 11) {
                                translatedText = minutes + " минуту назад";
                            } else if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 10 || lastTwoDigits > 20)) {
                                translatedText = minutes + " минуты назад";
                            } else {
                                translatedText = minutes + " минут назад";
                            }
                        }

                        relativeTime.textContent = translatedText;
                    } else if (onDateMatch) {
                        // Обрабатываем формат «on Apr 12, 2025»
                        // переводим английское название месяца на русский
                        const dateText = onDateMatch[1];
                        const monthMapping = {
                            Jan: 'января',
                            Feb: 'февраля',
                            Mar: 'марта',
                            Apr: 'апреля',
                            May: 'мая',
                            Jun: 'июня',
                            Jul: 'июля',
                            Aug: 'августа',
                            Sep: 'сентября',
                            Oct: 'октября',
                            Nov: 'ноября',
                            Dec: 'декабря'
                        };

                        // Регулярное выражение для поиска и замены месяца в строке даты
                        const monthRegex = /([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})/;
                        const dateMatch = dateText.match(monthRegex);

                        if (dateMatch) {
                            const monthEn = dateMatch[1];
                            const day = dateMatch[2];
                            const year = dateMatch[3];
                            const monthRu = monthMapping[monthEn] || monthEn;

                            relativeTime.textContent = `в ${day} ${monthRu} ${year}`;
                        } else {
                            relativeTime.textContent = "в " + dateText;
                        }
                    }

                    // 6. Скрываем оригинальный контейнер с автором
                    if (authorEl !== authorLink) {
                        authorEl.style.cssText = 'display: none !important;';
                    }

                    console.log('[Русификатор Гитхаба] Cтрока с автором темы трансформирована');
                } catch (error) {
                    console.error('[Русификатор Гитхаба] Ошибка при трансформации строки с автором:', error);
                }
            });
        }

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

        const feedTitleEl = document.querySelector('[data-target="feed-container.feedTitle"]');
        if (feedTitleEl && window.dashboardHomeTranslation) {
            feedTitleEl.textContent = window.dashboardHomeTranslation;
        }

        document.querySelectorAll('#feed-filter-menu summary').forEach(summary => {
            summary.innerHTML = summary.innerHTML.replace('Filter', translations["Filter"]);
        });

        const observer = new MutationObserver(() => {
            translateTextContent();
            translateAttributes();
            translateCopilotPreview();
            translateTooltips();
            translateGitHubEducation();
            translateExperienceHeaderItems();
            translateEducationExperience();
            translateFilterMenu();
            translateOpenCopilotMenu();
            translateStarButtons();
            translateRepositoryButtons();
            translateIssueElements();
            translateDashboardBreadcrumbs();

            // Перевод подвала
            document.querySelectorAll('p.color-fg-subtle.text-small.text-light').forEach(node => {
                if (node.textContent.trim() === '© 2025 GitHub, Inc.') {
                    node.textContent = translations['© 2025 GitHub, Inc.'];
                }
            });

            document.querySelectorAll('a.Link').forEach(link => {
                const text = link.textContent.trim();
                if (text === 'About') link.textContent = 'О нас';
                if (text === 'Blog') link.textContent = 'Блог';
                if (text === 'Terms') link.textContent = 'Условия';
                if (text === 'Privacy') link.textContent = 'Конфиденциальность';
                if (text === 'Security') link.textContent = 'Безопасность';
                if (text === 'Status') link.textContent = 'Статус';
            });

            document.querySelectorAll('.Button-label').forEach(btn => {
                if (btn.textContent.trim() === 'Do not share my personal information') {
                    btn.textContent = 'Не передавать мои личные данные';
                }
                if (btn.textContent.trim() === 'Manage Cookies') {
                    btn.textContent = 'Управление куки';
                }
            });

            // Владельцы и перейти
            document.querySelectorAll('h3.ActionList-sectionDivider-title').forEach(node => {
                if (node.textContent.trim() === 'Owners') {
                    node.textContent = translations['Owners'];
                }
            });

            document.querySelectorAll('.ActionListItem-description.QueryBuilder-ListItem-trailing').forEach(span => {
                if (span.textContent.trim() === 'Jump to') {
                    span.textContent = translations['Jump to'];
                }
            });

            // Перевод для кнопки «Chat with Copilot»
            document.querySelectorAll('.ActionListItem-label').forEach(el => {
                if (el.textContent.trim() === "Chat with Copilot" && translations["Chat with Copilot"]) {
                    el.textContent = translations["Chat with Copilot"];
                }
            });

            // Перевод описания «Start a new Copilot thread»
            document.querySelectorAll('.QueryBuilder-ListItem-trailing').forEach(el => {
                if (el.textContent.trim() === "Start a new Copilot thread" && translations["Start a new Copilot thread"]) {
                    el.textContent = translations["Start a new Copilot thread"];
                }
            });

            // Замена «added a repository to»
            document.querySelectorAll('h3.h5.text-normal.color-fg-muted.d-flex.flex-items-center.flex-row.flex-nowrap.width-fit span.flex-1 span.flex-shrink-0').forEach(span => {
                if (span.textContent.trim() === 'added a repository to') {
                    span.textContent = translations['added a repository to'];
                }
            });
        });

        // Наблюдение за всем документом, включая изменения атрибутов
        observer.observe(document, {
            childList: true,
            subtree: true,
            attributes: true
        });

        // Будущие изменения
        const observerStarred = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => replaceAllStarred(node));
            });
        });

        // Запуск
        observerStarred.observe(document.body, { childList: true, subtree: true });

        // Начальное прохождение
        replaceAllStarred(document.body);

        translateTextContent();
        translateAttributes();
        translateCopilotPreview();
        translateTooltips();
        translateGitHubEducation();
        translateExperienceHeaderItems();
        translateEducationExperience();
        translateFilterMenu();
        translateOpenCopilotMenu();
        translateStarButtons();
        translateRepositoryButtons();
        translateIssueElements();
        translateDashboardBreadcrumbs();

        // Замена «Filter»
        document.querySelectorAll('summary .octicon-filter').forEach(icon => {
            const summary = icon.parentElement;
            if (summary) {
                summary.childNodes.forEach(node => {
                    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() === 'Filter') {
                        node.textContent = translations["Filter"];
                    }
                });
            }
        });

        // Добавляем текст «Фильтр» в кнопку, если его нет
        document.querySelectorAll('summary').forEach(summary => {
            if (summary.querySelector('.octicon-filter')) {
                let hasFilterText = false;
                summary.childNodes.forEach(node => {
                    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() === 'Фильтр') {
                        hasFilterText = true;
                    }
                });
                if (!hasFilterText) {
                    const svgIcon = summary.querySelector('.octicon-filter');
                    const textNode = document.createTextNode('Фильтр');
                    if (svgIcon && svgIcon.nextSibling) {
                        summary.insertBefore(textNode, svgIcon.nextSibling);
                    } else {
                        summary.appendChild(textNode);
                    }
                }
            }
        });

        translateFilterMenu();
    }
}