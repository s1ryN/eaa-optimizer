/**
 * WCAG 2.1 Rules Knowledge Base
 * ══════════════════════════════
 * Maps every axe-core rule ID we care about to human-readable guidance:
 *   - WCAG success criterion + level
 *   - A short fix tip
 *   - A bad/good HTML example pair
 *   - Whether manual inspection is still needed
 *
 * Entries are added here whenever a new rule lands in production data.
 * Rules not present fall back to a safe default in getRule().
 * Coverage targets WCAG 2.1 Level A and AA — the ~50% automatable portion.
 */

// ─── 1.1 Text Alternatives ──────────────────────────────────────────────────

const RULES_KB = {

    'image-alt': {
        wcagRef:   '1.1.1',
        wcagLevel: 'A',
        title:     'Images must have alternative text',
        fixTip:    'Add a descriptive alt attribute. For purely decorative images use alt="" (empty string).',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/image-alt',
        badExample:  '<img src="logo.png">',
        goodExample: '<img src="logo.png" alt="Company logo">\n<!-- Decorative: -->\n<img src="divider.png" alt="" role="presentation">',
        manualCheck: 'Verify that alt text meaningfully describes the image — not just "image123.png".',
    },

    'input-image-alt': {
        wcagRef:   '1.1.1',
        wcagLevel: 'A',
        title:     'Image buttons must have alternative text',
        fixTip:    'Add an alt attribute that describes the button action, not the image itself.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/input-image-alt',
        badExample:  '<input type="image" src="submit.png">',
        goodExample: '<input type="image" src="submit.png" alt="Submit order">',
    },

    'object-alt': {
        wcagRef:   '1.1.1',
        wcagLevel: 'A',
        title:     '<object> elements must have alternative text',
        fixTip:    'Provide fallback text content inside the <object> element.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/object-alt',
        badExample:  '<object data="chart.swf"></object>',
        goodExample: '<object data="chart.swf">Sales chart showing Q1–Q4 2024 revenue</object>',
    },

    'role-img-alt': {
        wcagRef:   '1.1.1',
        wcagLevel: 'A',
        title:     'Elements with role="img" must have alternative text',
        fixTip:    'Add aria-label or aria-labelledby to the element.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/role-img-alt',
        badExample:  '<div role="img" style="background-image: url(hero.jpg)"></div>',
        goodExample: '<div role="img" aria-label="Hero banner: autumn forest" style="background-image: url(hero.jpg)"></div>',
    },

    'svg-img-alt': {
        wcagRef:   '1.1.1',
        wcagLevel: 'A',
        title:     'SVG images must have an accessible name',
        fixTip:    'Add a <title> element as the first child of <svg>, or use aria-label.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/svg-img-alt',
        badExample:  '<svg role="img"><path d="..."/></svg>',
        goodExample: '<svg role="img" aria-labelledby="svg-title">\n  <title id="svg-title">Bar chart of monthly sales</title>\n  <path d="..."/>\n</svg>',
    },

    // ─── 1.2 Time-based Media ───────────────────────────────────────────────

    'video-caption': {
        wcagRef:   '1.2.2',
        wcagLevel: 'A',
        title:     'Videos must have captions',
        fixTip:    'Add a <track kind="captions"> element to the video.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/video-caption',
        badExample:  '<video src="intro.mp4" controls></video>',
        goodExample: '<video src="intro.mp4" controls>\n  <track kind="captions" src="captions-en.vtt" srclang="en" label="English">\n</video>',
        manualCheck: 'Check that captions accurately reflect all spoken content and relevant sounds.',
    },

    'audio-caption': {
        wcagRef:   '1.2.1',
        wcagLevel: 'A',
        title:     'Audio must have a transcript',
        fixTip:    'Provide a text transcript immediately after or near the audio element.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/audio-caption',
        badExample:  '<audio src="message.mp3" controls></audio>',
        goodExample: '<audio src="message.mp3" controls></audio>\n<details>\n  <summary>Transcript</summary>\n  <p>"Welcome to our store..."</p>\n</details>',
    },

    // ─── 1.3 Adaptable ─────────────────────────────────────────────────────

    'landmark-one-main': {
        wcagRef:   '1.3.1',
        wcagLevel: 'A',
        title:     'Document must have exactly one main landmark',
        fixTip:    'Wrap your primary page content in a single <main> element.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/landmark-one-main',
        badExample:  '<div class="content">...</div>',
        goodExample: '<main id="main-content">...</main>',
    },

    'region': {
        wcagRef:   '1.3.1',
        wcagLevel: 'A',
        title:     'Page content must be contained in landmarks',
        fixTip:    'Wrap all visible content in semantic landmark elements: <header>, <nav>, <main>, <aside>, <footer>.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/region',
        badExample:  '<div>This text is outside any landmark</div>',
        goodExample: '<main><p>This text is inside the main landmark</p></main>',
    },

    'list': {
        wcagRef:   '1.3.1',
        wcagLevel: 'A',
        title:     '<ul> and <ol> must only directly contain <li> elements',
        fixTip:    'Remove non-<li> direct children, or change the container to a <div>.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/list',
        badExample:  '<ul>\n  <span>Item 1</span>\n  <span>Item 2</span>\n</ul>',
        goodExample: '<ul>\n  <li>Item 1</li>\n  <li>Item 2</li>\n</ul>',
    },

    'listitem': {
        wcagRef:   '1.3.1',
        wcagLevel: 'A',
        title:     '<li> must be contained in <ul> or <ol>',
        fixTip:    'Move <li> elements inside a <ul> or <ol> wrapper.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/listitem',
        badExample:  '<div>\n  <li>Item 1</li>\n</div>',
        goodExample: '<ul>\n  <li>Item 1</li>\n</ul>',
    },

    'definition-list': {
        wcagRef:   '1.3.1',
        wcagLevel: 'A',
        title:     '<dl> must only contain <dt> and <dd> elements',
        fixTip:    'Replace invalid children with <dt>/<dd> pairs.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/definition-list',
        badExample:  '<dl>\n  <li>Term: Definition</li>\n</dl>',
        goodExample: '<dl>\n  <dt>Term</dt>\n  <dd>Definition</dd>\n</dl>',
    },

    'table-duplicate-name': {
        wcagRef:   '1.3.1',
        wcagLevel: 'A',
        title:     'Table summary must not duplicate the caption',
        fixTip:    'Use <caption> for a short title; provide additional detail only in summary.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/table-duplicate-name',
        badExample:  '<table summary="Sales data">\n  <caption>Sales data</caption>\n</table>',
        goodExample: '<table summary="Quarterly breakdown by product for 2024">\n  <caption>Sales data</caption>\n</table>',
    },

    'td-headers-attr': {
        wcagRef:   '1.3.1',
        wcagLevel: 'A',
        title:     'Table data cells must reference existing header IDs',
        fixTip:    'Each ID in headers="" must match an existing <th id="">. Or use scope instead.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/td-headers-attr',
        badExample:  '<td headers="nonexistent-id">Data</td>',
        goodExample: '<th id="col-price">Price</th>\n<td headers="col-price">€29.99</td>',
    },

    'th-has-data-cells': {
        wcagRef:   '1.3.1',
        wcagLevel: 'A',
        title:     'Table headers must have associated data cells',
        fixTip:    'Add scope="col" or scope="row" to header cells, and ensure they have data cells.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/th-has-data-cells',
        badExample:  '<th>Unused header</th>',
        goodExample: '<th scope="col">Price</th>',
    },

    'autocomplete-valid': {
        wcagRef:   '1.3.5',
        wcagLevel: 'AA',
        title:     'Autocomplete attribute must be used correctly',
        fixTip:    'Use a valid WCAG autocomplete token: "name", "email", "tel", "street-address", etc.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/autocomplete-valid',
        badExample:  '<input type="text" autocomplete="full-name">',
        goodExample: '<input type="text" autocomplete="name">',
    },

    // ─── 1.4 Distinguishable ────────────────────────────────────────────────

    'color-contrast': {
        wcagRef:   '1.4.3',
        wcagLevel: 'AA',
        title:     'Text must have sufficient colour contrast',
        fixTip:    'Ensure text has a contrast ratio ≥ 4.5:1 (≥ 3:1 for large text ≥ 18pt / 14pt bold). Darken text or adjust background.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/color-contrast',
        badExample:  '<!-- Light grey on white — ratio ~2.0:1 -->\n<p style="color:#aaa;background:#fff">Read me</p>',
        goodExample: '<!-- Dark on white — ratio ~7.1:1 -->\n<p style="color:#333;background:#fff">Read me</p>',
        manualCheck: 'Axe cannot check text over images or gradients. Review those manually.',
    },

    'color-contrast-enhanced': {
        wcagRef:   '1.4.6',
        wcagLevel: 'AAA',
        title:     'Text must meet enhanced contrast (AAA)',
        fixTip:    'Target a contrast ratio ≥ 7:1 (≥ 4.5:1 for large text) for AAA conformance.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/color-contrast-enhanced',
        badExample:  '<p style="color:#777;background:#fff">Text (ratio ~4.5:1)</p>',
        goodExample: '<p style="color:#222;background:#fff">Text (ratio ~12:1)</p>',
    },

    'meta-viewport': {
        wcagRef:   '1.4.4',
        wcagLevel: 'AA',
        title:     'Viewport must not prevent user scaling',
        fixTip:    'Remove user-scalable=no and maximum-scale values below 2 from the viewport meta tag.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/meta-viewport',
        badExample:  '<meta name="viewport" content="width=device-width, user-scalable=no">',
        goodExample: '<meta name="viewport" content="width=device-width, initial-scale=1">',
    },

    // ─── 2.1 Keyboard Accessible ────────────────────────────────────────────

    'scrollable-region-focusable': {
        wcagRef:   '2.1.1',
        wcagLevel: 'A',
        title:     'Scrollable regions must be keyboard accessible',
        fixTip:    'Add tabindex="0" to scrollable containers not otherwise keyboard accessible.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/scrollable-region-focusable',
        badExample:  '<div style="overflow:auto;height:200px">...long content...</div>',
        goodExample: '<div style="overflow:auto;height:200px" tabindex="0" role="region" aria-label="Product details">...long content...</div>',
    },

    // ─── 2.4 Navigable ─────────────────────────────────────────────────────

    'skip-link': {
        wcagRef:   '2.4.1',
        wcagLevel: 'A',
        title:     'Page must have a skip navigation link',
        fixTip:    'Add a visually-hidden "Skip to main content" link as the very first element in <body>.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/skip-link',
        badExample:  '<body>\n  <nav>...</nav>\n  <main>...</main>\n</body>',
        goodExample: '<body>\n  <a href="#main" class="skip-link">Skip to main content</a>\n  <nav>...</nav>\n  <main id="main">...</main>\n</body>',
    },

    'document-title': {
        wcagRef:   '2.4.2',
        wcagLevel: 'A',
        title:     'Document must have a non-empty <title>',
        fixTip:    'Add a descriptive <title> in <head>. Each page should have a unique, meaningful title.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/document-title',
        badExample:  '<head></head>',
        goodExample: '<head>\n  <title>Product Catalogue — My Shop</title>\n</head>',
    },

    'focus-order-semantics': {
        wcagRef:   '2.4.3',
        wcagLevel: 'A',
        title:     'Focusable elements must have interactive semantics',
        fixTip:    'Only add tabindex to interactive elements, or add an appropriate ARIA role (role="button", role="link", etc.).',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/focus-order-semantics',
        badExample:  '<div tabindex="0" class="info-box">Information</div>',
        goodExample: '<div tabindex="0" role="region" aria-label="Information panel">Information</div>',
    },

    'link-name': {
        wcagRef:   '2.4.4',
        wcagLevel: 'A',
        title:     'Links must have discernible text',
        fixTip:    'Provide visible link text, or aria-label/aria-labelledby. Avoid "click here", "read more", or icon-only links without a label.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/link-name',
        badExample:  '<a href="/products"><img src="arrow.svg"></a>\n<a href="/more">Click here</a>',
        goodExample: '<a href="/products">\n  <img src="arrow.svg" alt="">\n  View products\n</a>\n<a href="/more">Read more about accessibility</a>',
    },

    'heading-order': {
        wcagRef:   '2.4.6',
        wcagLevel: 'AA',
        title:     'Heading levels must not be skipped',
        fixTip:    'Use headings in sequential order — never jump from <h1> directly to <h3> without an <h2> in between.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/heading-order',
        badExample:  '<h1>Page Title</h1>\n<h3>Subsection</h3>',
        goodExample: '<h1>Page Title</h1>\n<h2>Section</h2>\n<h3>Subsection</h3>',
    },

    // ─── 3.1 Readable ──────────────────────────────────────────────────────

    'html-has-lang': {
        wcagRef:   '3.1.1',
        wcagLevel: 'A',
        title:     'HTML element must have a lang attribute',
        fixTip:    'Add a valid BCP 47 language tag to <html>, e.g. lang="en" or lang="cs".',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/html-has-lang',
        badExample:  '<html>',
        goodExample: '<html lang="en">',
    },

    'html-lang-valid': {
        wcagRef:   '3.1.1',
        wcagLevel: 'A',
        title:     'HTML lang attribute must be a valid language code',
        fixTip:    'Use a valid BCP 47 tag: "en", "cs", "de", "fr", "sk", "pl", etc.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/html-lang-valid',
        badExample:  '<html lang="english">',
        goodExample: '<html lang="en">',
    },

    // ─── 4.1 Compatible ────────────────────────────────────────────────────

    'duplicate-id': {
        wcagRef:   '4.1.1',
        wcagLevel: 'A',
        title:     'IDs must be unique within a document',
        fixTip:    'Ensure every id value appears exactly once per page.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/duplicate-id',
        badExample:  '<div id="header">...</div>\n<div id="header">...</div>',
        goodExample: '<div id="site-header">...</div>\n<div id="page-header">...</div>',
    },

    'duplicate-id-active': {
        wcagRef:   '4.1.1',
        wcagLevel: 'A',
        title:     'Interactive elements must not share an ID',
        fixTip:    'IDs referenced by aria-labelledby, aria-describedby, aria-controls, etc. must be unique.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/duplicate-id-active',
        badExample:  '<button id="btn">Cancel</button>\n<button id="btn">Submit</button>',
        goodExample: '<button id="btn-cancel">Cancel</button>\n<button id="btn-submit">Submit</button>',
    },

    'duplicate-id-aria': {
        wcagRef:   '4.1.1',
        wcagLevel: 'A',
        title:     'IDs used in ARIA attributes must be unique',
        fixTip:    'Duplicate IDs break aria-labelledby / aria-describedby associations.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/duplicate-id-aria',
        badExample:  '<span id="hint">Required</span>\n<span id="hint">Required</span>\n<input aria-describedby="hint">',
        goodExample: '<span id="hint-email">Required</span>\n<input aria-describedby="hint-email">',
    },

    'label': {
        wcagRef:   '4.1.2',
        wcagLevel: 'A',
        title:     'Form inputs must have accessible labels',
        fixTip:    'Use <label for="inputId"> or add aria-label / aria-labelledby directly on the input.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/label',
        badExample:  '<span>Email:</span>\n<input type="email">',
        goodExample: '<label for="email">Email address</label>\n<input type="email" id="email">\n<!-- Or: -->\n<input type="email" aria-label="Email address">',
    },

    'select-name': {
        wcagRef:   '4.1.2',
        wcagLevel: 'A',
        title:     'Select elements must have accessible names',
        fixTip:    'Associate a <label> with the <select>, or use aria-label.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/select-name',
        badExample:  '<select>\n  <option>Red</option>\n</select>',
        goodExample: '<label for="colour">Choose colour</label>\n<select id="colour">\n  <option>Red</option>\n</select>',
    },

    'button-name': {
        wcagRef:   '4.1.2',
        wcagLevel: 'A',
        title:     'Buttons must have accessible names',
        fixTip:    'Add visible text, aria-label, or aria-labelledby to every button.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/button-name',
        badExample:  '<button><svg viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg></button>',
        goodExample: '<button aria-label="Close dialog">\n  <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">\n    <path d="M6 18L18 6M6 6l12 12"/>\n  </svg>\n</button>',
    },

    'frame-title': {
        wcagRef:   '4.1.2',
        wcagLevel: 'A',
        title:     'Frames must have accessible names',
        fixTip:    'Add a descriptive title attribute to every <iframe>.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/frame-title',
        badExample:  '<iframe src="map.html"></iframe>',
        goodExample: '<iframe src="map.html" title="Store location map"></iframe>',
    },

    'tabindex': {
        wcagRef:   '2.4.3',
        wcagLevel: 'A',
        title:     'Positive tabindex values must not be used',
        fixTip:    'Use tabindex="0" to include an element in focus order, or tabindex="-1" for programmatic focus only. Never use positive values — they break the natural tab order.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/tabindex',
        badExample:  '<button tabindex="5">Submit</button>',
        goodExample: '<button>Submit</button>',
    },

    'form-field-multiple-labels': {
        wcagRef:   '1.3.1',
        wcagLevel: 'A',
        title:     'Form fields must not have multiple labels',
        fixTip:    'Remove the duplicate label association from the input.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/form-field-multiple-labels',
        badExample:  '<label for="name">First name</label>\n<label for="name">Your name</label>\n<input id="name" type="text">',
        goodExample: '<label for="name">First name</label>\n<input id="name" type="text">',
    },

    'aria-required-attr': {
        wcagRef:   '4.1.2',
        wcagLevel: 'A',
        title:     'ARIA roles must have all required attributes',
        fixTip:    'Add the required ARIA state/property attributes for the role being used.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/aria-required-attr',
        badExample:  '<!-- role="checkbox" requires aria-checked -->\n<div role="checkbox">Accept terms</div>',
        goodExample: '<div role="checkbox" aria-checked="false" tabindex="0">Accept terms</div>',
    },

    'aria-required-children': {
        wcagRef:   '4.1.2',
        wcagLevel: 'A',
        title:     'ARIA roles must contain required child roles',
        fixTip:    'Add the required owned-element roles as direct children.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/aria-required-children',
        badExample:  '<div role="list">\n  <div>Item</div>\n</div>',
        goodExample: '<div role="list">\n  <div role="listitem">Item</div>\n</div>',
    },

    'aria-required-parent': {
        wcagRef:   '4.1.2',
        wcagLevel: 'A',
        title:     'ARIA child roles must be inside the required parent role',
        fixTip:    'Nest the element inside the correct parent role container.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/aria-required-parent',
        badExample:  '<div role="option">Red</div>',
        goodExample: '<div role="listbox" aria-label="Colours">\n  <div role="option">Red</div>\n</div>',
    },

    'aria-roles': {
        wcagRef:   '4.1.2',
        wcagLevel: 'A',
        title:     'ARIA role attribute must be valid',
        fixTip:    'Use a valid WAI-ARIA role. See https://www.w3.org/TR/wai-aria/#role_definitions',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/aria-roles',
        badExample:  '<div role="thingy">...</div>',
        goodExample: '<div role="region" aria-label="Announcements">...</div>',
    },

    'aria-valid-attr': {
        wcagRef:   '4.1.2',
        wcagLevel: 'A',
        title:     'ARIA attributes must have valid names',
        fixTip:    'Remove invalid aria-* attributes or correct the spelling.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/aria-valid-attr',
        badExample:  '<div aria-labelby="id1">...</div>',
        goodExample: '<div aria-labelledby="id1">...</div>',
    },

    'aria-valid-attr-value': {
        wcagRef:   '4.1.2',
        wcagLevel: 'A',
        title:     'ARIA attribute values must be valid',
        fixTip:    'Boolean ARIA attributes must be "true" or "false". ID references must point to existing elements.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/aria-valid-attr-value',
        badExample:  '<button aria-expanded="yes">Menu</button>',
        goodExample: '<button aria-expanded="false">Menu</button>',
    },

    'aria-hidden-focus': {
        wcagRef:   '4.1.2',
        wcagLevel: 'A',
        title:     'aria-hidden elements must not contain focusable children',
        fixTip:    'Remove aria-hidden="true" from the ancestor, or remove/disable focusable elements within it.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/aria-hidden-focus',
        badExample:  '<div aria-hidden="true">\n  <button>Click me</button>\n</div>',
        goodExample: '<div aria-hidden="true">\n  <span>Decorative icon</span>\n</div>',
    },

    'aria-hidden-body': {
        wcagRef:   '4.1.2',
        wcagLevel: 'A',
        title:     'aria-hidden must not be present on <body>',
        fixTip:    'Remove aria-hidden="true" from the <body> element.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/aria-hidden-body',
        badExample:  '<body aria-hidden="true">...</body>',
        goodExample: '<body>...</body>',
    },

    'aria-label': {
        wcagRef:   '4.1.2',
        wcagLevel: 'A',
        title:     'aria-label must not be empty',
        fixTip:    'Provide a meaningful (non-empty) value for aria-label.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/aria-label',
        badExample:  '<button aria-label="">X</button>',
        goodExample: '<button aria-label="Close dialog">X</button>',
    },

    'aria-labelledby': {
        wcagRef:   '4.1.2',
        wcagLevel: 'A',
        title:     'aria-labelledby must reference existing elements',
        fixTip:    'Ensure every ID in aria-labelledby exists on the page and contains non-empty text.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/aria-labelledby',
        badExample:  '<input aria-labelledby="nonexistent">',
        goodExample: '<label id="lbl-email">Email</label>\n<input aria-labelledby="lbl-email">',
    },

    'landmark-banner-is-top-level': {
        wcagRef:   '1.3.1',
        wcagLevel: 'A',
        title:     'The banner landmark must not be nested in another landmark',
        fixTip:    'Move <header> (role="banner") to the top level, not inside <main> or <article>.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/landmark-banner-is-top-level',
        badExample:  '<main>\n  <header>...</header>\n</main>',
        goodExample: '<header>...</header>\n<main>...</main>',
    },

    'landmark-contentinfo-is-top-level': {
        wcagRef:   '1.3.1',
        wcagLevel: 'A',
        title:     'The contentinfo landmark must not be nested in another landmark',
        fixTip:    'Move <footer> (role="contentinfo") to the top level.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/landmark-contentinfo-is-top-level',
        badExample:  '<main>\n  <footer>...</footer>\n</main>',
        goodExample: '<main>...</main>\n<footer>...</footer>',
    },

    'landmark-no-duplicate-banner': {
        wcagRef:   '1.3.1',
        wcagLevel: 'A',
        title:     'Document must not have more than one banner landmark',
        fixTip:    'Use only one <header> element at the top level per page.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/landmark-no-duplicate-banner',
        badExample:  '<header>Site header</header>\n<header>Section header</header>',
        goodExample: '<header>Site header</header>\n<section>\n  <h2>Section heading</h2>\n</section>',
    },

    'landmark-no-duplicate-contentinfo': {
        wcagRef:   '1.3.1',
        wcagLevel: 'A',
        title:     'Document must not have more than one contentinfo landmark',
        fixTip:    'Keep a single top-level <footer> on each page.',
        helpUrl:   'https://dequeuniversity.com/rules/axe/4.10/landmark-no-duplicate-contentinfo',
        badExample:  '<footer>Footer 1</footer>\n<footer>Footer 2</footer>',
        goodExample: '<footer>Site footer</footer>',
    },

};

