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
  interface GooeyNavItem {
    label: string;
    href: string;
  }
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

declare module "*/BlurText.jsx" {
  import type { ReactNode } from "react";
  interface BlurTextProps {
    text?: string;
    delay?: number;
    className?: string;
    animateBy?: "words" | "letters";
    direction?: "top" | "bottom";
    threshold?: number;
    rootMargin?: string;
    animationFrom?: Record<string, unknown>;
    animationTo?: Record<string, unknown>[];
    easing?: (t: number) => number;
    onAnimationComplete?: () => void;
    stepDuration?: number;
  }
  const BlurText: (p: BlurTextProps) => JSX.Element;
  export default BlurText;
}

declare module "*/ShinyText.jsx" {
  interface ShinyTextProps {
    text: string;
    disabled?: boolean;
    speed?: number;
    className?: string;
    color?: string;
    shineColor?: string;
    spread?: number;
    yoyo?: boolean;
    pauseOnHover?: boolean;
    direction?: "left" | "right";
    delay?: number;
  }
  const ShinyText: (p: ShinyTextProps) => JSX.Element;
  export default ShinyText;
}

declare module "*/DecryptedText.jsx" {
  interface DecryptedTextProps {
    text: string;
    speed?: number;
    maxIterations?: number;
    sequential?: boolean;
    revealDirection?: "start" | "end" | "center";
    useOriginalCharsOnly?: boolean;
    characters?: string;
    className?: string;
    parentClassName?: string;
    encryptedClassName?: string;
    animateOn?: "hover" | "click" | "view" | "inViewHover";
    clickMode?: "once" | "toggle";
    [key: string]: unknown;
  }
  export default function DecryptedText(p: DecryptedTextProps): JSX.Element;
}

declare module "*/TiltedCard.jsx" {
  import type { ReactNode } from "react";
  interface TiltedCardProps {
    imageSrc?: string;
    altText?: string;
    captionText?: string;
    containerHeight?: string;
    containerWidth?: string;
    imageHeight?: string;
    imageWidth?: string;
    scaleOnHover?: number;
    rotateAmplitude?: number;
    showMobileWarning?: boolean;
    showTooltip?: boolean;
    overlayContent?: ReactNode;
    displayOverlayContent?: boolean;
    children?: ReactNode;
  }
  export default function TiltedCard(p: TiltedCardProps): JSX.Element;
}

declare module "*/SpecularButton.jsx" {
  import type { ReactNode, MouseEvent } from "react";
  interface SpecularButtonProps {
    children?: ReactNode;
    size?: "sm" | "md" | "lg";
    radius?: number;
    tint?: string;
    tintOpacity?: number;
    blur?: number;
    textColor?: string;
    lineColor?: string;
    baseColor?: string;
    intensity?: number;
    shineSize?: number;
    shineFade?: number;
    thickness?: number;
    speed?: number;
    followMouse?: boolean;
    proximity?: number;
    autoAnimate?: boolean;
    disabled?: boolean;
    onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
    className?: string;
    type?: "button" | "submit" | "reset";
  }
  const SpecularButton: (p: SpecularButtonProps) => JSX.Element;
  export default SpecularButton;
}
