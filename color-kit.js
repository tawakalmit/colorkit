const colorInput = document.getElementById('color-input');
const filterValue = document.getElementById('filter-value');
const colorPreview = document.getElementById('color-preview');
const getColorBtn = document.querySelector('button');
const hexColorDisplay = document.querySelector('#hex-element');
const rgbColorDisplay = document.querySelector('#rgb-element');
const rgbaColorDisplay = document.querySelector('#rgba-element');
const realColorPreview = document.getElementById('real-color-preview');
const allCopyButtons = document.querySelectorAll('.copy-btn');

const showCopiedPopup = (button) => {
    document.querySelectorAll('.copied-popup').forEach(p => p.remove());

    const popup = document.createElement('span');
    popup.className = 'copied-popup fixed z-50 font-mono text-xs text-white bg-green-600 px-2 py-1 rounded shadow pointer-events-none';
    popup.textContent = 'Copied!';
    document.body.appendChild(popup);

    const rect = button.getBoundingClientRect();
    popup.style.left = `${rect.right + 8}px`;
    popup.style.top = `${rect.top + rect.height / 2 - popup.offsetHeight / 2}px`;

    setTimeout(() => popup.remove(), 1200);
}

const hexToRgba = (hex, alpha = 1) => {
    // hapus tanda #
    hex = hex.replace('#', '');

    // support shorthand (#fff)
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('');
    }

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const rgbaToHex = (rgba) => {
    const result = rgba.match(/rgba?\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})(?:,\s*(0|1|0?\.\d+))?\)/);
    if (!result) return null;

    const r = parseInt(result[1]).toString(16).padStart(2, '0');
    const g = parseInt(result[2]).toString(16).padStart(2, '0');
    const b = parseInt(result[3]).toString(16).padStart(2, '0');

    return `#${r}${g}${b}`;
}

const rgbToHex = (rgb) => {
    const result = rgb.match(/rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)/);
    if (!result) return null;

    const r = parseInt(result[1]).toString(16).padStart(2, '0');
    const g = parseInt(result[2]).toString(16).padStart(2, '0');
    const b = parseInt(result[3]).toString(16).padStart(2, '0');

    return `#${r}${g}${b}`;
}

colorInput.addEventListener('keyup', (e) => {
    const value = e.target.value.trim();

    // check if input is valid hex color or rgba color
    const hexRegex = /^#?([a-fA-F0-9]{3}|[a-fA-F0-9]{6})$/;
    const rgbaRegex = /^rgba?\(\s*(\d{1,3}\s*,\s*){2}\d{1,3}(,\s*(0|1|0?\.\d+))?\s*\)$/;

    // check if valid hex color or rgba color getColorBtn enabled, else disabled
    if (hexRegex.test(value) || rgbaRegex.test(value)) {
        getColorBtn.disabled = false;
    } else {
        getColorBtn.disabled = true;
    }
})

getColorBtn.addEventListener('click', () => {
    const value = colorInput.value.trim();
    let resultHex
    let resultRgba
    let resultRgb

    // check if input is hex color or rgba color
    const hexRegex = /^#?([a-fA-F0-9]{3}|[a-fA-F0-9]{6})$/;
    const rgbaRegex = /^rgba?\(\s*(\d{1,3}\s*,\s*){2}\d{1,3}(,\s*(0|1|0?\.\d+))?\s*\)$/;
    const rgbRegex = /^rgb\(\s*(\d{1,3}\s*,\s*){2}\d{1,3}\s*\)$/;

    if (hexRegex.test(value)) {
        const result = hexToCssFilter(value);
        const filter = result.filter;
        filterValue.textContent = filter;
        colorPreview.style.filter = result.filterRaw;

        resultHex = value
        resultRgba = hexToRgba(value)
        resultRgb = hexToRgba(value, 1).replace(/rgba\((\d{1,3}), (\d{1,3}), (\d{1,3}), 1\)/, 'rgb($1, $2, $3)')
    }

    if (rgbaRegex.test(value)) {
        const hexCode = rgbaToHex(value)
        console.log(hexCode)
        const result = hexToCssFilter(hexCode);
        const filter = result.filter;
        filterValue.textContent = filter;
        colorPreview.style.filter = result.filterRaw;

        resultRgba = value
        resultHex = rgbaToHex(value)
        resultRgb = value.replace(/rgba\((\d{1,3}), (\d{1,3}), (\d{1,3}), (0|1|0?\.\d+)\)/, 'rgb($1, $2, $3)')
    }

    if (rgbRegex.test(value)) {
        const hexCode = rgbToHex(value)
        const result = hexToCssFilter(hexCode);
        const filter = result.filter;
        filterValue.textContent = filter;
        colorPreview.style.filter = result.filterRaw;

        resultRgb = value
        resultHex = rgbToHex(value)
        resultRgba = value.replace(/rgb\((\d{1,3}), (\d{1,3}), (\d{1,3})\)/, 'rgba($1, $2, $3, 1)')
    }

    hexColorDisplay.textContent = `Hex: ${resultHex}`;
    rgbColorDisplay.textContent = `RGB: ${resultRgb}`;
    rgbaColorDisplay.textContent = `RGBA: ${resultRgba}`;

    allCopyButtons.forEach(button => {
        button.classList.remove('hidden');
        button.onclick = () => {
            let textToCopy = '';
            if (button.previousElementSibling.textContent.startsWith('Hex:')) {
                textToCopy = resultHex;
            } else if (button.previousElementSibling.textContent.startsWith('RGB:')) {
                textToCopy = resultRgb;
            } else if (button.previousElementSibling.textContent.startsWith('RGBA:')) {
                textToCopy = resultRgba;
            } else if (button.previousElementSibling === filterValue) {
                textToCopy = filterValue.textContent;
            }
            navigator.clipboard.writeText(textToCopy).then(() => {
                showCopiedPopup(button);
            }).catch(err => {
                console.error('Failed to copy: ', err);
            });
        }
    });

    realColorPreview.style.backgroundColor = resultHex;
});