Object.assign(RULES_KB, {
    'area-alt': {
        wcagRef: '1.1.1', wcagLevel: 'A', title: 'Image map areas must have alt text',
        fixTip: 'Add meaningful alt text to every <area> inside an image map.',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/area-alt',
        badExample: '<area href="/sale">', goodExample: '<area href="/sale" alt="Summer sale">'
    },
    'aria-allowed-attr': {
        wcagRef: '4.1.2', wcagLevel: 'A', title: 'ARIA attributes must be allowed for the role used',
        fixTip: 'Remove aria-* properties that are not supported by the element role.',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/aria-allowed-attr',
        badExample: '<div role="img" aria-checked="true"></div>', goodExample: '<div role="img" aria-label="Store logo"></div>'
    },
    'aria-braille-equivalent': {
        wcagRef: '4.1.2', wcagLevel: 'A', title: 'Braille ARIA labels must not conflict with accessible names',
        fixTip: 'Only use aria-braillelabel / aria-brailleroledescription when you know a braille-specific alternative is needed.',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/aria-braille-equivalent'
    },
    'aria-command-name': {
        wcagRef: '4.1.2', wcagLevel: 'A', title: 'Command roles must have accessible names',
        fixTip: 'Buttons, links, and command-like roles need visible text or aria-label / aria-labelledby.',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/aria-command-name',
        badExample: '<div role="button"></div>', goodExample: '<div role="button" aria-label="Open filters"></div>'
    },
    'aria-conditional-attr': {
        wcagRef: '4.1.2', wcagLevel: 'A', title: 'Conditional ARIA attributes must only appear when valid',
        fixTip: 'Use conditional ARIA states only on roles and states that support them.',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/aria-conditional-attr'
    },
    'aria-deprecated-role': {
        wcagRef: '4.1.2', wcagLevel: 'A', title: 'Deprecated ARIA roles must not be used',
        fixTip: 'Replace deprecated roles with current WAI-ARIA roles or semantic HTML.',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/aria-deprecated-role'
    },
    'aria-input-field-name': {
        wcagRef: '4.1.2', wcagLevel: 'A', title: 'ARIA input fields must have accessible names',
        fixTip: 'Textbox, combobox, searchbox, and similar ARIA widgets need a programmatic label.',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/aria-input-field-name',
        badExample: '<div role="textbox"></div>', goodExample: '<div role="textbox" aria-label="Search products"></div>'
    },
    'aria-meter-name': {
        wcagRef: '4.1.2', wcagLevel: 'A', title: 'Meters need accessible names',
        fixTip: 'Add aria-label or aria-labelledby to role="meter" widgets.',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/aria-meter-name'
    },
    'aria-progressbar-name': {
        wcagRef: '4.1.2', wcagLevel: 'A', title: 'Progress bars need accessible names',
        fixTip: 'Add aria-label or aria-labelledby so assistive tech can identify the progress indicator.',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/aria-progressbar-name'
    },
    'aria-prohibited-attr': {
        wcagRef: '4.1.2', wcagLevel: 'A', title: 'Prohibited ARIA attributes must be removed',
        fixTip: 'Remove aria-* attributes that are explicitly prohibited for the role used.',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/aria-prohibited-attr'
    },
    'aria-roledescription': {
        wcagRef: '4.1.2', wcagLevel: 'A', title: 'aria-roledescription must be used carefully',
        fixTip: 'Only use aria-roledescription when it improves clarity and the base role remains correct.',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/aria-roledescription'
    },
    'aria-toggle-field-name': {
        wcagRef: '4.1.2', wcagLevel: 'A', title: 'Toggle widgets need accessible names',
        fixTip: 'Switches, checkboxes, radios, and toggle buttons need visible or programmatic labels.',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/aria-toggle-field-name'
    },
    'aria-tooltip-name': {
        wcagRef: '4.1.2', wcagLevel: 'A', title: 'Tooltips need accessible names',
        fixTip: 'Tooltip widgets should expose a stable accessible name or label relationship.',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/aria-tooltip-name'
    },
    'avoid-inline-spacing': {
        wcagRef: '1.4.12', wcagLevel: 'AA', title: 'Content must survive user text spacing changes',
        fixTip: 'Avoid fixed heights and cramped inline styles that break when users increase spacing.',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/avoid-inline-spacing'
    },
    'blink': {
        wcagRef: '2.2.2', wcagLevel: 'A', title: 'Blinking content must not be used',
        fixTip: 'Remove blinking text and replace it with static or user-controlled emphasis.',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/blink'
    },
    'bypass': {
        wcagRef: '2.4.1', wcagLevel: 'A', title: 'Repeated content must be bypassable',
        fixTip: 'Provide a skip link, landmarks, or another reliable way to jump to main content.',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/bypass'
    },
    'css-orientation-lock': {
        wcagRef: '1.3.4', wcagLevel: 'AA', title: 'Content must not force one screen orientation',
        fixTip: 'Do not lock the interface to portrait or landscape unless essential.',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/css-orientation-lock'
    },
    'dlitem': {
        wcagRef: '1.3.1', wcagLevel: 'A', title: 'Definition-list children must be inside a <dl>',
        fixTip: 'Move stray <dt> and <dd> elements into a parent <dl>.',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/dlitem'
    },
    'frame-focusable-content': {
        wcagRef: '2.1.1', wcagLevel: 'A', title: 'Frames with focusable content must be keyboard reachable',
        fixTip: 'Make sure interactive iframe content is reachable and the frame itself is correctly labeled.',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/frame-focusable-content'
    },
    'frame-title-unique': {
        wcagRef: '4.1.2', wcagLevel: 'A', title: 'Frame titles should be unique',
        fixTip: 'Give each iframe a distinct title so users can distinguish embedded content.',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/frame-title-unique'
    },
    'html-xml-lang-mismatch': {
        wcagRef: '3.1.1', wcagLevel: 'A', title: 'HTML and XML language declarations must match',
        fixTip: 'If both lang and xml:lang are present, set them to equivalent language tags.',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/html-xml-lang-mismatch'
    },
    'input-button-name': {
        wcagRef: '4.1.2', wcagLevel: 'A', title: 'Button inputs need accessible names',
        fixTip: 'Add a meaningful value attribute or ARIA label to input buttons.',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/input-button-name',
        badExample: '<input type="button">', goodExample: '<input type="button" value="Apply filters">'
    },
    'label-content-name-mismatch': {
        wcagRef: '2.5.3', wcagLevel: 'A', title: 'Visible labels should match accessible names',
        fixTip: 'Make sure the accessible name contains the visible text users see on screen.',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/label-content-name-mismatch'
    },
    'link-in-text-block': {
        wcagRef: '1.4.1', wcagLevel: 'A', title: 'Links in body text must be distinguishable without color alone',
        fixTip: 'Underline text links or add another non-color visual distinction.',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/link-in-text-block'
    },
    'marquee': {
        wcagRef: '2.2.2', wcagLevel: 'A', title: 'Marquee-like moving content must not be used',
        fixTip: 'Replace marquee behavior with static text or a user-controlled carousel.',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/marquee'
    },
    'meta-refresh': {
        wcagRef: '2.2.1', wcagLevel: 'A', title: 'Timed refresh or redirect must be avoided',
        fixTip: 'Remove meta refresh redirects and use user-initiated navigation instead.',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/meta-refresh'
    },
    'nested-interactive': {
        wcagRef: '4.1.2', wcagLevel: 'A', title: 'Interactive controls must not be nested',
        fixTip: 'Do not place buttons inside links or interactive elements inside other interactive elements.',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/nested-interactive',
        badExample: '<a href="/product"><button>Buy</button></a>', goodExample: '<a href="/product" class="button-link">Buy</a>'
    },
    'no-autoplay-audio': {
        wcagRef: '1.4.2', wcagLevel: 'A', title: 'Audio must not autoplay for more than 3 seconds',
        fixTip: 'Disable autoplay or provide a clear pause/stop control immediately.',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/no-autoplay-audio'
    },
    'p-as-heading': {
        wcagRef: '1.3.1', wcagLevel: 'A', title: 'Visual headings should use heading elements',
        fixTip: 'Replace styled paragraphs that act as headings with semantic <h1>-<h6> elements.',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/p-as-heading'
    },
    'server-side-image-map': {
        wcagRef: '2.1.1', wcagLevel: 'A', title: 'Server-side image maps must not be used',
        fixTip: 'Use client-side image maps or standard links/buttons instead of server-side image maps.',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/server-side-image-map'
    },
    'summary-name': {
        wcagRef: '4.1.2', wcagLevel: 'A', title: 'Summary elements need discernible text',
        fixTip: 'Ensure each <summary> has meaningful visible text describing the expandable content.',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/summary-name'
    },
    'table-fake-caption': {
        wcagRef: '1.3.1', wcagLevel: 'A', title: 'Tables should use real <caption> elements',
        fixTip: 'Use a semantic <caption> instead of visually styled text outside the table.',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/table-fake-caption'
    },
    'td-has-header': {
        wcagRef: '1.3.1', wcagLevel: 'A', title: 'Table cells must have associated headers',
        fixTip: 'Use <th scope> or headers/id associations so data cells have meaningful headers.',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/td-has-header'
    },
    'valid-lang': {
        wcagRef: '3.1.2', wcagLevel: 'AA', title: 'Language codes must be valid where used',
        fixTip: 'Use valid BCP 47 language tags for lang attributes and language changes inside content.',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/valid-lang'
    }
});

/**
 * Look up rule guidance by axe rule ID.
 * Returns a safe fallback when the rule is not in our KB yet.
 *
 * @param {string} ruleId
 * @returns {object}
 */
function getRule(ruleId) {
    return RULES_KB[ruleId] ?? {
        wcagRef:     null,
        wcagLevel:   null,
        title:       ruleId,
        fixTip:      'Refer to the axe-core documentation for guidance on this rule.',
        helpUrl:     `https://dequeuniversity.com/rules/axe/4.10/${ruleId}`,
        badExample:  null,
        goodExample: null,
        manualCheck: null,
    };
}

module.exports = { RULES_KB, getRule };
