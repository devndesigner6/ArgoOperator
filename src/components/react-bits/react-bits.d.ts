declare module "*/Dither.jsx" {
  interface DitherProps {
    waveSpeed?: number;
    waveFrequency?: number;
    waveAmplitude?: number;
    waveColor?: [number, number, number];
    colorNum?: number;
    pixelSize?: number;
    disableAnimation?: boolean;
    enableMouseInteraction?: boolean;
    mouseRadius?: number;
  }
  const Dither: (p: DitherProps) => JSX.Element;
  export default Dither;
}

declare module "*/DotField.jsx" {
  import type { CSSProperties, HTMLAttributes } from "react";
  interface DotFieldProps extends HTMLAttributes<HTMLDivElement> {
    dotRadius?: number;
    dotSpacing?: number;
    cursorRadius?: number;
    cursorForce?: number;
    bulgeOnly?: boolean;
    bulgeStrength?: number;
    glowRadius?: number;
    sparkle?: boolean;
    waveAmplitude?: number;
    gradientFrom?: string;
    gradientTo?: string;
    glowColor?: string;
    style?: CSSProperties;
  }
  const DotField: React.MemoExoticComponent<(p: DotFieldProps) => JSX.Element>;
  export default DotField;
}

declare module "*/BorderGlow.jsx" {
  import type { ReactNode } from "react";
  interface BorderGlowProps {
    children?: ReactNode;
    className?: string;
    edgeSensitivity?: number;
    glowColor?: string;
    backgroundColor?: string;
    borderRadius?: number;
    glowRadius?: number;
    glowIntensity?: number;
    coneSpread?: number;
    animated?: boolean;
    colors?: string[];
    fillOpacity?: number;
  }
  const BorderGlow: (p: BorderGlowProps) => JSX.Element;
  export default BorderGlow;
}

declare module "*/Strands.jsx" {
  import type { CSSProperties } from "react";
  interface StrandsProps {
    colors?: string[];
    count?: number;
    speed?: number;
    amplitude?: number;
    waviness?: number;
    thickness?: number;
    glow?: number;
    taper?: number;
    spread?: number;
    hueShift?: number;
    intensity?: number;
    saturation?: number;
    opacity?: number;
    scale?: number;
    glass?: boolean;
    refraction?: number;
    dispersion?: number;
    glassSize?: number;
    className?: string;
    style?: CSSProperties;
  }
  const Strands: (p: StrandsProps) => JSX.Element;
  export default Strands;
}

declare module "*/GooeyNav.jsx" {
  interface GooeyNavItem { label: string; href: string }
  interface GooeyNavProps {
    items: GooeyNavItem[];
    animationTime?: number;
    particleCount?: number;
    particleDistances?: [number, number];
    particleR?: number;
    timeVariance?: number;
    colors?: number[];
    initialActiveIndex?: number;
    onItemSelect?: (item: GooeyNavItem, index: number) => void;
  }
  const GooeyNav: (p: GooeyNavProps) => JSX.Element;
  export default GooeyNav;
}
