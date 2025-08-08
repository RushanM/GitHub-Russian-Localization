// Модуль переводчика GitHub
const GitHubTranslator = {
    translations: {},
    
    // Инициализация переводчика
    init: function(translations) {
        this.translations = translations;
        this.translatePage();
    },
    
    // перевод текущей страницы
    translatePage: function() {
        // переводим статичные элементы
        this.translateStaticElements();
        
        // обработка специальных случаев
        this.processDashboard();
        this.processRepositoryPage();
        this.processProfilePage();
        
        // Форматирование чисел
        TranslationUtils.formatStarCount();
    },
    
    // перевод статичных элементов страницы
    translateStaticElements: function() {
        // Базовый перевод текстовых узлов
        const textNodes = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            { 
                acceptNode: function(node) {
                    // Игнорируем пустые узлы и узлы в скриптах/стилях
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
            // проверяем, не находится ли узел в исключенной зоне
            if (TranslationUtils.isExcludedElement(currentNode.parentElement)) {
                continue;
            }
            
            const originalText = currentNode.textContent.trim();
            // пропускаем пустые узлы и узлы с числами
            if (!originalText || /^\d+$/.test(originalText)) {
                continue;
            }
            
            // проверяем, есть ли прямой перевод
            if (this.translations[originalText]) {
                currentNode.textContent = currentNode.textContent.replace(
                    originalText, 
                    this.translations[originalText]
                );
                continue;
            }
            
            // проверяем сложные шаблоны
            this.translateTimeAndDates(currentNode);
        }
    },
    
    // перевод времени и дат
    translateTimeAndDates: function(node) {
        const text = node.textContent.trim();
        
        // перевод относительного времени
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
                
                if (this.translations.time && this.translations.time[translationKey]) {
                    const translation = this.translations.time[translationKey].replace('{count}', numValue);
                    node.textContent = node.textContent.replace(text, translation);
                }
                return;
            }
        }
        
        // перевод абсолютного времени
        if (/^[A-Z][a-z]{2} \d{1,2}, \d{4}, \d{1,2}:\d{2}\s*(AM|PM)\s*GMT\+3$/.test(text)) {
            const translated = TranslationUtils.translateAbsoluteTime(text, this.translations);
            if (translated !== text) {
                node.textContent = node.textContent.replace(text, translated);
            }
        }
    },
    
    // обработка элементов на панели управления (dashboard)
    processDashboard: function() {
        if (window.location.pathname === '/' || window.location.pathname === '/dashboard') {
            // переводим списки репозиториев и других элементов
            this.translateRepositoryLists();
            this.translateActivityFeed();
        }
    },
    
    // обработка страницы репозитория
    processRepositoryPage: function() {
        if (window.location.pathname.match(/\/[^\/]+\/[^\/]+\/?$/)) {
            // переводим специфичные элементы репозитория
            this.translateRepoTabs();
            this.translateRepoSidebar();
        }
    },
    
    // обработка страницы профиля
    processProfilePage: function() {
        if (window.location.pathname.match(/^\/[^\/]+\/?$/)) {
            // переводим элементы профиля
            this.translateProfileStatistics();
        }
    },
    
    // перевод списков репозиториев
    translateRepositoryLists: function() {
        // список заголовков разделов
        const sectionTitles = document.querySelectorAll('h2.h4');
        sectionTitles.forEach(title => {
            const text = title.textContent.trim();
            if (this.translations[text]) {
                title.textContent = this.translations[text];
            }
        });
    },
    
    // перевод вкладок репозитория
    translateRepoTabs: function() {
        const repoNavItems = document.querySelectorAll('.UnderlineNav-item');
        repoNavItems.forEach(item => {
            // Извлекаем текст вкладки без счетчика
            const textSpan = item.querySelector(':scope > span:not(.Counter)');
            if (textSpan && this.translations.repo_tabs && this.translations.repo_tabs[textSpan.textContent.trim()]) {
                textSpan.textContent = this.translations.repo_tabs[textSpan.textContent.trim()];
            }
        });
    },
    
    // перевод боковой панели репозитория
    translateRepoSidebar: function() {
        const sidebarItems = document.querySelectorAll('.BorderGrid-cell h2');
        sidebarItems.forEach(item => {
            const text = item.textContent.trim();
            if (this.translations.general && this.translations.general[text]) {
                item.textContent = this.translations.general[text];
            }
        });
    },
    
    // перевод статистики профиля
    translateProfileStatistics: function() {
        const statsItems = document.querySelectorAll('.js-profile-editable-area .Counter');
        statsItems.forEach(item => {
            const parent = item.parentElement;
            if (parent && parent.textContent.includes('repositories')) {
                const count = parseInt(item.textContent.trim());
                if (!isNaN(count)) {
                    parent.textContent = parent.textContent.replace(
                        `${count} repositories`, 
                        TranslationUtils.getRepositoriesTranslation(count)
                    );
                }
            }
        });
    },
    
    // перевод ленты активности
    translateActivityFeed: function() {
        const feedItems = document.querySelectorAll('.dashboard-feed .Box-row');
        feedItems.forEach(item => {
            const activityText = item.querySelector('.color-fg-muted');
            if (activityText) {
                this.translateActivityItem(activityText);
            }
        });
    },
    
    // перевод отдельного элемента ленты активности
    translateActivityItem: function(element) {
        const text = element.textContent;
        
        // перевод типичных действий
        const activities = [
            { en: 'contributed to', ru: this.translations.general?.['contributed to'] },
            { en: 'forked', ru: this.translations.general?.['forked'] },
            { en: 'created a repository', ru: this.translations.general?.['created a repository'] },
            { en: 'starred', ru: this.translations.general?.['starred'] }
        ];
        
        activities.forEach(({ en, ru }) => {
            if (ru && text.includes(en)) {
                element.innerHTML = element.innerHTML.replace(
                    new RegExp(en, 'g'), 
                    ru
                );
            }
        });
    }
};

// Экспортирование объекта переводчика в глобальную область видимости
window.GitHubTranslator = GitHubTranslator;
