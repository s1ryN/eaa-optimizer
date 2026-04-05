const MANUAL_CHECKS = [
    {
        id: 'meaningful-alt-text',
        wcagRef: '1.1.1',
        title: 'Alternative text is meaningful in context',
        whyItNeedsHuman: 'Automation can detect missing alt text, but not whether the supplied text is accurate or useful.',
        reviewPrompt: 'Do product images, icons, charts, and decorative assets have alt text that matches user intent?'
    },
    {
        id: 'reading-order',
        wcagRef: '1.3.2',
        title: 'Reading order stays logical when linearized',
        whyItNeedsHuman: 'DOM order and visual order can diverge in ways scanners cannot judge semantically.',
        reviewPrompt: 'If CSS is removed or content is read linearly, does the sequence still make sense?'
    },
    {
        id: 'instructions-clarity',
        wcagRef: '3.3.2',
        title: 'Instructions are clear and not color-only',
        whyItNeedsHuman: 'A crawler cannot judge whether instructional copy is understandable or relies only on color/shape.',
        reviewPrompt: 'Are users told what to do without relying on color, position, or prior knowledge?'
    },
    {
        id: 'purpose-in-context',
        wcagRef: '2.4.4',
        title: 'Link purpose is clear in context',
        whyItNeedsHuman: 'Automation can detect empty names, but not whether repeated labels like “More” are meaningful in context.',
        reviewPrompt: 'Would a screen-reader user understand each link/button purpose from nearby context?'
    },
    {
        id: 'focus-order-logic',
        wcagRef: '2.4.3',
        title: 'Focus order is logical for keyboard users',
        whyItNeedsHuman: 'Automation can detect some tabindex misuse, but not whether the actual tab sequence matches the workflow.',
        reviewPrompt: 'When tabbing through the page, does focus move in the order a user expects?'
    },
    {
        id: 'custom-widget-behavior',
        wcagRef: '4.1.2',
        title: 'Custom widgets behave correctly with keyboard and assistive tech',
        whyItNeedsHuman: 'A crawler cannot fully validate complex interactive states, announcements, and keyboard patterns.',
        reviewPrompt: 'Do custom dropdowns, carousels, dialogs, tabs, and accordions behave like native equivalents?'
    },
    {
        id: 'error-prevention',
        wcagRef: '3.3.4',
        title: 'High-impact actions have review/undo safeguards',
        whyItNeedsHuman: 'This depends on business flow and legal consequence, not just markup.',
        reviewPrompt: 'For purchases, submissions, and deletions, can users review, correct, or undo before finalizing?'
    },
    {
        id: 'consistent-identification',
        wcagRef: '3.2.4',
        title: 'Repeated UI components are identified consistently',
        whyItNeedsHuman: 'Automation cannot decide whether naming remains consistent across journeys and templates.',
        reviewPrompt: 'Are the same controls labeled the same way across product, cart, and checkout screens?'
    },
    {
        id: 'motion-and-distraction',
        wcagRef: '2.2.2',
        title: 'Moving content is not distracting and can be paused if needed',
        whyItNeedsHuman: 'A scanner can detect autoplay in some cases, but not whether motion is acceptable or disruptive.',
        reviewPrompt: 'Do moving banners, carousels, or videos distract users or require a pause/stop control?'
    },
    {
        id: 'visible-focus-quality',
        wcagRef: '2.4.7',
        title: 'Visible focus indicator is obvious enough',
        whyItNeedsHuman: 'Automation can detect presence inconsistently, but not whether the focus ring is actually noticeable in the design.',
        reviewPrompt: 'Can a keyboard-only user always see where focus currently is?'
    },
    {
        id: 'content-understanding',
        wcagRef: '3.1.5',
        title: 'Content is understandable for the intended audience',
        whyItNeedsHuman: 'Readability, jargon, and cognitive load are human-judgment problems.',
        reviewPrompt: 'Are headings, labels, and instructions written in plain enough language for real users?'
    },
    {
        id: 'touch-target-usability',
        wcagRef: '2.5.5',
        title: 'Touch targets are practical on mobile',
        whyItNeedsHuman: 'This depends on layout density, accidental taps, and real-device ergonomics.',
        reviewPrompt: 'On mobile, are links, filters, and checkout controls comfortably tappable?'
    }
];

module.exports = { MANUAL_CHECKS };
