import { saveSettingsDebounced } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';

const supportedProviders = [
    'openai', 'claude', 'windowai', 'aimlapi', 'openrouter', 'ai21', 'scale',
    'makersuite', 'google', 'gemini', 'vertexai', 'mistralai', 'custom', 'cohere',
    'perplexity', 'groq', '01ai', 'nanogpt', 'deepseek', 'xai', 'pollinations',
    'novelai', 'koboldai', 'textgenerationwebui', 'horde', 'anthropic', 'together',
];

const defaultSettings = { provider: {} };
for (const provider of supportedProviders) {
    defaultSettings.provider[provider] = [];
    defaultSettings[`${provider}_model`] = undefined;
}

const settings = { ...defaultSettings };
Object.assign(settings, extension_settings.customModels ?? {});

for (const provider of supportedProviders) {
    if (!settings.provider[provider]) {
        settings.provider[provider] = [];
    }
}

let popupCaller;
let popupType;
let popupResult;
try {
    const popup = await import('../../../popup.js');
    popupCaller = popup.callGenericPopup;
    popupType = popup.POPUP_TYPE;
    popupResult = popup.POPUP_RESULT;
} catch {
    popupCaller = (await import('../../../../script.js')).callPopup;
    popupType = { TEXT: 1 };
    popupResult = { AFFIRMATIVE: 1 };
}

setTimeout(() => {
    for (const [provider, models] of Object.entries(settings.provider)) {
        const sel = /**@type {HTMLSelectElement}*/(document.querySelector(`#model_${provider}_select`));
        if (!sel) continue;

        // Flexible label search: looks for h4, label, small, or searches parent containers
        const targetContainer = sel.parentElement?.querySelector('h4, label, small, span') 
            || sel.closest('.inline-drawer, .flex-container, div')?.querySelector('h4, label, small')
            || sel.parentElement;

        if (!targetContainer) continue;

        const btn = document.createElement('div');
        btn.classList.add('stcm--btn', 'menu_button', 'fa-solid', 'fa-fw', 'fa-pen-to-square');
        btn.title = `Edit custom models (${provider})`;
        btn.style.cursor = 'pointer';
        btn.style.display = 'inline-block';
        btn.style.marginLeft = '6px';

        btn.addEventListener('click', async () => {
            const dom = document.createElement('div');
            const header = document.createElement('h3');
            header.textContent = `Custom Models: ${provider}`;
            dom.append(header);

            const hint = document.createElement('small');
            hint.textContent = 'one model name per line';
            dom.append(hint);

            const inp = document.createElement('textarea');
            inp.classList.add('text_pole');
            inp.rows = 20;
            inp.value = models.join('\n');
            dom.append(inp);

            const prom = popupCaller(dom, popupType.TEXT, null, { okButton: 'Save' });
            const result = await prom;
            if (result == popupResult.AFFIRMATIVE) {
                while (models.pop());
                models.push(...inp.value.split('\n').map(m => m.trim()).filter(Boolean));
                extension_settings.customModels = settings;
                saveSettingsDebounced();
                populateOptGroup();
                if (settings[`${provider}_model`] && models.includes(settings[`${provider}_model`])) {
                    sel.value = settings[`${provider}_model`];
                    sel.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        });

        targetContainer.append(btn);

        const grp = document.createElement('optgroup');
        grp.label = 'Custom Models';

        const populateOptGroup = () => {
            grp.innerHTML = '';
            for (const model of models) {
                const opt = document.createElement('option');
                opt.value = model;
                opt.textContent = model;
                grp.append(opt);
            }
        };

        populateOptGroup();
        sel.insertBefore(grp, sel.children[0]);

        if (settings[`${provider}_model`] && models.includes(settings[`${provider}_model`])) {
            sel.value = settings[`${provider}_model`];
            sel.dispatchEvent(new Event('change', { bubbles: true }));
        }

        sel.addEventListener('change', (evt) => {
            evt.stopImmediatePropagation();
            if (settings[`${provider}_model`] != sel.value) {
                settings[`${provider}_model`] = sel.value;
                extension_settings.customModels = settings;
                saveSettingsDebounced();
            }
        });
    }
}, 800);
