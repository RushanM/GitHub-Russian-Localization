document.addEventListener('DOMContentLoaded', function () {
    const enabledCheckbox = document.getElementById('enableTranslation');
    const statusText = document.getElementById('statusText');

    // загружаем сохранённое состояние
    browser.storage.local.get('enabled').then(result => {
        // Если настройки ещё не сохранены, по умолчанию включено
        const isEnabled = result.enabled !== undefined ? result.enabled : true;
        enabledCheckbox.checked = isEnabled;
        updateStatusText(isEnabled);
    });

    // обрабатываем изменение состояния переключателя
    enabledCheckbox.addEventListener('change', function () {
        const isEnabled = enabledCheckbox.checked;

        // сохраняем новое состояние
        browser.storage.local.set({ enabled: isEnabled });

        // обновляем текст статуса
        updateStatusText(isEnabled);

        // отправляем сообщение скрипту для применения изменений
        browser.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs[0].url.includes('github.com')) {
                browser.tabs.sendMessage(tabs[0].id, { action: "toggleTranslation", enabled: isEnabled });
            }
        });
    });

    function updateStatusText(isEnabled) {
        statusText.textContent = isEnabled ? 'Включён' : 'Выключен';
        statusText.style.color = isEnabled ? '#2cce5a' : '#cf222e';
    }
});