/* Local renderer for the Lucide icons used by this catalogue.
   Icon names and geometry follow https://lucide.dev */
(function () {
  const icons = {
    orbit: [['circle', { cx: 12, cy: 12, r: 3 }], ['path', { d: 'M20.2 20.2c2-2-.1-7.2-4.6-11.7S6 2 4 4c-2 2 .1 7.2 4.6 11.7s9.6 6.5 11.6 4.5Z' }], ['path', { d: 'M15.6 15.7c4.5-4.5 6.6-9.7 4.6-11.7-2-2-7.2.1-11.7 4.6S2 18.2 4 20.2c2 2 7.2-.1 11.6-4.5Z' }]],
    'external-link': [['path', { d: 'M15 3h6v6' }], ['path', { d: 'M10 14 21 3' }], ['path', { d: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' }]],
    'layout-dashboard': [['rect', { width: 7, height: 9, x: 3, y: 3, rx: 1 }], ['rect', { width: 7, height: 5, x: 14, y: 3, rx: 1 }], ['rect', { width: 7, height: 9, x: 14, y: 12, rx: 1 }], ['rect', { width: 7, height: 5, x: 3, y: 16, rx: 1 }]],
    palette: [['circle', { cx: 13.5, cy: 6.5, r: .5, fill: 'currentColor' }], ['circle', { cx: 17.5, cy: 10.5, r: .5, fill: 'currentColor' }], ['circle', { cx: 8.5, cy: 7.5, r: .5, fill: 'currentColor' }], ['circle', { cx: 6.5, cy: 12.5, r: .5, fill: 'currentColor' }], ['path', { d: 'M12 22a10 10 0 1 1 10-10 5 5 0 0 1-5 5h-2.3a1.7 1.7 0 0 0-1.4 2.8l.2.3A1.2 1.2 0 0 1 12 22Z' }]],
    panels: [['rect', { width: 18, height: 18, x: 3, y: 3, rx: 2 }], ['path', { d: 'M3 9h18' }], ['path', { d: 'M9 21V9' }]],
    'mouse-pointer-click': [['path', { d: 'm9 9 5 12 2-5 5-2Z' }], ['path', { d: 'M7.2 2.2 8 5.1' }], ['path', { d: 'm3.5 5.5 2.6 1.2' }], ['path', { d: 'm5.5 3.5 1.2 2.6' }], ['path', { d: 'M12 3h-1' }]],
    'list-checks': [['path', { d: 'm3 7 2 2 4-4' }], ['path', { d: 'm3 17 2 2 4-4' }], ['path', { d: 'M13 6h8' }], ['path', { d: 'M13 12h8' }], ['path', { d: 'M13 18h8' }]],
    'table-2': [['path', { d: 'M9 3v18' }], ['path', { d: 'M3 9h18' }], ['rect', { width: 18, height: 18, x: 3, y: 3, rx: 2 }]],
    'message-square-more': [['path', { d: 'M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z' }], ['path', { d: 'M8 10h.01' }], ['path', { d: 'M12 10h.01' }], ['path', { d: 'M16 10h.01' }]],
    moon: [['path', { d: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z' }]],
    sun: [['circle', { cx: 12, cy: 12, r: 4 }], ['path', { d: 'M12 2v2' }], ['path', { d: 'M12 20v2' }], ['path', { d: 'm4.93 4.93 1.42 1.42' }], ['path', { d: 'm17.66 17.66 1.41 1.41' }], ['path', { d: 'M2 12h2' }], ['path', { d: 'M20 12h2' }], ['path', { d: 'm6.34 17.66-1.41 1.41' }], ['path', { d: 'm19.07 4.93-1.41 1.41' }]],
    save: [['path', { d: 'M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z' }], ['path', { d: 'M17 21v-8H7v8' }], ['path', { d: 'M7 3v5h8' }]],
    'arrow-right': [['path', { d: 'M5 12h14' }], ['path', { d: 'm12 5 7 7-7 7' }]],
    'trash-2': [['path', { d: 'M3 6h18' }], ['path', { d: 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' }], ['path', { d: 'M19 6 18 20a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6' }], ['path', { d: 'M10 11v6' }], ['path', { d: 'M14 11v6' }]],
    plus: [['path', { d: 'M5 12h14' }], ['path', { d: 'M12 5v14' }]],
    'folder-plus': [['path', { d: 'M12 10v6' }], ['path', { d: 'M9 13h6' }], ['path', { d: 'M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z' }]],
    info: [['circle', { cx: 12, cy: 12, r: 10 }], ['path', { d: 'M12 16v-4' }], ['path', { d: 'M12 8h.01' }]],
    'circle-check': [['circle', { cx: 12, cy: 12, r: 10 }], ['path', { d: 'm9 12 2 2 4-4' }]],
    'message-square': [['path', { d: 'M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z' }]],
    menu: [['path', { d: 'M4 12h16' }], ['path', { d: 'M4 6h16' }], ['path', { d: 'M4 18h16' }]],
    x: [['path', { d: 'M18 6 6 18' }], ['path', { d: 'm6 6 12 12' }]],
    search: [['circle', { cx: 11, cy: 11, r: 8 }], ['path', { d: 'm21 21-4.3-4.3' }]],
    'sliders-horizontal': [['line', { x1: 21, x2: 14, y1: 4, y2: 4 }], ['line', { x1: 10, x2: 3, y1: 4, y2: 4 }], ['line', { x1: 21, x2: 12, y1: 12, y2: 12 }], ['line', { x1: 8, x2: 3, y1: 12, y2: 12 }], ['line', { x1: 21, x2: 16, y1: 20, y2: 20 }], ['line', { x1: 12, x2: 3, y1: 20, y2: 20 }], ['line', { x1: 14, x2: 14, y1: 2, y2: 6 }], ['line', { x1: 8, x2: 8, y1: 10, y2: 14 }], ['line', { x1: 16, x2: 16, y1: 18, y2: 22 }]],
    truck: [['path', { d: 'M10 17h4V5H2v12h3' }], ['path', { d: 'M14 9h4l4 4v4h-3' }], ['circle', { cx: 7.5, cy: 17.5, r: 2.5 }], ['circle', { cx: 16.5, cy: 17.5, r: 2.5 }]],
    'triangle-alert': [['path', { d: 'm21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z' }], ['path', { d: 'M12 9v4' }], ['path', { d: 'M12 17h.01' }]],
    'map-pin': [['path', { d: 'M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z' }], ['circle', { cx: 12, cy: 10, r: 3 }]],
    clock: [['circle', { cx: 12, cy: 12, r: 9 }], ['path', { d: 'M12 7v5l3 2' }]],
    gauge: [['path', { d: 'm12 14 4-4' }], ['path', { d: 'M3.3 19a10 10 0 1 1 17.4 0' }]],
    fuel: [['line', { x1: 3, x2: 15, y1: 22, y2: 22 }], ['line', { x1: 4, x2: 14, y1: 9, y2: 9 }], ['path', { d: 'M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18' }], ['path', { d: 'M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 4 0V9l-3-3' }]],
    route: [['circle', { cx: 6, cy: 19, r: 3 }], ['path', { d: 'M9 19h8.5a3.5 3.5 0 0 0 0-7H6.5a3.5 3.5 0 0 1 0-7H15' }], ['circle', { cx: 18, cy: 5, r: 3 }]],
    'chevron-down': [['path', { d: 'm6 9 6 6 6-6' }]],
    download: [['path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }], ['path', { d: 'm7 10 5 5 5-5' }], ['path', { d: 'M12 15V3' }]],
    bell: [['path', { d: 'M10.3 21a2 2 0 0 0 3.4 0' }], ['path', { d: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9' }]],
    settings: [['path', { d: 'M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.2a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.2.1a2 2 0 0 1 1 1.8v.5a2 2 0 0 1-1 1.8l-.2.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.4.2a2 2 0 0 1 1 1.7v.2a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.2a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.8v-.5a2 2 0 0 1 1-1.8l.2-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.4-.2a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2Z' }], ['circle', { cx: 12, cy: 12, r: 3 }]],
    'user-round': [['circle', { cx: 12, cy: 8, r: 5 }], ['path', { d: 'M20 21a8 8 0 0 0-16 0' }]],
    'locate-fixed': [['line', { x1: 2, x2: 5, y1: 12, y2: 12 }], ['line', { x1: 19, x2: 22, y1: 12, y2: 12 }], ['line', { x1: 12, x2: 12, y1: 2, y2: 5 }], ['line', { x1: 12, x2: 12, y1: 19, y2: 22 }], ['circle', { cx: 12, cy: 12, r: 7 }], ['circle', { cx: 12, cy: 12, r: 3 }]],
    minus: [['path', { d: 'M5 12h14' }]],
    'more-horizontal': [['circle', { cx: 5, cy: 12, r: 1 }], ['circle', { cx: 12, cy: 12, r: 1 }], ['circle', { cx: 19, cy: 12, r: 1 }]]
  };

  function createIcon(name, size = 16) {
    const definition = icons[name];
    if (!definition) throw new Error(`Lucide icon not included: ${name}`);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    Object.entries({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false', class: 'icon', 'data-lucide': name }).forEach(([key, value]) => svg.setAttribute(key, value));
    definition.forEach(([tag, attributes]) => {
      const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
      Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
      svg.append(node);
    });
    return svg;
  }

  function setButtonLabel(button, label, iconName, iconPosition = 'start') {
    if (!button) return;
    const icon = createIcon(iconName, 15);
    const text = document.createTextNode(label);
    button.replaceChildren(...(iconPosition === 'end' ? [text, icon] : [icon, text]));
  }

  function decorate() {
    document.querySelectorAll('.logo').forEach(logo => logo.replaceChildren(createIcon('orbit', 29)));
    const workspaceLink = document.querySelector('.workspace span');
    if (workspaceLink) workspaceLink.replaceChildren(createIcon('external-link', 13));
    const navigation = { overview: 'layout-dashboard', foundations: 'palette', rules: 'panels', actions: 'mouse-pointer-click', forms: 'list-checks', data: 'table-2', feedback: 'message-square-more' };
    Object.entries(navigation).forEach(([target, iconName]) => {
      const link = document.querySelector(`aside nav a[href="#${target}"]`);
      if (link) {
        const symbol = [...link.childNodes].find(node => node.nodeType === Node.TEXT_NODE);
        if (symbol) symbol.remove();
        link.prepend(createIcon(iconName, 15));
      }
    });
    setButtonLabel(document.querySelector('#theme'), 'Dark mode', 'moon');
    const saveButton = document.querySelector('[data-toast="Changes saved successfully"]');
    if (saveButton) saveButton.textContent = 'Save changes';
    setButtonLabel(document.querySelector('#menu-toggle'), 'Menu', 'menu');
    setButtonLabel(document.querySelector('[data-toast="Tertiary action preview"]'), 'Tertiary', 'arrow-right', 'end');
    setButtonLabel(document.querySelector('#delete'), 'Delete record', 'trash-2');
    const emptyIcon = document.querySelector('.empty-icon');
    if (emptyIcon) emptyIcon.replaceChildren(createIcon('folder-plus', 30));
    setButtonLabel(document.querySelector('[data-toast="Project creation is a component preview"]'), 'Create project', 'plus');
    const alertIcon = document.querySelector('.alert > span');
    if (alertIcon) alertIcon.replaceChildren(createIcon('info', 20));
    setButtonLabel(document.querySelector('[data-toast="Your changes have been saved."]'), 'Show success toast', 'circle-check');
    setButtonLabel(document.querySelector('#open-dialog'), 'Preview dialog', 'message-square');
  }

  window.CopperIcons = { createIcon, setButtonLabel };
  decorate();
})();
