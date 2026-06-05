/**
 * Centralized font registration for @react-pdf/renderer.
 *
 * Font.register() MUST be called at module level (not inside components,
 * not inside window guards) so that fonts are available when PDF
 * rendering begins.
 *
 * Cairo is a Google Font that supports both Arabic and Latin scripts
 * with proper GSUB shaping tables. The variable font covers all weights.
 */

import { Font } from '@react-pdf/renderer';

Font.register({
  family: 'Cairo',
  fonts: [
    { src: '/fonts/Cairo-Variable.ttf', fontWeight: 400 },
    { src: '/fonts/Cairo-Variable.ttf', fontWeight: 700 },
  ],
});

// Re-export nothing — this module is imported purely for its side effect.
export {};
