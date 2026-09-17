import type { ComponentType, CSSProperties } from 'react';
import { themeToCssVariables, type Theme } from 'hueframe';

import { GuesthouseTemplate } from './GuesthouseTemplate';
import { PortfolioTemplate } from './PortfolioTemplate';
import type { TemplateId } from '@/lib/studio';

/**
 * Every preview template receives the same two things and nothing else.
 *
 * Templates own their photography (CC0, see CREDITS.md); the dropped photo only
 * ever feeds the palette, so a template looks the same whatever you use as the
 * colour source.
 */
export interface TemplateProps {
  readonly theme: Theme | null;
  readonly busy: boolean;
}

/** Turns a theme into the custom properties the template renders against. */
export function templateStyle(theme: Theme | null): CSSProperties {
  return (theme ? themeToCssVariables(theme) : {}) as CSSProperties;
}

export const TEMPLATE_VIEWS: Record<TemplateId, ComponentType<TemplateProps>> = {
  guesthouse: GuesthouseTemplate,
  portfolio: PortfolioTemplate,
};
