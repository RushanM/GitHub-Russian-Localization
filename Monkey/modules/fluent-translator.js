// Модуль для работы с Mozilla Fluent локализацией
const FluentTranslationModule = {
    // хранилище переведённых строк
    _messages: null,
    
    // загрузка файла FTL
    async loadTranslations(url) {
        try {
            // проверяем, загружена ли библиотека Fluent
            if (!window.FluentBundle) {
                console.log('Библиотека Fluent не загружена, пытаюсь загрузить...');
                await this.loadFluentLibrary();
            }
            
            // проверяем ещё раз после попытки загрузки
            if (!window.FluentBundle) {
                console.error('Не удалось загрузить библиотеку Fluent');
                return false;
            }
            
            // загружаем содержимое файла FTL
            const response = await fetch(url);
            if (!response.ok) {
                console.error('Ошибка загрузки файла локализации:', response.statusText);
                return false;
            }
            
            const ftlContent = await response.text();
            await this.initFluent(ftlContent);
            return true;
        } catch (error) {
            console.error('Ошибка загрузки файла локализации:', error);
            return false;
        }
    },
    
    // инициализация Fluent с загруженным содержимым
    async initFluent(ftlContent) {
        try {
            // проверяем, загружена ли библиотека Fluent
            if (!window.FluentBundle) {
                console.error('Библиотека Fluent не загружена в initFluent');
                return null;
            }
            
            const { FluentBundle, FluentResource } = window.FluentBundle;
            
            // создаём сборку с русской локализацией
            const bundle = new FluentBundle('ru');
            const resource = new FluentResource(ftlContent);
            
            // добавляем ресурс в сборку
            const errors = bundle.addResource(resource);
            if (errors.length) {
                console.warn('Ошибки при синтаксическом анализе файла FTL:', errors);
            }
            
            this._messages = bundle;
            return bundle;
        } catch (error) {
            console.error('Ошибка при инициализации Fluent:', error);
            return null;
        }
    },
    
    // загрузка библиотеки Fluent
    async loadFluentLibrary() {
        // проверяем, если библиотека уже загружена
        if (window.FluentBundle) {
            return Promise.resolve();
        }
        
        return new Promise((resolve, reject) => {
            try {
                // создаём скрипт для загрузки Fluent
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/@fluent/bundle@0.19.1/index.js';
                script.async = true;
                script.crossOrigin = 'anonymous';
                
                // обработчики событий для загрузки
                script.onload = () => {
                    console.log('Библиотека Fluent успешно загружена');
                    resolve();
                };
                
                script.onerror = (error) => {
                    console.error('Не удалось загрузить библиотеку Fluent:', error);
                    reject(new Error('Не удалось загрузить библиотеку Fluent'));
                };
                
                // добавляем скрипт в документ
                document.head.appendChild(script);
            } catch (error) {
                console.error('Ошибка при загрузке библиотеки Fluent:', error);
                reject(error);
            }
        });
    },
    
    // получение перевода по ключу
    getMessage(id, args = null) {
        if (!this._messages) {
            return id;
        }
        
        const message = this._messages.getMessage(id);
        if (!message) {
            return id;
        }
        
        try {
            const formatted = this._messages.formatPattern(message.value, args);
            return formatted;
        } catch (e) {
            console.warn(`Ошибка форматирования сообщения '${id}':`, e);
            return id;
        }
    },
    
    // проверка наличия перевода для ключа
    hasMessage(id) {
        return this._messages && this._messages.hasMessage(id);
    },
    
    // склонение числа репозиториев 
    formatRepositories(count) {
        return this.getMessage('repositories-one', { count });
    },
    
    // создание карты соответствия из старых ключей JSON к новым ключам Fluent
    buildMigrationMap() {
        return {
            // панель управления
            'Dashboard': 'dashboard-title',
            'Type / to search': 'dashboard-type-to-search',
            'Command palette': 'dashboard-command-palette',
            'Chat with Copilot': 'dashboard-chat-with-copilot',
            'Open Copilot…': 'dashboard-open-copilot',
            'Create new...': 'dashboard-create-new',
            'Your issues': 'dashboard-your-issues',
            'Your pull requests': 'dashboard-your-pull-requests',
            'You have no unread notifications': 'dashboard-no-unread-notifications',
            'You have unread notifications': 'dashboard-unread-notifications',
            'Top repositories': 'dashboard-top-repositories',
            'Ask Copilot': 'dashboard-ask-copilot',
            'Send': 'dashboard-send',
            'Learn. Collaborate. Grow.': 'dashboard-learn-collaborate-grow',
            'Find a repository…': 'dashboard-find-repository',
            'GitHub Education gives you the tools and community support to take on tech challenges and turn them into opportunities. Your future in tech starts here!': 'dashboard-github-education-info',
            'Go to GitHub Education': 'dashboard-go-to-github-education',
            'Home': 'dashboard-home',
            'Filter': 'dashboard-filter',
            'Popular among': 'dashboard-popular-among',
            'people you follow': 'dashboard-people-you-follow',
            'Recommended for you': 'dashboard-recommended-for-you',
            'Latest changes': 'dashboard-latest-changes',
            'Explore repositories': 'dashboard-explore-repositories',
            
            // левая боковая панель
            'Home': 'left-sidebar-home',
            'Issues': 'left-sidebar-issues',
            'Pull requests': 'left-sidebar-pull-requests',
            'Projects': 'left-sidebar-projects',
            'Discussions': 'left-sidebar-discussions',
            'Codespaces': 'left-sidebar-codespaces',
            'Copilot': 'left-sidebar-copilot',
            '© 2025 GitHub, Inc.': 'left-sidebar-copyright',
            
            // подвал
            'Manage Cookies': 'footer-manage-cookies',
            
            // поиск
            'Give feedback': 'search-give-feedback',
            
            // настройки Копайлота
            'Settings': 'copilot-settings',
            
            // создание нового
            'New project': 'createnew-new-project',
            
            // правая боковая панель
            'Sign out': 'right-sidebar-sign-out',
            
            // работа с Копайлотом
            'CLI': 'copilot-openwith-cli',
            
            // настройки
            'Archives': 'settings-archives',
            
            // вкладки репозитория
            'Releases': 'repo-tabs-releases',
            
            // время
            'by_moscow_time': 'time-by-moscow-time',
            
            // месяцы
            'December': 'months-december',
            
            // общие действия
            'contributed to': 'contributed-to',
            'forked': 'forked',
            'created a repository': 'created-a-repository',
            'made this repository public': 'made-repository-public',
            'starred': 'starred',
            'a repository': 'a-repository',
            'minutes ago': 'minutes-ago',
            
            // соответствия для всех подсказок Копайлота
            'Compare JS equality operators': 'copilot-compare-js-equality',
            'Compare Python method decorators': 'copilot-compare-python-decorators',
            'Create a profile README for me': 'copilot-create-profile-readme',
        };
    },
    
    // получение перевода по старому ключу JSON (для обратной совместимости)
    getTranslationByLegacyKey(jsonKey) {
        const migrationMap = this.buildMigrationMap();
        const fluentKey = migrationMap[jsonKey];
        
        if (fluentKey) {
            return this.getMessage(fluentKey);
        }
        
        return null;
    }
};

// экспортирование объекта модуля в глобальную область видимости
window.FluentTranslationModule = FluentTranslationModule;
