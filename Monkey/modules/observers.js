// Модуль наблюдателей за DOM
const DOMObservers = {
    // Инициализация MutationObserver для отслеживания изменений DOM
    startObserving: function (translations) {
        // Основной наблюдатель за DOM
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                // Проверяем изменения в атрибутах
                if (mutation.type === 'attributes') {
                    this.handleAttributeChanges(mutation.target, translations);
                }
                // Проверяем новые добавленные узлы
                else if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.handleNewElement(node, translations);
                        }
                    });
                }
            });
        });

        // Настраиваем наблюдатель
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['aria-label', 'placeholder', 'title'],
        });

        // Наблюдаем за появлением модальных окон
        this.observeModals(translations);

        // Наблюдаем за изменениями заголовка страницы
        this.observePageTitle(translations);

        // Трансформируем строки с автором темы при загрузке страницы
        this.transformIssueAuthorStrings(translations);

        return observer;
    },

    // Обработка изменений атрибутов
    handleAttributeChanges: function (element, translations) {
        // переводим атрибуты aria-label, placeholder и title
        ['aria-label', 'placeholder', 'title'].forEach(attr => {
            if (element.hasAttribute(attr)) {
                const originalText = element.getAttribute(attr);
                if (originalText && translations[originalText]) {
                    element.setAttribute(attr, translations[originalText]);
                }
            }
        });
    },
    // Обработка новых элементов в DOM
    handleNewElement: function (element, translations) {
        // Проверяем, не является ли элемент частью исключений
        if (TranslationUtils.isExcludedElement(element)) {
            return;
        }

        // Обрабатываем специфические элементы
        this.processHeaderElements(element, translations);
        this.processModalElements(element, translations);
        this.processTooltips(element, translations);

        // Трансформируем строки с автором темы
        this.transformIssueAuthorStrings(translations);

        // переводим текстовые узлы в добавленном элементе
        this.translateTextNodesInElement(element, translations);

        // переводим атрибуты
        this.translateAttributes(element, translations);
    },

    // Перевод текстовых узлов внутри элемента
    translateTextNodesInElement: function (element, translations) {
        const textNodes = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function (node) {
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
        while (currentNode = textNodes.nextNode()) {
            if (TranslationUtils.isExcludedElement(currentNode.parentElement)) {
                continue;
            }

            const originalText = currentNode.textContent.trim();
            if (!originalText) continue;

            // Проверяем, есть ли прямой перевод
            if (translations[originalText]) {
                currentNode.textContent = currentNode.textContent.replace(
                    originalText,
                    translations[originalText]
                );
                continue;
            }

            // Обрабатываем время и даты
            const text = currentNode.textContent.trim();
            if (/^(\d+) (hours?|minutes?|days?|weeks?) ago$/.test(text)) {
                this.translateRelativeTime(currentNode, translations);
            }
            else if (/^[A-Z][a-z]{2} \d{1,2}, \d{4}, \d{1,2}:\d{2}\s*(AM|PM)\s*GMT\+3$/.test(text)) {
                const translated = TranslationUtils.translateAbsoluteTime(text, translations);
                if (translated !== text) {
                    currentNode.textContent = currentNode.textContent.replace(text, translated);
                }
            }
        }
    },

    // Перевод атрибутов элемента
    translateAttributes: function (element, translations) {
        const elementsWithAttrs = element.querySelectorAll('[aria-label], [placeholder], [title]');
        elementsWithAttrs.forEach(el => {
            ['aria-label', 'placeholder', 'title'].forEach(attr => {
                if (el.hasAttribute(attr)) {
                    const originalText = el.getAttribute(attr);
                    if (originalText && translations[originalText]) {
                        el.setAttribute(attr, translations[originalText]);
                    }
                }
            });
        });
    },

    // Обработка элементов в заголовке
    processHeaderElements: function (element, translations) {
        // Поиск и перевод элементов в шапке
        const headerElements = element.querySelectorAll('.AppHeader-globalBar-item');
        headerElements.forEach(item => {
            // Ищем элементы меню в шапке
            const menuText = item.querySelector('.AppHeader-item-label');
            if (menuText && translations[menuText.textContent.trim()]) {
                menuText.textContent = translations[menuText.textContent.trim()];
            }
        });
    },

    // Обработка модальных окон
    processModalElements: function (element, translations) {
        // Перевод заголовков модальных окон
        const modalTitles = element.querySelectorAll('.Overlay-headerTitle');
        modalTitles.forEach(title => {
            if (translations[title.textContent.trim()]) {
                title.textContent = translations[title.textContent.trim()];
            }
        });

        // Перевод кнопок в модальных окнах
        const modalButtons = element.querySelectorAll('.Overlay-footer .btn');
        modalButtons.forEach(btn => {
            if (translations[btn.textContent.trim()]) {
                btn.textContent = translations[btn.textContent.trim()];
            }
        });
    },

    // Обработка всплывающих подсказок
    processTooltips: function (element, translations) {
        const tooltips = element.querySelectorAll('.Tooltip, .tooltip');
        tooltips.forEach(tooltip => {
            const tooltipText = tooltip.getAttribute('aria-label');
            if (tooltipText && translations[tooltipText]) {
                tooltip.setAttribute('aria-label', translations[tooltipText]);
            }
        });
    },

    // Перевод относительного времени
    translateRelativeTime: function (node, translations) {
        const text = node.textContent.trim();

        const timeRegexes = [
            { pattern: /^(\d+) hours? ago$/, key: 'hour', count: match => parseInt(match[1]) },
            { pattern: /^(\d+) minutes? ago$/, key: 'minute', count: match => parseInt(match[1]) },
            { pattern: /^(\d+) days? ago$/, key: 'day', count: match => parseInt(match[1]) },
            { pattern: /^(\d+) weeks? ago$/, key: 'week', count: match => parseInt(match[1]) }
        ];

        for (const { pattern, key, count } of timeRegexes) {
            const match = text.match(pattern);
            if (match) {
                const numValue = count(match);
                let translationKey;

                if (numValue === 1) {
                    translationKey = `${key}_singular`;
                } else if (numValue >= 2 && numValue <= 4) {
                    translationKey = `${key}_few`;
                } else {
                    translationKey = `${key}_many`;
                }

                if (translations.time && translations.time[translationKey]) {
                    const translation = translations.time[translationKey].replace('{count}', numValue);
                    node.textContent = node.textContent.replace(text, translation);
                }
                return;
            }
        }
    },

    // Наблюдение за появлением модальных окон
    observeModals: function (translations) {
        // Наблюдатель для портала модальных окон
        const portalContainer = document.getElementById('portal');
        if (portalContainer) {
            const modalObserver = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        mutation.addedNodes.forEach(node => {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                // Перевод модальных окон с задержкой для полной загрузки
                                setTimeout(() => {
                                    this.handleNewElement(node, translations);
                                }, 100);
                            }
                        });
                    }
                });
            });

            modalObserver.observe(portalContainer, {
                childList: true,
                subtree: true
            });
        }
    },

    // Наблюдение за изменениями заголовка страницы
    observePageTitle: function (translations) {
        // Сохраняем оригинальную функцию смены заголовка
        const originalTitleSetter = Object.getOwnPropertyDescriptor(Document.prototype, 'title').set;

        // Устанавливаем свой перехватчик
        Object.defineProperty(document, 'title', {
            set: function (newTitle) {
                // Убираем в конце " · GitHub"
                let translatedTitle = newTitle;
                if (newTitle.endsWith(' · GitHub')) {
                    const basePart = newTitle.substring(0, newTitle.length - 9);
                    if (translations[basePart]) {
                        translatedTitle = translations[basePart] + ' · GitHub';
                    }
                }
                // Вызываем оригинальную функцию
                originalTitleSetter.call(this, translatedTitle);
            }
        });
    },

    // Трансформация строки с автором темы из формата «Автор Открыта 8 hours ago» в «Открыта Автор 8 часов назад»
    transformIssueAuthorStrings: function (translations) {
        document.querySelectorAll('.Box-sc-g0xbh4-0.dqmClk, [data-testid="issue-body-header-author"]').forEach(authorEl => {
            // Ищем ближайший родительский контейнер с информацией об открытии темы
            const container = authorEl.closest('.ActivityHeader-module__narrowViewportWrapper--Hjl75, .Box-sc-g0xbh4-0.koxHLL');
            if (!container) return;

            // Находим подвал с текстом «Открыта»
            const footer = container.querySelector('.ActivityHeader-module__footer--FVHp7, .Box-sc-g0xbh4-0.bJQcYY');
            if (!footer) return;

            // Находим span с «Открыта» и автором
            const openedSpan = footer.querySelector('span');
            const authorLink = authorEl.querySelector('a[data-testid="issue-body-header-author"], a[href*="/users/"]') || authorEl;

            // Проверяем span
            if (!openedSpan) return;

            // Находим ссылку на время с relative-time
            const timeLink = footer.querySelector('a[data-testid="issue-body-header-link"]');
            if (!timeLink) return;

            // Находим элемент relative-time внутри ссылки
            const relativeTime = timeLink.querySelector('relative-time');
            if (!relativeTime) return;

            // Если уже трансформировано, пропускаем
            if (footer.getAttribute('data-ru-transformed')) return;

            try {
                // Выводим отладочную информацию
                console.log('[Русификатор Гитхаба] Найдена строка с автором темы:', openedSpan.textContent);

                // Отмечаем как трансформированное
                footer.setAttribute('data-ru-transformed', 'true');

                // Создаём новую структуру
                // 1. Сохраняем автора
                const authorClone = authorLink.cloneNode(true);

                // 2. Меняем текст в span на «Открыта»
                openedSpan.textContent = 'Открыта ';

                // 3. Вставляем автора после слова «Открыта»
                openedSpan.after(authorClone);

                // 4. Добавляем пробел между автором и временем
                authorClone.after(document.createTextNode(' '));

                // 5. Трансформируем текст времени
                const originalTimeText = relativeTime.textContent;
                console.log('[Русификатор Гитхаба] Оригинальный текст времени:', originalTimeText);

                // Проверяем, содержит ли текст паттерн времени
                const hoursAgoMatch = originalTimeText.match(/(\d+)\s+hours?\s+ago/);
                const minutesAgoMatch = originalTimeText.match(/(\d+)\s+minutes?\s+ago/);
                const daysAgoMatch = originalTimeText.match(/(\d+)\s+days?\s+ago/);
                const onDateMatch = originalTimeText.match(/on\s+([A-Za-z]+\s+\d+,\s+\d+)/);
                const inDateMatch = originalTimeText.match(/в\s+([A-Za-z]+\s+\d+,\s+\d+)/);

                if (hoursAgoMatch) {
                    const hours = parseInt(hoursAgoMatch[1], 10);
                    let translatedText;

                    // Правильное склонение
                    if (hours === 1) {
                        translatedText = "1 час назад";
                    } else if (hours >= 2 && hours <= 4) {
                        translatedText = hours + " часа назад";
                    } else {
                        translatedText = hours + " часов назад";
                    }

                    relativeTime.textContent = translatedText;
                    console.log('[Русификатор Гитхаба] Заменено на:', translatedText);
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
                    console.log('[Русификатор Гитхаба] Заменено на:', translatedText);
                } else if (daysAgoMatch) {
                    const days = parseInt(daysAgoMatch[1], 10);
                    let translatedText;

                    if (days === 1) {
                        translatedText = "1 день назад";
                    } else if (days >= 2 && days <= 4) {
                        translatedText = days + " дня назад";
                    } else {
                        translatedText = days + " дней назад";
                    }

                    relativeTime.textContent = translatedText;
                    console.log('[Русификатор Гитхаба] Заменено на:', translatedText);
                } else if (onDateMatch || inDateMatch) {
                    // Обрабатываем формат «on Apr 12, 2025» или «в Apr 12, 2025»
                    const dateText = onDateMatch ? onDateMatch[1] : inDateMatch[1];
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

                        const translatedText = `в ${day} ${monthRu} ${year}`;
                        relativeTime.textContent = translatedText;
                        console.log('[Русификатор Гитхаба] Заменено на:', translatedText);
                    } else {
                        const translatedText = "в " + dateText;
                        relativeTime.textContent = translatedText;
                        console.log('[Русификатор Гитхаба] Заменено на:', translatedText);
                    }
                }

                // 6. Скрываем оригинальный контейнер с автором
                if (authorEl !== authorLink) {
                    authorEl.style.cssText = 'display: none !important;';
                }

                console.log('[Русификатор Гитхаба] Строка с автором темы трансформирована');
            } catch (error) {
                console.error('[Русификатор Гитхаба] Ошибка при трансформации строки с автором:', error);
            }
        });
    }
};

// Экспорт объекта наблюдателей в глобальную область видимости
window.DOMObservers = DOMObservers;
